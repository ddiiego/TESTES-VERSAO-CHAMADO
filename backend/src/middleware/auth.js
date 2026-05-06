const jwt = require('jsonwebtoken');
const { config } = require('../config');

/**
 * Verifica o token JWT no header Authorization.
 * Popula req.user com os dados decodificados.
 */
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.sendStatus(401);

  jwt.verify(token, config.jwtSecret, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
};

/**
 * Middleware factory: restringe acesso a roles específicas.
 * Uso: requireRole('admin') ou requireRole('admin', 'tecnico')
 */
const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Acesso negado.' });
    }
    next();
  };
};

module.exports = { authenticateToken, requireRole };
