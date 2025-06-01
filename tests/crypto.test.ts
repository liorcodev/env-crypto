/**
 * Tests for env-crypto encryption and decryption functionality.
 * Covers encryption, decryption, error handling, and edge cases for .env files.
 */
import { it, expect, describe, afterAll } from 'bun:test';
import { decryptEnvFile, encryptEnvFile } from '../src/env-crypto';

describe('Default Test Suite', () => {
  const ENV_CRYPTO_KEY = 'mkNA802Hqwxpl6c0';

  // Clean up any test files created during the tests
  afterAll(async () => {
    const envFile = Bun.file('.env');
    const encryptedEnvFile = Bun.file('.env.encrypted');
    if (await envFile.exists()) envFile.delete();
    if (await encryptedEnvFile.exists()) encryptedEnvFile.delete();
  });

  it('should encrypt environment file', async () => {
    // Arrange: Set up test .env file and encryption key
    const sourcePath = '.env';
    const outputPath = '.env.encrypted';

    process.env['ENV_CRYPTO_KEY'] = ENV_CRYPTO_KEY;
    Bun.write(sourcePath, 'TEST_VAR=123\nANOTHER_VAR=hello,world\n');

    // Act: Encrypt the environment file
    encryptEnvFile(sourcePath, outputPath);

    // Assert: Check if the encrypted file exists
    expect(() => {
      Bun.file(outputPath);
    }).not.toThrow();
  });

  it('should decrypt environment file', async () => {
    // Arrange: Ensure a fresh encrypted file exists
    const sourcePath = '.env.encrypted';
    const outputPath = '.env';
    process.env['ENV_CRYPTO_KEY'] = ENV_CRYPTO_KEY;

    // Remove any existing encrypted file
    await Bun.file(sourcePath).delete();

    // Re-encrypt to get the new format
    encryptEnvFile('.env', sourcePath);

    // Act: Decrypt the environment file
    decryptEnvFile(sourcePath);
    const envVars = await Bun.file(outputPath).text();

    // Assert: Check if the decrypted content matches the original
    expect(envVars).toContain('TEST_VAR=123');
    expect(envVars).toContain('ANOTHER_VAR=hello,world');
  });

  it('should throw error if encryption key is missing', async () => {
    // Arrange: Remove the encryption key from environment variables
    const sourcePath = '.env';
    const outputPath = '.env.encrypted';
    delete process.env['ENV_CRYPTO_KEY'];

    // Act & Assert: Attempt to encrypt and expect an error
    expect(() => {
      encryptEnvFile(sourcePath, outputPath);
    }).toThrowErrorMatchingSnapshot();
  });

  it('should throw error if decryption key is missing', async () => {
    // Arrange: Remove the encryption key from environment variables
    const sourcePath = '.env.encrypted';
    delete process.env['ENV_CRYPTO_KEY'];

    // Act & Assert: Attempt to decrypt and expect an error
    expect(() => {
      decryptEnvFile(sourcePath);
    }).toThrowErrorMatchingSnapshot();
  });

  it('should correctly decrypt environment variables with quoted values', async () => {
    // Arrange: Write .env file with various quoted values
    const sourcePath = '.env';
    const outputPath = '.env.encrypted';
    process.env['ENV_CRYPTO_KEY'] = ENV_CRYPTO_KEY;

    const envContent = `
DB_HOST="localhost"
API_KEY='abcdef123456'
EMPTY_QUOTED_VAR=""
SINGLE_QUOTED_SPACE=' value with spaces '
DOUBLE_QUOTED_SPECIAL="value with $pecial chars!"
UNQUOTED_VAR=noquotes
`;
    await Bun.write(sourcePath, envContent);

    // Act: Encrypt and then decrypt the environment file
    encryptEnvFile(sourcePath, outputPath);
    const decryptedVars = decryptEnvFile(outputPath);

    // Assert: Check if the decrypted content matches the original, with quotes removed
    expect(decryptedVars['DB_HOST']).toBe('localhost');
    expect(decryptedVars['API_KEY']).toBe('abcdef123456');
    expect(decryptedVars['EMPTY_QUOTED_VAR']).toBe('');
    expect(decryptedVars['SINGLE_QUOTED_SPACE']).toBe(' value with spaces ');
    expect(decryptedVars['DOUBLE_QUOTED_SPECIAL']).toBe('value with $pecial chars!');
    expect(decryptedVars['UNQUOTED_VAR']).toBe('noquotes');

    // Clean up environment and files
    delete process.env['ENV_CRYPTO_KEY'];
    await Bun.file(sourcePath).delete();
    await Bun.file(outputPath).delete();
  });

  it('should throw error if encrypted file is malformed', async () => {
    // Arrange: Write a malformed encrypted file (not valid JSON)
    const sourcePath = '.env.malformed.encrypted';
    process.env['ENV_CRYPTO_KEY'] = ENV_CRYPTO_KEY;
    await Bun.write(sourcePath, 'This is not valid JSON');

    // Act & Assert: Attempt to decrypt the malformed file and expect an error
    expect(() => {
      decryptEnvFile(sourcePath);
    }).toThrowErrorMatchingSnapshot();

    // Clean up environment and files
    delete process.env['ENV_CRYPTO_KEY'];
    await Bun.file(sourcePath).delete();
  });

  it('should throw error for path traversal attempts', async () => {
    // Arrange: Set encryption key
    process.env['ENV_CRYPTO_KEY'] = ENV_CRYPTO_KEY;

    // Act & Assert: Test encryption and decryption with path traversal attempts
    expect(() => {
      encryptEnvFile('../../../etc/passwd', '.env.encrypted');
    }).toThrowErrorMatchingSnapshot();

    expect(() => {
      encryptEnvFile('.env', '../../../tmp/malicious.encrypted');
    }).toThrowErrorMatchingSnapshot();

    expect(() => {
      decryptEnvFile('../../../etc/shadow');
    }).toThrowErrorMatchingSnapshot();

    // Test with Windows-style path traversal
    expect(() => {
      encryptEnvFile('..\\..\\..\\windows\\system32\\config\\sam', '.env.encrypted');
    }).toThrowErrorMatchingSnapshot();

    // Test with absolute path outside working directory
    expect(() => {
      encryptEnvFile('C:\\temp\\malicious.env', '.env.encrypted');
    }).toThrowErrorMatchingSnapshot();

    // Clean up environment
    delete process.env['ENV_CRYPTO_KEY'];
  });

  it('should handle file with only comments and empty lines', async () => {
    // Arrange: Write .env file with only comments and empty lines
    const sourcePath = '.env.comments';
    const outputPath = '.env.comments.encrypted';
    process.env['ENV_CRYPTO_KEY'] = ENV_CRYPTO_KEY;

    const envContent = `
# This is a comment
   # Another comment
   
# Yet another comment

`;
    await Bun.write(sourcePath, envContent);

    // Act: Encrypt and then decrypt the file
    encryptEnvFile(sourcePath, outputPath);
    const decryptedVars = decryptEnvFile(outputPath);

    // Assert: Should return empty object
    expect(decryptedVars).toEqual({});

    // Clean up environment and files
    delete process.env['ENV_CRYPTO_KEY'];
    await Bun.file(sourcePath).delete();
    await Bun.file(outputPath).delete();
  });

  it('should handle malformed lines in env file', async () => {
    // Arrange: Write .env file with malformed lines (no = sign)
    const sourcePath = '.env.malformed';
    const outputPath = '.env.malformed.encrypted';
    process.env['ENV_CRYPTO_KEY'] = ENV_CRYPTO_KEY;

    const envContent = `
VALID_VAR=value1
malformed line without equals
ANOTHER_VALID=value2
just text
KEY_WITHOUT_VALUE=
=VALUE_WITHOUT_KEY
`;
    await Bun.write(sourcePath, envContent);

    // Act: Encrypt and then decrypt the file
    encryptEnvFile(sourcePath, outputPath);
    const decryptedVars = decryptEnvFile(outputPath);

    // Assert: Should only parse valid lines
    expect(decryptedVars['VALID_VAR']).toBe('value1');
    expect(decryptedVars['ANOTHER_VALID']).toBe('value2');
    expect(decryptedVars['KEY_WITHOUT_VALUE']).toBe('');
    expect(Object.keys(decryptedVars)).toHaveLength(3);

    // Clean up environment and files
    delete process.env['ENV_CRYPTO_KEY'];
    await Bun.file(sourcePath).delete();
    await Bun.file(outputPath).delete();
  });

  it('should handle encrypted file missing required fields', async () => {
    // Arrange: Set encryption key
    const sourcePath = '.env.missing.encrypted';
    process.env['ENV_CRYPTO_KEY'] = ENV_CRYPTO_KEY;

    // Act & Assert: Test missing salt
    await Bun.write(
      sourcePath,
      JSON.stringify({
        iv: 'test',
        content: 'test',
        authTag: 'test',
      }),
    );
    expect(() => {
      decryptEnvFile(sourcePath);
    }).toThrowErrorMatchingSnapshot();

    // Test missing iv
    await Bun.write(
      sourcePath,
      JSON.stringify({
        salt: 'test',
        content: 'test',
        authTag: 'test',
      }),
    );
    expect(() => {
      decryptEnvFile(sourcePath);
    }).toThrowErrorMatchingSnapshot();

    // Test missing content
    await Bun.write(
      sourcePath,
      JSON.stringify({
        salt: 'test',
        iv: 'test',
        authTag: 'test',
      }),
    );
    expect(() => {
      decryptEnvFile(sourcePath);
    }).toThrowErrorMatchingSnapshot();

    // Test missing authTag
    await Bun.write(
      sourcePath,
      JSON.stringify({
        salt: 'test',
        iv: 'test',
        content: 'test',
      }),
    );
    expect(() => {
      decryptEnvFile(sourcePath);
    }).toThrowErrorMatchingSnapshot();

    // Clean up environment and files
    delete process.env['ENV_CRYPTO_KEY'];
    await Bun.file(sourcePath).delete();
  });
});
