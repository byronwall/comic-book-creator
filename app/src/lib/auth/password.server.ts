import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";

function derive(password: string, salt: Buffer, length: number, options: { N: number; r: number; p: number; maxmem: number }) {
  return new Promise<Buffer>((resolve, reject) => {
    scryptCallback(password, salt, length, options, (error, key) => {
      if (error) reject(error);
      else resolve(key as Buffer);
    });
  });
}
const N = 131072;
const r = 8;
const p = 1;
const keyLength = 64;
const maxmem = 256 * 1024 * 1024;

export async function hashPassword(password: string): Promise<string> {
  if (typeof password !== "string" || password.length < 6) {
    throw new Error("Password must contain at least 6 characters.");
  }
  const salt = randomBytes(16);
  const key = await derive(password, salt, keyLength, { N, r, p, maxmem });
  return `scrypt$${N}$${r}$${p}$${salt.toString("base64url")}$${key.toString("base64url")}`;
}

export async function verifyPassword(password: string, encoded: string): Promise<boolean> {
  const parts = encoded.split("$");
  if (parts.length !== 6 || parts[0] !== "scrypt") return false;
  const [nText, rText, pText, saltText, keyText] = parts.slice(1);
  const n = Number(nText);
  const workR = Number(rText);
  const workP = Number(pText);
  if (!Number.isSafeInteger(n) || n < 2 || (n & (n - 1)) !== 0 || n > N
    || workR !== r || workP !== p) return false;
  try {
    const salt = Buffer.from(saltText!, "base64url");
    const expected = Buffer.from(keyText!, "base64url");
    if (salt.length < 16 || expected.length !== keyLength) return false;
    const actual = await derive(password, salt, expected.length, {
      N: n, r: workR, p: workP, maxmem,
    });
    return timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}
