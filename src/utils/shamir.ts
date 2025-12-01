const PRIME = 257;

function mod(n: number): number {
  return ((n % PRIME) + PRIME) % PRIME;
}

function modInverse(a: number): number {
  let t = 0;
  let newT = 1;
  let r = PRIME;
  let newR = mod(a);

  while (newR !== 0) {
    const quotient = Math.floor(r / newR);
    [t, newT] = [newT, t - quotient * newT];
    [r, newR] = [newR, r - quotient * newR];
  }

  if (r > 1) {
    throw new Error("Value is not invertible in the field");
  }

  if (t < 0) {
    t += PRIME;
  }

  return t;
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function hexToBytes(hex: string): Uint8Array {
  if (hex.length % 2 !== 0) {
    throw new Error("Invalid hex string");
  }
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.slice(i, i + 2), 16);
  }
  return bytes;
}

function createShare(secret: Uint8Array, coeff: Uint8Array, shareId: number): string {
  const shareBytes = new Uint8Array(secret.length);
  for (let i = 0; i < secret.length; i++) {
    const y = mod(secret[i] + coeff[i] * shareId);
    shareBytes[i] = y;
  }
  return `S${shareId}-${bytesToHex(shareBytes)}`;
}

function parseShare(share: string): { id: number; bytes: Uint8Array } {
  const [prefix, hex] = share.split("-");
  if (!prefix || !prefix.startsWith("S")) {
    throw new Error("Invalid share format");
  }
  const id = Number(prefix.slice(1));
  if (!Number.isFinite(id) || id <= 0) {
    throw new Error("Invalid share identifier");
  }
  return { id, bytes: hexToBytes(hex) };
}

export function splitPassword(password: string): string[] {
  const encoder = new TextEncoder();
  const secret = encoder.encode(password);
  const coeff = new Uint8Array(secret.length);
  crypto.getRandomValues(coeff);

  return [1, 2, 3].map((id) => createShare(secret, coeff, id));
}

export function reconstructPassword(shares: string[]): string {
  if (shares.length < 2) {
    throw new Error("At least two shares are required");
  }

  const [first, second] = shares;
  const s1 = parseShare(first);
  const s2 = parseShare(second);

  if (s1.bytes.length !== s2.bytes.length) {
    throw new Error("Share lengths do not match");
  }

  const secret = new Uint8Array(s1.bytes.length);
  const denominator = mod(s2.id - s1.id);
  const denominatorInv = modInverse(denominator);

  for (let i = 0; i < s1.bytes.length; i++) {
    const numerator = mod(s1.bytes[i] * s2.id - s2.bytes[i] * s1.id);
    secret[i] = mod(numerator * denominatorInv);
  }

  const decoder = new TextDecoder();
  return decoder.decode(secret);
}
