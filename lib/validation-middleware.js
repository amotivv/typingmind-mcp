/**
 * Middleware for validating API requests
 */
const { isValidClientId } = require('./command-validator');

/**
 * Validates the mcpServers payload for the /start endpoint
 */
function validateStartRequest(req, res, next) {
  const { mcpServers } = req.body;

  // Check if mcpServers is provided and is an object
  if (!mcpServers || typeof mcpServers !== 'object' || Array.isArray(mcpServers)) {
    return res.status(400).json({ 
      error: 'Invalid request format',
      details: 'mcpServers must be a non-array object' 
    });
  }

  // Check if there are any server configurations
  if (Object.keys(mcpServers).length === 0) {
    return res.status(400).json({ 
      error: 'Invalid request format',
      details: 'No server configurations provided' 
    });
  }

  // Validate each server configuration has a command
  const invalid = Object.entries(mcpServers).filter(([id, config]) => {
    return !config || typeof config !== 'object' || !config.command || typeof config.command !== 'string';
  });

  if (invalid.length > 0) {
    return res.status(400).json({
      error: 'Invalid server configuration',
      details: 'Each server must have a command property'
    });
  }

  // All validations passed
  next();
}

/**
 * Validates client ID parameter
 */
function validateClientId(req, res, next) {
  const { id } = req.params;
  
  if (!isValidClientId(id)) {
    return res.status(400).json({ 
      error: 'Invalid client ID format' 
    });
  }
  
  next();
}

/**
 * Validates the call_tools request body
 */
function validateCallTools(req, res, next) {
  const { name, arguments: toolArgs } = req.body;
  
  // Tool name is required and must be a string
  if (!name || typeof name !== 'string') {
    return res.status(400).json({ 
      error: 'Invalid request',
      details: 'Tool name is required and must be a string' 
    });
  }
  
  // If arguments are provided, they must be an object
  if (toolArgs !== undefined) {
    if (typeof toolArgs !== 'object' || toolArgs === null) {
      return res.status(400).json({ 
        error: 'Invalid request',
        details: 'Tool arguments must be an object' 
      });
    }
  }
  
  next();
}

/**
 * Sanitizes error responses to prevent information disclosure
 */
function errorSanitizer(err, req, res, next) {
  console.error('Error occurred:', err);
  
  // Don't expose internal error details to clients
  res.status(500).json({
    error: 'Internal server error',
    // Only expose a generic message, not the actual error details
    message: 'An unexpected error occurred while processing your request'
  });
}

module.exports = {
  validateStartRequest,
  validateClientId,
  validateCallTools,
  errorSanitizer
};