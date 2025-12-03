# 修复私钥设置问题

## 问题说明

你目前有两个 Workers：
1. `eternlink-api` - 有私钥 Secret，但没有自定义域名
2. `eternlink-api-production` - 有自定义域名 `api.eternlink.co`，但没有私钥 Secret

**实际运行的是 `eternlink-api-production`**，所以需要将私钥设置到这个 Worker。

## 解决方案

### 方法 1：将私钥设置到正确的 Worker（推荐）

```bash
cd workers

# 设置私钥到 eternlink-api-production
wrangler secret put COMPANY_WALLET_PRIVATE_KEY --env production
```

然后按提示输入你的私钥。

### 方法 2：删除旧的 Worker，统一使用一个

如果你想统一使用 `eternlink-api-production`：

1. **删除旧的 `eternlink-api` Worker**：
   - 在 Cloudflare Dashboard > Workers & Pages
   - 找到 `eternlink-api`，点击删除

2. **确保私钥在 `eternlink-api-production`**：
   ```bash
   cd workers
   wrangler secret put COMPANY_WALLET_PRIVATE_KEY --env production
   ```

### 方法 3：使用默认环境（不使用 --env production）

如果你想使用默认的 `eternlink-api` 名称：

1. **将自定义域名从 `eternlink-api-production` 移到 `eternlink-api`**：
   - Cloudflare Dashboard > Workers & Pages > `eternlink-api-production`
   - Settings > Triggers > Custom Domains > 删除 `api.eternlink.co`
   - 然后到 `eternlink-api` > Settings > Triggers > Custom Domains > 添加 `api.eternlink.co`

2. **部署时不使用 --env production**：
   ```bash
   cd workers
   wrangler deploy
   ```

3. **删除 `eternlink-api-production`**（如果不再需要）

## 推荐方案

我推荐使用**方法 1**，因为：
- `eternlink-api-production` 已经有自定义域名配置好了
- 只需要添加私钥即可
- 不需要重新配置域名

## 验证

设置私钥后，测试 API：

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

然后在前端测试上传文件功能，应该不再出现 "invalid private key" 错误。

