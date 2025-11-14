# EternLink 架构说明

本文档详细说明 EternLink 项目的架构设计和技术实现。

## 整体架构

```
┌─────────────────────────────────────────────────────────────┐
│                        用户浏览器                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │              前端应用 (React + TypeScript)            │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌───────────┐  │   │
│  │  │  文件上传    │  │  加密工具    │  │ 合约交互  │  │   │
│  │  │  组件       │  │  (crypto.ts) │  │(contract) │  │   │
│  │  └──────────────┘  └──────────────┘  └───────────┘  │   │
│  └──────────────────────────────────────────────────────┘   │
│                          │                                   │
│                          │ Web3 (MetaMask)                   │
└──────────────────────────┼───────────────────────────────────┘
                           │
                           │ 区块链交易
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                    Base Sepolia 测试网                       │
│  ┌──────────────────────────────────────────────────────┐   │
│  │          ProofOfExistence 智能合约                    │   │
│  │  ┌────────────────┐  ┌──────────────────────────┐   │   │
│  │  │  register()    │  │  exists()                │   │   │
│  │  │  登记文件哈希   │  │  验证文件存在            │   │   │
│  │  └────────────────┘  └──────────────────────────┘   │   │
│  │  ┌──────────────────────────────────────────────┐   │   │
│  │  │  mapping(bytes32 => address) ownerOf         │   │   │
│  │  │  存储文件哈希到所有者的映射                   │   │   │
│  │  └──────────────────────────────────────────────┘   │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

## 数据流

### 1. 文件上传流程

```
用户选择文件 (.txt)
    │
    ▼
读取文件内容 (ArrayBuffer)
    │
    ▼
计算 SHA-256 哈希
    │
    ├──→ 文件哈希 (用于上链)
    │
    ▼
使用密码派生密钥 (PBKDF2)
    │
    ▼
AES-GCM 加密文件
    │
    ├──→ 加密文件 (.enc) 下载到本地
    │
    ▼
调用智能合约 register()
    │
    ▼
将文件哈希和元数据写入区块链
    │
    ▼
交易确认，完成上链
```

### 2. 文件验证流程

```
用户选择文件 (.txt)
    │
    ▼
读取文件内容 (ArrayBuffer)
    │
    ▼
计算 SHA-256 哈希
    │
    ▼
调用智能合约 exists(hash)
    │
    ▼
返回 true/false
    │
    ▼
显示验证结果
```

## 技术栈

### 前端

- **React 18**: UI 框架
- **TypeScript**: 类型安全
- **Vite**: 构建工具
- **Framer Motion**: 动画效果
- **ethers.js v6**: 区块链交互
- **Web Crypto API**: 加密功能

### 智能合约

- **Solidity 0.8.20**: 智能合约语言
- **EVM**: 以太坊虚拟机
- **Base Sepolia**: 测试网络

### 加密算法

- **SHA-256**: 文件哈希计算
- **PBKDF2**: 密钥派生 (250,000 轮)
- **AES-256-GCM**: 文件加密

## 核心模块

### 1. 加密模块 (`src/utils/crypto.ts`)

#### 功能
- 文件哈希计算 (SHA-256)
- 密钥派生 (PBKDF2)
- 文件加密/解密 (AES-GCM)
- 加密文件打包/解包

#### 关键函数

```typescript
// 计算文件哈希
sha256(buffer: ArrayBuffer): Promise<Uint8Array>

// 加密文件
encryptFile(fileContent: ArrayBuffer, password: string): Promise<EncryptedData>

// 打包加密文件
packEncryptedFile(encrypted: Uint8Array, iv: Uint8Array, salt: Uint8Array): Blob
```

### 2. 合约交互模块 (`src/utils/contract.ts`)

#### 功能
- MetaMask 钱包连接
- 网络检查与切换
- 合约实例创建
- 文件登记与验证

#### 关键函数

```typescript
// 连接钱包
connectWallet(): Promise<ethers.BrowserProvider>

// 检查网络
checkNetwork(provider: ethers.BrowserProvider, chainId: number): Promise<boolean>

// 注册文件
registerFile(contract: ethers.Contract, fileHash: string, ...): Promise<Transaction>

// 验证文件存在
checkFileExists(contract: ethers.Contract, fileHash: string): Promise<boolean>
```

### 3. 主应用组件 (`src/App.tsx`)

#### 功能
- 用户界面
- 文件上传处理
- 加密流程控制
- 上链流程控制
- 状态管理

#### 主要状态

```typescript
- contractAddress: 合约地址
- chainId: 链 ID
- file: 选择的文件
- password: 加密密码
- status: 操作状态
- loading: 加载状态
- account: 钱包地址
- fileHash: 文件哈希
- txHash: 交易哈希
```

### 4. 智能合约 (`contracts/ProofOfExistence.sol`)

#### 功能
- 文件哈希登记
- 文件存在性验证
- 文件元数据存储

#### 关键函数

```solidity
// 登记文件
function register(bytes32 fileHash, string calldata cipher, ...) external

// 验证文件存在
function exists(bytes32 fileHash) external view returns (bool)
```

## 安全设计

### 1. 客户端加密

- 所有加密操作在浏览器本地完成
- 文件内容不会发送到服务器
- 密码只在本地使用，不会存储或传输

### 2. 密钥管理

- 使用 PBKDF2 派生密钥（250,000 轮）
- 每个文件使用随机盐值和 IV
- 密钥不会存储或传输

### 3. 链上存储

- 只存储文件哈希，不存储文件内容
- 文件内容加密后存储在本地
- 链上可验证但不可恢复文件内容

### 4. 隐私保护

- 文件内容完全加密
- 链上只存储哈希值
- 任何人都可以验证文件存在，但无法获取文件内容

## 文件格式

### 加密文件格式 (.enc)

```
[盐值 (16 字节)][IV (12 字节)][加密数据 (可变长度)]
```

- **盐值**: PBKDF2 盐值，用于派生密钥
- **IV**: AES-GCM 初始化向量
- **加密数据**: AES-GCM 加密后的文件内容

### 链上存储格式

```solidity
struct FileRecord {
    address owner;      // 文件所有者
    bytes32 fileHash;   // 文件 SHA-256 哈希
    string cipher;      // 加密方式描述
    string cid;         // IPFS CID (可选)
    uint256 size;       // 文件大小 (字节)
    string mime;        // MIME 类型
}
```

## 性能优化

### 1. 前端优化

- 使用 Vite 快速构建
- 代码分割和懒加载
- 优化加密操作性能

### 2. 区块链优化

- 使用 L2 网络降低 gas 费用
- 只存储哈希值，减少链上数据
- 使用事件记录详细信息

### 3. 用户体验优化

- 异步操作不阻塞 UI
- 实时状态反馈
- 错误处理和提示

## 扩展性

### 1. 支持更多文件格式

- 修改文件类型检查
- 支持二进制文件加密
- 添加文件大小限制

### 2. IPFS 集成

- 上传加密文件到 IPFS
- 存储 IPFS CID 到链上
- 从 IPFS 下载加密文件

### 3. 批量操作

- 支持批量文件上传
- 批量文件上链
- 批量文件验证

### 4. 主网部署

- 部署到 Base 主网
- 部署到 Ethereum 主网
- 支持多链部署

## 测试策略

### 1. 单元测试

- 加密功能测试
- 合约交互测试
- 工具函数测试

### 2. 集成测试

- 完整流程测试
- 钱包连接测试
- 合约交互测试

### 3. 端到端测试

- 用户流程测试
- 错误处理测试
- 性能测试

## 部署架构

### 开发环境

```
本地开发服务器 (Vite)
    │
    ├──→ 前端应用
    │
    └──→ MetaMask 钱包
            │
            └──→ Base Sepolia 测试网
```

### 生产环境

```
CDN / 静态托管
    │
    ├──→ 前端应用 (构建后的静态文件)
    │
    └──→ MetaMask 钱包
            │
            └──→ Base 主网 / Ethereum 主网
```

## 监控和日志

### 1. 前端监控

- 错误捕获和报告
- 用户操作日志
- 性能监控

### 2. 区块链监控

- 交易状态监控
- Gas 费用监控
- 合约事件监控

## 未来改进

### 1. 功能增强

- [ ] 文件解密功能
- [ ] 文件分享功能
- [ ] 文件版本管理
- [ ] 文件权限管理

### 2. 技术改进

- [ ] 使用 Web Workers 优化加密性能
- [ ] 添加文件压缩功能
- [ ] 支持增量加密
- [ ] 添加文件完整性验证

### 3. 用户体验改进

- [ ] 改进 UI/UX 设计
- [ ] 添加多语言支持
- [ ] 添加暗黑模式
- [ ] 添加移动端支持

## 参考资料

- [Web Crypto API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Crypto_API)
- [ethers.js 文档](https://docs.ethers.org/)
- [Solidity 文档](https://docs.soliditylang.org/)
- [Base 文档](https://docs.base.org/)
