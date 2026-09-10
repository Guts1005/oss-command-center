import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // 96 bits for AES-GCM
const KEY_LENGTH = 32; // 256 bits

/**
 * Derives a consistent 256-bit key from the environment variable ENCRYPTION_KEY.
 * Falls back to a deterministic development key if not configured in .env.
 */
function getMasterKey(): Buffer {
  const secret = process.env.ENCRYPTION_KEY || 'oss-command-center-default-dev-secret-key-32b';
  // Use scrypt to derive a 256-bit key with a fixed application salt
  return crypto.scryptSync(secret, 'oss-command-center-token-salt-v1', KEY_LENGTH);
}

/**
 * Encrypts a plaintext string (e.g. GitHub/GitLab PAT) using AES-256-GCM.
 * Generates a fresh 12-byte random IV for every encryption call.
 */
export function encryptSecret(plainText: string): { ciphertext: string; iv: string; authTag: string } {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, getMasterKey(), iv);
  
  let ciphertext = cipher.update(plainText, 'utf8', 'hex');
  ciphertext += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');

  return {
    ciphertext,
    iv: iv.toString('hex'),
    authTag
  };
}

/**
 * Decrypts a ciphertext string using AES-256-GCM.
 * Verifies the authentication tag to guarantee integrity and authenticity.
 * Throws an error if the key, ciphertext, IV, or authTag have been tampered with.
 */
export function decryptSecret(ciphertext: string, ivHex: string, authTagHex: string): string {
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  const decipher = crypto.createDecipheriv(ALGORITHM, getMasterKey(), iv);
  
  decipher.setAuthTag(authTag);
  
  let decrypted = decipher.update(ciphertext, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

/**
 * Hashes a plaintext password using Node's native crypto.scrypt with a 16-byte random salt.
 * Formats output as `salt:derivedKeyHex`.
 */
export async function hashPassword(password: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const salt = crypto.randomBytes(16).toString('hex');
    crypto.scrypt(password, salt, 64, (err, derivedKey) => {
      if (err) return reject(err);
      resolve(`${salt}:${derivedKey.toString('hex')}`);
    });
  });
}

/**
 * Verifies a password against a stored hash using timing-safe comparison.
 */
export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  return new Promise((resolve) => {
    const parts = storedHash.split(':');
    if (parts.length !== 2) return resolve(false);
    
    const [salt, keyHex] = parts;
    crypto.scrypt(password, salt, 64, (err, derivedKey) => {
      if (err) return resolve(false);
      try {
        const storedKey = Buffer.from(keyHex, 'hex');
        if (storedKey.length !== derivedKey.length) return resolve(false);
        resolve(crypto.timingSafeEqual(storedKey, derivedKey));
      } catch {
        resolve(false);
      }
    });
  });
}

/**
 * Generates a 256-bit cryptographically secure session token.
 */
export function generateSessionToken(): string {
  return crypto.randomBytes(32).toString('hex');
}
