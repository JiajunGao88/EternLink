# EternLink Cloudflare 部署总结

## ✅ 已完成的工作

### 1. 创建 Cloudflare Workers 后端
- ✅ `workers/src/index.ts` - Workers 主文件，处理区块链交易
- ✅ `workers/wrangler.toml` - Workers 配置文件
- ✅ `workers/package.json` - Workers 依赖配置
- ✅ `workers/tsconfig.json` - TypeScript 配置
- ✅ `workers/README.md` - Workers 使用说明

### 2. 更新前端配置
- ✅ `src/config.ts` - 更新为使用 `https://api.eternlink.co`
- ✅ `src/utils/api.ts` - 已适配新的 API 端点格式

### 3. 部署文档
- ✅ `DEPLOY_CLOUDFLARE.md` - 完整部署指南
- ✅ `QUICK_DEPLOY.md` - 快速部署步骤
- ✅ `CLOUDFLARE_SETUP.md` - 配置检查清单

### 4. CI/CD 配置
- ✅ `.github/workflows/deploy.yml` - GitHub Actions 自动部署

### 5. 配置文件
- ✅ `.gitignore` - 更新忽略规则
- ✅ `workers/.gitignore` - Workers 特定忽略规则
- ✅ `cloudflare-pages.json` - Pages 配置参考

## 🎯 关键配置信息

### 公司钱包
- **地址**: `0x1A81508179191CF22Aa94B921394f644982728f4`
- **私钥**: 需要设置为 Cloudflare Workers Secret

### 智能合约
- **地址**: `0x34C2Bd37DcEb505F5528E878A7a5c4C5f8EE736a`
- **网络**: Base Sepolia Testnet
- **RPC**: `https://sepolia.base.org`

### 域名
- **前端**: `https://eternlink.co`
- **API**: `https://api.eternlink.co`

## 🚀 下一步操作

### 1. 部署 Workers（后端）

```bash
cd workers
wrangler login
wrangler secret put COMPANY_WALLET_PRIVATE_KEY
npm run deploy:prod
```

### 2. 配置 Workers 自定义域名
- Cloudflare Dashboard > Workers & Pages
- 选择 `eternlink-api` worker
- Settings > Triggers > Custom Domains
- 添加: `api.eternlink.co`

### 3. 部署 Pages（前端）

**方法 A: 通过 Dashboard（推荐）**
- Cloudflare Dashboard > Pages
- Create project > Connect to Git
- 配置:
  - Framework: Vite
  - Build command: `npm run build`
  - Output directory: `dist`
- 添加环境变量（可选）: `VITE_API_BASE_URL=https://api.eternlink.co`

**方法 B: 通过 CLI**
```bash
npm run build
wrangler pages deploy dist --project-name=eternlink
```

### 4. 配置 DNS
- `eternlink.co` → CNAME → Pages URL
- `api.eternlink.co` → CNAME → Workers URL
- 两个都启用代理（橙色云朵）

## 📋 API 端点

### GET /health
健康检查
```bash
curl https://api.eternlink.co/health
```

### POST /api/register
注册文件哈希
```json
{
  "fileHash": "0x...",
  "cipher": "AES-256-GCM+PBKDF2(250k, SHA-256)",
  "cid": "",
  "size": 1024,
  "mime": "text/plain"
}
```

### GET /api/verify/:fileHash
验证文件哈希是否存在

## 🔒 安全特性

✅ 私钥存储在 Cloudflare Workers Secrets（加密）
✅ 前端不包含任何钱包信息
✅ 所有区块链操作在服务器端完成
✅ 用户无需连接钱包，一键上链

## 📝 重要文件

- `workers/src/index.ts` - Workers 主代码
- `src/config.ts` - 前端 API 配置
- `DEPLOY_CLOUDFLARE.md` - 详细部署指南
- `QUICK_DEPLOY.md` - 快速部署步骤

## ⚠️ 注意事项

1. **私钥安全**: 私钥必须通过 `wrangler secret` 设置，不要提交到代码库
2. **DNS 传播**: 域名配置后可能需要等待最多 24 小时
3. **测试**: 部署后务必测试 API 和前端功能
4. **监控**: 使用 `wrangler tail` 监控 Workers 日志

## 🎉 完成！

所有代码和配置已准备就绪，可以开始部署到 Cloudflare 了！

