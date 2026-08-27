function errorHandler(err, req, res, next) {
  console.error(`[${new Date().toISOString()}]`, err.message);
  const status  = err.status || 500;
  const message = status < 500 ? err.message : 'Internal server error';
  res.status(status).json({ error: message });
}

function notFound(req, res) {
  res.status(404).json({ error: `${req.method} ${req.path} not found` });
}

module.exports = { errorHandler, notFound };
