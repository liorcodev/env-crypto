import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto';
import fs from 'fs';
import path from 'path';

const ALGORITHM = 'aes-256-gcm';
export const DEFAULT_KEY = 'ENV_CRYPTO_KEY';

// Add simple error class
export class EnvCryptoError extends Error {
  constructor(
    message: string,
    public code: string,
  ) {
    super(message);
    this.name = 'EnvCryptoError';
  }
}

// Simple memory clearing helper
function clearBuffer(buffer: Buffer): void {
  if (buffer && Buffer.isBuffer(buffer)) {
    buffer.fill(0);
  }
}

/**
 * Validates and resolves a file path to ensure it is within the current working directory.
 * Prevents path traversal and absolute paths outside the project root.
 * @param filePath The file path to validate.
 * @returns The resolved absolute path.
 * @throws EnvCryptoError if the path is outside the working directory.
 */
function validatePath(filePath: string): string {
  const resolved = path.resolve(process.cwd(), filePath);
  const cwd = path.resolve(process.cwd());
  const relative = path.relative(cwd, resolved);

  // Prevent absolute paths outside CWD and path traversal
  if (relative.startsWith('..') || (path.isAbsolute(filePath) && !resolved.startsWith(cwd + path.sep))) {
    throw new EnvCryptoError('Invalid file path: outside working directory', 'INVALID_PATH');
  }
  return resolved;
}

/**
 * Encrypts a plaintext .env file and writes the encrypted output.
 * - Reads the source .env file.
 * - Uses AES-256-GCM with a random salt and IV.
 * - Stores salt, IV, encrypted content, and auth tag in output file.
 * @param sourcePath Path to the plaintext .env file.
 * @param outputPath Path to write the encrypted file.
 * @param keyEnvVar Name of the environment variable containing the encryption key.
 * @throws EnvCryptoError if the key is missing or file operations fail.
 */
export function encryptEnvFile(
  sourcePath: string = '.env',
  outputPath: string = '.env.encrypted',
  keyEnvVar: string = DEFAULT_KEY,
): void {
  let keyBuffer: Buffer | null = null;
  let salt: Buffer | null = null;

  try {
    // Get key from environment variable
    const key = process.env[keyEnvVar];
    if (!key) {
      throw new EnvCryptoError(`Environment variable ${keyEnvVar} not found`, 'KEY_NOT_FOUND');
    }

    // Validate and read the source file
    const validatedSourcePath = validatePath(sourcePath);
    const plaintext = fs.readFileSync(validatedSourcePath, 'utf8');

    // Generate random salt for each encryption
    salt = randomBytes(16);
    keyBuffer = scryptSync(key, salt, 32);

    // Generate initialization vector
    const iv = randomBytes(16);

    // Create cipher
    const cipher = createCipheriv(ALGORITHM, keyBuffer, iv);

    // Encrypt the plaintext
    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    // Get authentication tag for GCM mode
    const authTag = cipher.getAuthTag();

    // Write encrypted file with version, salt, IV and auth tag
    const encryptedData = JSON.stringify({
      version: '1.0.0',
      salt: salt.toString('hex'),
      iv: iv.toString('hex'),
      content: encrypted,
      authTag: authTag.toString('hex'),
    });

    const validatedOutputPath = validatePath(outputPath);
    fs.writeFileSync(validatedOutputPath, encryptedData, { mode: 0o600 });
    console.log(`Encrypted environment file saved to ${outputPath}`);
  } finally {
    // Clear sensitive data
    clearBuffer(keyBuffer!);
    clearBuffer(salt!);
  }
}

/**
 * Decrypts an encrypted .env file and returns the parsed environment variables.
 * - Reads and parses the encrypted file.
 * - Uses AES-256-GCM with salt and IV from the file.
 * - Returns a key-value object of environment variables.
 * @param sourcePath Path to the encrypted file.
 * @param keyEnvVar Name of the environment variable containing the decryption key.
 * @returns Record of environment variable key-value pairs.
 * @throws EnvCryptoError if the key is missing, file is invalid, or decryption fails.
 */
export function decryptEnvFile(
  sourcePath: string = '.env.encrypted',
  keyEnvVar: string = DEFAULT_KEY,
): Record<string, string> {
  let keyBuffer: Buffer | null = null;

  try {
    // Get key from environment variable
    const key = process.env[keyEnvVar];
    if (!key) {
      throw new EnvCryptoError(`Decryption key not found in environment variable ${keyEnvVar}`, 'KEY_NOT_FOUND');
    }

    // Validate and read encrypted file
    const validatedSourcePath = validatePath(sourcePath);
    const encryptedData = JSON.parse(fs.readFileSync(validatedSourcePath, 'utf8'));

    // Validate required fields exist
    if (!encryptedData.salt || !encryptedData.iv || !encryptedData.content || !encryptedData.authTag) {
      throw new EnvCryptoError('Invalid encrypted file format: missing required fields', 'INVALID_FORMAT');
    }

    // Prepare decryption with salt from file
    const salt = Buffer.from(encryptedData.salt, 'hex');
    keyBuffer = scryptSync(key, salt, 32);
    const iv = Buffer.from(encryptedData.iv, 'hex');
    const authTag = Buffer.from(encryptedData.authTag, 'hex');

    // Create decipher
    const decipher = createDecipheriv(ALGORITHM, keyBuffer, iv);
    decipher.setAuthTag(authTag);

    // Decrypt the content
    let decrypted = decipher.update(encryptedData.content, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    // Parse the decrypted content as .env format
    const envVars: Record<string, string> = {};
    decrypted.split('\n').forEach((line) => {
      // Skip comments and empty lines
      if (!line || line.startsWith('#')) return;

      // Parse key-value pairs (supports quoted values)
      const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
      if (match) {
        const key = match[1];
        let value = match[2] || '';

        // Remove quotes if present
        if (
          value.length > 1 &&
          ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'")))
        ) {
          value = value.substring(1, value.length - 1);
        }

        if (typeof key !== 'undefined') {
          envVars[key] = value;
        }
      }
    });

    return envVars;
  } finally {
    // Clear sensitive data
    clearBuffer(keyBuffer!);
  }
}
