# Mini Playbox Backend

轻量用户鉴权与静态文件服务，使用 Node.js 内置模块和 SQLite 实现，无第三方依赖。

## 启动

```bash
cd backend
node server.mjs
```

默认地址：`http://127.0.0.1:3001`

## 接口

- `GET /api/health`
- `POST /api/auth/anonymous`
- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/me`
- `PATCH /api/me`
- `POST /api/adou/best-wave`
- `GET /api/adou/leaderboard`

用户数据保存在 `backend/data/app.db`，数据库文件已加入 `.gitignore`。
