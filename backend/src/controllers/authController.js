const bcrypt   = require('bcryptjs');
const jwt      = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const { getDb } = require('../config/db');

const SALT_ROUNDS = 12;

function signToken(user) {
  return jwt.sign(
    { sub: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
  );
}

const registerValidation = [
  body('name').trim().notEmpty().isLength({ max: 80 }),
  body('email').trim().isEmail().normalizeEmail(),
  body('password').isLength({ min: 8 }).matches(/[A-Z]/).matches(/[0-9]/),
  body('storeName').trim().notEmpty().withMessage('Store name is required'),
  body('storeAddress').optional().trim(),
  body('storePhone').optional().trim(),
  body('storeTaxId').optional().trim(),
  body('storeCity').optional().trim(),
];

const loginValidation = [
  body('email').trim().isEmail().normalizeEmail(),
  body('password').notEmpty(),
];

async function register(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(422).json({ errors: errors.array() });

    const { name, email, password, storeName, storeAddress, storePhone, storeTaxId, storeCity } = req.body;
    const db = getDb();

    if (db.prepare('SELECT id FROM users WHERE email = ?').get(email)) {
      db.close();
      return res.status(409).json({ error: 'Email already in use' });
    }

    const hashed = await bcrypt.hash(password, SALT_ROUNDS);

    const createUser = db.transaction(() => {
      const user = db.prepare(
        'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)'
      ).run(name, email, hashed, 'owner');

      const store = db.prepare(
        'INSERT INTO stores (name, address, phone, tax_id, city) VALUES (?, ?, ?, ?, ?)'
      ).run(storeName, storeAddress || '', storePhone || '', storeTaxId || '', storeCity || '');

      db.prepare(
        'INSERT INTO user_stores (user_id, store_id, role) VALUES (?, ?, ?)'
      ).run(user.lastInsertRowid, store.lastInsertRowid, 'owner');

      // Default garment types for the new store
      const garmentsStmt = db.prepare(
        'INSERT INTO garment_types (store_id, name, price, turnaround_days) VALUES (?, ?, ?, ?)'
      );
      [
        ['Camisa', 3.50, 2],
        ['Pantalón', 4.00, 2],
        ['Traje completo', 12.00, 3],
        ['Vestido', 8.00, 3],
        ['Abrigo', 10.00, 4],
        ['Falda', 4.50, 2],
        ['Corbata', 2.50, 2],
        ['Edredón', 15.00, 5],
      ].forEach(([n, p, t]) => garmentsStmt.run(store.lastInsertRowid, n, p, t));

      return {
        user: { id: user.lastInsertRowid, name, email, role: 'owner' },
        store: { id: store.lastInsertRowid, name: storeName },
      };
    });

    const result = createUser();
    db.close();

    const token = signToken(result.user);
    res.status(201).json({ token, user: result.user, stores: [result.store] });
  } catch (err) {
    next(err);
  }
}

async function login(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(422).json({ errors: errors.array() });

    const { email, password } = req.body;
    const db = getDb();

    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
    const dummy = '$2a$12$invalidhashfortimingprotectionxxxxxxxxxxxxxxxxxxxxxxx';
    const match = user
      ? await bcrypt.compare(password, user.password)
      : await bcrypt.compare(password, dummy);

    if (!user || !match) {
      db.close();
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const stores = db.prepare(`
      SELECT s.id, s.name, s.city, us.role
      FROM stores s
      JOIN user_stores us ON us.store_id = s.id
      WHERE us.user_id = ?
      ORDER BY s.name
    `).all(user.id);

    db.close();

    const token = signToken({ id: user.id, email: user.email, role: user.role });
    res.json({
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
      stores,
    });
  } catch (err) {
    next(err);
  }
}

function me(req, res, next) {
  try {
    const db = getDb();
    const user = db.prepare('SELECT id, name, email, role, created_at FROM users WHERE id = ?').get(req.user.id);
    const stores = db.prepare(`
      SELECT s.id, s.name, s.city, s.address, s.phone, s.tax_id, us.role
      FROM stores s JOIN user_stores us ON us.store_id = s.id
      WHERE us.user_id = ? ORDER BY s.name
    `).all(req.user.id);
    db.close();
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ ...user, stores });
  } catch (err) {
    next(err);
  }
}

// Añadir una tienda nueva al usuario autenticado
async function addStore(req, res, next) {
  try {
    const { name, address, phone, tax_id, city } = req.body;
    if (!name?.trim()) return res.status(422).json({ error: 'Store name required' });

    const db = getDb();
    const result = db.transaction(() => {
      const store = db.prepare(
        'INSERT INTO stores (name, address, phone, tax_id, city) VALUES (?, ?, ?, ?, ?)'
      ).run(name.trim(), address || '', phone || '', tax_id || '', city || '');

      db.prepare(
        'INSERT INTO user_stores (user_id, store_id, role) VALUES (?, ?, ?)'
      ).run(req.user.id, store.lastInsertRowid, 'owner');

      const garmentsStmt = db.prepare(
        'INSERT INTO garment_types (store_id, name, price, turnaround_days) VALUES (?, ?, ?, ?)'
      );
      [
        ['Camisa', 3.50, 2], ['Pantalón', 4.00, 2], ['Traje completo', 12.00, 3],
        ['Vestido', 8.00, 3], ['Abrigo', 10.00, 4],
      ].forEach(([n, p, t]) => garmentsStmt.run(store.lastInsertRowid, n, p, t));

      return db.prepare('SELECT * FROM stores WHERE id = ?').get(store.lastInsertRowid);
    })();

    db.close();
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
}

module.exports = { register, login, me, addStore, registerValidation, loginValidation };
