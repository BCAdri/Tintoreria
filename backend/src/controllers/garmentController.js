const { getDb } = require('../config/db');
const { body, validationResult } = require('express-validator');

const garmentValidation = [
  body('name').trim().notEmpty().isLength({ max: 80 }),
  body('price').isFloat({ min: 0 }),
  body('turnaround_days').isInt({ min: 1 }),
];

function list(req, res, next) {
  try {
    const db = getDb();
    const garments = db.prepare(
      'SELECT * FROM garment_types WHERE store_id = ? ORDER BY name'
    ).all(req.storeId);
    db.close();
    res.json(garments);
  } catch (err) { next(err); }
}

function create(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(422).json({ errors: errors.array() });

    const { name, price, turnaround_days } = req.body;
    const db = getDb();
    const result = db.prepare(
      'INSERT INTO garment_types (store_id, name, price, turnaround_days) VALUES (?, ?, ?, ?)'
    ).run(req.storeId, name, price, turnaround_days);
    const garment = db.prepare('SELECT * FROM garment_types WHERE id = ?').get(result.lastInsertRowid);
    db.close();
    res.status(201).json(garment);
  } catch (err) { next(err); }
}

function update(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(422).json({ errors: errors.array() });

    const { name, price, turnaround_days, active } = req.body;
    const db = getDb();
    const garment = db.prepare('SELECT id FROM garment_types WHERE id = ? AND store_id = ?')
      .get(req.params.id, req.storeId);
    if (!garment) { db.close(); return res.status(404).json({ error: 'Not found' }); }

    db.prepare(`
      UPDATE garment_types SET
        name            = COALESCE(?, name),
        price           = COALESCE(?, price),
        turnaround_days = COALESCE(?, turnaround_days),
        active          = COALESCE(?, active)
      WHERE id = ?
    `).run(name, price, turnaround_days, active !== undefined ? (active ? 1 : 0) : null, garment.id);

    const updated = db.prepare('SELECT * FROM garment_types WHERE id = ?').get(garment.id);
    db.close();
    res.json(updated);
  } catch (err) { next(err); }
}

function remove(req, res, next) {
  try {
    const db = getDb();
    const garment = db.prepare('SELECT id FROM garment_types WHERE id = ? AND store_id = ?')
      .get(req.params.id, req.storeId);
    if (!garment) { db.close(); return res.status(404).json({ error: 'Not found' }); }
    db.prepare('DELETE FROM garment_types WHERE id = ?').run(garment.id);
    db.close();
    res.status(204).end();
  } catch (err) { next(err); }
}

module.exports = { list, create, update, remove, garmentValidation };
