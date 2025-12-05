# 用户注册系统完整文档

## 🎯 系统概述

EternLink用户注册系统实现了完整的账号管理功能，包括：
- 📧 **邮箱验证码注册**
- 🔑 **密码登录**
- 📱 **多级通知机制**（Email级别 → Phone级别 → 账号冻结）
- 🎤 **声音验证解锁**

---

## 📋 功能清单

### ✅ 已实现功能

#### 1. 用户注册流程
- **注册** - 邮箱+密码注册
- **邮箱验证** - 6位数字验证码，15分钟有效期
- **验证码重发** - 可以重新请求验证码

#### 2. 登录系统
- **邮箱密码登录**
- **邮箱验证检查** - 未验证邮箱无法登录
- **账号冻结检查** - 冻结账号提示需要声音验证
- **登录历史记录** - 记录IP、User Agent、登录方式

#### 3. 账户设置页面
**必填信息：**
- ✅ Email（注册时已填）
- ✅ Phone Number（可添加并验证）
- ✅ 声音录入（录制并上传声音签名）

**通知级别配置：**
- 📧 **Email Level** - X天不登录发送邮件通知
- 📱 **Phone Level** - Y天不登录发送短信通知（必须 > Email Level）
- 🔒 **Freeze Level** - Z天不登录账号冻结（必须 > Phone Level）

#### 4. 多级通知系统
**层级1 - Email通知：**
- 在设定的天数后发送邮件提醒
- 邮件包含：不活跃天数、登录链接

**层级2 - Phone通知：**
- 在Email通知之后的设定天数发送
- 发送邮件通知（SMS功能已预留）
- 更紧急的提醒信息

**层级3 - 账号冻结：**
- 达到设定天数后自动冻结账号
- 冻结原因记录在数据库
- 需要声音验证才能解锁

#### 5. 声音验证系统
- **录制声音** - 使用浏览器麦克风录制
- **上传签名** - Base64编码存储
- **解锁账号** - 冻结账号通过声音验证解锁
- **ML准备** - 代码结构支持集成语音识别ML模型

#### 6. 自动化监控
- **Account Monitor Service** - 每日2AM检查所有账号
- **自动发送通知** - 根据不活跃天数自动触发
- **自动冻结账号** - 达到阈值自动执行
- **邮件通知** - 专业HTML模板

---

## 🗄️ 数据库Schema

### User表（扩展）
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY,
  wallet_address VARCHAR(42) UNIQUE,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  email_verified BOOLEAN DEFAULT FALSE,
  phone_number VARCHAR(20),
  phone_verified BOOLEAN DEFAULT FALSE,
  voice_signature TEXT,  -- Base64 encoded
  account_frozen BOOLEAN DEFAULT FALSE,
  freeze_reason VARCHAR(255),
  last_login_at TIMESTAMP,
  email_notification_days INT,  -- Email级别触发天数
  phone_notification_days INT,  -- Phone级别触发天数
  freeze_days INT,              -- 冻结触发天数
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### VerificationCode表
```sql
CREATE TABLE verification_codes (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  email VARCHAR(255),
  phone_number VARCHAR(20),
  code VARCHAR(6) NOT NULL,
  type VARCHAR(20),  -- email_verification, phone_verification
  expires_at TIMESTAMP NOT NULL,
  verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### LoginHistory表
```sql
CREATE TABLE login_history (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  login_at TIMESTAMP DEFAULT NOW(),
  ip_address VARCHAR(45),
  user_agent TEXT,
  login_method VARCHAR(50)  -- password, siwe, voice
);
```

---

## 🔌 API端点文档

### 注册相关

#### POST /api/registration/register
注册新用户

**Request:**
```json
{
  "email": "user@example.com",
  "password": "strongpassword123"
}
```

**Response:**
```json
{
  "message": "Registration successful. Please check your email for verification code.",
  "userId": "uuid",
  "email": "user@example.com"
}
```

#### POST /api/registration/verify-email
验证邮箱

**Request:**
```json
{
  "email": "user@example.com",
  "code": "123456"
}
```

**Response:**
```json
{
  "message": "Email verified successfully",
  "token": "jwt-token",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "emailVerified": true
  }
}
```

#### POST /api/registration/resend-code
重发验证码

**Request:**
```json
{
  "email": "user@example.com"
}
```

**Response:**
```json
{
  "message": "Verification code sent successfully"
}
```

#### POST /api/registration/login
登录

**Request:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "message": "Login successful",
  "token": "jwt-token",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "emailVerified": true,
    "phoneNumber": "+1234567890",
    "phoneVerified": true,
    "hasVoiceSignature": true,
    "emailNotificationDays": 7,
    "phoneNotificationDays": 14,
    "freezeDays": 30
  }
}
```

### 账户管理

#### GET /api/account/status
获取账户状态（需要认证）

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "emailVerified": true,
    "phoneNumber": "+1234567890",
    "phoneVerified": true,
    "hasVoiceSignature": true,
    "accountFrozen": false,
    "freezeReason": null,
    "lastLoginAt": "2025-01-15T10:30:00Z",
    "emailNotificationDays": 7,
    "phoneNotificationDays": 14,
    "freezeDays": 30,
    "daysSinceLogin": 2
  }
}
```

#### PUT /api/account/settings
更新账户设置（需要认证）

**Request:**
```json
{
  "phoneNumber": "+1234567890",
  "emailNotificationDays": 7,
  "phoneNotificationDays": 14,
  "freezeDays": 30
}
```

**验证规则:**
- emailNotificationDays < phoneNotificationDays
- phoneNotificationDays < freezeDays

**Response:**
```json
{
  "message": "Account settings updated successfully",
  "user": { ...updated user info }
}
```

#### POST /api/account/phone/send-code
发送手机验证码（需要认证）

**Request:**
```json
{
  "phoneNumber": "+1234567890"
}
```

**Response:**
```json
{
  "message": "Verification code sent to phone",
  "phoneNumber": "+1234567890"
}
```

#### POST /api/account/phone/verify
验证手机号（需要认证）

**Request:**
```json
{
  "code": "123456"
}
```

**Response:**
```json
{
  "message": "Phone number verified successfully",
  "phoneVerified": true
}
```

#### POST /api/account/voice/upload
上传声音签名（需要认证）

**Request:**
```json
{
  "voiceData": "data:audio/webm;base64,..."
}
```

**Response:**
```json
{
  "message": "Voice signature uploaded successfully",
  "hasVoiceSignature": true
}
```

#### POST /api/account/voice/verify
声音验证解锁账号（需要认证）

**Request:**
```json
{
  "voiceData": "data:audio/webm;base64,..."
}
```

**Response:**
```json
{
  "message": "Voice verified successfully. Account unfrozen.",
  "accountFrozen": false
}
```

---

## 🎨 前端组件

### 1. RegistrationPage
**路径:** `src/components/RegistrationPage.tsx`

**功能:**
- 两步注册流程（注册 → 验证）
- 表单验证
- 错误和成功消息显示
- 验证码重发功能

**Props:**
```typescript
interface RegistrationPageProps {
  onRegistrationComplete: (token: string) => void;
  onBackToHome: () => void;
}
```

### 2. LoginPage
**路径:** `src/components/LoginPage.tsx`

**功能:**
- 邮箱密码登录
- 错误处理
- 注册页面导航

**Props:**
```typescript
interface LoginPageProps {
  onLoginSuccess: (token: string, user: any) => void;
  onBackToHome: () => void;
  onRegisterClick: () => void;
}
```

### 3. AccountSettingsPage
**路径:** `src/components/AccountSettingsPage.tsx`

**功能:**
- 账户状态显示
- 多级通知配置
- 手机号验证
- 声音录制和上传
- 实时表单验证

**Props:**
```typescript
interface AccountSettingsPageProps {
  token: string;
  onLogout: () => void;
}
```

---

## ⚙️ 配置说明

### 环境变量（.env）
```env
# SMTP配置（用于发送邮件）
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
EMAIL_FROM=noreply@eternlink.com

# 账号监控配置
HEARTBEAT_CHECK_CRON="0 2 * * *"  # 每日2AM检查
```

### 通知级别示例配置

**保守配置：**
```
Email通知: 7天
Phone通知: 14天
账号冻结: 30天
```

**激进配置：**
```
Email通知: 3天
Phone通知: 7天
账号冻结: 14天
```

**宽松配置：**
```
Email通知: 30天
Phone通知: 60天
账号冻结: 90天
```

---

## 🔄 工作流程示例

### 用户注册流程
1. 用户访问注册页面
2. 输入邮箱和密码
3. 系统发送6位验证码到邮箱
4. 用户输入验证码
5. 验证成功，获得JWT token
6. 跳转到账户设置页面

### 账户设置流程
1. 用户进入账户设置页
2. **强制填写:**
   - 添加手机号并验证
   - 录制声音签名
   - 设置通知级别
3. 保存设置

### 不活跃检测流程
```
Day 0: 用户最后一次登录
  ↓
Day 7: Email通知发送（emailNotificationDays = 7）
  ↓
Day 14: Phone通知发送（phoneNotificationDays = 14）
  ↓
Day 30: 账号冻结（freezeDays = 30）
  ↓
需要声音验证解锁
```

### 账号解冻流程
1. 用户尝试登录
2. 系统检测到账号已冻结
3. 提示需要声音验证
4. 用户录制声音
5. 系统比对声音签名
6. 验证成功，账号解冻
7. 更新lastLoginAt，重置计时器

---

## 📧 邮件模板

### 验证码邮件
**主题:** EternLink Email Verification Code

**内容:**
- 大号显示6位数验证码
- 15分钟有效期提示
- 品牌一致性设计

### Email级别通知
**主题:** EternLink Account Alert - X Days of Inactivity

**内容:**
- 不活跃天数
- 友好提醒
- 登录链接

### Phone级别通知
**主题:** EternLink Account Alert - X Days of Inactivity (Important)

**内容:**
- 更紧急的提示
- 不活跃天数
- SMS通知提示
- 登录链接

### 冻结警告
**主题:** EternLink Account Alert - X Days of Inactivity (Critical)

**内容:**
- 严重警告
- 即将冻结提示
- 声音验证要求说明
- 立即登录链接

---

## 🔒 安全特性

### 密码安全
- Bcrypt哈希（10 rounds）
- 最少8字符要求
- 不存储明文密码

### 验证码安全
- 6位随机数字
- 15分钟过期
- 使用后失效
- 每次请求生成新码

### JWT认证
- 7天有效期
- Bearer token格式
- 包含userId和email

### 声音验证
- Base64编码存储
- 预留ML模型集成接口
- 当前使用占位符比对
- **生产环境建议:** 集成Azure Speaker Recognition或类似服务

### 登录历史
- 记录IP地址
- 记录User Agent
- 记录登录方式
- 用于安全审计

---

## 🚀 部署步骤

### 1. 后端部署

```bash
cd backend

# 安装依赖
npm install

# 配置环境变量
cp .env.example .env
# 编辑 .env 文件

# 生成Prisma client
npm run prisma:generate

# 运行数据库迁移
npm run prisma:migrate

# 启动服务
npm run dev  # 开发环境
npm run build && npm start  # 生产环境
```

### 2. 前端部署

```bash
# 安装依赖（如果还没有）
npm install

# 启动开发服务器
npm run dev
```

### 3. 配置SMTP

**Gmail示例:**
1. 启用2FA
2. 生成应用专用密码
3. 在.env中配置：
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-specific-password
```

---

## 🧪 测试场景

### 注册测试
1. ✅ 正常注册流程
2. ✅ 重复邮箱注册（应失败）
3. ✅ 弱密码注册（应失败）
4. ✅ 验证码验证
5. ✅ 过期验证码（应失败）
6. ✅ 错误验证码（应失败）

### 登录测试
1. ✅ 正确密码登录
2. ✅ 错误密码登录（应失败）
3. ✅ 未验证邮箱登录（应失败）
4. ✅ 冻结账号登录（应提示声音验证）

### 通知配置测试
1. ✅ 正确配置（email < phone < freeze）
2. ✅ 错误配置（email >= phone）应失败
3. ✅ 错误配置（phone >= freeze）应失败

### 声音验证测试
1. ✅ 录制声音
2. ✅ 上传声音签名
3. ✅ 声音验证解锁

---

## 📝 待办事项

### 短期（高优先级）
- [ ] 集成真实SMS服务（Twilio, AWS SNS）
- [ ] 集成真实语音识别ML模型
- [ ] 添加前端路由集成
- [ ] 编写API集成测试

### 中期
- [ ] 添加密码重置功能
- [ ] 2FA（两步验证）
- [ ] 邮箱变更验证
- [ ] 手机号变更验证

### 长期
- [ ] 活动日志查看器
- [ ] 设备管理
- [ ] 可信设备功能
- [ ] 生物识别集成（Face ID, Touch ID）

---

## 🐛 已知问题

1. **声音验证** - 当前使用占位符算法，生产环境需要集成ML模型
2. **SMS发送** - 当前仅记录日志，需要集成SMS服务
3. **TypeScript错误** - npm依赖未安装时会有类型错误（正常）

---

## 💡 最佳实践

### 用户建议
1. 设置合理的通知间隔（推荐7/14/30天）
2. 使用强密码（至少12字符，包含大小写字母、数字、符号）
3. 及时验证手机号和录制声音
4. 定期登录避免账号冻结

### 开发建议
1. 在生产环境使用环境变量管理敏感信息
2. 定期备份数据库
3. 监控邮件发送成功率
4. 设置告警监控冻结账号数量

---

## 📞 技术支持

如有问题，请查看：
1. Backend README: `backend/README.md`
2. API文档: 本文档
3. Phase 2总结: `PHASE2_SUMMARY.md`

---

## 📄 许可证

MIT License

© 2025 EternLink. All rights reserved.
