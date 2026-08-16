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
`);

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
  return {
    id: session.id,
    displayName: session.displayName,
    createdAt: session.createdAt,
    lastSeenAt: session.lastSeenAt,
    isGuest: !session.accountId,
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
