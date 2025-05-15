/**
 * Tests for validation utilities
 */

const assert = require('assert');
const {
  sanitizeCommandArgs,
  sanitizeEnvironment,
  isValidClientId,
  validateServerConfig
} = require('../lib/command-validator');

// Test command argument sanitization
console.log('Testing sanitizeCommandArgs...');

// Should handle non-array input
assert.deepStrictEqual(sanitizeCommandArgs(null), [], 'Should handle null');
assert.deepStrictEqual(sanitizeCommandArgs(undefined), [], 'Should handle undefined');
assert.deepStrictEqual(sanitizeCommandArgs({}), [], 'Should handle objects');

// Should convert non-string arguments to strings
assert.deepStrictEqual(sanitizeCommandArgs([123, true, null]), ['123', 'true', 'null'], 
  'Should convert non-string values to strings');

// Should sanitize dangerous characters
const sanitizedArgs = sanitizeCommandArgs(['arg1', 'arg2;rm -rf', 'arg3|cat /etc/passwd']);
assert.deepStrictEqual(sanitizedArgs, ['arg1', 'arg2rm -rf', 'arg3cat /etc/passwd'], 
  'Should remove dangerous shell characters');

// Should reject path traversal attempts
try {
  sanitizeCommandArgs(['../../../etc/passwd']);
  assert.fail('Should throw error on path traversal');
} catch (error) {
  assert(error.message.includes('Path traversal'), 'Should reject path traversal');
}

// Test environment sanitization
console.log('Testing sanitizeEnvironment...');

// Should handle invalid inputs
assert.deepStrictEqual(sanitizeEnvironment(null), {}, 'Should handle null');
assert.deepStrictEqual(sanitizeEnvironment(undefined), {}, 'Should handle undefined');
assert.deepStrictEqual(sanitizeEnvironment('string'), {}, 'Should handle non-objects');

// Should sanitize environment variables
const testEnv = {
  VALID_KEY: 'value',
  'INVALID-KEY': 'value',
  DANGEROUS_VALUE: 'value;rm -rf /',
};

const sanitizedEnv = sanitizeEnvironment(testEnv);
assert('VALID_KEY' in sanitizedEnv, 'Should keep valid keys');
assert(!('INVALID-KEY' in sanitizedEnv), 'Should remove invalid keys');
assert.strictEqual(sanitizedEnv.DANGEROUS_VALUE, 'valuerm -rf /', 'Should sanitize dangerous values');

// Test client ID validation
console.log('Testing isValidClientId...');

assert(isValidClientId('valid-client-id_123'), 'Should accept valid client ID');
assert(!isValidClientId('invalid/client/id'), 'Should reject IDs with slashes');
assert(!isValidClientId('invalid client id'), 'Should reject IDs with spaces');
assert(!isValidClientId(null), 'Should reject null');
assert(!isValidClientId(undefined), 'Should reject undefined');
assert(!isValidClientId(123), 'Should reject numbers');

// Test server config validation
console.log('Testing validateServerConfig...');

assert(validateServerConfig({ command: 'valid-command' }), 'Should accept valid command');
assert(!validateServerConfig({ }), 'Should reject missing command');
assert(!validateServerConfig({ command: '' }), 'Should reject empty command');
assert(!validateServerConfig({ command: 123 }), 'Should reject non-string command');
assert(!validateServerConfig({ command: 'valid', args: 'not-array' }), 'Should reject non-array args');
assert(!validateServerConfig({ command: 'valid', env: 'not-object' }), 'Should reject non-object env');
assert(validateServerConfig({ command: 'valid', args: [], env: {} }), 'Should accept valid config');

console.log('All validation tests passed!');