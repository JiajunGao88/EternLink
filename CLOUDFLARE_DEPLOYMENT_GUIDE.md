# Cloudflare 部署问题修复指南

## 问题分析

最近的 commits 在 GitHub Actions 中显示 Cloudflare 错误，主要原因是：

1. **GitHub Secrets 未配置** - 缺少必要的 API tokens
2. **Workers Secrets 管理方式错误** - `COMPANY_WALLET_PRIVATE_KEY` 需要特殊处理
3. **部署流程不完整** - Workers 和 Pages 的部署配置不匹配

## 完整解决方案

### 步骤 1: 配置 GitHub Repository Secrets

访问你的 GitHub 仓库：

```
https://github.com/JiajunGao88/EternLink/settings/secrets/actions
```

添加以下 secrets：

1. **CLOUDFLARE_API_TOKEN**
   - 获取方式: Cloudflare Dashboard → My Profile → API Tokens → Create Token
   - 权限: Edit Cloudflare Workers
   - 值: 复制生成的 token

2. **CLOUDFLARE_ACCOUNT_ID**
   - 获取方式: Cloudflare Dashboard → 右侧栏
   - 值: 类似 `32 个字符的 ID`

3. **COMPANY_WALLET_PRIVATE_KEY**
   - 来源: MetaMask 或其他钱包
   - 格式: `0x` + 64 个十六进制字符（总共 66 字符）
   - ⚠️ **注意**: 这是敏感信息，确保安全保存

### 步骤 2: 手动设置 Workers Secret（推荐方式）

由于 Cloudflare Workers secrets 的特殊性，建议手动设置：

```bash
# 安装 wrangler (如果还没安装)
npm install -g wrangler

# 登录 Cloudflare
wrangler login

# 切换到 workers 目录
cd workers

# 设置 secret
wrangler secret put COMPANY_WALLET_PRIVATE_KEY --env production
# 粘贴你的私钥（66 字符，以 0x 开头）
```

### 步骤 3: 验证配置

检查 secret 是否设置成功：

```bash
# 查看已部署的 Workers
wrangler deployments list --env production

# 测试部署
wrangler deploy --env production

# 查看实时日志
wrangler tail eternlink-api-production
```

### 步骤 4: 更新 GitHub Actions 配置（可选）

如果你想通过 GitHub Actions 自动更新 Workers secret，可以使用以下方式：

**方法 A: 使用 wrangler-action 的 secrets 参数**

```yaml
- name: Deploy to Cloudflare Workers
  uses: cloudflare/wrangler-action@v3
  with:
    apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
    accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
    workingDirectory: ./workers
    command: deploy --env production
    secrets: |
      COMPANY_WALLET_PRIVATE_KEY
  env:
    COMPANY_WALLET_PRIVATE_KEY: ${{ secrets.COMPANY_WALLET_PRIVATE_KEY }}
```

**方法 B: 手动使用 wrangler secret 命令**

```yaml
- name: Set Workers Secret
  working-directory: ./workers
  run: |
    echo "${{ secrets.COMPANY_WALLET_PRIVATE_KEY }}" | wrangler secret put COMPANY_WALLET_PRIVATE_KEY --env production
  env:
    CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
    CLOUDFLARE_ACCOUNT_ID: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}

- name: Deploy to Cloudflare Workers
  uses: cloudflare/wrangler-action@v3
  with:
    apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
    accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
    workingDirectory: ./workers
    command: deploy --env production
```

## 常见错误及解决方案

### 错误 1: "API token could not be verified"

**原因**: `CLOUDFLARE_API_TOKEN` 未设置或无效

**解决方案**:
1. 在 Cloudflare Dashboard 重新生成 API Token
2. 确保 token 有 "Edit Cloudflare Workers" 权限
3. 在 GitHub 中更新 `CLOUDFLARE_API_TOKEN` secret

### 错误 2: "Account ID is required"

**原因**: `CLOUDFLARE_ACCOUNT_ID` 未设置

**解决方案**:
1. 在 Cloudflare Dashboard 找到 Account ID（右侧栏）
2. 在 GitHub 中添加 `CLOUDFLARE_ACCOUNT_ID` secret

### 错误 3: "Invalid private key"

**原因**: Workers 运行时 `COMPANY_WALLET_PRIVATE_KEY` 未设置或格式错误

**解决方案**:
1. 检查私钥格式：必须是 66 个字符（`0x` + 64 个十六进制字符）
2. 使用 `wrangler secret put` 重新设置
3. 确保没有多余的空格或换行符

### 错误 4: "Worker not found"

**原因**: Worker 名称不匹配

**解决方案**:
查看 `wrangler.toml` 中的配置：
```toml
[env.production]
name = "eternlink-api-production"
```

使用正确的 worker 名称：
```bash
wrangler tail eternlink-api-production
# 注意：不需要 --env production 参数
```

## 部署验证

部署成功后，验证各个服务：

### 1. 验证 Cloudflare Pages（前端）

```bash
curl https://eternlink.pages.dev
# 应该返回前端页面
```

### 2. 验证 Cloudflare Workers（API）

```bash
# Health check
curl https://api.eternlink.co/health
# 应该返回: {"status":"ok","service":"EternLink API","wallet":"0x1A81508179191CF22Aa94B921394f644982728f4"}

# 测试文件注册
curl -X POST https://api.eternlink.co/api/register \
  -H "Content-Type: application/json" \
  -d '{"fileHash":"0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef","cipher":"AES-256-GCM","cid":"QmTest","size":1024,"mime":"text/plain"}'
```

### 3. 查看部署日志

```bash
# Cloudflare Dashboard
# Workers & Pages → eternlink-api-production → Logs

# 或者使用 CLI
cd workers
wrangler tail eternlink-api-production
```

## 推荐的工作流程

### 首次部署

1. 手动使用 `wrangler` 部署并设置所有 secrets
2. 验证 Worker 运行正常
3. 配置 GitHub Secrets
4. 测试 GitHub Actions 自动部署

### 日常开发

1. 本地开发和测试
2. Push 到 `main` 分支
3. GitHub Actions 自动触发部署
4. 验证部署结果

### 故障排查

1. 查看 GitHub Actions 日志
2. 查看 Cloudflare Workers 日志
3. 使用 `wrangler tail` 实时监控
4. 检查 secrets 配置

## 安全建议

1. **私钥管理**
   - ⚠️ 永远不要将私钥提交到代码仓库
   - ⚠️ 使用 GitHub Secrets 存储敏感信息
   - ⚠️ 定期轮换 API tokens

2. **环境隔离**
   - 生产环境使用独立的钱包
   - 测试环境使用 testnet 钱包
   - 不要在多个环境共享私钥

3. **访问控制**
   - 限制 GitHub Actions secrets 访问权限
   - 使用 Cloudflare API Token 最小权限原则
   - 定期审查部署日志

## 参考链接

- [Cloudflare Workers 文档](https://developers.cloudflare.com/workers/)
- [Wrangler CLI 文档](https://developers.cloudflare.com/workers/wrangler/)
- [GitHub Actions Secrets](https://docs.github.com/en/actions/security-guides/encrypted-secrets)
- [ethers.js 文档](https://docs.ethers.org/)

## 需要帮助？

如果问题仍然存在：

1. 查看 GitHub Actions 日志: `https://github.com/JiajunGao88/EternLink/actions`
2. 查看 Cloudflare Workers 日志: Cloudflare Dashboard → Workers & Pages
3. 使用 `wrangler tail` 查看实时日志
4. 检查所有 secrets 是否正确配置
