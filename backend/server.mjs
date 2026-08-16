import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const dataDir = path.join(__dirname, "data");
const usersFile = path.join(dataDir, "users.json");
const port = Number(process.env.PORT || 3001);

fs.mkdirSync(dataDir, { recursive: true });

if (!fs.existsSync(usersFile)) {
  fs.writeFileSync(usersFile, "{}", "utf8");
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

function loadUsers() {
  try {
    return JSON.parse(fs.readFileSync(usersFile, "utf8"));
  } catch {
    return {};
  }
}

function saveUsers(users) {
  fs.writeFileSync(usersFile, JSON.stringify(users, null, 2), "utf8");
}

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

function createAnonymousUser(displayName) {
  const id = crypto.randomUUID();
  const token = `mp_${crypto.randomBytes(24).toString("base64url")}`;
  const now = new Date().toISOString();

  return {
    id,
    token,
    displayName: displayName || `游客_${id.slice(0, 4).toUpperCase()}`,
    createdAt: now,
    lastSeenAt: now,
  };
}

function getUserFromRequest(req, users) {
  const auth = req.headers.authorization || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  return token ? users[token] || null : null;
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
    sendJson(res, 200, { ok: true, service: "mini-playbox-backend" });
    return;
  }

  if (pathname === "/api/auth/anonymous" && req.method === "POST") {
    const body = await readBody(req);
    const users = loadUsers();
    const user = createAnonymousUser(body.displayName);
    users[user.token] = user;
    saveUsers(users);
    sendJson(res, 201, { token: user.token, user });
    return;
  }

  if (pathname === "/api/me" && (req.method === "GET" || req.method === "PATCH")) {
    const users = loadUsers();
    const user = getUserFromRequest(req, users);

    if (!user) {
      sendJson(res, 401, { error: "Unauthorized" });
      return;
    }

    if (req.method === "PATCH") {
      const body = await readBody(req);
      if (body.displayName) {
        user.displayName = body.displayName.slice(0, 24);
      }
      user.lastSeenAt = new Date().toISOString();
      users[user.token] = user;
      saveUsers(users);
    }

    sendJson(res, 200, {
      id: user.id,
      displayName: user.displayName,
      createdAt: user.createdAt,
      lastSeenAt: user.lastSeenAt,
    });
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
