/**
 * 加密工具函数
 * 使用 Web Crypto API 实现 AES-GCM 加密和 SHA-256 哈希
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
 * 从密码派生 AES 密钥 (PBKDF2)
 */
export async function deriveAesKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
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
      salt: new Uint8Array(salt),
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
 * 加密文件内容
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
      iv: new Uint8Array(iv)
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
 * 解密文件内容
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
      iv: new Uint8Array(iv)
    },
    key,
    new Uint8Array(encryptedData)
  );

  return decrypted;
}

/**
 * 将加密数据打包为 .enc 文件格式
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
 * 从 .enc 文件解包加密数据
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
