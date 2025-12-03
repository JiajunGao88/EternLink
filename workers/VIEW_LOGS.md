# 查看 Workers 日志指南

## 问题

使用 `wrangler tail eternlink-api-production --env production` 时出现错误：
```
This Worker does not exist on your account. [code: 10007]
```

## 解决方案

### 方法 1：直接使用 Worker 名称（推荐）

```bash
cd workers
wrangler tail eternlink-api-production
```

**不要使用 `--env production` 参数**，直接使用 Worker 名称即可。

### 方法 2：通过 Cloudflare Dashboard 查看日志

1. 打开 Cloudflare Dashboard
2. 进入 **Workers & Pages**
3. 点击 **eternlink-api-production**
4. 点击 **Logs** 标签页
5. 查看实时日志

### 方法 3：查看最近的日志

在 Cloudflare Dashboard 中：
1. Workers & Pages > eternlink-api-production
2. 点击 **Logs** 标签页
3. 可以看到最近的请求和错误日志

## 正确的命令

```bash
# 查看实时日志
cd workers
wrangler tail eternlink-api-production

# 或者查看特定时间的日志
wrangler tail eternlink-api-production --format pretty
```

## 为什么会出现错误？

当使用 `--env production` 时，wrangler 可能会尝试查找 `eternlink-api-production-production`（重复了 `-production`），导致找不到 Worker。

直接使用 Worker 名称 `eternlink-api-production` 即可，不需要 `--env` 参数。

