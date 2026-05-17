const jwt = require('jsonwebtoken');

function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    return res.status(401).json({ success: false, error: 'Authentication required' });
  }

  try {
    const secret = process.env.JWT_SECRET || process.env.ANTIGRAVITY_KEY || 'demo-secret';
    const payload = jwt.verify(token, secret);
    req.auth = payload;
    return next();
  } catch (error) {
    return res.status(401).json({ success: false, error: 'Invalid or expired session' });
  }
}

module.exports = requireAuth;
