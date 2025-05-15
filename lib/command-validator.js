/**
 * Utilities for validating and sanitizing command configurations
 */

/**
 * Sanitizes command arguments to prevent command injection
 * @param {string[]} args An array of command arguments
 * @returns {string[]} Sanitized arguments
 */
function sanitizeCommandArgs(args) {
  if (!Array.isArray(args)) {
    return [];
  }

  return args.map((arg) => {
    // Ensure argument is a string
    if (typeof arg !== 'string') {
      return String(arg);
    }

    // Prevent path traversal attacks
    if (arg.includes('../') || arg.includes('./') || /^\//.test(arg)) {
      throw new Error('Path traversal in command arguments is not allowed');
    }

    // Remove potentially dangerous characters for shell commands
    // This is a basic sanitization - adjust based on your specific needs
    return arg.replace(/[;&|`$()<>]/g, '');
  });
}

/**
 * Sanitizes environment variables object
 * @param {Object} env The environment variables object
 * @returns {Object} Sanitized environment variables
 */
function sanitizeEnvironment(env) {
  if (!env || typeof env !== 'object') {
    return {};
  }

  const sanitizedEnv = {};
  
  // Filter and sanitize each environment variable
  for (const [key, value] of Object.entries(env)) {
    // Validate key format (allow only alphanumeric and underscore in ENV var names)
    if (!/^[a-zA-Z0-9_]+$/.test(key)) {
      continue;
    }
    
    // Ensure value is a string
    const stringValue = String(value);
    
    // Remove potentially dangerous characters
    const sanitizedValue = stringValue.replace(/[;&|`$()<>]/g, '');
    
    sanitizedEnv[key] = sanitizedValue;
  }
  
  return sanitizedEnv;
}

/**
 * Validates a client ID
 * @param {string} id The client ID to validate
 * @returns {boolean} True if the ID is valid
 */
function isValidClientId(id) {
  // Allow alphanumeric characters, hyphens, and underscores
  return typeof id === 'string' && /^[a-zA-Z0-9\-_]+$/.test(id);
}

/**
 * Validates the structure of an MCP server configuration
 * @param {Object} config The MCP server configuration
 * @returns {boolean} True if the configuration is valid
 */
function validateServerConfig(config) {
  if (!config || typeof config !== 'object') {
    return false;
  }
  
  // Command is required and must be a string
  if (typeof config.command !== 'string' || !config.command.trim()) {
    return false;
  }
  
  // Args must be an array if present
  if (config.args !== undefined && !Array.isArray(config.args)) {
    return false;
  }
  
  // Env must be an object if present
  if (config.env !== undefined && (typeof config.env !== 'object' || config.env === null)) {
    return false;
  }
  
  return true;
}

module.exports = {
  sanitizeCommandArgs,
  sanitizeEnvironment,
  isValidClientId,
  validateServerConfig,
};