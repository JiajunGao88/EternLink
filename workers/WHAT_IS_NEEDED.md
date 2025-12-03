# 到底需要什么？私钥还是地址？

## 明确答案：需要私钥（Private Key），不是地址（Address）

### 代码证据

看 `workers/src/index.ts` 第 72 行：
```typescript
const wallet = new ethers.Wallet(privateKey, provider);
```

`ethers.Wallet` 构造函数**必须**使用私钥来创建钱包对象，这样才能：
1. 签名交易
2. 发送交易到区块链
3. 支付 gas 费用

**地址无法签名交易**，所以不能用地址。

## 为什么你可能记得是地址？

1. **代码中有两个变量**：
   - `COMPANY_WALLET_ADDRESS` - 这是地址（42 字符），用于**显示**在健康检查 API 中
   - `COMPANY_WALLET_PRIVATE_KEY` - 这是私钥（66 字符），用于**签名交易**

2. **你可能看到了地址**：
   - 在健康检查 API 响应中：`{"wallet": "0x1A81508179191CF22Aa94B921394f644982728f4"}`
   - 在代码中：`const COMPANY_WALLET_ADDRESS = "0x1A81508179191CF22Aa94B921394f644982728f4";`
   - 但这些只是用于显示，不是实际使用的

## 实际需要什么？

### ✅ 需要设置到 Workers Secret：
- **名称**: `COMPANY_WALLET_PRIVATE_KEY`
- **值**: 你的私钥（66 个字符，以 `0x` 开头）
- **格式**: `0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef`

### ❌ 不需要设置：
- 地址已经在代码中硬编码了（`COMPANY_WALLET_ADDRESS`）
- 地址是公开的，可以安全地放在代码中

## 如何获取私钥？

### MetaMask：
1. 打开 MetaMask
2. 点击账户旁边的三个点（...）
3. Account details
4. Export Private Key
5. 输入密码
6. 复制私钥（66 个字符）

### 其他钱包：
查看钱包软件的"导出私钥"功能。

## 设置命令

```bash
cd workers
wrangler secret put COMPANY_WALLET_PRIVATE_KEY --env production
```

然后粘贴你的**私钥**（66 个字符），不是地址（42 个字符）。

## 总结

- **私钥** = 66 字符，用于签名交易 ✅ **需要设置**
- **地址** = 42 字符，用于显示，已经在代码中 ✅ **不需要设置**

