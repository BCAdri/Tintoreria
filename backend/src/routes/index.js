const { Router } = require('express');
const { authenticate, requireStore } = require('../middleware/auth');
const auth      = require('../controllers/authController');
const clients   = require('../controllers/clientController');
const orders    = require('../controllers/orderController');
const garments  = require('../controllers/garmentController');
const dashboard = require('../controllers/dashboardController');

const r = Router();

// ── Auth ──────────────────────────────────────────────────────────────────
r.post('/auth/register', auth.registerValidation, auth.register);
r.post('/auth/login',    auth.loginValidation,    auth.login);
r.get ('/auth/me',       authenticate,            auth.me);
r.post('/auth/stores',   authenticate,            auth.addStore);

// ── Dashboard ─────────────────────────────────────────────────────────────
r.get('/dashboard/global', authenticate,                    dashboard.globalStats);
r.get('/dashboard',        authenticate, requireStore,      dashboard.storeStats);

// ── Clients ───────────────────────────────────────────────────────────────
r.get   ('/clients',     authenticate, requireStore, clients.list);
r.post  ('/clients',     authenticate, requireStore, clients.clientValidation, clients.create);
r.get   ('/clients/:id', authenticate, requireStore, clients.get);
r.patch ('/clients/:id', authenticate, requireStore, clients.clientValidation, clients.update);
r.delete('/clients/:id', authenticate, requireStore, clients.remove);

// ── Garment types ─────────────────────────────────────────────────────────
r.get   ('/garments',     authenticate, requireStore, garments.list);
r.post  ('/garments',     authenticate, requireStore, garments.garmentValidation, garments.create);
r.patch ('/garments/:id', authenticate, requireStore, garments.garmentValidation, garments.update);
r.delete('/garments/:id', authenticate, requireStore, garments.remove);

// ── Orders ────────────────────────────────────────────────────────────────
r.get   ('/orders',              authenticate, requireStore, orders.list);
r.post  ('/orders',              authenticate, requireStore, orders.orderValidation, orders.create);
r.get   ('/orders/:id',          authenticate, requireStore, orders.get);
r.patch ('/orders/:id/status',   authenticate, requireStore, orders.updateStatus);
r.post  ('/orders/:id/payments', authenticate, requireStore, orders.addPayment);
r.delete('/orders/:id',          authenticate, requireStore, orders.remove);

module.exports = r;
