import { decryptEnvFile, DEFAULT_KEY } from './env-crypto';

/**
 * Processes a single environment variable value.
 * - Converts numeric strings to numbers.
 * - Converts comma-separated strings to string arrays.
 * - Returns plain strings otherwise.
 */
const processEnvValue = (value: string): string | number | string[] => {
  // Check if it's a number (integer or decimal)
  if (/^-?\d+(\.\d+)?$/.test(value)) {
    return Number(value);
  }

  // Check if it's a comma-separated array
  if (value.includes(',')) {
    return value.split(',').map((item) => item.trim());
  }

  // Default: return as string
  return value;
};

// The main environment object, extended from process.env
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const env: { [key: string]: any } & typeof process.env = {} as typeof process.env;
let isInitialized = false;

/**
 * Initializes environment variables from the encrypted file.
 * - Loads and decrypts the environment file.
 * - Processes each variable (number, array, string).
 * - Populates the `env` object and sets process.env for arrays as JSON strings.
 * - Only runs once per process unless reset.
 * @returns The populated env object.
 */
function initEnv(sourcePath: string = '.env.encrypted', keyEnvVar: string = DEFAULT_KEY): typeof env {
  if (isInitialized) {
    return env;
  }

  try {
    // Load and decrypt env vars
    const envVars = decryptEnvFile(sourcePath, keyEnvVar);

    // Iterate over the decrypted environment variables
    Object.entries(envVars).forEach(([key, value]) => {
      if (!env[key]) {
        const processedValue = processEnvValue(value);

        // Assign the processed value to the env object
        if (typeof processedValue === 'string') {
          env[key] = processedValue;
        } else if (typeof processedValue === 'number') {
          env[key] = processedValue;
        } else if (Array.isArray(processedValue)) {
          env[key] = processedValue;
          // For process.env compatibility, convert arrays to JSON strings
          process.env[key] = JSON.stringify(processedValue);
        }
      }
    });

    isInitialized = true;
    console.log('Decrypted environment variables loaded');
    return env;
  } catch (error) {
    // Wrap and rethrow errors with context
    throw new Error('Failed to load encrypted environment variables', { cause: error });
  }
}

/**
 * Resets the initialization state and clears the env object.
 * Useful for testing or reloading environment variables.
 */
function resetEnv() {
  isInitialized = false;
  Object.keys(env).forEach((key) => delete env[key]);
}

export { env, initEnv, resetEnv };
