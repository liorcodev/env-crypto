#!/usr/bin/env node
import { encryptEnvFile, decryptEnvFile, EnvCryptoError } from '../src/env-crypto.js';
import fs from 'fs';
import path from 'path';

const args = process.argv.slice(2);
const command = args[0];
const DEFAULT_KEY = 'ENV_CRYPTO_KEY';

try {
  if (command === 'encrypt') {
    const sourcePath = args[1] || '.env';
    const outputPath = args[2] || '.env.encrypted';
    const keyEnvVar = args[3] || DEFAULT_KEY;
    encryptEnvFile(sourcePath, outputPath, keyEnvVar);
  } else if (command === 'decrypt') {
    const sourcePath = args[1] || '.env.encrypted';
    const outputPath = args[2] || '.env';
    const keyEnvVar = args[3] || DEFAULT_KEY;

    const vars = decryptEnvFile(sourcePath, keyEnvVar);
    console.log('Decrypted variables:', Object.keys(vars));

    if (outputPath) {
      const envContent =
        Object.entries(vars)
          .map(([key, value]) => {
            const needsQuotes = /[\s,;]/.test(value);
            return needsQuotes ? `${key}="${value}"` : `${key}=${value}`;
          })
          .join('\n') + '\n';

      fs.writeFileSync(path.resolve(process.cwd(), outputPath), envContent);
      console.log(`Decrypted environment saved to ${outputPath}`);
    }
  } else {
    console.log(`
Usage:
  env-crypto encrypt [sourcePath] [outputPath] [keyEnvVar]
  env-crypto decrypt [sourcePath] [outputPath] [keyEnvVar]
    `);
  }
} catch (error) {
  if (error instanceof EnvCryptoError) {
    console.error(`❌ ${error.message}`);
  } else {
    console.error(`❌ Error: ${error}`);
  }
  process.exit(1);
}
