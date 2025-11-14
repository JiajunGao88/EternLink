import React, { useState } from "react";
import { motion } from "framer-motion";
import { ethers } from "ethers";
import {
  sha256,
  hex32,
  encryptFile,
  packEncryptedFile,
  downloadFile,
} from "./utils/crypto";
import {
  connectWallet,
  checkNetwork,
  switchNetwork,
  getContract,
  registerFile,
  checkFileExists,
} from "./utils/contract";

// 默认配置
const DEFAULTS = {
  CONTRACT_ADDRESS: "0xYourPoEContractAddressHere", // 请替换为部署的合约地址
  CHAIN_ID: 84532, // Base Sepolia
  CIPHER: "AES-256-GCM+PBKDF2(250k, SHA-256)",
};

interface FileInfo {
  name: string;
  size: number;
  type: string;
  content: ArrayBuffer;
}

function App() {
  const [contractAddress, setContractAddress] = useState(DEFAULTS.CONTRACT_ADDRESS);
  const [chainId, setChainId] = useState(DEFAULTS.CHAIN_ID);
  const [ipfsCid, setIpfsCid] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [fileInfo, setFileInfo] = useState<FileInfo | null>(null);
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<{
    type: "info" | "success" | "error";
    message: string;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [account, setAccount] = useState<string>("");
  const [fileHash, setFileHash] = useState<string>("");
  const [txHash, setTxHash] = useState<string>("");

  // 连接钱包
  const handleConnectWallet = async () => {
    try {
      setStatus(null);
      const provider = await connectWallet();
      const signer = await provider.getSigner();
      const address = await signer.getAddress();
      setAccount(address);

      // 检查网络
      const isCorrectNetwork = await checkNetwork(provider, chainId);
      if (!isCorrectNetwork) {
        setStatus({
          type: "error",
          message: `请切换到链 ID ${chainId} (Base Sepolia)`,
        });
        await switchNetwork(chainId);
      } else {
        setStatus({
          type: "success",
          message: `已连接钱包: ${address.slice(0, 6)}...${address.slice(-4)}`,
        });
      }
    } catch (error: any) {
      setStatus({
        type: "error",
        message: error.message || "连接钱包失败",
      });
    }
  };

  // 处理文件选择
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    // 只允许 .txt 文件
    if (!selectedFile.name.endsWith(".txt")) {
      setStatus({
        type: "error",
        message: "目前只支持 .txt 格式的文件",
      });
      return;
    }

    setFile(selectedFile);
    const content = await selectedFile.arrayBuffer();
    setFileInfo({
      name: selectedFile.name,
      size: selectedFile.size,
      type: selectedFile.type || "text/plain",
      content,
    });
    setStatus({
      type: "info",
      message: `已选择文件: ${selectedFile.name} (${selectedFile.size} 字节)`,
    });
  };

  // 加密并登记上链
  const handleEncryptAndRegister = async () => {
    if (!fileInfo) {
      setStatus({ type: "error", message: "请先选择文件" });
      return;
    }
    if (!password) {
      setStatus({ type: "error", message: "请输入密码" });
      return;
    }
    if (contractAddress === DEFAULTS.CONTRACT_ADDRESS) {
      setStatus({ type: "error", message: "请先配置合约地址" });
      return;
    }

    setLoading(true);
    setStatus(null);

    try {
      // 1. 计算明文哈希
      const hash = await sha256(fileInfo.content);
      const hashHex = hex32(hash);
      setFileHash(hashHex);
      setStatus({ type: "info", message: "已计算文件哈希" });

      // 2. 加密文件
      const { encrypted, iv, salt } = await encryptFile(fileInfo.content, password);
      setStatus({ type: "info", message: "文件加密完成" });

      // 3. 打包并下载加密文件
      const encryptedBlob = packEncryptedFile(encrypted, iv, salt);
      const encryptedFileName = fileInfo.name + ".enc";
      downloadFile(encryptedBlob, encryptedFileName);
      setStatus({ type: "info", message: "已下载加密文件" });

      // 4. 连接钱包并上链
      const provider = await connectWallet();
      const isCorrectNetwork = await checkNetwork(provider, chainId);
      if (!isCorrectNetwork) {
        await switchNetwork(chainId);
      }

      const contract = getContract(contractAddress, provider);
      const signer = await provider.getSigner();
      const contractWithSigner = contract.connect(signer);

      // 5. 调用合约注册
      setStatus({ type: "info", message: "正在提交交易到区块链..." });
      const tx = await registerFile(
        contractWithSigner,
        hashHex,
        DEFAULTS.CIPHER,
        ipfsCid || "",
        fileInfo.size,
        fileInfo.type
      );

      setTxHash(tx.hash);
      setStatus({
        type: "info",
        message: `交易已提交: ${tx.hash}`,
      });

      // 6. 等待交易确认
      await tx.wait();
      setStatus({
        type: "success",
        message: `文件已成功登记到区块链！交易哈希: ${tx.hash}`,
      });
    } catch (error: any) {
      console.error(error);
      setStatus({
        type: "error",
        message: error.message || "加密或上链失败",
      });
    } finally {
      setLoading(false);
    }
  };

  // 验证文件存在
  const handleVerifyFile = async () => {
    if (!fileInfo) {
      setStatus({ type: "error", message: "请先选择文件" });
      return;
    }
    if (contractAddress === DEFAULTS.CONTRACT_ADDRESS) {
      setStatus({ type: "error", message: "请先配置合约地址" });
      return;
    }

    setLoading(true);
    setStatus(null);

    try {
      // 计算文件哈希
      const hash = await sha256(fileInfo.content);
      const hashHex = hex32(hash);

      // 连接钱包
      const provider = await connectWallet();
      const contract = getContract(contractAddress, provider);

      // 检查是否存在
      const exists = await checkFileExists(contract, hashHex);

      if (exists) {
        setStatus({
          type: "success",
          message: "✅ 文件已存在于区块链上！",
        });
      } else {
        setStatus({
          type: "error",
          message: "❌ 文件不存在于区块链上",
        });
      }
    } catch (error: any) {
      setStatus({
        type: "error",
        message: error.message || "验证失败",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", padding: "20px" }}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        style={{
          maxWidth: "800px",
          margin: "0 auto",
          background: "white",
          borderRadius: "20px",
          padding: "40px",
          boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
        }}
      >
        <h1
          style={{
            fontSize: "2.5rem",
            marginBottom: "10px",
            background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            textAlign: "center",
          }}
        >
          EternLink
        </h1>
        <p
          style={{
            textAlign: "center",
            color: "#666",
            marginBottom: "30px",
            fontSize: "1.1rem",
          }}
        >
          文件加密并上链存储
        </p>

        {/* 配置区域 */}
        <div
          style={{
            marginBottom: "30px",
            padding: "20px",
            background: "#f5f5f5",
            borderRadius: "10px",
          }}
        >
          <h3 style={{ marginBottom: "15px" }}>配置</h3>
          <div style={{ marginBottom: "15px" }}>
            <label style={{ display: "block", marginBottom: "5px", fontWeight: "bold" }}>
              合约地址:
            </label>
            <input
              type="text"
              value={contractAddress}
              onChange={(e) => setContractAddress(e.target.value)}
              placeholder="0x..."
              style={{
                width: "100%",
                padding: "10px",
                borderRadius: "5px",
                border: "1px solid #ddd",
                fontSize: "14px",
              }}
            />
          </div>
          <div style={{ marginBottom: "15px" }}>
            <label style={{ display: "block", marginBottom: "5px", fontWeight: "bold" }}>
              链 ID:
            </label>
            <input
              type="number"
              value={chainId}
              onChange={(e) => setChainId(Number(e.target.value))}
              style={{
                width: "100%",
                padding: "10px",
                borderRadius: "5px",
                border: "1px solid #ddd",
                fontSize: "14px",
              }}
            />
          </div>
          <div>
            <label style={{ display: "block", marginBottom: "5px", fontWeight: "bold" }}>
              IPFS CID (可选):
            </label>
            <input
              type="text"
              value={ipfsCid}
              onChange={(e) => setIpfsCid(e.target.value)}
              placeholder="Qm..."
              style={{
                width: "100%",
                padding: "10px",
                borderRadius: "5px",
                border: "1px solid #ddd",
                fontSize: "14px",
              }}
            />
          </div>
        </div>

        {/* 钱包连接 */}
        <div style={{ marginBottom: "30px" }}>
          {!account ? (
            <button
              onClick={handleConnectWallet}
              style={{
                width: "100%",
                padding: "15px",
                background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                color: "white",
                border: "none",
                borderRadius: "10px",
                fontSize: "16px",
                fontWeight: "bold",
                cursor: "pointer",
              }}
            >
              连接 MetaMask 钱包
            </button>
          ) : (
            <div
              style={{
                padding: "15px",
                background: "#e8f5e9",
                borderRadius: "10px",
                textAlign: "center",
              }}
            >
              ✅ 已连接: {account.slice(0, 6)}...{account.slice(-4)}
            </div>
          )}
        </div>

        {/* 文件上传 */}
        <div style={{ marginBottom: "30px" }}>
          <label
            style={{
              display: "block",
              marginBottom: "10px",
              fontWeight: "bold",
              fontSize: "1.1rem",
            }}
          >
            选择文件 (.txt):
          </label>
          <input
            type="file"
            accept=".txt"
            onChange={handleFileSelect}
            style={{
              width: "100%",
              padding: "15px",
              border: "2px dashed #667eea",
              borderRadius: "10px",
              cursor: "pointer",
            }}
          />
          {file && (
            <div style={{ marginTop: "10px", color: "#666" }}>
              已选择: {file.name} ({file.size} 字节)
            </div>
          )}
        </div>

        {/* 密码输入 */}
        <div style={{ marginBottom: "30px" }}>
          <label
            style={{
              display: "block",
              marginBottom: "10px",
              fontWeight: "bold",
              fontSize: "1.1rem",
            }}
          >
            加密密码:
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="请输入密码（请妥善保管）"
            style={{
              width: "100%",
              padding: "15px",
              borderRadius: "10px",
              border: "1px solid #ddd",
              fontSize: "16px",
            }}
          />
        </div>

        {/* 操作按钮 */}
        <div style={{ display: "flex", gap: "10px", marginBottom: "30px" }}>
          <button
            onClick={handleEncryptAndRegister}
            disabled={loading || !file || !password}
            style={{
              flex: 1,
              padding: "15px",
              background: loading
                ? "#ccc"
                : "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
              color: "white",
              border: "none",
              borderRadius: "10px",
              fontSize: "16px",
              fontWeight: "bold",
              cursor: loading ? "not-allowed" : "pointer",
            }}
          >
            {loading ? "处理中..." : "加密并登记上链"}
          </button>
          <button
            onClick={handleVerifyFile}
            disabled={loading || !file}
            style={{
              flex: 1,
              padding: "15px",
              background: loading ? "#ccc" : "#4caf50",
              color: "white",
              border: "none",
              borderRadius: "10px",
              fontSize: "16px",
              fontWeight: "bold",
              cursor: loading ? "not-allowed" : "pointer",
            }}
          >
            链上验证存在
          </button>
        </div>

        {/* 状态显示 */}
        {status && (
          <div
            style={{
              padding: "15px",
              borderRadius: "10px",
              marginBottom: "20px",
              background:
                status.type === "success"
                  ? "#e8f5e9"
                  : status.type === "error"
                  ? "#ffebee"
                  : "#e3f2fd",
              color:
                status.type === "success"
                  ? "#2e7d32"
                  : status.type === "error"
                  ? "#c62828"
                  : "#1565c0",
            }}
          >
            {status.message}
          </div>
        )}

        {/* 交易信息 */}
        {txHash && (
          <div
            style={{
              padding: "15px",
              background: "#f5f5f5",
              borderRadius: "10px",
              marginBottom: "20px",
            }}
          >
            <div style={{ marginBottom: "10px" }}>
              <strong>交易哈希:</strong>{" "}
              <a
                href={`https://sepolia.basescan.org/tx/${txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: "#667eea" }}
              >
                {txHash}
              </a>
            </div>
            {fileHash && (
              <div>
                <strong>文件哈希:</strong> {fileHash}
              </div>
            )}
          </div>
        )}

        {/* 说明 */}
        <div
          style={{
            marginTop: "30px",
            padding: "20px",
            background: "#fff3e0",
            borderRadius: "10px",
            fontSize: "14px",
            lineHeight: "1.6",
          }}
        >
          <h4 style={{ marginBottom: "10px" }}>使用说明:</h4>
          <ol style={{ paddingLeft: "20px" }}>
            <li>在 Remix 中部署 ProofOfExistence.sol 合约</li>
            <li>将部署的合约地址填入上方配置</li>
            <li>连接 MetaMask 钱包（确保网络为 Base Sepolia）</li>
            <li>选择 .txt 文件并输入密码</li>
            <li>点击"加密并登记上链"完成上链</li>
            <li>使用"链上验证存在"验证文件是否已登记</li>
          </ol>
        </div>
      </motion.div>
    </div>
  );
}

export default App;
