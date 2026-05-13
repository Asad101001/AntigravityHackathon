/**
 * Input Sanitization Middleware
 * Strips HTML tags, control characters, limits input length
 */

function sanitizeInput(req, res, next) {
  if (req.body && typeof req.body === 'object') {
    for (const key of Object.keys(req.body)) {
      if (typeof req.body[key] === 'string') {
        let text = req.body[key];
        text = text.trim().slice(0, 500);          // Length limit
        text = text.replace(/<[^>]*>/g, '');        // Strip HTML tags
        text = text.replace(/[\x00-\x1F]/g, '');    // Strip control chars
        req.body[key] = text;
      }
    }
  }
  next();
}

module.exports = { sanitizeInput };
