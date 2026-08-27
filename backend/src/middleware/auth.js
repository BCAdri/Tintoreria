const jwt = require('jsonwebtoken');
const { getDb } = require('../config/db');

function authenticate(req, res, next) {
  const header = req.headers['authorization'];
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }
  try {
    const payload = jwt.verify(header.split(' ')[1], process.env.JWT_SECRET);
    req.user = { id: payload.sub, email: payload.email, role: payload.role };
    next();
  } catch (err) {
    const msg = err.name === 'TokenExpiredError' ? 'Token expired' : 'Invalid token';
    return res.status(401).json({ error: msg });
  }
}

// Verifica que el usuario tiene acceso a la tienda que viene en el header X-Store-Id
function requireStore(req, res, next) {
  const storeId = parseInt(req.headers['x-store-id'], 10);
  if (!storeId) return res.status(400).json({ error: 'X-Store-Id header required' });

  const db = getDb();
  const access = db.prepare(
    'SELECT role FROM user_stores WHERE user_id = ? AND store_id = ?'
  ).get(req.user.id, storeId);
  db.close();

  if (!access) return res.status(403).json({ error: 'No access to this store' });

  req.storeId   = storeId;
  req.storeRole = access.role;
  next();
}

module.exports = { authenticate, requireStore };
