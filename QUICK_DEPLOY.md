# 快速部署指南 - EternLink 到 Cloudflare

## 前提条件

1. ✅ Cloudflare 账号，域名 `eternlink.co` 已配置
2. ✅ 公司钱包私钥（用于设置 Workers Secret）
3. ✅ Node.js 和 npm 已安装

## 快速部署步骤

### 1. 部署后端 API (Cloudflare Workers)

```bash
# 进入 workers 目录
cd workers

# 安装依赖
npm install

# 登录 Cloudflare
wrangler login

# 设置私钥（重要！）
wrangler secret put COMPANY_WALLET_PRIVATE_KEY
# 粘贴你的私钥，然后回车

# 部署到生产环境
npm run deploy:prod
```

部署成功后，你会看到类似这样的输出：
```
✨  Deployed to production
   https://eternlink-api.your-subdomain.workers.dev
```

### 2. 配置 Workers 自定义域名

1. 打开 Cloudflare Dashboard > Workers & Pages
2. 选择 `eternlink-api` worker
3. 进入 Settings > Triggers
4. 在 Custom Domains 中添加：
   - `api.eternlink.co`

### 3. 部署前端 (Cloudflare Pages)

#### 方法 A: 通过 Cloudflare Dashboard（推荐）

1. 打开 Cloudflare Dashboard > Pages
2. 点击 "Create a project" > "Connect to Git"
3. 连接你的 GitHub/GitLab 仓库
4. 配置构建设置：
   - **Framework preset**: Vite
   - **Build command**: `npm run build`
   - **Build output directory**: `dist`
   - **Root directory**: `/` (留空)
5. 环境变量（可选，已默认配置）：
   - `VITE_API_BASE_URL`: `https://api.eternlink.co`
6. 点击 "Save and Deploy"

#### 方法 B: 通过 Wrangler CLI

```bash
# 在项目根目录
npm run build

# 部署到 Cloudflare Pages
wrangler pages deploy dist --project-name=eternlink
```

### 4. 配置 DNS

在 Cloudflare DNS 设置中：

1. **根域名** (`eternlink.co`):
   - 类型: `CNAME`
   - 名称: `@`
   - 目标: `eternlink.pages.dev` (或你的 Pages 部署 URL)
   - 代理: ✅ 启用（橙色云朵）

2. **API 子域名** (`api.eternlink.co`):
   - 类型: `CNAME`
   - 名称: `api`
   - 目标: `eternlink-api.your-subdomain.workers.dev` (你的 Workers URL)
   - 代理: ✅ 启用（橙色云朵）

### 5. 验证部署

1. **测试 API**:
   ```bash
   curl https://api.eternlink.co/health
   ```
   应该返回：
   ```json
   {
     "status": "ok",
     "service": "EternLink API",
     "wallet": "0x1A81508179191CF22Aa94B921394f644982728f4"
   }
   ```

2. **测试前端**:
   访问 `https://eternlink.co`，测试文件上传和上链功能

## 重要信息

- **公司钱包地址**: `0x1A81508179191CF22Aa94B921394f644982728f4`
- **合约地址**: `0x34C2Bd37DcEb505F5528E878A7a5c4C5f8EE736a` (Base Sepolia)
- **API 地址**: `https://api.eternlink.co`
- **前端地址**: `https://eternlink.co`

## 故障排除

### API 不工作
- 检查 Workers 是否部署: `wrangler deployments list`
- 检查日志: `wrangler tail`
- 验证 Secret: `wrangler secret list`

### 前端无法连接 API
- 检查浏览器控制台错误
- 验证 `src/config.ts` 中的 API_BASE_URL
- 检查 CORS 设置

### 域名不工作
- 等待 DNS 传播（最多 24 小时）
- 检查 SSL/TLS 设置（应为 Full/Strict）
- 验证 DNS 记录是否正确

## 持续部署

如果使用 GitHub Actions，已配置自动部署：
- 推送到 `main` 分支会自动部署
- 需要在 GitHub Secrets 中设置：
  - `CLOUDFLARE_API_TOKEN`
  - `CLOUDFLARE_ACCOUNT_ID`

