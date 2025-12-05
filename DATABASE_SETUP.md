# EternLink 数据库设置指南

## 前提条件

1. 确保 Docker Desktop 已安装并正在运行
2. 确保 Node.js 已安装

## 步骤

### 1. 启动 Docker Desktop

请先打开 Docker Desktop 应用程序并等待其完全启动。

### 2. 启动 PostgreSQL 数据库

在项目根目录运行：

```bash
docker-compose up -d
```

这将启动一个 PostgreSQL 容器，配置如下：
- 数据库名: `eternlink`
- 用户名: `eternlink`
- 密码: `eternlink_dev_password`
- 端口: `5432`

### 3. 检查数据库状态

```bash
docker-compose ps
```

确保 `eternlink-postgres` 容器状态为 `running`。

### 4. 运行 Prisma 迁移

进入backend目录并运行迁移：

```bash
cd backend
npm run prisma:migrate
```

这将创建所有必要的数据库表，包括：
- `users` - 用户和beneficiary账户
- `beneficiary_links` - user和beneficiary之间的链接
- `death_claims` - 死亡claim记录
- `verification_codes` - 邮箱验证码
- 其他相关表

### 5. 启动后端服务器

在backend目录：

```bash
npm run dev
```

后端服务器将在 `http://localhost:3001` 启动。

### 6. 测试注册功能

现在你可以在前端（http://localhost:5173）测试注册功能：

1. 点击 "Get Started Free" 按钮
2. 选择账户类型（User 或 Beneficiary）
3. 填写邮箱和密码
4. 提交注册

数据将被保存到 PostgreSQL 数据库中。

## 查看数据库数据

使用 Prisma Studio:

```bash
cd backend
npm run prisma:studio
```

这将在浏览器中打开 `http://localhost:5555`，你可以查看和编辑数据库中的数据。

## 停止数据库

```bash
docker-compose down
```

如果需要删除所有数据：

```bash
docker-compose down -v
```

## 故障排除

### Docker连接错误

如果看到 "unable to get image" 或 "cannot find the file specified" 错误：
- 确保 Docker Desktop 正在运行
- 重启 Docker Desktop
- 检查 Docker Desktop 的设置，确保 WSL 2 集成已启用（Windows用户）

### 端口已被占用

如果 5432 端口已被占用，修改 `docker-compose.yml` 中的端口映射：

```yaml
ports:
  - "5433:5432"  # 使用5433而不是5432
```

同时更新 `backend/.env` 中的 `DATABASE_URL`:

```
DATABASE_URL="postgresql://eternlink:eternlink_dev_password@localhost:5433/eternlink?schema=public"
```

### Prisma迁移失败

如果迁移失败，尝试：

```bash
cd backend
npx prisma migrate reset  # 重置数据库
npm run prisma:migrate    # 重新运行迁移
```
