/**
 * 加密工具函数
 * 使用 Web Crypto API 实现 AES-GCM 加密和 SHA-256 哈希
 *
 * 支持两种模式：
 * 1. 密码模式（旧）：用户输入密码，派生 AES 密钥
 * 2. 随机密钥模式（新）：系统生成随机 AES 密钥，用于 SSS 分片
 */

/**
 * 计算 SHA-256 哈希
 */
export async function sha256(buffer: ArrayBuffer): Promise<Uint8Array> {
  const hash = await crypto.subtle.digest("SHA-256", buffer);
  return new Uint8Array(hash);
}

/**
 * 将 Uint8Array 转换为十六进制字符串
 */
export function hex32(u8: Uint8Array): string {
  return "0x" + Array.from(u8).map(b => b.toString(16).padStart(2, "0")).join("");
}

/**
 * 将十六进制字符串转换为 Uint8Array
 */
export function hexToBytes(hex: string): Uint8Array {
  const cleanHex = hex.startsWith('0x') ? hex.slice(2) : hex;
  const bytes = new Uint8Array(cleanHex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(cleanHex.substr(i * 2, 2), 16);
  }
  return bytes;
}

/**
 * 将 Uint8Array 转换为十六进制字符串（不带 0x 前缀）
 */
export function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * 生成随机 AES-256 密钥（32 字节）
 * 用于 SSS 分片模式
 */
export function generateRandomKey(): string {
  const keyBytes = crypto.getRandomValues(new Uint8Array(32));
  return bytesToHex(keyBytes);
}

/**
 * 从密码派生 AES 密钥 (PBKDF2)
 * 用于密码模式（旧）
 */
async function deriveAesKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    enc.encode(password),
    "PBKDF2",
    false,
    ["deriveKey"]
  );

  return await crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: salt as BufferSource,
      iterations: 250000,
      hash: "SHA-256"
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

/**
 * 从十六进制密钥字符串导入 AES 密钥
 * 用于 SSS 分片模式（新）
 */
async function importAesKey(keyHex: string): Promise<CryptoKey> {
  const keyBytes = hexToBytes(keyHex);
  return await crypto.subtle.importKey(
    "raw",
    keyBytes.buffer as ArrayBuffer,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

/**
 * 使用随机密钥加密文件（SSS 模式）
 * @param fileContent 文件内容 (ArrayBuffer)
 * @param keyHex 十六进制密钥字符串（64 字符）
 * @returns 加密后的数据 {encrypted: Uint8Array, iv: Uint8Array}
 */
export async function encryptFileWithKey(
  fileContent: ArrayBuffer,
  keyHex: string
): Promise<{
  encrypted: Uint8Array;
  iv: Uint8Array;
}> {
  const iv = crypto.getRandomValues(new Uint8Array(12)); // AES-GCM 使用 12 字节 IV
  const key = await importAesKey(keyHex);

  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: iv },
    key,
    fileContent
  );

  return {
    encrypted: new Uint8Array(encrypted),
    iv: iv
  };
}

/**
 * 使用密钥解密文件（SSS 模式）
 * @param encryptedData 加密的数据
 * @param iv 初始化向量
 * @param keyHex 十六进制密钥字符串
 * @returns 解密后的文件内容 (ArrayBuffer)
 */
export async function decryptFileWithKey(
  encryptedData: Uint8Array,
  iv: Uint8Array,
  keyHex: string
): Promise<ArrayBuffer> {
  const key = await importAesKey(keyHex);

  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: iv as BufferSource },
    key,
    encryptedData as BufferSource
  );

  return decrypted;
}

/**
 * 加密文件内容（密码模式 - 旧，保留兼容性）
 * @param fileContent 文件内容 (ArrayBuffer)
 * @param password 密码
 * @returns 加密后的数据 {encrypted: Uint8Array, iv: Uint8Array, salt: Uint8Array}
 */
export async function encryptFile(
  fileContent: ArrayBuffer,
  password: string
): Promise<{
  encrypted: Uint8Array;
  iv: Uint8Array;
  salt: Uint8Array;
}> {
  // 生成随机盐和 IV
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12)); // AES-GCM 使用 12 字节 IV

  // 派生密钥
  const key = await deriveAesKey(password, salt);

  // 加密
  const encrypted = await crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv: iv
    },
    key,
    fileContent
  );

  return {
    encrypted: new Uint8Array(encrypted),
    iv: iv,
    salt: salt
  };
}

/**
 * 解密文件内容（密码模式 - 旧，保留兼容性）
 * @param encryptedData 加密的数据
 * @param iv 初始化向量
 * @param salt 盐值
 * @param password 密码
 * @returns 解密后的文件内容 (ArrayBuffer)
 */
export async function decryptFile(
  encryptedData: Uint8Array,
  iv: Uint8Array,
  salt: Uint8Array,
  password: string
): Promise<ArrayBuffer> {
  // 派生密钥
  const key = await deriveAesKey(password, salt);

  // 解密
  const decrypted = await crypto.subtle.decrypt(
    {
      name: "AES-GCM",
      iv: iv as BufferSource
    },
    key,
    encryptedData as BufferSource
  );

  return decrypted;
}

/**
 * 将加密数据打包为 .enc 文件格式（密码模式）
 * 格式: [salt(16字节)][iv(12字节)][encrypted data]
 */
export function packEncryptedFile(
  encrypted: Uint8Array,
  iv: Uint8Array,
  salt: Uint8Array
): Blob {
  const totalLength = salt.length + iv.length + encrypted.length;
  const packed = new Uint8Array(totalLength);

  let offset = 0;
  packed.set(salt, offset);
  offset += salt.length;
  packed.set(iv, offset);
  offset += iv.length;
  packed.set(encrypted, offset);

  return new Blob([packed], { type: "application/octet-stream" });
}

/**
 * 将加密数据打包为 .enc 文件格式（SSS 模式 v2）
 * 格式: [version(1字节)][fileHashLen(1字节)][fileHash(66字节)][iv(12字节)][encrypted data]
 * version = 0x03 表示 SSS 模式 v2 (with embedded file hash)
 *
 * @param encrypted - 加密后的数据
 * @param iv - 初始化向量
 * @param fileHash - 文件哈希 (0x + 64 hex chars)
 */
export function packEncryptedFileSSS(
  encrypted: Uint8Array,
  iv: Uint8Array,
  fileHash?: string
): Blob {
  // Use v3 format if fileHash is provided, otherwise v2 for backward compatibility
  if (fileHash) {
    const version = new Uint8Array([0x03]); // SSS v2 mode with embedded hash
    const fileHashBytes = new TextEncoder().encode(fileHash);
    const hashLength = new Uint8Array([fileHashBytes.length]);

    const totalLength = 1 + 1 + fileHashBytes.length + iv.length + encrypted.length;
    const packed = new Uint8Array(totalLength);

    let offset = 0;
    packed.set(version, offset);
    offset += 1;
    packed.set(hashLength, offset);
    offset += 1;
    packed.set(fileHashBytes, offset);
    offset += fileHashBytes.length;
    packed.set(iv, offset);
    offset += iv.length;
    packed.set(encrypted, offset);

    return new Blob([packed], { type: "application/octet-stream" });
  }

  // Legacy v2 format (no embedded hash)
  const version = new Uint8Array([0x02]); // SSS mode marker
  const totalLength = 1 + iv.length + encrypted.length;
  const packed = new Uint8Array(totalLength);

  let offset = 0;
  packed.set(version, offset);
  offset += 1;
  packed.set(iv, offset);
  offset += iv.length;
  packed.set(encrypted, offset);

  return new Blob([packed], { type: "application/octet-stream" });
}

/**
 * 从 .enc 文件解包加密数据（密码模式）
 */
export function unpackEncryptedFile(file: ArrayBuffer): {
  salt: Uint8Array;
  iv: Uint8Array;
  encrypted: Uint8Array;
} {
  const data = new Uint8Array(file);
  const salt = data.slice(0, 16);
  const iv = data.slice(16, 28);
  const encrypted = data.slice(28);

  return { salt, iv, encrypted };
}

/**
 * 从 .enc 文件解包加密数据（SSS 模式）
 * Supports both v2 (0x02) and v3 (0x03 with embedded hash) formats
 */
export function unpackEncryptedFileSSS(file: ArrayBuffer): {
  iv: Uint8Array;
  encrypted: Uint8Array;
  fileHash?: string;
} {
  const data = new Uint8Array(file);
  const version = data[0];

  if (version === 0x03) {
    // v3 format: [version][hashLen][fileHash][iv][encrypted]
    const hashLength = data[1];
    const fileHashBytes = data.slice(2, 2 + hashLength);
    const fileHash = new TextDecoder().decode(fileHashBytes);
    const iv = data.slice(2 + hashLength, 2 + hashLength + 12);
    const encrypted = data.slice(2 + hashLength + 12);

    return { iv, encrypted, fileHash };
  }

  // v2 format: [version][iv][encrypted]
  const iv = data.slice(1, 13);
  const encrypted = data.slice(13);

  return { iv, encrypted };
}

/**
 * 从 .enc 文件中提取 file hash（如果存在）
 * @returns file hash or null if not embedded
 */
export function extractFileHashFromEncFile(file: ArrayBuffer): string | null {
  const data = new Uint8Array(file);
  const version = data[0];

  if (version === 0x03) {
    const hashLength = data[1];
    const fileHashBytes = data.slice(2, 2 + hashLength);
    return new TextDecoder().decode(fileHashBytes);
  }

  return null;
}

/**
 * 检测加密文件的模式
 * @returns 'sss' | 'sss-v3' | 'password'
 */
export function detectEncryptionMode(file: ArrayBuffer): 'sss' | 'sss-v3' | 'password' {
  const data = new Uint8Array(file);
  if (data[0] === 0x03) {
    return 'sss-v3'; // SSS with embedded file hash
  }
  if (data[0] === 0x02) {
    return 'sss'; // SSS without embedded hash (legacy)
  }
  return 'password';
}

/**
 * 下载文件
 */
export function downloadFile(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
