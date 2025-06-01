# env-crypto

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)

`env-crypto` is a utility to encrypt and decrypt environment variables in Node.js and Bun applications, helping you keep sensitive configuration data secure.

## Features

- **Strong Encryption:** Uses `aes-256-gcm` algorithm for robust encryption.
- **Easy Integration:** Simple functions to encrypt and decrypt `.env` files.
- **CLI Tool:** Comes with a command-line interface for quick operations.
- **Custom Key Support:** Use a custom environment variable for your encryption/decryption key.
- **Automatic Env Loading:** Decrypt and load environment variables into your application's process.

## Table of Contents

- [Installation](#installation)
- [Usage](#usage)
  - [Command Line Interface (CLI)](#command-line-interface-cli)
  - [Programmatic Usage](#programmatic-usage)
- [API Reference](#api-reference)
  - [`encryptEnvFile(sourcePath?, outputPath?, keyEnvVar?)`](#encryptenvfilesourcepath-outputpath-keyenvvar)
  - [`decryptEnvFile(sourcePath?, keyEnvVar?)`](#decryptenvfilesourcepath-keyenvvar)
  - [`initEnv(sourcePath?, keyEnvVar?)`](#initenvsourcepath-keyenvvar)
  - [`env`](#env)
- [Contributing](#contributing)
- [License](#license)

## Installation

```bash
# Using npm
npm install env-crypto

# Using bun
bun add env-crypto
```

## Usage

### Command Line Interface (CLI)

The CLI tool allows you to encrypt and decrypt your environment files directly from the terminal.

**Prerequisites:**
Ensure your encryption/decryption key is set as an environment variable. By default, `env-crypto` looks for `ENV_CRYPTO_KEY`.

```bash
export ENV_CRYPTO_KEY="your-super-secret-key"
```

**Encrypting an environment file:**

This command reads `.env` (by default), encrypts its content, and saves it to `.env.encrypted` (by default).

```bash
npx env-crypto encrypt [sourcePath] [outputPath] [keyEnvVar]
```

- `sourcePath` (optional): Path to the source `.env` file. Defaults to `.env`.
- `outputPath` (optional): Path to save the encrypted file. Defaults to `.env.encrypted`.
- `keyEnvVar` (optional): The environment variable name holding the encryption key. Defaults to `ENV_CRYPTO_KEY`.

Example:

```bash
# Encrypt .env to .env.encrypted using ENV_CRYPTO_KEY
npx env-crypto encrypt

# Encrypt .env.dev to .env.dev.enc using MY_CUSTOM_KEY
export MY_CUSTOM_KEY="another-secret"
npx env-crypto encrypt .env.dev .env.dev.enc MY_CUSTOM_KEY
```

**Decrypting an environment file:**

This command reads an encrypted file (e.g., `.env.encrypted`), decrypts its content, and by default, writes it back to `.env`. It also prints the decrypted variable keys to the console.

```bash
npx env-crypto decrypt [sourcePath] [outputPath] [keyEnvVar]
```

- `sourcePath` (optional): Path to the encrypted file. Defaults to `.env.encrypted`.
- `outputPath` (optional): Path to save the decrypted `.env` file. Defaults to `.env`. If not provided, decrypted variables are only printed.
- `keyEnvVar` (optional): The environment variable name holding the decryption key. Defaults to `ENV_CRYPTO_KEY`.

Example:

```bash
# Decrypt .env.encrypted to .env using ENV_CRYPTO_KEY
npx env-crypto decrypt

# Decrypt .env.prod.enc to .env.prod using MY_PROD_KEY
export MY_PROD_KEY="production-secret"
npx env-crypto decrypt .env.prod.enc .env.prod MY_PROD_KEY
```

### Programmatic Usage

You can integrate `env-crypto` directly into your Node.js or Bun application.

**1. Encrypting a file:**

```typescript
import { encryptEnvFile } from 'env-crypto';

// Ensure your encryption key is in process.env
process.env.ENV_CRYPTO_KEY = 'your-super-secret-key';

try {
  // Encrypts '.env' to '.env.encrypted' using 'ENV_CRYPTO_KEY'
  encryptEnvFile();
  console.log('Encryption successful!');

  // With custom paths and key variable
  // process.env.MY_APP_KEY = 'another-key';
  // encryptEnvFile('.env.development', '.env.dev.enc', 'MY_APP_KEY');
} catch (error) {
  console.error('Encryption failed:', error);
}
```

**2. Decrypting a file and loading variables:**

The `initEnv(sourcePath?, keyEnvVar?)` function decrypts the specified encrypted file (defaults to `.env.encrypted` using `ENV_CRYPTO_KEY`) and loads the variables into a special `env` object. It also attempts to populate `process.env` for compatibility, converting arrays to JSON strings.

```typescript
// At the very beginning of your application
import { initEnv, env } from 'env-crypto';

// Ensure your decryption key is in process.env
process.env.ENV_CRYPTO_KEY = 'your-super-secret-key';

try {
  initEnv(); // Decrypts and loads variables

  // Access your decrypted variables
  console.log('API Key:', env.API_KEY);
  console.log('Database URL:', env.DATABASE_URL);

  // Variables are also available in process.env (arrays as JSON strings)
  // console.log('Processed API Key:', process.env.API_KEY);
} catch (error) {
  console.error('Failed to initialize environment:', error);
  process.exit(1); // Exit if critical env vars can't be loaded
}

// ... rest of your application logic
```

**3. Decrypting a file to get variables as an object:**

If you only need the decrypted variables as an object without automatically loading them:

```typescript
import { decryptEnvFile } from 'env-crypto';

process.env.ENV_CRYPTO_KEY = 'your-super-secret-key';

try {
  // Decrypts '.env.encrypted' using 'ENV_CRYPTO_KEY'
  const decryptedVariables = decryptEnvFile();
  console.log('My Secret:', decryptedVariables.MY_SECRET_VAR);

  // With custom path and key variable
  // process.env.MY_OTHER_KEY = 'yet-another-key';
  // const customVars = decryptEnvFile('.env.custom.enc', 'MY_OTHER_KEY');
  // console.log('Custom Data:', customVars.CUSTOM_DATA);
} catch (error) {
  console.error('Decryption failed:', error);
}
```

## API Reference

### `encryptEnvFile(sourcePath?, outputPath?, keyEnvVar?)`

Encrypts an environment file.

- `sourcePath: string` (optional): Path to the source `.env` file. Defaults to `.env`.
- `outputPath: string` (optional): Path to save the encrypted file. Defaults to `.env.encrypted`.
- `keyEnvVar: string` (optional): The environment variable name holding the encryption key. Defaults to `ENV_CRYPTO_KEY`.

Throws an error if the `keyEnvVar` is not found in `process.env`.

### `decryptEnvFile(sourcePath?, keyEnvVar?)`

Decrypts an environment file and returns the variables as a `Record<string, string>`.

- `sourcePath: string` (optional): Path to the encrypted file. Defaults to `.env.encrypted`.
- `keyEnvVar: string` (optional): The environment variable name holding the decryption key. Defaults to `ENV_CRYPTO_KEY`.

Returns: `Record<string, string>` - An object containing the decrypted key-value pairs.
Throws an error if the `keyEnvVar` is not found or if decryption fails (e.g., malformed file, incorrect key).

### `initEnv(sourcePath?, keyEnvVar?)`

Initializes the environment by decrypting the specified encrypted environment file and loading the variables into the `env` object and `process.env`. This function will only execute its core logic once, even if called multiple times.

- `sourcePath: string` (optional): Path to the encrypted file. Defaults to `.env.encrypted`.
- `keyEnvVar: string` (optional): The environment variable name holding the decryption key. Defaults to `ENV_CRYPTO_KEY`.

Returns: The `env` object.
Throws an error if decryption or loading fails.

### `env`

An object that holds the decrypted environment variables after `initEnv()` has been successfully called.
Values are processed:

- Numeric strings are converted to `Number`.
- Comma-separated strings are converted to `string[]`.
- Other values remain `string`.

Example:

```typescript
import { initEnv, env } from 'env-crypto';
// ... (ensure key is set and call initEnv)
const port = env.PORT; // Could be a number if PORT="3000"
const features = env.FEATURES_ENABLED; // Could be an array if FEATURES_ENABLED="feature1,feature2"
```

## Contributing

Contributions are welcome! Please feel free to submit a pull request or open an issue for bugs, feature requests, or improvements.

1.  Fork the repository.
2.  Create your feature branch (`git checkout -b feature/AmazingFeature`).
3.  Commit your changes (`git commit -m 'Add some AmazingFeature'`).
4.  Push to the branch (`git push origin feature/AmazingFeature`).
5.  Open a Pull Request.

Please ensure your code adheres to the existing style and that all tests pass.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

Made with ❤️ by Lior Cohen
