# Cloudflare 部署完整配置说明

## 项目结构

```
EternLink/
├── workers/              # Cloudflare Workers 后端 API
│   ├── src/
│   │   └── index.ts     # Workers 主文件
│   ├── wrangler.toml    # Workers 配置
│   └── package.json      # Workers 依赖
├── src/                  # React 前端
│   ├── config.ts        # API 配置（指向 api.eternlink.co）
│   └── ...
└── dist/                 # 构建输出（部署到 Pages）
```

## 配置信息

### 公司钱包
- **地址**: `0x1A81508179191CF22Aa94B921394f644982728f4` (公开，安全)
- **私钥**: 存储在 Cloudflare Workers Secrets 中（加密）

### 智能合约
- **地址**: `0x34C2Bd37DcEb505F5528E878A7a5c4C5f8EE736a`
- **网络**: Base Sepolia Testnet
- **RPC**: `https://sepolia.base.org`

### 域名配置
- **前端**: `https://eternlink.co`
- **API**: `https://api.eternlink.co`

## 部署检查清单

### 后端 (Workers)

- [ ] 安装依赖: `cd workers && npm install`
- [ ] 登录 Cloudflare: `wrangler login`
- [ ] 设置私钥 Secret: `wrangler secret put COMPANY_WALLET_PRIVATE_KEY`
- [ ] 部署 Worker: `npm run deploy:prod`
- [ ] 配置自定义域名: `api.eternlink.co`
- [ ] 测试健康检查: `curl https://api.eternlink.co/health`

### 前端 (Pages)

- [ ] 构建项目: `npm run build`
- [ ] 部署到 Pages（通过 Dashboard 或 CLI）
- [ ] 配置自定义域名: `eternlink.co`
- [ ] 设置环境变量（可选）: `VITE_API_BASE_URL=https://api.eternlink.co`
- [ ] 测试前端: 访问 `https://eternlink.co`

### DNS 配置

- [ ] `eternlink.co` → CNAME → Pages 部署 URL
- [ ] `api.eternlink.co` → CNAME → Workers 部署 URL
- [ ] 两个记录都启用代理（橙色云朵）

## API 端点

### GET /health
健康检查，返回服务状态和钱包地址。

### POST /api/register
注册文件哈希到区块链。

**请求体:**
```json
{
  "fileHash": "0x...",
  "cipher": "AES-256-GCM+PBKDF2(250k, SHA-256)",
  "cid": "",
  "size": 1024,
  "mime": "text/plain"
}
```

**响应:**
```json
{
  "success": true,
  "txHash": "0x...",
  "blockNumber": 12345
}
```

### GET /api/verify/:fileHash
检查文件哈希是否存在。

**响应:**
```json
{
  "success": true,
  "exists": true
}
```

## 安全说明

✅ **私钥安全**: 
- 私钥存储在 Cloudflare Workers Secrets 中
- 使用加密存储，不会暴露在代码中
- 只有通过 `wrangler secret` 命令可以访问

✅ **CORS 配置**:
- Workers 已配置 CORS 头
- 允许来自任何源的请求（生产环境可限制为 eternlink.co）

✅ **无前端暴露**:
- 前端不包含任何钱包信息
- 所有区块链操作在 Workers 中完成
- 用户无需连接钱包

## 开发环境

### 本地开发 Workers

```bash
cd workers
npm run dev
# Worker 运行在 http://localhost:8787
```

### 本地开发前端

```bash
npm run dev
# 前端运行在 http://localhost:5173
# 会自动连接到 http://localhost:8787 (如果 Workers 在运行)
```

## 故障排除

### Workers 部署失败
- 检查 `wrangler.toml` 配置
- 确认已登录: `wrangler whoami`
- 检查 Secret 是否设置: `wrangler secret list`

### Pages 构建失败
- 检查 `package.json` 中的构建脚本
- 确认所有依赖已安装
- 查看构建日志中的错误信息

### API 调用失败
- 检查 Workers 日志: `wrangler tail`
- 验证 CORS 配置
- 确认 API URL 在 `src/config.ts` 中正确

### 域名无法访问
- 等待 DNS 传播（最多 24 小时）
- 检查 DNS 记录是否正确
- 验证 SSL/TLS 证书状态

## 更新部署

### 更新 Workers
```bash
cd workers
npm run deploy:prod
```

### 更新 Pages
```bash
npm run build
wrangler pages deploy dist --project-name=eternlink
```

或通过 Git 推送自动部署（如果已配置 CI/CD）。

