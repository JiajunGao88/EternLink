# 快速开始指南

本指南将帮助你在 10 分钟内快速运行 EternLink MVP。

## 前提条件

- Node.js 16+ 和 npm
- MetaMask 浏览器插件
- 一个 Base Sepolia 测试网账户（有测试 ETH）

## 步骤 1: 安装依赖

```bash
npm install
```

## 步骤 2: 部署智能合约

### 2.1 打开 Remix IDE

访问 [Remix IDE](https://remix.ethereum.org)

### 2.2 创建合约文件

1. 点击左侧 "+" 按钮创建新文件
2. 命名为 `ProofOfExistence.sol`
3. 复制 `contracts/ProofOfExistence.sol` 的内容到编辑器

### 2.3 编译合约

1. 点击左侧 "Solidity Compiler" 图标
2. 选择编译器版本 `0.8.20`
3. 点击 "Compile ProofOfExistence.sol"

### 2.4 部署合约

1. 点击左侧 "Deploy & Run Transactions" 图标
2. 在 "Environment" 中选择 "Injected Provider - MetaMask"
3. **重要**: 确保 MetaMask 网络为 Base Sepolia (链ID: 84532)
   - 如果没有，请手动添加网络：
     - 网络名称: Base Sepolia
     - RPC URL: https://sepolia.base.org
     - 链 ID: 84532
     - 货币符号: ETH
     - 区块浏览器: https://sepolia.basescan.org
4. 点击 "Deploy" 按钮
5. 在 MetaMask 中确认交易
6. 等待部署完成（通常几秒钟）
7. **复制合约地址**（格式: 0x...）

### 2.5 获取测试币

如果钱包中没有测试 ETH，访问 Base Sepolia Faucet:
- https://docs.base.org/docs/tools/network-faucets

## 步骤 3: 配置前端

### 方法 1: 在应用界面中配置（推荐）

1. 启动应用后，在界面中的 "合约地址" 输入框填入你部署的合约地址
2. 确保 "链 ID" 为 `84532`

### 方法 2: 在代码中配置

编辑 `src/App.tsx`，修改第 21 行:

```typescript
const DEFAULTS = {
  CONTRACT_ADDRESS: "0x你的合约地址", // 替换为你的合约地址
  CHAIN_ID: 84532,
  CIPHER: "AES-256-GCM+PBKDF2(250k, SHA-256)",
};
```

## 步骤 4: 启动应用

```bash
npm run dev
```

访问 http://localhost:5173

## 步骤 5: 使用应用

### 5.1 连接钱包

1. 点击 "连接 MetaMask 钱包" 按钮
2. 在 MetaMask 中确认连接
3. 确保网络为 Base Sepolia

### 5.2 上传文件

1. 点击 "选择文件 (.txt)" 按钮
2. 选择一个 .txt 文件（可以使用项目中的 `test-file.txt`）
3. 输入加密密码（请妥善保管）
4. 点击 "加密并登记上链" 按钮
5. 在 MetaMask 中确认交易
6. 等待交易确认（通常几秒钟）

### 5.3 验证文件

1. 选择相同的 .txt 文件
2. 点击 "链上验证存在" 按钮
3. 应该显示 "✅ 文件已存在于区块链上！"

### 5.4 查看交易

1. 点击交易哈希链接
2. 在 Base Sepolia 区块浏览器中查看交易详情
3. 可以看到 `FileRegistered` 事件

## 常见问题

### Q: MetaMask 无法连接

**A**: 确保已安装 MetaMask 浏览器插件，并已解锁钱包。

### Q: 网络不匹配

**A**: 在 MetaMask 中切换到 Base Sepolia 网络（链ID: 84532）。

### Q: 交易失败

**A**: 
- 检查钱包余额是否足够支付 gas 费用
- 检查合约地址是否正确
- 查看 MetaMask 错误信息

### Q: 合约地址错误

**A**: 
- 确认合约地址已正确复制
- 在区块浏览器中验证合约地址
- 检查合约是否已部署

### Q: 找不到 Base Sepolia 网络

**A**: 手动添加网络：
- 网络名称: Base Sepolia
- RPC URL: https://sepolia.base.org
- 链 ID: 84532
- 货币符号: ETH
- 区块浏览器: https://sepolia.basescan.org

## 下一步

- 阅读 [README.md](./README.md) 了解完整功能
- 阅读 [ARCHITECTURE.md](./ARCHITECTURE.md) 了解架构设计
- 阅读 [DEPLOY.md](./DEPLOY.md) 了解部署详情

## 获取帮助

如果遇到问题，请：
1. 查看 [README.md](./README.md) 中的常见问题
2. 查看 [DEPLOY.md](./DEPLOY.md) 中的故障排除
3. 提交 Issue 获取帮助
