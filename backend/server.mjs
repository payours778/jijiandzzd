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
  res.writeHead(200, {
    "Content-Type": mimeTypes[ext] || "application/octet-stream",
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

server.listen(port, "127.0.0.1", () => {
  console.log(`Mini Playbox backend running at http://127.0.0.1:${port}`);
});
