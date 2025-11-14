# EternLink - 文件加密上链存储 MVP

一个基于区块链的文件存在性证明系统，支持文件本地加密并上链存储哈希值。

## 功能特性

- ✅ 文件本地加密（AES-256-GCM + PBKDF2）
- ✅ 文件哈希上链存储（Base Sepolia 测试网）
- ✅ 链上验证文件存在性
- ✅ 支持 .txt 文件格式
- ✅ 完全客户端加密，保护隐私

## 技术栈

- **前端**: React + TypeScript + Vite
- **区块链**: Base Sepolia (EVM 兼容)
- **智能合约**: Solidity 0.8.20
- **加密**: Web Crypto API (AES-GCM, PBKDF2, SHA-256)
- **钱包**: MetaMask

## 项目结构

```
EternLink/
├── contracts/           # 智能合约
│   └── ProofOfExistence.sol
├── src/
│   ├── App.tsx         # 主应用组件
│   ├── main.tsx        # 应用入口
│   ├── index.css       # 样式文件
│   └── utils/
│       ├── crypto.ts   # 加密工具函数
│       └── contract.ts # 合约交互工具
├── package.json
├── tsconfig.json
├── vite.config.ts
└── README.md
```

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 部署智能合约

#### 使用 Remix IDE

1. 访问 [Remix IDE](https://remix.ethereum.org)
2. 创建新文件 `ProofOfExistence.sol`
3. 复制 `contracts/ProofOfExistence.sol` 的内容
4. 选择编译器版本 0.8.20
5. 编译合约
6. 在 "Deploy & Run" 中选择 "Injected Provider - MetaMask"
7. 确保 MetaMask 网络为 Base Sepolia (链ID: 84532)
8. 点击 "Deploy" 部署合约
9. 复制部署后的合约地址

#### 配置 MetaMask 网络

如果 MetaMask 中没有 Base Sepolia 网络，手动添加：

- **网络名称**: Base Sepolia
- **RPC URL**: https://sepolia.base.org
- **链 ID**: 84532
- **货币符号**: ETH
- **区块浏览器**: https://sepolia.basescan.org

#### 获取测试币

访问 Base Sepolia Faucet 获取测试 ETH:
- https://docs.base.org/docs/tools/network-faucets

### 3. 配置前端

1. 打开 `src/App.tsx`
2. 找到 `DEFAULTS.CONTRACT_ADDRESS`
3. 替换为你在 Remix 中部署的合约地址

或者直接在应用界面中填入合约地址。

### 4. 启动开发服务器

```bash
npm run dev
```

访问 http://localhost:5173

### 5. 使用应用

1. **连接钱包**: 点击 "连接 MetaMask 钱包" 按钮
2. **选择文件**: 选择一个 .txt 文件
3. **输入密码**: 输入加密密码（请妥善保管）
4. **加密并上链**: 点击 "加密并登记上链" 按钮
5. **验证存在**: 使用 "链上验证存在" 按钮验证文件是否已登记

## 工作原理

### 加密流程

1. **文件选择**: 用户选择 .txt 文件
2. **计算哈希**: 对文件明文计算 SHA-256 哈希
3. **加密文件**: 使用 PBKDF2 派生密钥，AES-GCM 加密文件
4. **打包下载**: 将加密文件打包为 .enc 格式并下载
5. **上链登记**: 将文件哈希和元数据写入智能合约

### 验证流程

1. **选择文件**: 选择原始 .txt 文件
2. **计算哈希**: 重新计算文件 SHA-256 哈希
3. **链上查询**: 调用智能合约 `exists()` 函数查询
4. **返回结果**: 显示文件是否存在于区块链上

### 安全特性

- **客户端加密**: 所有加密操作在浏览器本地完成
- **密码派生**: 使用 PBKDF2 (250,000 轮) 派生密钥
- **加密算法**: AES-256-GCM 提供机密性和完整性
- **哈希存储**: 链上只存储文件哈希，不存储文件内容
- **隐私保护**: 文件内容不会泄露到链上

## 智能合约说明

### ProofOfExistence.sol

**功能**:
- `register()`: 登记文件哈希到区块链
- `exists()`: 检查文件是否已登记

**事件**:
- `FileRegistered`: 文件登记事件，包含所有元数据

**映射**:
- `ownerOf`: 文件哈希到所有者的映射

## 文件格式

### .enc 文件格式

加密文件采用以下格式：

```
[salt (16 字节)][IV (12 字节)][encrypted data (可变长度)]
```

- **salt**: PBKDF2 盐值 (16 字节)
- **IV**: AES-GCM 初始化向量 (12 字节)
- **encrypted data**: 加密后的文件内容

## 注意事项

### 安全警告

- ⚠️ **密码管理**: 加密密码丢失后无法恢复文件
- ⚠️ **文件备份**: 请妥善保管 .enc 加密文件
- ⚠️ **测试网络**: 当前使用测试网，不适合生产环境

### 限制

- 目前只支持 .txt 文件格式
- 文件大小建议控制在合理范围内（避免 gas 费用过高）
- 链上只存储哈希，不存储文件内容

### Gas 费用

- Base Sepolia 测试网: 几乎免费
- Base 主网: 费用极低
- Ethereum 主网: 费用较高

## 未来计划

- [ ] 支持更多文件格式（PDF, 图片等）
- [ ] 集成 IPFS 存储加密文件
- [ ] 添加文件解密功能
- [ ] 支持批量文件上链
- [ ] 添加文件元数据查询
- [ ] 支持主网部署

## 开发指南

### 构建生产版本

```bash
npm run build
```

### 预览生产版本

```bash
npm run preview
```

### 代码检查

```bash
npm run lint
```

## 常见问题

### Q: 为什么选择 Base Sepolia？

A: Base Sepolia 是 Coinbase 的 L2 测试网，gas 费用极低，工具链成熟，未来迁移到 Base 主网成本低。

### Q: 文件内容会上链吗？

A: 不会。链上只存储文件哈希和元数据，文件内容在本地加密存储。

### Q: 如何解密文件？

A: 目前 MVP 版本不包含解密功能，未来版本会添加。你需要保存加密文件和密码。

### Q: 可以在主网使用吗？

A: 可以，但需要：
1. 将合约部署到主网（Base 主网或 Ethereum 主网）
2. 修改前端配置中的链 ID 和合约地址
3. 使用真实 ETH 支付 gas 费用

## 许可证

MIT License

## 贡献

欢迎提交 Issue 和 Pull Request！

## 联系方式

如有问题，请提交 Issue 或联系维护者。
