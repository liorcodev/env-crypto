#!/usr/bin/env node
import { encryptEnvFile, decryptEnvFile } from '../src/env-crypto';
import fs from 'fs';
import path from 'path';

const args = process.argv.slice(2);
const command = args[0];
const DEFAULT_KEY = 'ENV_CRYPTO_KEY';
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

  // Write back to .env file if output path is provided
  if (outputPath) {
    let envContent = '';
    // Format the variables as key=value pairs
    Object.entries(vars).forEach(([key, value]) => {
      // Check if value needs quotes (if it contains spaces or special characters)
      if (/[\s,;]/.test(value)) {
        envContent += `${key}="${value}"\n`;
      } else {
        envContent += `${key}=${value}\n`;
      }
    });

    fs.writeFileSync(path.resolve(process.cwd(), outputPath), envContent);
    console.log(`Decrypted environment saved to ${outputPath}`);
  }
} else {
  console.log(`
Usage:
  env-crypto encrypt [sourcePath] [outputPath] [keyEnvVar]
  env-crypto decrypt [sourcePath] [outputPath] [keyEnvVar]

You can also use npx:
  npx env-crypto encrypt [sourcePath] [outputPath] [keyEnvVar]
  npx env-crypto decrypt [sourcePath] [outputPath] [keyEnvVar]
  `);
}
