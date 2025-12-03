# 修复私钥问题指南

## 问题诊断

如果遇到 "invalid private key" 错误，可能是以下原因：

1. **私钥格式不正确**（最常见）
   - 私钥可能包含换行符、空格
   - 私钥可能缺少 `0x` 前缀
   - 私钥长度不正确（应该是 66 个字符，包括 `0x`）

2. **私钥设置错误**
   - 私钥可能设置到了错误的环境
   - 私钥可能被截断

## 解决方案

### 步骤 1：检查私钥格式

私钥应该是：
- 以 `0x` 开头
- 总共 66 个字符（`0x` + 64 个十六进制字符）
- 例如：`0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef`

### 步骤 2：重新设置私钥

```bash
cd workers

# 删除旧的私钥（如果需要）
wrangler secret delete COMPANY_WALLET_PRIVATE_KEY --env production

# 重新设置私钥
wrangler secret put COMPANY_WALLET_PRIVATE_KEY --env production
```

**重要提示**：
- 粘贴私钥时，确保**没有多余的空格或换行符**
- 确保私钥以 `0x` 开头
- 如果私钥没有 `0x` 前缀，添加它
- 按回车确认

### 步骤 3：验证私钥格式

私钥应该看起来像这样：
```
0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef
```

**不要**：
- ❌ 包含换行符
- ❌ 包含多余空格
- ❌ 缺少 `0x` 前缀
- ❌ 长度不是 66 个字符

### 步骤 4：重新部署

```bash
cd workers
wrangler deploy --env production
```

### 步骤 5：测试

```bash
curl https://api.eternlink.co/health
```

然后在前端测试上传文件功能。

## 查看实时日志

如果还有问题，查看实时日志：

```bash
cd workers
wrangler tail eternlink-api-production --env production
```

然后在前端尝试上传文件，查看具体的错误信息。

## 常见错误

### 错误 1: "Invalid private key length"
- **原因**: 私钥长度不是 66 个字符
- **解决**: 检查私钥是否完整，确保包含 `0x` 前缀

### 错误 2: "Invalid private key format"
- **原因**: 私钥包含非法字符
- **解决**: 确保私钥只包含十六进制字符（0-9, a-f, A-F）和 `0x` 前缀

### 错误 3: "COMPANY_WALLET_PRIVATE_KEY is not set"
- **原因**: 私钥没有设置到正确的环境
- **解决**: 使用 `--env production` 参数设置私钥
