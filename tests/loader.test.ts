/**
 * Tests for env-loader module.
 * Ensures environment variables are loaded, parsed, and initialized correctly from encrypted files.
 */
import { describe, it, expect, afterAll } from 'bun:test';
import { encryptEnvFile } from '../src/env-crypto';
import { env, initEnv, resetEnv } from '../src/env-loader';

describe('Environment Loader', () => {
  const ENV_CRYPTO_KEY = 'mkNA802Hqwxpl6c0';

  // Clean up any test files created during the tests
  afterAll(async () => {
    const envFile = Bun.file('.env');
    const encryptedEnvFile = Bun.file('.env.encrypted');
    if (await envFile.exists()) envFile.delete();
    if (await encryptedEnvFile.exists()) encryptedEnvFile.delete();
  });

  it('should initialize environment variables', async () => {
    // Arrange: Write a test .env file and encrypt it
    const sourcePath = '.env';
    const outputPath = '.env.encrypted';

    process.env['ENV_CRYPTO_KEY'] = ENV_CRYPTO_KEY;
    await Bun.write(sourcePath, 'TEST_VAR=123\nANOTHER_VAR=hello,world\nEXTRA_VAR=extra\n');

    // Encrypt the environment file
    encryptEnvFile(sourcePath, outputPath);

    // Wait briefly to ensure file is written
    await new Promise((resolve) => setTimeout(resolve, 10));

    // Act: Initialize environment variables from encrypted file
    initEnv();

    // Assert: Check parsed values
    expect(env.TEST_VAR).toBe(123);
    expect(env.ANOTHER_VAR).toEqual(['hello', 'world']);
    expect(env.EXTRA_VAR).toBe('extra');
  });

  it('should execute only once even if called multiple times', async () => {
    // Arrange: Write and encrypt a test .env file
    const sourcePath = '.env';
    const outputPath = '.env.encrypted';

    process.env['ENV_CRYPTO_KEY'] = ENV_CRYPTO_KEY;
    await Bun.write(sourcePath, 'TEST_VAR=123');

    // Encrypt the environment file
    encryptEnvFile(sourcePath, outputPath);

    // Wait briefly to ensure file is written
    await new Promise((resolve) => setTimeout(resolve, 10));

    // Act: Call initEnv multiple times
    initEnv();
    const returnEnv = initEnv(); // Should return the same object

    // Assert: Check that the returned object is the same and values are correct
    expect(returnEnv).toBe(env);
    expect(returnEnv.TEST_VAR).toBe(123);
  });

  it('should throw error when decryption fails', async () => {
    // Arrange: Reset the initialization state and remove the encryption key
    resetEnv();
    delete process.env['ENV_CRYPTO_KEY'];

    // Act & Assert: Attempt to initialize environment and expect an error
    expect(() => {
      initEnv();
    }).toThrowErrorMatchingInlineSnapshot(`"Failed to load encrypted environment variables"`);

    // Restore the key for other tests
    process.env['ENV_CRYPTO_KEY'] = ENV_CRYPTO_KEY;
  });
});
