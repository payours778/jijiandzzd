import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { DatabaseSync } from "node:sqlite";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..", "frontend", "dist");
const dataDir = path.join(__dirname, "data");
const dbFile = path.join(dataDir, "app.db");
const port = Number(process.env.PORT || 3001);
const host = process.env.HOST || "127.0.0.1";

fs.mkdirSync(dataDir, { recursive: true });

const db = new DatabaseSync(dbFile);
db.exec(`
  CREATE TABLE IF NOT EXISTS accounts (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    display_name TEXT NOT NULL,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    token TEXT UNIQUE NOT NULL,
    account_id TEXT,
    display_name TEXT NOT NULL,
    created_at TEXT NOT NULL,
    last_seen_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS adou_records (
    account_id TEXT NOT NULL,
    mode TEXT NOT NULL DEFAULT 'normal',
    best_wave INTEGER NOT NULL,
    score INTEGER NOT NULL DEFAULT 0,
    play_count INTEGER NOT NULL DEFAULT 1,
    updated_at TEXT NOT NULL,
    PRIMARY KEY (account_id, mode)
  );
`);
try {
  db.exec("ALTER TABLE accounts ADD COLUMN coins INTEGER NOT NULL DEFAULT 0");
} catch {
  // 老数据库已存在该列时忽略。
}

// 6A: 武将 instance 表
db.exec(`
  CREATE TABLE IF NOT EXISTS adou_general_instances (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    account_id INTEGER NOT NULL,
    hero_id TEXT NOT NULL,
    level INTEGER NOT NULL DEFAULT 1,
    star INTEGER NOT NULL DEFAULT 0,
    fragments INTEGER NOT NULL DEFAULT 0,
    equipped_main TEXT,
    equipped_secondary TEXT,
    equipped_accessory TEXT,
    status TEXT NOT NULL DEFAULT 'idle',
    position_row INTEGER,
    position_col INTEGER,
    total_kills INTEGER NOT NULL DEFAULT 0,
    updated_at TEXT NOT NULL,
    UNIQUE(account_id, hero_id),
    FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE
  )`
);

// 13: daily signin table
db.exec(`CREATE TABLE IF NOT EXISTS adou_daily_signin (id INTEGER PRIMARY KEY AUTOINCREMENT, account_id TEXT NOT NULL, signin_date TEXT NOT NULL, reward_coins INTEGER NOT NULL, consecutive_days INTEGER NOT NULL, created_at TEXT NOT NULL, UNIQUE(account_id, signin_date), FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE)`);
try{db.exec('CREATE INDEX IF NOT EXISTS idx_daily_signin_account_date ON adou_daily_signin(account_id, signin_date DESC)');}catch{}

// 14: 成就进度表
db.exec(`CREATE TABLE IF NOT EXISTS adou_achievements (
  account_id TEXT NOT NULL,
  achv_type TEXT NOT NULL,
  count INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (account_id, achv_type),
  FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE
)`);

try { db.exec('CREATE INDEX IF NOT EXISTS idx_achievements_account ON adou_achievements(account_id)'); } catch {}


// 14: 已领取成就记录
db.exec(`CREATE TABLE IF NOT EXISTS adou_achievements_claimed (
  account_id TEXT NOT NULL,
  achv_id TEXT NOT NULL,
  claimed_at TEXT NOT NULL,
  PRIMARY KEY (account_id, achv_id),
  FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE
)`);




// 7: 商店购买记录表
db.exec(`
  CREATE TABLE IF NOT EXISTS adou_shop_purchases (
    id TEXT PRIMARY KEY,
    account_id TEXT NOT NULL,
    item_id TEXT NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    total_price INTEGER NOT NULL,
    purchased_at TEXT NOT NULL,
    FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE
  )`
);

// 6B: 招募系统 state 表 (整块 JSON 存)
db.exec(`
  CREATE TABLE IF NOT EXISTS adou_recruit_state (
    account_id TEXT PRIMARY KEY,
    data TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE
  )`
);

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".ico": "image/x-icon",
};

function sendJson(res, status, data) {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Methods": "GET, POST, PATCH, OPTIONS",
  });
  res.end(JSON.stringify(data));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
      if (body.length > 1_000_000) {
        reject(new Error("Body too large"));
        req.destroy();
      }
    });
    req.on("end", () => {
      if (!body) {
        resolve({});
        return;
      }

      try {
        resolve(JSON.parse(body));
      } catch {
        reject(new Error("Invalid JSON"));
      }
    });
    req.on("error", reject);
  });
}

function createToken() {
  return `mp_${crypto.randomBytes(24).toString("base64url")}`;
}

function createSession(displayName, accountId = null) {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    token: createToken(),
    accountId,
    displayName,
    createdAt: now,
    lastSeenAt: now,
  };
}

function insertSession(session) {
  db.prepare(`
    INSERT INTO sessions (id, token, account_id, display_name, created_at, last_seen_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(
    session.id,
    session.token,
    session.accountId,
    session.displayName,
    session.createdAt,
    session.lastSeenAt,
  );
}

function getSessionByToken(token) {
  const row = db
    .prepare(`
      SELECT id, token, account_id, display_name, created_at, last_seen_at
      FROM sessions
      WHERE token = ?
    `)
    .get(token);

  if (!row) {
    return null;
  }

  return {
    id: row.id,
    token: row.token,
    accountId: row.account_id,
    displayName: row.display_name,
    createdAt: row.created_at,
    lastSeenAt: row.last_seen_at,
  };
}

function updateSession(session) {
  db.prepare(`
    UPDATE sessions
    SET display_name = ?, last_seen_at = ?
    WHERE token = ?
  `).run(session.displayName, session.lastSeenAt, session.token);
}

function deleteSession(token) {
  db.prepare("DELETE FROM sessions WHERE token = ?").run(token);
}

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

function verifyPassword(password, stored) {
  const [salt, hash] = stored.split(":");
  const candidate = crypto.scryptSync(password, salt, 64).toString("hex");
  const expected = Buffer.from(hash, "hex");
  const actual = Buffer.from(candidate, "hex");
  return expected.length === actual.length && crypto.timingSafeEqual(expected, actual);
}

function getAccountByUsername(username) {
  const row = db
    .prepare(`
      SELECT id, username, password_hash, display_name, created_at
      FROM accounts
      WHERE username = ?
    `)
    .get(username);

  if (!row) {
    return null;
  }

  return {
    id: row.id,
    username: row.username,
    passwordHash: row.password_hash,
    displayName: row.display_name,
    createdAt: row.created_at,
  };
}

function createAccount(username, password, displayName) {
  const account = {
    id: crypto.randomUUID(),
    username,
    passwordHash: hashPassword(password),
    displayName: displayName || username,
    createdAt: new Date().toISOString(),
  };

  db.prepare(`
    INSERT INTO accounts (id, username, password_hash, display_name, created_at)
    VALUES (?, ?, ?, ?, ?)
  `).run(
    account.id,
    account.username,
    account.passwordHash,
    account.displayName,
    account.createdAt,
  );

  return account;
}

function getSessionFromRequest(req) {
  const auth = req.headers.authorization || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  return token ? getSessionByToken(token) : null;
}

function publicSession(session) {
  let coins = 0;
  if (session.accountId) {
    const row = db
      .prepare("SELECT coins FROM accounts WHERE id = ?")
      .get(session.accountId);
    if (row) {
      coins = row.coins || 0;
    }
  }
  return {
    id: session.id,
    displayName: session.displayName,
    createdAt: session.createdAt,
    lastSeenAt: session.lastSeenAt,
    isGuest: !session.accountId,
    coins,
  };
}

function serveStatic(req, res) {
  const requestUrl = new URL(req.url, `http://${req.headers.host || "localhost"}`);
  const pathname = decodeURIComponent(requestUrl.pathname);
  const relativePath = pathname === "/" ? "index.html" : pathname.replace(/^\/+/, "");
  const filePath = path.resolve(rootDir, relativePath);

  if (!filePath.startsWith(rootDir) || !fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    sendJson(res, 404, { error: "Not found" });
    return;
  }

  const ext = path.extname(filePath).toLowerCase();
  // index.html 不缓存（确保总能加载最新 JS hash）；带 hash 的静态资源可长缓存
  const cacheControl = relativePath === "index.html"
    ? "no-cache, no-store, must-revalidate"
    : "public, max-age=3600";
  res.writeHead(200, {
    "Content-Type": mimeTypes[ext] || "application/octet-stream",
    "Cache-Control": cacheControl,
  });
  fs.createReadStream(filePath).pipe(res);
}

async function handleApi(req, res, pathname) {
  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  if (pathname === "/api/health" && req.method === "GET") {
    sendJson(res, 200, { ok: true, service: "mini-playbox-backend", database: "sqlite" });
    return;
  }

  if (pathname === "/api/auth/anonymous" && req.method === "POST") {
    const session = createSession("游客", null);
    insertSession(session);
    sendJson(res, 201, { token: session.token, user: publicSession(session) });
    return;
  }

  if (pathname === "/api/auth/register" && req.method === "POST") {
    const body = await readBody(req);
    const username = String(body.username || "").trim().slice(0, 24);
    const password = String(body.password || "");
    const displayName = String(body.displayName || username).slice(0, 24);

    if (username.length < 2 || password.length < 6) {
      sendJson(res, 400, { error: "用户名至少 2 位，密码至少 6 位" });
      return;
    }

    if (getAccountByUsername(username)) {
      sendJson(res, 409, { error: "用户名已存在" });
      return;
    }

    const account = createAccount(username, password, displayName);
    const session = createSession(account.displayName, account.id);
    insertSession(session);
    sendJson(res, 201, { token: session.token, user: publicSession(session) });
    return;
  }

  if (pathname === "/api/auth/login" && req.method === "POST") {
    const body = await readBody(req);
    const username = String(body.username || "").trim();
    const password = String(body.password || "");
    const account = getAccountByUsername(username);

    if (!account || !verifyPassword(password, account.passwordHash)) {
      sendJson(res, 401, { error: "用户名或密码错误" });
      return;
    }

    const session = createSession(account.displayName, account.id);
    insertSession(session);
    sendJson(res, 200, { token: session.token, user: publicSession(session) });
    return;
  }

  if (pathname === "/api/auth/logout" && req.method === "POST") {
    const session = getSessionFromRequest(req);
    if (session) {
      deleteSession(session.token);
    }
    sendJson(res, 200, { ok: true });
    return;
  }

  if (pathname === "/api/me" && (req.method === "GET" || req.method === "PATCH")) {
    const session = getSessionFromRequest(req);

    if (!session) {
      sendJson(res, 401, { error: "Unauthorized" });
      return;
    }

    if (req.method === "PATCH") {
      const body = await readBody(req);
      if (body.displayName) {
        session.displayName = body.displayName.slice(0, 24);
      }
      session.lastSeenAt = new Date().toISOString();
      updateSession(session);
    }

    sendJson(res, 200, publicSession(session));
    return;
  }

  if (pathname === "/api/adou/best-wave" && req.method === "POST") {
    const session = getSessionFromRequest(req);

    if (!session) {
      sendJson(res, 401, { error: "Unauthorized" });
      return;
    }

    if (!session.accountId) {
      sendJson(res, 403, { error: "游客无法提交排行，请先注册账号" });
      return;
    }

    const body = await readBody(req);
    const wave = Number(body.wave);
    const mode = body.mode === "challenge" ? "challenge" : "normal";

    if (!Number.isInteger(wave) || wave < 1 || wave > 999) {
      sendJson(res, 400, { error: "无效的波次" });
      return;
    }

    // UPSERT 保证 best_wave 只增不减；play_count 每次对局 +1；score 预留暂不参与更新。
    db.prepare(`
      INSERT INTO adou_records (account_id, mode, best_wave, score, play_count, updated_at)
      VALUES (?, ?, ?, 0, 1, ?)
      ON CONFLICT(account_id, mode) DO UPDATE SET
        best_wave = MAX(best_wave, excluded.best_wave),
        play_count = play_count + 1,
        updated_at = excluded.updated_at
    `).run(session.accountId, mode, wave, new Date().toISOString());

    const record = db
      .prepare("SELECT best_wave, play_count FROM adou_records WHERE account_id = ? AND mode = ?")
      .get(session.accountId, mode);

    sendJson(res, 200, {
      ok: true,
      bestWave: record.best_wave,
      playCount: record.play_count,
      isNewBest: record.best_wave === wave,
    });
    return;
  }

  if (pathname === "/api/adou/generals" && req.method === "GET") {
    const session = getSessionFromRequest(req);
    if (!session || !session.accountId) { sendJson(res, 401, { error: "Unauthorized" }); return; }
    const rows = db.prepare("SELECT hero_id, level, star, fragments, equipped_main, equipped_secondary, equipped_accessory, status, position_row, position_col, total_kills, updated_at FROM adou_general_instances WHERE account_id = ?").all(session.accountId);
    const list = rows.map((r) => ({
      heroId: r.hero_id,
      level: r.level,
      star: r.star,
      fragments: r.fragments,
      equippedWeapons: { main: r.equipped_main, secondary: r.equipped_secondary, accessory: r.equipped_accessory },
      status: r.status,
      position: r.position_row != null ? { row: r.position_row, col: r.position_col } : null,
      totalKills: r.total_kills,
      updatedAt: r.updated_at,
    }));
    sendJson(res, 200, { ok: true, instances: list });
    return;
  }

  if (pathname === "/api/adou/generals/sync" && req.method === "POST") {
    const session = getSessionFromRequest(req);
    if (!session || !session.accountId) { sendJson(res, 401, { error: "Unauthorized" }); return; }
    const body = await readBody(req);
    const list = Array.isArray(body?.instances) ? body.instances : [];
    const now = new Date().toISOString();
    const upsert = db.prepare(`
      INSERT INTO adou_general_instances (account_id, hero_id, level, star, fragments, equipped_main, equipped_secondary, equipped_accessory, status, position_row, position_col, total_kills, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(account_id, hero_id) DO UPDATE SET
        level=excluded.level, star=excluded.star, fragments=excluded.fragments,
        equipped_main=excluded.equipped_main, equipped_secondary=excluded.equipped_secondary, equipped_accessory=excluded.equipped_accessory,
        status=excluded.status, position_row=excluded.position_row, position_col=excluded.position_col,
        total_kills=excluded.total_kills, updated_at=excluded.updated_at
    `);
    let count = 0;
    // node:sqlite 没有 db.transaction, 用 BEGIN/COMMIT/ROLLBACK 手工包
    db.exec("BEGIN");
    try {
      for (const it of list) {
        const w = it.equippedWeapons || {};
        const pos = it.position || null;
        upsert.run(
          session.accountId,
          String(it.heroId || ""),
          Math.max(1, Math.min(5, Number(it.level) || 1)),
          Math.max(0, Math.min(5, Number(it.star) || 0)),
          Math.max(0, Math.floor(Number(it.fragments) || 0)),
          w.main || null, w.secondary || null, w.accessory || null,
          String(it.status || "idle"),
          pos ? pos.row : null, pos ? pos.col : null,
          Math.max(0, Math.floor(Number(it.totalKills) || 0)),
          now,
        );
        count += 1;
      }
      db.exec("COMMIT");
    } catch (txErr) {
      db.exec("ROLLBACK");
      throw txErr;
    }
    sendJson(res, 200, { ok: true, count });
    return;
  }

  if (pathname === "/api/adou/recruit" && req.method === "GET") {
    const session = getSessionFromRequest(req);
    if (!session || !session.accountId) { sendJson(res, 401, { error: "Unauthorized" }); return; }
    const row = db.prepare("SELECT data, updated_at FROM adou_recruit_state WHERE account_id = ?").get(session.accountId);
    if (!row) { sendJson(res, 200, { ok: true, data: null }); return; }
    let parsed = null;
    try { parsed = JSON.parse(row.data); } catch { parsed = null; }
    sendJson(res, 200, { ok: true, data: parsed, updatedAt: row.updated_at });
    return;
  }

  if (pathname === "/api/adou/recruit/sync" && req.method === "POST") {
    const session = getSessionFromRequest(req);
    if (!session || !session.accountId) { sendJson(res, 401, { error: "Unauthorized" }); return; }
    const body = await readBody(req);
    const data = body?.data;
    if (!data || typeof data !== "object") { sendJson(res, 400, { error: "data 字段缺失或非对象" }); return; }
    const json = JSON.stringify(data);
    const now = new Date().toISOString();
    db.prepare(`
      INSERT INTO adou_recruit_state (account_id, data, updated_at)
      VALUES (?, ?, ?)
      ON CONFLICT(account_id) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at
    `).run(session.accountId, json, now);
    sendJson(res, 200, { ok: true, updatedAt: now });
    return;
  }

  if (pathname === "/api/adou/coins" && req.method === "POST") {
    const session = getSessionFromRequest(req);

    if (!session || !session.accountId) {
      sendJson(res, 401, { error: "Unauthorized" });
      return;
    }

    const body = await readBody(req);
    const amount = Number(body.amount);
    if (!Number.isInteger(amount) || amount < 1 || amount > 100000) {
      sendJson(res, 400, { error: "无效的金币数量" });
      return;
    }

    db.prepare("UPDATE accounts SET coins = coins + ? WHERE id = ?").run(
      amount,
      session.accountId,
    );
    const row = db
      .prepare("SELECT coins FROM accounts WHERE id = ?")
      .get(session.accountId);
    sendJson(res, 200, { ok: true, coins: row.coins });
    return;
  }

  // ===== 7: 商店系统 =====
  // 商品目录 (硬编码, 改这里就行)
  const SHOP_CATALOG = [
    { id: "recruit_ticket_1", name: "普通招募券", desc: "1 张普通招募券", price: 50, currency: "coin", grant: { recruitTickets: 1 } },
    { id: "recruit_ticket_10", name: "普通招募券×10", desc: "10 张普通招募券, 9 折优惠", price: 450, currency: "coin", grant: { recruitTickets: 10 } },
    { id: "elite_item_1", name: "精英招募符", desc: "1 个精英招募符, 用于精英池", price: 200, currency: "coin", grant: { eliteRecruitItems: 1 } },
    { id: "legend_scroll_1", name: "巅峰招募卷", desc: "1 个巅峰招募卷, 用于 BOSS 掉落保底", price: 1000, currency: "coin", grant: { legendRecruitScrolls: 1 } },
    { id: "fragment_box_5", name: "随机碎片盒", desc: "随机 1 个武将的 5 个碎片", price: 300, currency: "coin", grant: { randomFragments: 5 } },
  ];

  if (pathname === "/api/adou/shop/items" && req.method === "GET") {
    sendJson(res, 200, { ok: true, items: SHOP_CATALOG });
    return;
  }

  if (pathname === "/api/adou/shop/my" && req.method === "GET") {
    const session = getSessionFromRequest(req);
    if (!session || !session.accountId) { sendJson(res, 401, { error: "Unauthorized" }); return; }
    const rows = db.prepare("SELECT id, item_id, quantity, total_price, purchased_at FROM adou_shop_purchases WHERE account_id = ? ORDER BY purchased_at DESC LIMIT 50").all(session.accountId);
    const enriched = rows.map((r) => {
      const item = SHOP_CATALOG.find((x) => x.id === r.item_id);
      return { ...r, item_name: item?.name || r.item_id };
    });
    sendJson(res, 200, { ok: true, purchases: enriched });
    return;
  }

  if (pathname === "/api/adou/shop/buy" && req.method === "POST") {
    const session = getSessionFromRequest(req);
    if (!session || !session.accountId) { sendJson(res, 401, { error: "Unauthorized" }); return; }
    const body = await readBody(req);
    const itemId = String(body?.itemId || "");
    const quantity = Math.max(1, Math.min(99, Math.floor(Number(body?.quantity) || 1)));
    const item = SHOP_CATALOG.find((x) => x.id === itemId);
    if (!item) { sendJson(res, 404, { error: "商品不存在" }); return; }
    const totalPrice = item.price * quantity;
    // 1) 扣金币
    const accRow = db.prepare("SELECT coins FROM accounts WHERE id = ?").get(session.accountId);
    if (!accRow) { sendJson(res, 404, { error: "账户不存在" }); return; }
    if ((accRow.coins || 0) < totalPrice) { sendJson(res, 400, { error: "金币不足", need: totalPrice, have: accRow.coins }); return; }
    db.prepare("UPDATE accounts SET coins = coins - ? WHERE id = ?").run(totalPrice, session.accountId);
    // 2) 记录购买
    const now = new Date().toISOString();
    db.prepare("INSERT INTO adou_shop_purchases (id, account_id, item_id, quantity, total_price, purchased_at) VALUES (?, ?, ?, ?, ?, ?)").run(crypto.randomUUID(), session.accountId, itemId, quantity, totalPrice, now);
    // 3) 返回新余额 + 商品
    const newRow = db.prepare("SELECT coins FROM accounts WHERE id = ?").get(session.accountId);
    sendJson(res, 200, { ok: true, coins: newRow.coins, item, quantity, totalPrice, grant: item.grant });
    return;
  }

  if (pathname === "/api/adou/leaderboard" && req.method === "GET") {
    const mode = new URL(req.url, "http://localhost").searchParams.get("mode") === "challenge"
      ? "challenge"
      : "normal";

    // 昵称走 JOIN accounts 实时获取；排序规则：波次 > 积分 > 达成时间。
    const rows = db.prepare(`
      SELECT a.display_name AS display_name, r.best_wave, r.score, r.updated_at
      FROM adou_records r
      JOIN accounts a ON a.id = r.account_id
      WHERE r.mode = ?
      ORDER BY r.best_wave DESC, r.score DESC, r.updated_at ASC
      LIMIT 20
    `).all(mode);

    const leaderboard = rows.map((row, index) => ({
      rank: index + 1,
      displayName: row.display_name,
      bestWave: row.best_wave,
    }));

    let myRank = null;
    const session = getSessionFromRequest(req);

    if (session?.accountId) {
      const mine = db
        .prepare("SELECT best_wave, score, play_count, updated_at FROM adou_records WHERE account_id = ? AND mode = ?")
        .get(session.accountId, mode);

      if (mine) {
        const ahead = db.prepare(`
          SELECT COUNT(*) AS count
          FROM adou_records
          WHERE mode = ?
            AND (
              best_wave > ?
              OR (best_wave = ? AND score > ?)
              OR (best_wave = ? AND score = ? AND updated_at < ?)
            )
        `).get(mode, mine.best_wave, mine.best_wave, mine.score, mine.best_wave, mine.score, mine.updated_at);

        myRank = {
          rank: ahead.count + 1,
          bestWave: mine.best_wave,
          playCount: mine.play_count,
        };
      }
    }

    sendJson(res, 200, { leaderboard, myRank });
    return;
  }


// === 13 daily-signin API ===
const SIGNIN_REWARDS = [50, 80, 120, 150, 200, 250, 400];
function todayStr() { return new Date().toISOString().slice(0, 10); }
function daysBetween(a, b) { return Math.round((new Date(b + 'T00:00:00Z') - new Date(a + 'T00:00:00Z')) / 86400000); }

if (pathname === '/api/adou/daily-signin' && req.method === 'GET') {
  const s = getSessionFromRequest(req);
  if (!s || !s.accountId) { sendJson(res, 401, { error: 'Unauthorized' }); return; }
  const today = todayStr();
  const tr = db.prepare('SELECT id, reward_coins, consecutive_days, created_at FROM adou_daily_signin WHERE account_id = ? AND signin_date = ?').get(s.accountId, today);
  const lr = db.prepare('SELECT signin_date, consecutive_days FROM adou_daily_signin WHERE account_id = ? ORDER BY signin_date DESC LIMIT 1').get(s.accountId);
  const wr = db.prepare('SELECT signin_date, reward_coins, consecutive_days FROM adou_daily_signin WHERE account_id = ? ORDER BY signin_date DESC LIMIT 7').all(s.accountId);
  const tot = db.prepare('SELECT COUNT(*) AS c, COALESCE(SUM(reward_coins), 0) AS t FROM adou_daily_signin WHERE account_id = ?').get(s.accountId);
  let cur = 0;
  if (lr) cur = lr.consecutive_days || 0;
  const nmd = ((cur % 7) + 1);
  const nr = SIGNIN_REWARDS[nmd - 1];
  sendJson(res, 200, { ok: true, today, signedToday: !!tr, currentStreak: cur, nextMilestoneDay: nmd, nextReward: nr, rewards: SIGNIN_REWARDS, recent: wr, totalSignins: tot.c, totalCoins: tot.t });
  return;
}

if (pathname === '/api/adou/daily-signin' && req.method === 'POST') {
  const s = getSessionFromRequest(req);
  if (!s || !s.accountId) { sendJson(res, 401, { error: 'Unauthorized' }); return; }
  const today = todayStr();
  const tr = db.prepare('SELECT id FROM adou_daily_signin WHERE account_id = ? AND signin_date = ?').get(s.accountId, today);
  if (tr) { sendJson(res, 400, { error: 'already-signed-today', signedToday: true }); return; }
  const lr = db.prepare('SELECT signin_date, consecutive_days FROM adou_daily_signin WHERE account_id = ? ORDER BY signin_date DESC LIMIT 1').get(s.accountId);
  let ns = 1;
  if (lr) {
    const d = daysBetween(lr.signin_date, today);
    if (d === 1) ns = (lr.consecutive_days || 0) + 1;
    else ns = 1;
  }
  const di = ((ns - 1) % 7);
  const reward = SIGNIN_REWARDS[di];
  const now = new Date().toISOString();
  db.prepare('INSERT INTO adou_daily_signin (account_id, signin_date, reward_coins, consecutive_days, created_at) VALUES (?, ?, ?, ?, ?)').run(s.accountId, today, reward, ns, now);
  db.prepare('UPDATE accounts SET coins = coins + ? WHERE id = ?').run(reward, s.accountId);
  const ar = db.prepare('SELECT coins FROM accounts WHERE id = ?').get(s.accountId);
  sendJson(res, 200, { ok: true, signedToday: true, consecutiveDays: ns, reward, coins: ar.coins, today });
  return;
}

// === 14 achievements API ===
const ACHIEVEMENTS = [
  { id: 'recruit_10',   name: '初出茅庐',   desc: '抽卡累计 10 次',    icon: '🎴', target: 10,  type: 'recruit',    reward: 100  },
  { id: 'recruit_50',   name: '招募达人',   desc: '抽卡累计 50 次',    icon: '🎴', target: 50,  type: 'recruit',    reward: 500  },
  { id: 'recruit_100',  name: '招募狂魔',   desc: '抽卡累计 100 次',   icon: '🎴', target: 100, type: 'recruit',    reward: 1500 },
  { id: 'purchase_5',   name: '初次消费',   desc: '商店购买 5 次',     icon: '🛒', target: 5,   type: 'purchase',   reward: 100  },
  { id: 'purchase_20',  name: '消费大户',   desc: '商店购买 20 次',    icon: '🛒', target: 20,  type: 'purchase',   reward: 500  },
  { id: 'signin_7',     name: '坚持不懈',   desc: '累计签到 7 天',     icon: '📅', target: 7,   type: 'signin',     reward: 200  },
  { id: 'signin_30',    name: '签到达人',   desc: '累计签到 30 天',    icon: '📅', target: 30,  type: 'signin',     reward: 1000 },
  { id: 'wave_10',      name: '首战告捷',   desc: '最高波次达到 10',   icon: '⚔️', target: 10,  type: 'wave',       reward: 200  },
  { id: 'wave_20',      name: '战无不胜',   desc: '最高波次达到 20',   icon: '⚔️', target: 20,  type: 'wave',       reward: 800  },
  { id: 'wave_30',      name: '塔防大师',   desc: '最高波次达到 30',   icon: '🏆', target: 30,  type: 'wave',       reward: 2000 },
  { id: 'boss_3',       name: 'BOSS 克星',  desc: '累计击杀 BOSS 3 个', icon: '👹', target: 3,   type: 'boss_kill',  reward: 300  },
  { id: 'boss_10',      name: 'BOSS 终结者', desc: '累计击杀 BOSS 10 个', icon: '👹', target: 10, type: 'boss_kill', reward: 1000 },
];

if (pathname === '/api/adou/achievements' && req.method === 'GET') {
  const s = getSessionFromRequest(req);
  if (!s || !s.accountId) { sendJson(res, 401, { error: 'Unauthorized' }); return; }
  const progress = {};
  const rows = db.prepare('SELECT achv_type, count FROM adou_achievements WHERE account_id = ?').all(s.accountId);
  for (const r of rows) progress[r.achv_type] = r.count;
  const bestRow = db.prepare('SELECT MAX(best_wave) AS w FROM adou_records WHERE account_id = ?').get(s.accountId);
  progress['wave'] = bestRow && bestRow.w ? bestRow.w : 0;
  const claimed = db.prepare('SELECT achv_id FROM adou_achievements_claimed WHERE account_id = ?').all(s.accountId).map((r) => r.achv_id);
  const list = ACHIEVEMENTS.map((a) => {
    const cur = progress[a.type] || 0;
    const done = cur >= a.target;
    return { ...a, progress: cur, completed: done, claimed: claimed.includes(a.id), claimable: done && !claimed.includes(a.id) };
  });
  const totalClaimable = list.filter((x) => x.claimable).length;
  const totalCompleted = list.filter((x) => x.completed).length;
  const totalClaimed = claimed.length;
  sendJson(res, 200, { ok: true, achievements: list, totalClaimable, totalCompleted, totalClaimed });
  return;
}

if (pathname === '/api/adou/achievements/event' && req.method === 'POST') {
  const s = getSessionFromRequest(req);
  if (!s || !s.accountId) { sendJson(res, 401, { error: 'Unauthorized' }); return; }
  const body = await readBody(req);
  const type = String(body?.type || '');
  const amount = Math.max(0, Math.min(999, Math.floor(Number(body?.amount) || 1)));
  const ALLOWED = ['recruit', 'purchase', 'signin', 'boss_kill'];
  if (!ALLOWED.includes(type)) { sendJson(res, 400, { error: 'invalid-type' }); return; }
  const now = new Date().toISOString();
  db.prepare('INSERT INTO adou_achievements (account_id, achv_type, count, updated_at) VALUES (?, ?, ?, ?) ON CONFLICT(account_id, achv_type) DO UPDATE SET count = count + excluded.count, updated_at = excluded.updated_at').run(s.accountId, type, amount, now);
  const row = db.prepare('SELECT count FROM adou_achievements WHERE account_id = ? AND achv_type = ?').get(s.accountId, type);
  sendJson(res, 200, { ok: true, type, count: row.count });
  return;
}

if (pathname === '/api/adou/achievements/claim' && req.method === 'POST') {
  const s = getSessionFromRequest(req);
  if (!s || !s.accountId) { sendJson(res, 401, { error: 'Unauthorized' }); return; }
  const body = await readBody(req);
  const achvId = String(body?.achievementId || '');
  const achv = ACHIEVEMENTS.find((a) => a.id === achvId);
  if (!achv) { sendJson(res, 404, { error: 'achievement-not-found' }); return; }
  const claimed = db.prepare('SELECT 1 FROM adou_achievements_claimed WHERE account_id = ? AND achv_id = ?').get(s.accountId, achvId);
  if (claimed) { sendJson(res, 400, { error: 'already-claimed' }); return; }
  let cur = 0;
  if (achv.type === 'wave') {
    const bestRow = db.prepare('SELECT MAX(best_wave) AS w FROM adou_records WHERE account_id = ?').get(s.accountId);
    cur = bestRow && bestRow.w ? bestRow.w : 0;
  } else {
    const row = db.prepare('SELECT count FROM adou_achievements WHERE account_id = ? AND achv_type = ?').get(s.accountId, achv.type);
    cur = row ? row.count : 0;
  }
  if (cur < achv.target) { sendJson(res, 400, { error: 'not-completed', progress: cur, target: achv.target }); return; }
  db.prepare('INSERT INTO adou_achievements_claimed (account_id, achv_id, claimed_at) VALUES (?, ?, ?)').run(s.accountId, achvId, new Date().toISOString());
  db.prepare('UPDATE accounts SET coins = coins + ? WHERE id = ?').run(achv.reward, s.accountId);
  const accRow = db.prepare('SELECT coins FROM accounts WHERE id = ?').get(s.accountId);
  sendJson(res, 200, { ok: true, achievementId: achvId, reward: achv.reward, coins: accRow.coins });
  return;
}

  sendJson(res, 404, { error: "API route not found" });
}

const server = http.createServer(async (req, res) => {
  const requestUrl = new URL(req.url, `http://${req.headers.host || "localhost"}`);
  const pathname = decodeURIComponent(requestUrl.pathname);

  try {
    if (pathname.startsWith("/api/")) {
      await handleApi(req, res, pathname);
      return;
    }

    serveStatic(req, res);
  } catch (error) {
    sendJson(res, 400, { error: error.message || "Bad request" });
  }
});

server.listen(port, host, () => {
  console.log(`Mini Playbox backend running at http://${host}:${port}`);
});
