/**
 * 智能合约交互工具
 */
import { ethers } from "ethers";

// 合约 ABI
export const POE_ABI = [
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "internalType": "address", "name": "owner", "type": "address" },
      { "indexed": true, "internalType": "bytes32", "name": "fileHash", "type": "bytes32" },
      { "indexed": false, "internalType": "string", "name": "cipher", "type": "string" },
      { "indexed": false, "internalType": "string", "name": "cid", "type": "string" },
      { "indexed": false, "internalType": "uint256", "name": "size", "type": "uint256" },
      { "indexed": false, "internalType": "string", "name": "mime", "type": "string" },
      { "indexed": false, "internalType": "uint256", "name": "heartbeatInterval", "type": "uint256" },
      { "indexed": false, "internalType": "address[]", "name": "beneficiaries", "type": "address[]" }
    ],
    "name": "FileRegistered",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "internalType": "bytes32", "name": "fileHash", "type": "bytes32" },
      { "indexed": true, "internalType": "address", "name": "owner", "type": "address" },
      { "indexed": false, "internalType": "uint256", "name": "timestamp", "type": "uint256" }
    ],
    "name": "HeartbeatUpdated",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "internalType": "bytes32", "name": "fileHash", "type": "bytes32" },
      { "indexed": true, "internalType": "address", "name": "owner", "type": "address" },
      { "indexed": false, "internalType": "address[]", "name": "beneficiaries", "type": "address[]" },
      { "indexed": false, "internalType": "uint256", "name": "timestamp", "type": "uint256" }
    ],
    "name": "RecoveryTriggered",
    "type": "event"
  },
  {
    "inputs": [
      { "internalType": "bytes32", "name": "fileHash", "type": "bytes32" },
      { "internalType": "string", "name": "cipher", "type": "string" },
      { "internalType": "string", "name": "cid", "type": "string" },
      { "internalType": "uint256", "name": "size", "type": "uint256" },
      { "internalType": "string", "name": "mime", "type": "string" },
      { "internalType": "uint256", "name": "heartbeatInterval", "type": "uint256" },
      { "internalType": "address[]", "name": "beneficiaries", "type": "address[]" }
    ],
    "name": "register",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "bytes32", "name": "fileHash", "type": "bytes32" }],
    "name": "exists",
    "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "bytes32", "name": "fileHash", "type": "bytes32" }],
    "name": "checkTimeout",
    "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "bytes32", "name": "fileHash", "type": "bytes32" }],
    "name": "heartbeat",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "bytes32", "name": "fileHash", "type": "bytes32" }],
    "name": "triggerRecovery",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  }
];

/**
 * 连接 MetaMask 钱包
 */
export async function connectWallet(): Promise<ethers.BrowserProvider> {
  if (!window.ethereum) {
    throw new Error("请安装 MetaMask 钱包");
  }
  
  const provider = new ethers.BrowserProvider(window.ethereum);
  await provider.send("eth_requestAccounts", []);
  return provider;
}

/**
 * 检查网络是否正确
 */
export async function checkNetwork(provider: ethers.BrowserProvider, chainId: number): Promise<boolean> {
  const network = await provider.getNetwork();
  return Number(network.chainId) === chainId;
}

/**
 * 切换到指定网络
 */
export async function switchNetwork(chainId: number): Promise<void> {
  if (!window.ethereum) {
    throw new Error("请安装 MetaMask 钱包");
  }
  
  try {
    await window.ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: `0x${chainId.toString(16)}` }],
    });
  } catch (switchError: any) {
    // 如果网络不存在，尝试添加网络
    if (switchError.code === 4902) {
      throw new Error(`请先在 MetaMask 中添加网络 (链ID: ${chainId})`);
    }
    throw switchError;
  }
}

/**
 * 获取合约实例
 */
export function getContract(
  address: string,
  provider: ethers.BrowserProvider | ethers.JsonRpcProvider
): ethers.Contract {
  return new ethers.Contract(address, POE_ABI, provider);
}

/**
 * 注册文件到链上
 */
export async function registerFile(
  contract: ethers.Contract,
  fileHash: string,
  cipher: string,
  cid: string,
  size: number,
  mime: string,
  heartbeatInterval: number,
  beneficiaries: string[]
): Promise<ethers.ContractTransactionResponse> {
  return await contract.register(
    fileHash,
    cipher,
    cid,
    size,
    mime,
    heartbeatInterval,
    beneficiaries
  );
}

export async function sendHeartbeat(
  contract: ethers.Contract,
  fileHash: string
): Promise<ethers.ContractTransactionResponse> {
  return await contract.heartbeat(fileHash);
}

export async function checkTimeout(
  contract: ethers.Contract,
  fileHash: string
): Promise<boolean> {
  return await contract.checkTimeout(fileHash);
}

export async function triggerRecovery(
  contract: ethers.Contract,
  fileHash: string
): Promise<ethers.ContractTransactionResponse> {
  return await contract.triggerRecovery(fileHash);
}

/**
 * 检查文件是否存在
 */
export async function checkFileExists(
  contract: ethers.Contract,
  fileHash: string
): Promise<boolean> {
  return await contract.exists(fileHash);
}

// 扩展 Window 接口以支持 ethereum
declare global {
  interface Window {
    ethereum?: any;
  }
}
