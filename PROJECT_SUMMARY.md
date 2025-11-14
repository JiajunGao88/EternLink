# EternLink 项目总结

## 项目概述

EternLink 是一个基于区块链的文件存在性证明系统 MVP，支持文件本地加密并上链存储哈希值。

## 核心功能

✅ **文件上传**: 支持 .txt 文件格式  
✅ **本地加密**: 使用 AES-256-GCM + PBKDF2 加密  
✅ **哈希上链**: 将文件 SHA-256 哈希登记到区块链  
✅ **链上验证**: 验证文件是否存在于区块链上  
✅ **隐私保护**: 文件内容完全加密，链上只存储哈希  

## 技术栈

### 前端
- React 18 + TypeScript
- Vite (构建工具)
- Framer Motion (动画)
- ethers.js v6 (区块链交互)
- Web Crypto API (加密)

### 智能合约
- Solidity 0.8.20
- EVM 兼容
- Base Sepolia 测试网

### 加密算法
- SHA-256 (文件哈希)
- PBKDF2 (密钥派生，250,000 轮)
- AES-256-GCM (文件加密)

## 项目结构

```
EternLink/
├── contracts/              # 智能合约
│   └── ProofOfExistence.sol
├── src/                    # 前端源码
│   ├── App.tsx            # 主应用组件
│   ├── main.tsx           # 应用入口
│   ├── index.css          # 样式文件
│   └── utils/
│       ├── crypto.ts      # 加密工具
│       └── contract.ts    # 合约交互
├── public/                 # 静态资源
│   └── vite.svg
├── package.json           # 项目配置
├── tsconfig.json          # TypeScript 配置
├── vite.config.ts         # Vite 配置
├── README.md              # 项目说明
├── DEPLOY.md              # 部署指南
├── QUICKSTART.md          # 快速开始
├── ARCHITECTURE.md        # 架构说明
├── test-file.txt          # 测试文件
└── PROJECT_SUMMARY.md     # 项目总结
```

## 核心模块

### 1. 加密模块 (`src/utils/crypto.ts`)

- `sha256()`: 计算文件 SHA-256 哈希
- `encryptFile()`: 加密文件内容
- `packEncryptedFile()`: 打包加密文件
- `downloadFile()`: 下载文件

### 2. 合约交互模块 (`src/utils/contract.ts`)

- `connectWallet()`: 连接 MetaMask 钱包
- `checkNetwork()`: 检查网络
- `registerFile()`: 注册文件到链上
- `checkFileExists()`: 验证文件存在

### 3. 主应用组件 (`src/App.tsx`)

- 用户界面
- 文件上传处理
- 加密流程控制
- 上链流程控制

### 4. 智能合约 (`contracts/ProofOfExistence.sol`)

- `register()`: 登记文件哈希
- `exists()`: 验证文件存在
- `FileRegistered` 事件: 文件登记事件

## 工作流程

### 文件上传流程

1. 用户选择 .txt 文件
2. 计算文件 SHA-256 哈希
3. 使用密码派生密钥 (PBKDF2)
4. AES-GCM 加密文件
5. 打包并下载加密文件 (.enc)
6. 调用智能合约 register() 登记哈希
7. 等待交易确认

### 文件验证流程

1. 用户选择 .txt 文件
2. 计算文件 SHA-256 哈希
3. 调用智能合约 exists() 查询
4. 返回验证结果

## 安全特性

- ✅ 客户端加密: 所有加密操作在浏览器本地完成
- ✅ 密码管理: 使用 PBKDF2 (250,000 轮) 派生密钥
- ✅ 加密算法: AES-256-GCM 提供机密性和完整性
- ✅ 链上存储: 只存储文件哈希，不存储文件内容
- ✅ 隐私保护: 文件内容不会泄露到链上

## 文件格式

### 加密文件格式 (.enc)

```
[salt (16 字节)][IV (12 字节)][encrypted data (可变长度)]
```

### 链上存储格式

- 文件哈希: `bytes32` (SHA-256)
- 所有者: `address`
- 加密方式: `string`
- IPFS CID: `string` (可选)
- 文件大小: `uint256`
- MIME 类型: `string`

## 部署说明

### 测试网部署

1. 在 Remix IDE 中部署合约到 Base Sepolia
2. 复制合约地址
3. 在前端配置中填入合约地址
4. 连接 MetaMask 钱包
5. 上传文件并上链

### 主网部署

1. 修改网络配置 (Base 主网或 Ethereum 主网)
2. 部署合约到主网
3. 使用真实 ETH 支付 gas 费用
4. 更新前端配置
5. 部署前端应用

## 使用说明

### 1. 安装依赖

```bash
npm install
```

### 2. 部署智能合约

在 Remix IDE 中部署 `ProofOfExistence.sol` 到 Base Sepolia

### 3. 配置前端

在 `src/App.tsx` 中填入合约地址，或直接在应用界面中配置

### 4. 启动应用

```bash
npm run dev
```

### 5. 使用应用

1. 连接 MetaMask 钱包
2. 选择 .txt 文件
3. 输入加密密码
4. 点击 "加密并登记上链"
5. 使用 "链上验证存在" 验证文件

## 测试

### 测试文件

项目包含 `test-file.txt` 用于测试

### 测试步骤

1. 上传 `test-file.txt`
2. 输入密码
3. 上链登记
4. 验证文件存在

## 已知限制

- 目前只支持 .txt 文件格式
- 文件大小建议控制在合理范围内
- 链上只存储哈希，不存储文件内容
- 测试网部署，不适合生产环境

## 未来计划

- [ ] 支持更多文件格式 (PDF, 图片等)
- [ ] 集成 IPFS 存储加密文件
- [ ] 添加文件解密功能
- [ ] 支持批量文件上链
- [ ] 添加文件元数据查询
- [ ] 支持主网部署

## 文档

- [README.md](./README.md) - 项目说明
- [DEPLOY.md](./DEPLOY.md) - 部署指南
- [QUICKSTART.md](./QUICKSTART.md) - 快速开始
- [ARCHITECTURE.md](./ARCHITECTURE.md) - 架构说明

## 许可证

MIT License

## 贡献

欢迎提交 Issue 和 Pull Request！

## 联系方式

如有问题，请提交 Issue 或联系维护者。

## 致谢

感谢所有为这个项目做出贡献的人！

---

**EternLink** - 文件加密并上链存储的 MVP 应用
