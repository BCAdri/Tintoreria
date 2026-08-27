const { getDb } = require('../config/db');
const { body, validationResult } = require('express-validator');

const clientValidation = [
  body('name').trim().notEmpty().isLength({ max: 100 }),
  body('phone').optional().trim().isLength({ max: 20 }),
  body('email').optional({ nullable: true }).trim().isEmail().normalizeEmail(),
  body('notes').optional().trim().isLength({ max: 500 }),
];

function list(req, res, next) {
  try {
    const { q } = req.query;
    const db = getDb();
    let clients;

    if (q?.trim()) {
      const term = `%${q.trim()}%`;
      clients = db.prepare(`
        SELECT c.*,
          COUNT(DISTINCT o.id) AS order_count,
          MAX(o.created_at)    AS last_order
        FROM clients c
        LEFT JOIN orders o ON o.client_id = c.id
        WHERE c.store_id = ?
          AND (c.name LIKE ? OR c.phone LIKE ? OR c.email LIKE ?)
        GROUP BY c.id
        ORDER BY c.name
      `).all(req.storeId, term, term, term);
    } else {
      clients = db.prepare(`
        SELECT c.*,
          COUNT(DISTINCT o.id) AS order_count,
          MAX(o.created_at)    AS last_order
        FROM clients c
        LEFT JOIN orders o ON o.client_id = c.id
        WHERE c.store_id = ?
        GROUP BY c.id
        ORDER BY c.name
      `).all(req.storeId);
    }

    db.close();
    res.json(clients);
  } catch (err) { next(err); }
}

function get(req, res, next) {
  try {
    const db = getDb();
    const client = db.prepare('SELECT * FROM clients WHERE id = ? AND store_id = ?')
      .get(req.params.id, req.storeId);
    if (!client) { db.close(); return res.status(404).json({ error: 'Client not found' }); }

    const orders = db.prepare(`
      SELECT o.*, COUNT(oi.id) AS item_count
      FROM orders o
      LEFT JOIN order_items oi ON oi.order_id = o.id
      WHERE o.client_id = ? AND o.store_id = ?
      GROUP BY o.id
      ORDER BY o.created_at DESC
      LIMIT 20
    `).all(client.id, req.storeId);

    db.close();
    res.json({ ...client, orders });
  } catch (err) { next(err); }
}

function create(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(422).json({ errors: errors.array() });

    const { name, phone = '', email = '', notes = '' } = req.body;
    const db = getDb();

    const result = db.prepare(
      'INSERT INTO clients (store_id, name, phone, email, notes) VALUES (?, ?, ?, ?, ?)'
    ).run(req.storeId, name, phone, email || null, notes);

    const client = db.prepare('SELECT * FROM clients WHERE id = ?').get(result.lastInsertRowid);
    db.close();
    res.status(201).json(client);
  } catch (err) { next(err); }
}

function update(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(422).json({ errors: errors.array() });

    const db = getDb();
    const client = db.prepare('SELECT id FROM clients WHERE id = ? AND store_id = ?')
      .get(req.params.id, req.storeId);
    if (!client) { db.close(); return res.status(404).json({ error: 'Client not found' }); }

    const { name, phone, email, notes } = req.body;
    db.prepare(`
      UPDATE clients SET
        name  = COALESCE(?, name),
        phone = COALESCE(?, phone),
        email = COALESCE(?, email),
        notes = COALESCE(?, notes)
      WHERE id = ?
    `).run(name, phone, email || null, notes, client.id);

    const updated = db.prepare('SELECT * FROM clients WHERE id = ?').get(client.id);
    db.close();
    res.json(updated);
  } catch (err) { next(err); }
}

function remove(req, res, next) {
  try {
    const db = getDb();
    const client = db.prepare('SELECT id FROM clients WHERE id = ? AND store_id = ?')
      .get(req.params.id, req.storeId);
    if (!client) { db.close(); return res.status(404).json({ error: 'Client not found' }); }
    db.prepare('DELETE FROM clients WHERE id = ?').run(client.id);
    db.close();
    res.status(204).end();
  } catch (err) { next(err); }
}

module.exports = { list, get, create, update, remove, clientValidation };
