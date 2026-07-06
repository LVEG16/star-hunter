## 1. 架构设计

```mermaid
flowchart TD
    "前端层(React)" --> "Canvas游戏引擎"
    "前端层(React)" --> "UI页面层"
    "前端层(React)" --> "API客户端"
    "Canvas游戏引擎" --> "游戏循环(GameLoop)"
    "游戏循环(GameLoop)" --> "渲染系统(Renderer)"
    "游戏循环(GameLoop)" --> "实体管理(EntityManager)"
    "游戏循环(GameLoop)" --> "碰撞检测(Collision)"
    "游戏循环(GameLoop)" --> "粒子系统(Particles)"
    "游戏循环(GameLoop)" --> "统计追踪(StatsTracker)"
    "UI页面层" --> "登录界面"
    "UI页面层" --> "主菜单"
    "UI页面层" --> "HUD"
    "UI页面层" --> "结算界面"
    "UI页面层" --> "排行榜页面"
    "UI页面层" --> "个人资料页面"
    "API客户端" --> "后端API(Express)"
    "后端API(Express)" --> "路由层"
    "路由层" --> "玩家路由"
    "路由层" --> "分数路由"
    "路由层" --> "排行榜路由"
    "路由层" --> "资料路由"
    "路由层" --> "SQLite数据库"
    "前端层(React)" --> "本地存储(LocalStorage)"
```

## 2. 技术说明
- 前端：React 18 + Tailwind CSS 3 + Vite + Zustand + React Router
- 初始化工具：Vite
- 后端：Express 4 + better-sqlite3
- 数据库：SQLite（文件存储，无需额外服务）
- 本地存储：LocalStorage 保存玩家ID和昵称

## 3. 路由定义
| 路由 | 用途 |
|------|------|
| / | 游戏主页面（登录/主菜单/游戏/结算） |
| /leaderboard | 全球排行榜页面 |
| /profile/:id | 玩家个人资料页面（自己或他人） |

## 4. API定义

### 4.1 玩家API
```typescript
// 注册/登录玩家
POST /api/players
Request: { nickname: string, avatar: number }
Response: { id: number, nickname: string, avatar: number, createdAt: string }

// 获取玩家信息
GET /api/players/:id
Response: { id, nickname, avatar, createdAt, rank, highestScore }
```

### 4.2 分数API
```typescript
// 提交分数
POST /api/scores
Request: {
  playerId: number,
  score: number,
  wave: number,
  kills: number,
  bossKills: number,
  powerupsUsed: number,
  playTime: number  // 秒
}
Response: { success: boolean, rank: number, isNewRecord: boolean }
```

### 4.3 排行榜API
```typescript
// 获取Top100
GET /api/leaderboard?limit=100
Response: Array<{
  rank: number,
  playerId: number,
  nickname: string,
  avatar: number,
  score: number,
  wave: number,
  createdAt: string
}>

// 获取玩家排名
GET /api/leaderboard/rank/:playerId
Response: { rank: number, totalPlayers: number }
```

### 4.4 个人资料API
```typescript
// 获取玩家详细统计
GET /api/profile/:playerId
Response: {
  player: { id, nickname, avatar, createdAt },
  stats: {
    totalGames: number,
    highestScore: number,
    highestWave: number,
    totalKills: number,
    totalBossKills: number,
    totalPowerupsUsed: number,
    totalPlayTime: number
  },
  achievements: Array<{ id: string, name: string, unlocked: boolean, unlockedAt?: string }>
}
```

## 5. 服务器架构图

```mermaid
flowchart TD
    "Express服务器" --> "中间件层"
    "中间件层" --> "CORS"
    "中间件层" --> "JSON解析"
    "中间件层" --> "路由分发"
    "路由分发" --> "玩家路由(PlayersRouter)"
    "路由分发" --> "分数路由(ScoresRouter)"
    "路由分发" --> "排行榜路由(LeaderboardRouter)"
    "路由分发" --> "资料路由(ProfileRouter)"
    "玩家路由(PlayersRouter)" --> "数据库查询层"
    "分数路由(ScoresRouter)" --> "数据库查询层"
    "排行榜路由(LeaderboardRouter)" --> "数据库查询层"
    "资料路由(ProfileRouter)" --> "数据库查询层"
    "数据库查询层" --> "SQLite数据库"
```

## 6. 数据模型

### 6.1 数据模型定义

```mermaid
erDiagram
    players ||--o{ scores : has
    players ||--|| player_stats : has
    players {
        int id PK
        string nickname
        int avatar
        string created_at
        string last_login
    }
    scores {
        int id PK
        int player_id FK
        int score
        int wave
        int kills
        int boss_kills
        int powerups_used
        int play_time
        string created_at
    }
    player_stats {
        int player_id PK_FK
        int total_games
        int highest_score
        int highest_wave
        int total_kills
        int total_boss_kills
        int total_powerups_used
        int total_play_time
        string updated_at
    }
```

### 6.2 数据定义语言

```sql
-- 玩家表
CREATE TABLE IF NOT EXISTS players (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nickname TEXT NOT NULL,
    avatar INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    last_login TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 分数记录表
CREATE TABLE IF NOT EXISTS scores (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    player_id INTEGER NOT NULL,
    score INTEGER NOT NULL,
    wave INTEGER NOT NULL,
    kills INTEGER NOT NULL,
    boss_kills INTEGER NOT NULL,
    powerups_used INTEGER NOT NULL,
    play_time INTEGER NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (player_id) REFERENCES players(id)
);

-- 玩家统计表（聚合数据）
CREATE TABLE IF NOT EXISTS player_stats (
    player_id INTEGER PRIMARY KEY,
    total_games INTEGER NOT NULL DEFAULT 0,
    highest_score INTEGER NOT NULL DEFAULT 0,
    highest_wave INTEGER NOT NULL DEFAULT 0,
    total_kills INTEGER NOT NULL DEFAULT 0,
    total_boss_kills INTEGER NOT NULL DEFAULT 0,
    total_powerups_used INTEGER NOT NULL DEFAULT 0,
    total_play_time INTEGER NOT NULL DEFAULT 0,
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (player_id) REFERENCES players(id)
);

-- 索引优化
CREATE INDEX IF NOT EXISTS idx_scores_score ON scores(score DESC);
CREATE INDEX IF NOT EXISTS idx_scores_player ON scores(player_id);
CREATE INDEX IF NOT EXISTS idx_scores_created ON scores(created_at DESC);
```
