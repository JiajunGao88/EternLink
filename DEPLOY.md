# 部署指南

本指南将帮助你部署 EternLink 智能合约到 Base Sepolia 测试网。

## 前提条件

1. **安装 MetaMask 钱包**
   - 访问 [MetaMask 官网](https://metamask.io/) 安装浏览器插件
   - 创建或导入钱包账户

2. **获取测试币**
   - 访问 Base Sepolia Faucet: https://docs.base.org/docs/tools/network-faucets
   - 或使用其他测试网水龙头获取测试 ETH

3. **配置 MetaMask 网络**

   如果 MetaMask 中没有 Base Sepolia 网络，请手动添加：

   - **网络名称**: Base Sepolia
   - **RPC URL**: https://sepolia.base.org
   - **链 ID**: 84532
   - **货币符号**: ETH
   - **区块浏览器**: https://sepolia.basescan.org

## 方法一：使用 Remix IDE（推荐）

### 步骤 1: 打开 Remix IDE

访问 [Remix IDE](https://remix.ethereum.org)

### 步骤 2: 创建合约文件

1. 在左侧文件浏览器中，点击 "+" 按钮创建新文件
2. 文件名输入: `ProofOfExistence.sol`
3. 复制 `contracts/ProofOfExistence.sol` 的内容到 Remix 编辑器

### 步骤 3: 编译合约

1. 点击左侧 "Solidity Compiler" 图标（齿轮图标）
2. 选择编译器版本: `0.8.20` 或更高版本
3. 点击 "Compile ProofOfExistence.sol" 按钮
4. 等待编译完成，底部应显示 "Compilation successful"

### 步骤 4: 部署合约

1. 点击左侧 "Deploy & Run Transactions" 图标（右箭头图标）
2. 在 "Environment" 下拉菜单中选择 "Injected Provider - MetaMask"
3. Remix 会自动连接你的 MetaMask 钱包
4. **重要**: 确保 MetaMask 当前网络为 "Base Sepolia" (链ID: 84532)
5. 如果网络不正确，在 MetaMask 中切换到 Base Sepolia 网络
6. 点击 "Deploy" 按钮
7. MetaMask 会弹出交易确认窗口，点击 "确认"
8. 等待交易确认（通常几秒钟）

### 步骤 5: 记录合约地址

1. 部署成功后，在 Remix 底部的 "Deployed Contracts" 区域会显示合约地址
2. 合约地址格式: `0x...`
3. **重要**: 复制并保存这个地址，后续需要在前端配置中使用

### 步骤 6: 验证部署

1. 访问 [Base Sepolia 区块浏览器](https://sepolia.basescan.org)
2. 在搜索框中输入你的合约地址
3. 应该能看到 "Contract Creation" 交易记录
4. 点击合约地址可以查看合约详情和交互界面

## 方法二：使用 Hardhat（高级用户）

### 安装 Hardhat

```bash
npm install --save-dev hardhat @nomicfoundation/hardhat-toolbox
npx hardhat init
```

### 配置 Hardhat

创建 `hardhat.config.ts`:

```typescript
import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";

const config: HardhatUserConfig = {
  solidity: "0.8.20",
  networks: {
    baseSepolia: {
      url: "https://sepolia.base.org",
      accounts: [process.env.PRIVATE_KEY || ""],
      chainId: 84532,
    },
  },
};

export default config;
```

### 部署脚本

创建 `scripts/deploy.ts`:

```typescript
import { ethers } from "hardhat";

async function main() {
  const ProofOfExistence = await ethers.getContractFactory("ProofOfExistence");
  const poe = await ProofOfExistence.deploy();
  
  await poe.waitForDeployment();
  const address = await poe.getAddress();
  
  console.log("ProofOfExistence deployed to:", address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
```

### 运行部署

```bash
npx hardhat run scripts/deploy.ts --network baseSepolia
```

## 配置前端

### 方法 1: 在应用界面中配置

1. 启动前端应用: `npm run dev`
2. 在应用界面中的 "合约地址" 输入框填入你部署的合约地址
3. 确保 "链 ID" 为 `84532` (Base Sepolia)

### 方法 2: 在代码中配置

编辑 `src/App.tsx`，修改 `DEFAULTS.CONTRACT_ADDRESS`:

```typescript
const DEFAULTS = {
  CONTRACT_ADDRESS: "0x你的合约地址", // 替换为你的合约地址
  CHAIN_ID: 84532,
  CIPHER: "AES-256-GCM+PBKDF2(250k, SHA-256)",
};
```

### 方法 3: 使用环境变量

1. 创建 `.env` 文件:

```env
VITE_CONTRACT_ADDRESS=0x你的合约地址
VITE_CHAIN_ID=84532
```

2. 在 `src/App.tsx` 中读取环境变量:

```typescript
const DEFAULTS = {
  CONTRACT_ADDRESS: import.meta.env.VITE_CONTRACT_ADDRESS || "0xYourPoEContractAddressHere",
  CHAIN_ID: Number(import.meta.env.VITE_CHAIN_ID) || 84532,
  CIPHER: "AES-256-GCM+PBKDF2(250k, SHA-256)",
};
```

## 测试部署

### 1. 连接钱包

1. 启动前端应用
2. 点击 "连接 MetaMask 钱包" 按钮
3. 在 MetaMask 中确认连接
4. 确保网络为 Base Sepolia

### 2. 上传文件

1. 选择一个 .txt 文件
2. 输入加密密码
3. 点击 "加密并登记上链"

### 3. 验证上链

1. 等待交易确认
2. 点击交易哈希链接查看区块浏览器
3. 使用 "链上验证存在" 按钮验证文件

## 故障排除

### 问题 1: MetaMask 无法连接

**解决方案**:
- 确保已安装 MetaMask 浏览器插件
- 刷新页面重试
- 检查 MetaMask 是否已解锁

### 问题 2: 网络不匹配

**解决方案**:
- 在 MetaMask 中切换到 Base Sepolia 网络
- 或在前端配置中修改链 ID

### 问题 3: 交易失败

**解决方案**:
- 检查钱包余额是否足够支付 gas 费用
- 检查合约地址是否正确
- 查看 MetaMask 错误信息

### 问题 4: 合约地址错误

**解决方案**:
- 确认合约地址已正确复制
- 在区块浏览器中验证合约地址
- 检查合约是否已部署

## 部署到主网

如果要部署到主网（Base 主网或 Ethereum 主网），需要：

1. **修改网络配置**
   - Base 主网: 链 ID `8453`
   - Ethereum 主网: 链 ID `1`

2. **使用真实 ETH**
   - 主网部署需要真实的 ETH 支付 gas 费用
   - 确保钱包有足够的 ETH

3. **更新前端配置**
   - 修改合约地址和链 ID
   - 重新构建并部署前端应用

## 安全建议

1. **私钥安全**: 永远不要泄露私钥或助记词
2. **测试网部署**: 在测试网上充分测试后再部署到主网
3. **代码审计**: 主网部署前进行代码审计
4. **Gas 费用**: 注意主网 gas 费用可能很高

## 参考资料

- [Remix IDE 文档](https://remix-ide.readthedocs.io/)
- [Hardhat 文档](https://hardhat.org/docs)
- [Base 文档](https://docs.base.org/)
- [MetaMask 文档](https://docs.metamask.io/)
