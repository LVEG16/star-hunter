# 星际猎手 - 太空射击游戏

一款赛博朋克风格的网页打飞机游戏，支持玩家登录、全球排行榜和成就系统。

## 本地运行

### 开发模式（前后端分离）

```bash
# 终端1：启动后端API
cd api
npm install
npm run dev

# 终端2：启动前端开发服务器
npm install
npm run dev
# 访问 http://localhost:5173
```

### 生产模式（统一服务）

```bash
# 构建前端 + 启动统一服务器
npm run deploy:local
# 访问 http://localhost:3001
```

## 部署到云平台（免费方案）

### 方案一：Render.com（推荐，免费支持Node.js）

1. 注册 https://render.com 账号（可用GitHub登录）
2. 将代码推送到GitHub仓库
3. 在Render创建新的 Web Service，连接你的GitHub仓库
4. 配置：
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `node api/server.js`
   - **环境变量**: 无需设置
5. 部署完成后获得公开URL，如 `https://star-hunter-xxxx.onrender.com`
6. 分享URL给朋友即可！

### 方案二：Railway.app

1. 注册 https://railway.app
2. New Project → Deploy from GitHub repo
3. 自动检测Node.js，设置Start Command为 `node api/server.js`
4. 部署完成后获得公开URL

### 方案三：本地内网穿透（快速分享）

使用 ngrok 或 localtunnel 将本地服务暴露到公网：

```bash
# 方式1: ngrok
ngrok http 3001

# 方式2: localtunnel（无需安装）
npx localtunnel --port 3001
```

获得公网URL后直接分享给朋友。

## 技术栈

- **前端**: React 18 + TypeScript + Tailwind CSS + Vite + Zustand
- **后端**: Express 4 + better-sqlite3
- **数据库**: SQLite（文件存储，无需额外服务）

## 操作说明

- **WASD / 方向键**: 移动战机
- **自动射击**: 持续开火
- **空格键**: 释放炸弹（清屏）
- **鼠标**: 辅助瞄准

## 游戏特色

- 4种敌机类型 + Boss弹幕战
- 4种道具：散射升级、护盾、炸弹、治疗
- 波次制玩法，每5波出现Boss
- 全球排行榜 + 16个成就系统
- 赛博朋克霓虹视觉风格
