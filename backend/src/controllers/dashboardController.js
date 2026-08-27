const { getDb } = require('../config/db');

function storeStats(req, res, next) {
  try {
    const db  = getDb();
    const sid = req.storeId;

    const today     = new Date().toISOString().slice(0, 10);
    const weekStart = (() => { const d = new Date(); d.setDate(d.getDate() - 6); return d.toISOString().slice(0, 10); })();
    const monthStart = new Date().toISOString().slice(0, 7) + '-01';

    const revenue = db.prepare(`
      SELECT
        COALESCE(SUM(CASE WHEN date(created_at) = ? THEN amount END), 0)           AS today,
        COALESCE(SUM(CASE WHEN date(created_at) >= ? THEN amount END), 0)           AS week,
        COALESCE(SUM(CASE WHEN date(created_at) >= ? THEN amount END), 0)           AS month,
        COALESCE(SUM(amount), 0)                                                    AS total
      FROM payments WHERE store_id = ?
    `).get(today, weekStart, monthStart, sid);

    const orderCounts = db.prepare(`
      SELECT status, COUNT(*) AS cnt FROM orders WHERE store_id = ? GROUP BY status
    `).all(sid).reduce((acc, r) => { acc[r.status] = r.cnt; return acc; }, {});

    const pendingBalance = db.prepare(`
      SELECT COALESCE(SUM(o.total) - COALESCE(SUM(p.amount),0), 0) AS balance
      FROM orders o
      LEFT JOIN payments p ON p.order_id = o.id
      WHERE o.store_id = ? AND o.status != 'delivered'
      GROUP BY o.store_id
    `).get(sid);

    const paymentMethods = db.prepare(`
      SELECT method, COUNT(*) AS cnt, SUM(amount) AS total
      FROM payments WHERE store_id = ? GROUP BY method
    `).all(sid);

    const topGarments = db.prepare(`
      SELECT gt.name, SUM(oi.qty) AS total_qty, SUM(oi.qty * oi.unit_price) AS revenue
      FROM order_items oi
      JOIN garment_types gt ON gt.id = oi.garment_type_id
      JOIN orders o ON o.order_id = oi.order_id
      WHERE o.store_id = ?
      GROUP BY gt.id ORDER BY total_qty DESC LIMIT 5
    `).all(sid);

    // Daily revenue last 14 days
    const dailyRevenue = db.prepare(`
      SELECT date(created_at) AS day, SUM(amount) AS total
      FROM payments WHERE store_id = ?
        AND date(created_at) >= date('now', '-13 days')
      GROUP BY day ORDER BY day
    `).all(sid);

    // Recent orders
    const recentOrders = db.prepare(`
      SELECT o.id, o.status, o.total, o.created_at, c.name AS client_name
      FROM orders o JOIN clients c ON c.id = o.client_id
      WHERE o.store_id = ? ORDER BY o.created_at DESC LIMIT 8
    `).all(sid);

    db.close();
    res.json({
      revenue,
      orders: {
        received:   orderCounts.received   || 0,
        processing: orderCounts.processing || 0,
        ready:      orderCounts.ready      || 0,
        delivered:  orderCounts.delivered  || 0,
        total: Object.values(orderCounts).reduce((a, b) => a + b, 0),
      },
      pendingBalance: pendingBalance?.balance || 0,
      paymentMethods,
      topGarments,
      dailyRevenue,
      recentOrders,
    });
  } catch (err) { next(err); }
}

// Global stats across all stores the user owns
function globalStats(req, res, next) {
  try {
    const db = getDb();

    const storeIds = db.prepare(`
      SELECT store_id FROM user_stores WHERE user_id = ? AND role = 'owner'
    `).all(req.user.id).map(r => r.store_id);

    if (!storeIds.length) { db.close(); return res.json({ stores: [] }); }

    const placeholders = storeIds.map(() => '?').join(',');

    const perStore = db.prepare(`
      SELECT
        s.id, s.name, s.city,
        COALESCE(SUM(p.amount), 0)   AS total_revenue,
        COUNT(DISTINCT o.id)         AS total_orders,
        COUNT(DISTINCT c.id)         AS total_clients
      FROM stores s
      LEFT JOIN orders o   ON o.store_id = s.id
      LEFT JOIN payments p ON p.store_id = s.id
      LEFT JOIN clients c  ON c.store_id = s.id
      WHERE s.id IN (${placeholders})
      GROUP BY s.id
    `).all(...storeIds);

    const totals = db.prepare(`
      SELECT
        COALESCE(SUM(p.amount), 0) AS total_revenue,
        COUNT(DISTINCT o.id)       AS total_orders,
        COUNT(DISTINCT c.id)       AS total_clients
      FROM stores s
      LEFT JOIN orders o   ON o.store_id = s.id
      LEFT JOIN payments p ON p.store_id = s.id
      LEFT JOIN clients c  ON c.store_id = s.id
      WHERE s.id IN (${placeholders})
    `).get(...storeIds);

    const monthlyRevenue = db.prepare(`
      SELECT strftime('%Y-%m', created_at) AS month, SUM(amount) AS total
      FROM payments WHERE store_id IN (${placeholders})
        AND created_at >= date('now', '-5 months')
      GROUP BY month ORDER BY month
    `).all(...storeIds);

    db.close();
    res.json({ stores: perStore, totals, monthlyRevenue });
  } catch (err) { next(err); }
}

module.exports = { storeStats, globalStats };
