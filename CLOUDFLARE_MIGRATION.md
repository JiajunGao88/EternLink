# EternLink Cloudflare 迁移进度

## 🎯 目标
将 EternLink 从 Docker + PostgreSQL + Express 迁移到 Cloudflare 全家桶：
- **Cloudflare Workers** - Serverless 后端 API
- **Cloudflare D1** - SQLite 数据库（替代 PostgreSQL）
- **Cloudflare R2** - 对象存储（存储加密文件）
- **Cloudflare KV** - 键值存储（会话/缓存）
- **Cloudflare Pages** - 静态前端托管

## ✅ 已完成

### Phase 1: 数据库迁移
- [x] 创建 Cloudflare D1 数据库 `eternlink-db`
  - Database ID: `8a2de35e-94ed-4a5c-bb35-274fbc7deb5b`
  - Region: ENAM (东北美)
- [x] 将 Prisma schema 转换为 Drizzle ORM schema
  - 文件: `workers-api/src/db/schema.ts`
- [x] 执行数据库迁移，创建所有表：
  - users, verification_codes, login_history
  - heartbeats, beneficiaries, notification_logs
  - beneficiary_links, death_claims, death_verification_events
  - death_claim_notifications, encrypted_files

### Phase 2: API 迁移
- [x] 创建新的 Workers 项目结构 `workers-api/`
- [x] 使用 Hono 框架（轻量、适合 Workers）
- [x] 使用 Drizzle ORM（替代 Prisma）
- [x] 迁移 Auth API:
  - POST `/api/auth/register` - 注册
  - POST `/api/auth/login` - 登录
  - POST `/api/auth/verify-email` - 验证邮箱
  - POST `/api/auth/resend-code` - 重发验证码
  - POST `/api/auth/request-password-reset` - 请求密码重置
  - POST `/api/auth/reset-password` - 重置密码
- [x] 迁移 User API:
  - GET `/api/user/profile` - 获取用户信息
  - PUT `/api/user/profile` - 更新用户信息
- [x] 迁移 Heartbeat API:
  - GET `/api/heartbeat` - 获取 heartbeats
  - POST `/api/heartbeat` - 创建 heartbeat
  - POST `/api/heartbeat/:id/checkin` - 签到
- [x] 迁移 Beneficiary API:
  - GET `/api/beneficiary/linked` - 获取关联的受益人
  - GET `/api/beneficiary/linked-users` - 获取关联的用户
  - POST `/api/beneficiary/death-claim` - 发起死亡声明
- [x] 迁移 Blockchain API:
  - POST `/api/blockchain/register` - 注册文件到链上
  - GET `/api/blockchain/verify/:fileHash` - 验证文件
  - GET `/api/blockchain/keyshare/:fileHash` - 获取 keyShare3
- [x] 创建 Files API (准备好等 R2 启用):
  - GET `/api/files` - 列出文件
  - POST `/api/files/upload` - 上传文件
  - GET `/api/files/download/:fileHash` - 下载文件
  - DELETE `/api/files/:fileHash` - 删除文件

### Phase 3: 存储设置 ✅
- [x] 创建 R2 bucket `eternlink-files`
- [x] 创建 KV namespace `eternlink-sessions`
  - ID: `5432646a1ea34dce94a1860a9b945487`

### Phase 4: 定时任务 ✅
- [x] 配置 Cron Triggers 用于 heartbeat 检查
  - 每天 UTC 0:00 运行 (`0 0 * * *`)
- [x] 迁移 heartbeat 检查逻辑到 scheduled handler

### Phase 5: 前端更新 ✅
- [x] 更新 `src/config.ts` 指向新的 Workers API
- [x] 更新所有组件的 API 调用路径
- [x] 更新 `src/utils/api.ts`
- [x] 前端构建成功

### Phase 6: 部署 ✅
- [x] 设置生产环境 secrets
  - JWT_SECRET ✅
  - COMPANY_WALLET_PRIVATE_KEY ✅
- [x] 部署 Workers 到生产环境
- [ ] 配置自定义域名 (可选)
- [ ] 部署前端到 Cloudflare Pages (可选)

## 📋 可选优化

### 后续优化
- [ ] 配置自定义域名 (api.eternlink.co)
- [ ] 部署前端到 Cloudflare Pages
- [ ] 集成 Resend/SendGrid 发送真实邮件
- [ ] 集成生物识别服务

## 📁 新项目结构

```
workers-api/
├── drizzle/
│   └── migrations/
│       └── 0000_foamy_overlord.sql   # 数据库迁移
├── src/
│   ├── db/
│   │   ├── index.ts                  # 数据库连接
│   │   └── schema.ts                 # Drizzle schema
│   ├── middleware/
│   ├── routes/
│   │   ├── auth.ts                   # 认证路由
│   │   ├── user.ts                   # 用户路由
│   │   ├── heartbeat.ts              # Heartbeat 路由
│   │   ├── beneficiary.ts            # 受益人路由
│   │   ├── blockchain.ts             # 区块链路由
│   │   └── files.ts                  # 文件路由
│   ├── utils/
│   │   └── auth.ts                   # JWT 等工具
│   ├── index.ts                      # 主入口
│   └── types.ts                      # 类型定义
├── drizzle.config.ts
├── package.json
├── tsconfig.json
└── wrangler.toml                     # Cloudflare 配置
```

## 🚀 本地开发

```bash
# 进入 workers-api 目录
cd workers-api

# 安装依赖
npm install

# 启动本地开发服务器
npm run dev
# API 将在 http://127.0.0.1:8787 运行

# 生成数据库迁移
npm run db:generate

# 应用迁移到远程 D1
npm run db:migrate

# 部署到 Cloudflare
npm run deploy
```

## 🔑 Secrets 配置

需要设置的 secrets：

```bash
# JWT 密钥
wrangler secret put JWT_SECRET

# 公司钱包私钥（用于区块链交易）
wrangler secret put COMPANY_WALLET_PRIVATE_KEY

# 生产环境
wrangler secret put JWT_SECRET --env production
wrangler secret put COMPANY_WALLET_PRIVATE_KEY --env production
```

## 📊 Cloudflare 资源

| 资源 | 名称 | ID/URL |
|------|------|---------|
| D1 Database | eternlink-db | 8a2de35e-94ed-4a5c-bb35-274fbc7deb5b |
| R2 Bucket | eternlink-files | ✅ 已创建 |
| KV Namespace | eternlink-sessions | 5432646a1ea34dce94a1860a9b945487 |
| Worker (Dev) | eternlink-api | https://eternlink-api.garygao922.workers.dev |
| Worker (Prod) | eternlink-api-production | https://eternlink-api-production.garygao922.workers.dev |

## ⚠️ 注意事项

1. **R2 需要手动启用** - 在 Cloudflare Dashboard → R2 启用
2. **KV 需要创建** - 使用 `wrangler kv namespace create`
3. **Secrets 必须设置** - JWT_SECRET, COMPANY_WALLET_PRIVATE_KEY
4. **邮件服务** - 需要集成 Resend 或 SendGrid
5. **生物识别** - 需要集成 Azure Cognitive Services

## 🔗 相关文档

- [Cloudflare Workers 文档](https://developers.cloudflare.com/workers/)
- [Cloudflare D1 文档](https://developers.cloudflare.com/d1/)
- [Drizzle ORM 文档](https://orm.drizzle.team/)
- [Hono 框架文档](https://hono.dev/)

