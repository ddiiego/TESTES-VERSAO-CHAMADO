/**
 * Middleware de logging para requisições da API.
 * Registra método, URL e IP de forma limpa.
 */
const requestLogger = (req, res, next) => {
  if (req.url.startsWith('/api')) {
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ${req.method} ${req.url} — ${ip}`);
  }
  next();
};

module.exports = { requestLogger };
