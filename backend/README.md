# Mini Playbox Backend

轻量用户鉴权与静态文件服务，使用 Node.js 内置模块实现，无第三方依赖。

## 启动

```bash
cd backend
node server.mjs
```

默认地址：`http://127.0.0.1:3001`

## 接口

- `GET /api/health`
- `POST /api/auth/anonymous`
- `GET /api/me`
- `PATCH /api/me`

用户数据保存在 `backend/data/users.json`，已加入 `.gitignore`。
