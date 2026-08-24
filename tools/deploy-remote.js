// 自动部署脚本：本地 build -> git push -> SFTP -> 服务器 pm2 restart
// 用法：node tools/deploy-remote.js [commit-message]
//
// 服务器密码不会硬编码到脚本里，统一从 tools/deploy.config.json 读取。
// 该配置文件已加入 .gitignore，提交到仓库时不会带出密码。

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

require("module").globalPaths.push("D:/wzj/node_modules");
const { Client } = require("ssh2");

const ROOT = path.resolve(__dirname, "..");
const FRONTEND = path.join(ROOT, "frontend");
const BACKEND = path.join(ROOT, "backend");
const DIST = path.join(FRONTEND, "dist");
const TOOLS = path.dirname(__filename);
const CONFIG_FILE = path.join(TOOLS, "deploy.config.json");
const LOG_FILE = path.join(TOOLS, "deploy.log");

if (!fs.existsSync(CONFIG_FILE)) {
  console.error("缺少部署配置: " + CONFIG_FILE);
  process.exit(1);
}
const CFG = JSON.parse(fs.readFileSync(CONFIG_FILE, "utf8"));
const REMOTE = {
  host: CFG.host,
  port: CFG.port || 22,
  username: CFG.username,
  password: CFG.password,
  root: CFG.remoteRoot,
  frontendDist: CFG.frontendDist,
  backendDir: CFG.backendDir,
  processName: CFG.processName || "mini-playbox",
};

function logLine(line) {
  const stamped = "[" + new Date().toISOString() + "] " + line;
  console.log(stamped);
  try { fs.appendFileSync(LOG_FILE, stamped + "\n"); } catch (e) {}
}

function sh(cmd, cwd) {
  logLine("$ " + cmd);
  return execSync(cmd, { cwd: cwd || ROOT, stdio: ["ignore", "pipe", "pipe"], encoding: "utf8" }).trim();
}

function buildCommitMessage(arg) {
  if (arg && arg.trim()) return arg.trim();
  const stat = sh("git diff --stat HEAD", ROOT);
  const lines = stat.split(/\r?\n/).filter(Boolean).slice(0, 8).map(l => "  " + l);
  const summary = lines.length ? lines.join("\n") : "  (无文件变更)";
  const ts = new Date().toISOString().replace("T", " ").slice(0, 16);
  return "chore: 自动部署 " + ts + "\n\n" + summary;
}

function listFiles(dir, base, ignore) {
  const results = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (let i = 0; i < entries.length; i++) {
    const e = entries[i];
    if (ignore.some(re => re.test(e.name))) continue;
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      const sub = listFiles(full, base, ignore);
      for (let j = 0; j < sub.length; j++) results.push(sub[j]);
    } else {
      results.push(path.relative(base, full).replace(/\\/g, "/"));
    }
  }
  return results;
}

function listDirs(files) {
  const set = new Set();
  for (let i = 0; i < files.length; i++) {
    const f = files[i];
    const idx = f.lastIndexOf("/");
    if (idx < 0) continue;
    let p = f.slice(0, idx);
    while (p.length > 0) { set.add(p); const j = p.lastIndexOf("/"); if (j < 0) break; p = p.slice(0, j); }
  }
  return Array.from(set);
}

function sftpUploadDir(conn, sftp, localDir, remoteDir, ignore) {
  return new Promise((resolve, reject) => {
    const files = listFiles(localDir, localDir, ignore);
    logLine("SFTP 上传 " + localDir + " -> " + remoteDir + "，共 " + files.length + " 个文件");
    // 先用 sshExec 一次性 mkdir -p 所有父目录（流式，比 sftp.mkdir 递归快）
    const dirs = listDirs(files.map(f => remoteDir + "/" + f));
    if (dirs.length > 0) {
      const quoted = dirs.map(d => String.fromCharCode(34) + d + String.fromCharCode(34)); const cmd = "mkdir -p " + quoted.join(" ");
      logLine("  准备 " + dirs.length + " 个目录");
      sshExec(conn, cmd).then(() => startUpload()).catch(reject);
    } else {
      startUpload();
    }
    function startUpload() {
      let i = 0;
      function next() {
        if (i >= files.length) return resolve();
        const rel = files[i++];
        const remote = remoteDir + "/" + rel;
        sftp.fastPut(path.join(localDir, rel).replace(/\\/g, "/"), remote, (err) => {
          if (err) return reject(new Error("上传失败 " + rel + ": " + err.message));
          if (i % 50 === 0 || i === files.length) logLine("  进度 " + i + "/" + files.length);
          next();
        });
      }
      next();
    }
  });
}

function sftpRemoveDir(sftp, remoteDir) {
  return new Promise((resolve) => { sftp.rmdir(remoteDir, { recursive: true }, () => resolve()); });
}

function sftpUploadFile(sftp, localFile, remoteFile) {
  return new Promise((resolve, reject) => {
    sftp.fastPut(localFile, remoteFile, (err) => err ? reject(err) : resolve());
  });
}

function sshExec(conn, cmd) {
  return new Promise((resolve, reject) => {
    conn.exec(cmd, (err, stream) => {
      if (err) return reject(err);
      let out = "";
      stream.on("data", d => out += d.toString());
      stream.stderr.on("data", d => out += d.toString());
      stream.on("close", (code) => {
        logLine("  exit=" + code + "\n" + out);
        if (code !== 0) return reject(new Error("命令失败: " + cmd));
        resolve(out);
      });
    });
  });
}

function sshConnect() {
  return new Promise((resolve, reject) => {
    const conn = new Client();
    conn.on("ready", () => resolve(conn));
    conn.on("error", reject);
    conn.connect({
      host: REMOTE.host, port: REMOTE.port,
      username: REMOTE.username, password: REMOTE.password,
      readyTimeout: 15000,
    });
  });
}

async function upload(conn) {
  await new Promise((resolve, reject) => {
    conn.sftp((err, sftp) => {
      if (err) return reject(err);
      (async () => {
        try {
          // 用 ssh exec + rm -rf 比 sftp.rmdir 递归快 100 倍以上
          logLine("清理远程目录 " + REMOTE.frontendDist);
          await sshExec(conn, "rm -rf " + REMOTE.frontendDist + " && mkdir -p " + REMOTE.frontendDist);
          logLine("  rm -rf 完成");
        } catch (e) { logLine("  清理失败（忽略）: " + e.message); }
        await sftpUploadDir(conn, sftp, DIST, REMOTE.frontendDist, []);
        await sftpUploadFile(
          sftp,
          path.join(BACKEND, "server.mjs").replace(/\\/g, "/"),
          REMOTE.backendDir + "/server.mjs"
        );
        await sftpUploadFile(
          sftp,
          path.join(BACKEND, "package.json").replace(/\\/g, "/"),
          REMOTE.backendDir + "/package.json"
        );
        sftp.end();
        resolve();
      })().catch(reject);
    });
  });
}

async function restartAndVerify(conn) {
  const cmds = [
    "cd " + REMOTE.backendDir,
    "(pm2 describe " + REMOTE.processName + " >/dev/null 2>&1 && pm2 restart " + REMOTE.processName + " --update-env || (PORT=3001 pm2 start server.mjs --name " + REMOTE.processName + " --update-env))",
    "pm2 save",
    "(nginx -t >/dev/null 2>&1 && systemctl reload nginx) || true",
    "sleep 2",
    'echo "--- HEALTH ---"',
    'curl -s -o /dev/null -w "API HTTP %{http_code}\\n" http://127.0.0.1:3001/api/health',
    'curl -s -o /dev/null -w "WEB HTTP %{http_code}\\n" http://127.0.0.1/',
    "pm2 status | head -8"
  ];
  await sshExec(conn, cmds.join(" && "));
}

async function main() {
  const arg = process.argv.slice(2).join(" ");
  logLine("=== 部署开始 ===");
  const status = sh("git status --porcelain", ROOT);
  logLine("工作区变更:\n" + (status || "  (干净)"));

  if (status) {
    const msg = buildCommitMessage(arg);
    sh("git add -A", ROOT);
    sh('git commit -m "' + msg.replace(/"/g, '\\"') + '"', ROOT);
  } else {
    logLine("无变更需要 commit");
  }

  sh("git push origin aaa", ROOT);

  if (!fs.existsSync(DIST)) logLine("本地 dist 不存在，先 build");
  else logLine("本地 dist 已存在，重新 build 保证最新");
  sh("npm run build", FRONTEND);
  if (!fs.existsSync(path.join(DIST, "index.html"))) throw new Error("build 失败，dist 缺少 index.html");

  const conn = await sshConnect();
  try {
    await upload(conn);
    await restartAndVerify(conn);
  } finally {
    conn.end();
  }
  logLine("=== 部署完成 ===");
}

main().catch(err => {
  logLine("!!! 部署失败: " + err.message);
  logLine("STACK: " + (err.stack || "(none)"));
  process.exit(1);
});
