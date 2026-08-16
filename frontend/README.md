# Mini Playbox Frontend

Mini Playbox 的 React 前端，由原静态原型重构而来。

## 技术栈

- React 19
- TypeScript
- Vite
- Zustand
- lucide-react

## 本地开发

```bash
pnpm install
pnpm dev
```

默认开发地址为 `http://127.0.0.1:5173`。

也可以在仓库根目录使用启动脚本：

```cmd
start.cmd
```

或使用 PowerShell：

```powershell
.\start.ps1
```

停止开发服务器：

```cmd
stop.cmd
```

或使用 PowerShell：

```powershell
.\stop.ps1
```

## 构建

```bash
pnpm build
pnpm preview
```

## 目录

```text
frontend/
├── public/
│   └── assets/       # 游戏封面等静态资源
├── src/
│   ├── components/   # 页面组件
│   ├── data/         # 游戏 Mock 数据
│   ├── store/        # Zustand 状态
│   ├── types/        # TypeScript 类型
│   ├── App.tsx
│   ├── main.tsx
│   └── styles.css
├── package.json
└── vite.config.ts
```
