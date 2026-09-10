import { encryptSecret, decryptSecret, hashPassword, verifyPassword, generateSessionToken } from '../server/security/crypto.js';

async function runCryptoTests() {
  console.log('--- Running Cryptography & Secret Security Tests ---');

  // 1. AES-256-GCM Round-trip
  const secretToken = 'ghp_superSecretToken1234567890abcdefghijklmnopqrstuvwxyz';
  const encrypted = encryptSecret(secretToken);
  
  if (!encrypted.ciphertext || !encrypted.iv || !encrypted.authTag) {
    throw new Error('Encryption failed to produce ciphertext, iv, or authTag');
  }
  if (encrypted.ciphertext === secretToken) {
    throw new Error('Ciphertext is unencrypted plaintext!');
  }

  const decrypted = decryptSecret(encrypted.ciphertext, encrypted.iv, encrypted.authTag);
  if (decrypted !== secretToken) {
    throw new Error(`Decryption mismatch! Expected: ${secretToken}, Got: ${decrypted}`);
  }
  console.log('✔ AES-256-GCM encryption & decryption round-trip passed.');

  // 2. Tampering resistance test
  let tamperingDetected = false;
  try {
    // Corrupt one character in ciphertext
    const corruptedCiphertext = encrypted.ciphertext.slice(0, -2) + (encrypted.ciphertext.endsWith('0') ? '1' : '0');
    decryptSecret(corruptedCiphertext, encrypted.iv, encrypted.authTag);
  } catch {
    tamperingDetected = true;
  }
  if (!tamperingDetected) {
    throw new Error('FAILED: Tampered ciphertext was accepted without error!');
  }

  let authTagTamperingDetected = false;
  try {
    // Corrupt auth tag
    const corruptedTag = '0' + encrypted.authTag.slice(1);
    decryptSecret(encrypted.ciphertext, encrypted.iv, corruptedTag);
  } catch {
    authTagTamperingDetected = true;
  }
  if (!authTagTamperingDetected) {
    throw new Error('FAILED: Tampered auth tag was accepted without error!');
  }
  console.log('✔ AES-256-GCM tamper detection passed (authentication tag verification confirmed).');

  // 3. Password Hashing & Verification
  const password = 'TestUserP@ssw0rd!2026';
  const wrongPassword = 'WrongPassword';
  const hash = await hashPassword(password);
  
  if (!hash.includes(':') || hash.length < 50) {
    throw new Error('Invalid Scrypt hash format');
  }

  const valid = await verifyPassword(password, hash);
  if (!valid) {
    throw new Error('Password verification failed for valid password!');
  }

  const invalid = await verifyPassword(wrongPassword, hash);
  if (invalid) {
    throw new Error('Password verification succeeded for invalid password!');
  }
  console.log('✔ Scrypt password hashing and timing-safe verification passed.');

  // 4. Session Token Entropy
  const token1 = generateSessionToken();
  const token2 = generateSessionToken();
  if (token1.length !== 64 || token2.length !== 64) {
    throw new Error('Session token length is not 64 hex characters (256 bits)');
  }
  if (token1 === token2) {
    throw new Error('Session tokens collided!');
  }
  console.log('✔ Cryptographic session token generation passed.');

  console.log('ALL CRYPTOGRAPHY TESTS PASSED SUCCESSFULLY!\n');
}

runCryptoTests().catch(err => {
  console.error('Crypto Test Failed:', err);
  process.exit(1);
});
