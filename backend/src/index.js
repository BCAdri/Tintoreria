require('dotenv').config();
const express    = require('express');
const helmet     = require('helmet');
const cors       = require('cors');
const morgan     = require('morgan');
const rateLimit  = require('express-rate-limit');
const routes     = require('./routes');
const { errorHandler, notFound } = require('./middleware/errors');
const { initDb } = require('./config/db');

initDb();

const app = express();

app.use(helmet());
app.use(cors({
  origin: process.env.ALLOWED_ORIGIN || 'http://localhost:5175',
  credentials: true,
}));
app.use(express.json({ limit: '100kb' }));

if (process.env.NODE_ENV !== 'test') app.use(morgan('dev'));

app.use('/api', rateLimit({ windowMs: 15 * 60 * 1000, max: 300, standardHeaders: true, legacyHeaders: false }));
app.use('/api/auth', rateLimit({ windowMs: 15 * 60 * 1000, max: 20 }));

app.use('/api', routes);
app.get('/health', (_, res) => res.json({ status: 'ok', uptime: process.uptime() }));
app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 3002;
app.listen(PORT, () => console.log(`Tintorería API on port ${PORT} [${process.env.NODE_ENV || 'development'}]`));

module.exports = app;
