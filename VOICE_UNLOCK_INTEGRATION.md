# 语音解锁功能 - 集成状态文档

**创建时间**: 2025-12-04
**当前状态**: ✅ 核心功能已实现，待前端集成

---

## 📋 功能概述

用户在新手引导时录入语音签名，当账户因长时间不登录被冻结后，需要通过语音验证才能解锁账户。

### 工作流程

```
┌─────────────────────┐
│  新手引导阶段        │
│  (Onboarding)       │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────────────────────┐
│  VoiceSignatureStep 组件             │
│  - 用户录制 3-10秒语音                │
│  - 转换为 Base64                     │
│  - POST /api/account/voice/upload   │
└──────────┬──────────────────────────┘
           │
           ▼
┌─────────────────────────────────────┐
│  Azure Speaker Recognition          │
│  - 创建语音配置文件 (Voice Profile)   │
│  - 返回 profileId                    │
└──────────┬──────────────────────────┘
           │
           ▼
┌─────────────────────────────────────┐
│  数据库 (users 表)                   │
│  - 存储 profileId 到 voiceSignature │
└──────────┬──────────────────────────┘
           │
           │  (用户长时间不登录)
           │
           ▼
┌─────────────────────────────────────┐
│  系统自动冻结账户                     │
│  - accountFrozen = true             │
│  - freezeReason = "长时间未登录"     │
└──────────┬──────────────────────────┘
           │
           │  (用户尝试登录)
           │
           ▼
┌─────────────────────────────────────┐
│  登录检测到 accountFrozen            │
│  - 返回冻结状态                      │
│  - 显示 VoiceUnlockPage              │
└──────────┬──────────────────────────┘
           │
           ▼
┌─────────────────────────────────────┐
│  VoiceUnlockPage 组件                │
│  - 用户录制验证音频                   │
│  - POST /api/account/voice/verify   │
└──────────┬──────────────────────────┘
           │
           ▼
┌─────────────────────────────────────┐
│  Azure 语音识别                      │
│  - 比较新音频 vs 存储的 profileId    │
│  - 返回相似度分数                     │
└──────────┬──────────────────────────┘
           │
           ▼
┌─────────────────────────────────────┐
│  验证成功 (score >= 0.8)             │
│  - 解冻账户: accountFrozen = false  │
│  - 用户进入 Dashboard                │
└─────────────────────────────────────┘
```

---

## ✅ 已完成的实现

### 1. 后端服务

#### 数据库架构 (已存在)
- ✅ `users.voiceSignature` (TEXT) - 存储 Azure Profile ID
- ✅ `users.accountFrozen` (BOOLEAN) - 账户冻结标志
- ✅ `users.freezeReason` (VARCHAR) - 冻结原因

#### API 端点

**语音上传** (Onboarding 阶段)
```
POST /api/account/voice/upload
Authorization: Bearer <token>
Content-Type: application/json

Request Body:
{
  "voiceData": "data:audio/webm;base64,..."
}

Response (Success):
{
  "message": "Voice signature uploaded successfully",
  "hasVoiceSignature": true
}
```

**语音验证** (解锁账户)
```
POST /api/account/voice/verify
Authorization: Bearer <token>
Content-Type: application/json

Request Body:
{
  "voiceData": "data:audio/webm;base64,..."
}

Response (Success):
{
  "message": "Voice verified successfully. Account unfrozen.",
  "accountFrozen": false
}

Response (Failure):
{
  "error": "Voice verification failed",
  "similarityScore": 0.65
}
```

#### Azure 语音识别服务
- ✅ [voice.service.ts](backend/src/services/voice.service.ts)
- ✅ 支持 Mock 模式（开发/测试）
- ✅ 支持 Azure 生产模式（需要凭证）
- ✅ 使用 Azure Speaker Recognition REST API
- ✅ Text-independent verification（无需特定词语）

**当前模式**: Mock 模式 (80% 成功率)

**启用 Azure 生产模式**:
```bash
# backend/.env
AZURE_SPEECH_KEY=your_key_here
AZURE_SPEECH_REGION=eastus
```

### 2. 前端组件

#### VoiceSignatureStep (Onboarding)
- ✅ [VoiceSignatureStep.tsx](src/components/onboarding/VoiceSignatureStep.tsx)
- ✅ 录音功能 (3-10秒)
- ✅ 实时倒计时
- ✅ 播放/重录功能
- ✅ **已修复**: API 端点从 `/voice-signature` 改为 `/voice/upload`
- ✅ **已修复**: 请求参数从 `voiceSignature` 改为 `voiceData`

#### VoiceUnlockPage (解锁页面)
- ✅ [VoiceUnlockPage.tsx](src/components/VoiceUnlockPage.tsx)
- ✅ 录音界面
- ✅ 错误处理
- ✅ 成功动画
- ✅ 重试功能

---

## 🔧 待完成的集成

### 步骤 1: 修复前端路由问题 (⚠️ 需要您完成)

在您的登录组件中添加冻结检测逻辑。我无法找到 `/api/registration/login` 对应的后端文件，您需要：

**A. 找到登录控制器** (可能的文件名):
- `backend/src/controllers/registration.controller.ts`
- `backend/src/controllers/user.controller.ts`
- `backend/src/controllers/auth.controller.ts`

**B. 在登录响应中添加冻结信息**:
```typescript
// 在登录成功后添加
res.json({
  token,
  user: {
    id: user.id,
    email: user.email,
    accountType: user.accountType,
    // ⚠️ 添加这两个字段
    accountFrozen: user.accountFrozen,
    freezeReason: user.freezeReason,
  },
});
```

### 步骤 2: 前端登录逻辑 (⚠️ 需要您完成)

在前端登录组件中（可能在 `src/components/LoginPage.tsx` 或类似位置）:

```typescript
// 登录请求
const response = await fetch('http://localhost:3001/api/registration/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, password }),
});

const data = await response.json();

if (!response.ok) {
  setError(data.error);
  return;
}

// ⚠️ 添加冻结检测
if (data.user.accountFrozen) {
  localStorage.setItem('authToken', data.token);
  localStorage.setItem('accountFrozen', 'true');
  localStorage.setItem('freezeReason', data.user.freezeReason || '');
  // 跳转到 VoiceUnlockPage (需要在 App.tsx 中处理)
  return;
}

// 正常登录流程...
localStorage.setItem('authToken', data.token);
localStorage.setItem('accountType', data.user.accountType);
// ... 其他逻辑
```

### 步骤 3: App.tsx 集成 (⚠️ 需要您完成)

在 [App.tsx](src/App.tsx) 中添加:

```typescript
import { VoiceUnlockPage } from './components/VoiceUnlockPage';

function App() {
  // ... 现有状态
  const [showVoiceUnlock, setShowVoiceUnlock] = useState(false);

  // 在应用启动时检查
  useEffect(() => {
    const token = localStorage.getItem('authToken');
    const accountFrozen = localStorage.getItem('accountFrozen');

    if (token && accountFrozen === 'true') {
      setShowVoiceUnlock(true);
    }
  }, []);

  // 渲染逻辑
  if (showVoiceUnlock) {
    return (
      <VoiceUnlockPage
        freezeReason={localStorage.getItem('freezeReason') || undefined}
        onUnlockSuccess={() => {
          localStorage.removeItem('accountFrozen');
          localStorage.removeItem('freezeReason');
          setShowVoiceUnlock(false);
          setShowUserDashboard(true);
        }}
        onLogout={() => {
          localStorage.clear();
          setShowVoiceUnlock(false);
          setShowProductLanding(true);
        }}
      />
    );
  }

  // ... 其他渲染逻辑
}
```

---

## 🧪 测试步骤

### 1. 测试语音录制 (Onboarding)

1. 启动应用并注册新用户
2. 进入 Onboarding 流程
3. 到达 Voice Signature 步骤
4. 点击 "Start Recording" 按钮
5. 录制 3-10秒语音
6. 点击 "Save Voice Signature"
7. ✅ **已修复**: 现在应该成功保存

**验证**: 在 Prisma Studio 查看 `users` 表的 `voice_signature` 字段，应该有值（Mock 模式：`MOCK_PROFILE_xxx`）

### 2. 测试账户冻结

在 Prisma Studio 或 SQL 中手动冻结账户:

```sql
UPDATE users
SET account_frozen = true,
    freeze_reason = '长时间未登录'
WHERE email = 'test@example.com';
```

### 3. 测试语音解锁

1. 登出当前账户
2. 重新登录被冻结的账户
3. 应该显示 VoiceUnlockPage
4. 录制新语音验证
5. Mock 模式下约 80% 概率成功
6. 成功后应进入 Dashboard

---

## 📊 当前状态总结

| 组件/功能 | 状态 | 备注 |
|----------|------|------|
| 数据库 Schema | ✅ 完成 | `voiceSignature`, `accountFrozen`, `freezeReason` |
| Voice Service (后端) | ✅ 完成 | 支持 Mock 和 Azure 两种模式 |
| API - Voice Upload | ✅ 完成 | `/api/account/voice/upload` |
| API - Voice Verify | ✅ 完成 | `/api/account/voice/verify` |
| VoiceSignatureStep (前端) | ✅ 完成 | 已修复 API 端点和参数 |
| VoiceUnlockPage (前端) | ✅ 完成 | 解锁页面组件 |
| 登录控制器集成 | ⚠️ 待完成 | 需要添加 `accountFrozen` 字段到响应 |
| 前端登录逻辑 | ⚠️ 待完成 | 需要检测冻结状态 |
| App.tsx 路由集成 | ⚠️ 待完成 | 需要添加 VoiceUnlockPage 路由 |

---

## 🚨 已知问题和解决方案

### 问题 1: "Save Voice Signature" 按钮无响应 ✅ 已解决

**原因**:
- API 端点不匹配：前端调用 `/api/account/voice-signature`，后端是 `/api/account/voice/upload`
- 参数名不匹配：前端发送 `voiceSignature`，后端期望 `voiceData`

**解决方案**:
- ✅ 已修改 [VoiceSignatureStep.tsx:136-142](src/components/onboarding/VoiceSignatureStep.tsx#L136-L142)
- 更改 API 路径为 `/api/account/voice/upload`
- 更改参数名为 `voiceData`

### 问题 2: 无法找到登录控制器

**影响**: 无法添加 `accountFrozen` 状态到登录响应

**下一步**:
1. 搜索 `POST /api/registration/login` 在后端的定义
2. 或查看前端登录请求的实际端点
3. 在对应的登录函数中添加冻结状态返回

---

## 🎯 下一步行动项

1. **找到登录控制器** - 搜索处理 `/api/registration/login` 的后端文件
2. **修改登录响应** - 添加 `accountFrozen` 和 `freezeReason` 字段
3. **更新前端登录逻辑** - 添加冻结检测
4. **集成 App.tsx** - 添加 VoiceUnlockPage 路由
5. **端到端测试** - 完整测试从录制到解锁的流程
6. **(可选) 启用 Azure** - 配置真实的语音识别服务

---

## 📞 需要帮助?

如果您需要帮助完成任何步骤，请告诉我：
- 登录控制器的文件位置
- 前端登录组件的文件名
- 遇到的任何错误信息

我可以帮您：
- 修改特定文件
- 调试 API 调用
- 配置 Azure 服务
- 编写测试用例
