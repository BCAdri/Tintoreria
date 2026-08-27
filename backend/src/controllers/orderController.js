const { getDb } = require('../config/db');
const { body, validationResult } = require('express-validator');

const STATUSES = ['received', 'processing', 'ready', 'delivered'];

const orderValidation = [
  body('client_id').isInt({ min: 1 }),
  body('notes').optional().trim().isLength({ max: 500 }),
  body('pickup_date').optional({ nullable: true }).isISO8601(),
  body('items').isArray({ min: 1 }).withMessage('At least one item required'),
  body('items.*.description').trim().notEmpty(),
  body('items.*.qty').isInt({ min: 1 }),
  body('items.*.unit_price').isFloat({ min: 0 }),
];

function enrichOrder(db, order) {
  const items = db.prepare(`
    SELECT oi.*, gt.name AS garment_name
    FROM order_items oi
    LEFT JOIN garment_types gt ON gt.id = oi.garment_type_id
    WHERE oi.order_id = ?
  `).all(order.id);

  const payments = db.prepare(
    'SELECT * FROM payments WHERE order_id = ? ORDER BY created_at'
  ).all(order.id);

  const client = db.prepare('SELECT id, name, phone, email FROM clients WHERE id = ?')
    .get(order.client_id);

  const paid = payments.reduce((s, p) => s + p.amount, 0);

  return { ...order, items, payments, client, paid, balance: order.total - paid };
}

function list(req, res, next) {
  try {
    const { status, client_id, from, to, q } = req.query;
    const db = getDb();

    let sql = `
      SELECT o.*, c.name AS client_name, c.phone AS client_phone,
        COUNT(oi.id) AS item_count,
        COALESCE(SUM(p.amount), 0) AS paid
      FROM orders o
      JOIN clients c ON c.id = o.client_id
      LEFT JOIN order_items oi ON oi.order_id = o.id
      LEFT JOIN payments p ON p.order_id = o.id
      WHERE o.store_id = ?
    `;
    const params = [req.storeId];

    if (status)    { sql += ' AND o.status = ?';          params.push(status); }
    if (client_id) { sql += ' AND o.client_id = ?';       params.push(client_id); }
    if (from)      { sql += ' AND o.created_at >= ?';     params.push(from); }
    if (to)        { sql += ' AND o.created_at <= ?';     params.push(to + ' 23:59:59'); }
    if (q)         { sql += ' AND c.name LIKE ?';         params.push(`%${q}%`); }

    sql += ' GROUP BY o.id ORDER BY o.created_at DESC LIMIT 200';

    const orders = db.prepare(sql).all(...params);
    db.close();
    res.json(orders);
  } catch (err) { next(err); }
}

function get(req, res, next) {
  try {
    const db = getDb();
    const order = db.prepare('SELECT * FROM orders WHERE id = ? AND store_id = ?')
      .get(req.params.id, req.storeId);
    if (!order) { db.close(); return res.status(404).json({ error: 'Order not found' }); }
    const enriched = enrichOrder(db, order);
    db.close();
    res.json(enriched);
  } catch (err) { next(err); }
}

function create(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(422).json({ errors: errors.array() });

    const { client_id, notes = '', pickup_date = null, items } = req.body;
    const db = getDb();

    // Verify client belongs to this store
    const client = db.prepare('SELECT id FROM clients WHERE id = ? AND store_id = ?')
      .get(client_id, req.storeId);
    if (!client) { db.close(); return res.status(422).json({ error: 'Client not found in this store' }); }

    const total = items.reduce((s, i) => s + i.qty * i.unit_price, 0);

    const result = db.transaction(() => {
      const order = db.prepare(`
        INSERT INTO orders (store_id, client_id, status, total, notes, pickup_date)
        VALUES (?, ?, 'received', ?, ?, ?)
      `).run(req.storeId, client_id, total, notes, pickup_date);

      const itemStmt = db.prepare(
        'INSERT INTO order_items (order_id, garment_type_id, description, qty, unit_price) VALUES (?, ?, ?, ?, ?)'
      );
      items.forEach(i => itemStmt.run(order.lastInsertRowid, i.garment_type_id || null, i.description, i.qty, i.unit_price));

      return db.prepare('SELECT * FROM orders WHERE id = ?').get(order.lastInsertRowid);
    })();

    const enriched = enrichOrder(db, result);
    db.close();
    res.status(201).json(enriched);
  } catch (err) { next(err); }
}

function updateStatus(req, res, next) {
  try {
    const { status } = req.body;
    if (!STATUSES.includes(status)) {
      return res.status(422).json({ error: `Status must be one of: ${STATUSES.join(', ')}` });
    }

    const db = getDb();
    const order = db.prepare('SELECT * FROM orders WHERE id = ? AND store_id = ?')
      .get(req.params.id, req.storeId);
    if (!order) { db.close(); return res.status(404).json({ error: 'Order not found' }); }

    const deliveredAt = status === 'delivered' ? `datetime('now')` : 'NULL';
    db.prepare(`
      UPDATE orders SET status = ?, updated_at = datetime('now'),
        delivered_at = ${deliveredAt === 'NULL' ? 'NULL' : `datetime('now')`}
      WHERE id = ?
    `).run(status, order.id);

    const updated = enrichOrder(db, db.prepare('SELECT * FROM orders WHERE id = ?').get(order.id));
    db.close();
    res.json(updated);
  } catch (err) { next(err); }
}

function addPayment(req, res, next) {
  try {
    const { amount, method = 'cash', notes = '' } = req.body;
    if (!amount || amount <= 0) return res.status(422).json({ error: 'Valid amount required' });
    if (!['cash', 'card', 'bizum'].includes(method)) {
      return res.status(422).json({ error: 'Method must be cash, card or bizum' });
    }

    const db = getDb();
    const order = db.prepare('SELECT * FROM orders WHERE id = ? AND store_id = ?')
      .get(req.params.id, req.storeId);
    if (!order) { db.close(); return res.status(404).json({ error: 'Order not found' }); }

    db.prepare(
      'INSERT INTO payments (order_id, store_id, amount, method, notes) VALUES (?, ?, ?, ?, ?)'
    ).run(order.id, req.storeId, amount, method, notes);

    const enriched = enrichOrder(db, order);
    db.close();
    res.status(201).json(enriched);
  } catch (err) { next(err); }
}

function remove(req, res, next) {
  try {
    const db = getDb();
    const order = db.prepare('SELECT id FROM orders WHERE id = ? AND store_id = ?')
      .get(req.params.id, req.storeId);
    if (!order) { db.close(); return res.status(404).json({ error: 'Order not found' }); }
    db.prepare('DELETE FROM orders WHERE id = ?').run(order.id);
    db.close();
    res.status(204).end();
  } catch (err) { next(err); }
}

module.exports = { list, get, create, updateStatus, addPayment, remove, orderValidation };
