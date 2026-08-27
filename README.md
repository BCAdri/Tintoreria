# Dry Cleaning POS

A full-stack point-of-sale and management system for dry cleaning businesses. Built with Vue 3, Node.js, Express and SQLite.

One account handles multiple stores, with fully isolated data per location and a global dashboard that consolidates everything.

---

## Features

### Multi-store
- Single login manages all your stores
- Active store switcher in the sidebar — no re-login needed
- Global dashboard with cross-store revenue comparison and monthly trend chart

### Orders
- Full lifecycle: Received → Processing → Ready → Delivered
- Visual step tracker with timestamps
- Estimated pickup date and per-order notes
- Quick status advance from the order detail page

### Clients
- Client profile with complete order history
- Search by name, phone or email
- Total spend and order count per client

### Cash register
- Daily breakdown of payments received
- Split by method: cash, card, Bizum
- List of orders with outstanding balance
- Day-by-day navigation

### Catalogue
- Garment types with preset price and turnaround time
- Items can be deactivated without deleting them
- Prices auto-fill when adding items to a new order

### Tickets
- Printable receipt optimised for 80mm thermal printers
- Also exportable as PDF from the browser
- Generated from the order detail view with one click

### Dashboards
- Per-store KPIs: today, week, month and all-time revenue
- 14-day bar chart of daily income
- Payment method breakdown
- Orders by status
- Recent orders with direct links

---

## Tech stack

| Layer | Technology |
|-------|-----------|
| Frontend | Vue 3 (Composition API, `<script setup>`), Vue Router 4, Pinia |
| Backend | Node.js, Express 4 |
| Database | SQLite via better-sqlite3 |
| Auth | JWT + bcryptjs (12 salt rounds) |
| Security | Helmet, express-rate-limit, express-validator, parameterised queries |
| Styles | Pure CSS with custom properties — no external UI framework |

---

## Running locally

### Requirements
- Node.js 18+

### Backend
```bash
cd backend
npm install
cp .env.example .env
# Set a strong JWT_SECRET in .env
npm run dev
# API available at http://localhost:3002
```

### Frontend
```bash
cd frontend
npm install
npm run dev
# App at http://localhost:5175
```

Register at `/register` with your name, email, password and the name of your first store. The app creates the store automatically with eight default garment types ready to use.

---

## Project structure

```
tintoreria/
├── backend/
│   └── src/
│       ├── config/db.js              # SQLite schema + auto-init
│       ├── middleware/
│       │   ├── auth.js               # JWT verification + store access check
│       │   └── errors.js
│       ├── controllers/
│       │   ├── authController.js     # Register, login, add store
│       │   ├── clientController.js
│       │   ├── orderController.js    # Orders, status transitions, payments
│       │   ├── garmentController.js
│       │   └── dashboardController.js
│       └── routes/index.js
│
└── frontend/
    └── src/
        ├── stores/auth.js            # Pinia: session + active store
        ├── router/index.js
        ├── utils/api.js              # Axios with automatic X-Store-Id header
        └── views/
            ├── DashboardView.vue
            ├── OrdersView.vue
            ├── NewOrderView.vue
            ├── OrderDetailView.vue   # Includes printable ticket
            ├── ClientsView.vue
            ├── ClientDetailView.vue
            ├── CatalogView.vue
            ├── CashView.vue
            └── GlobalView.vue
```

---

## A few implementation notes

**Multi-tenant via `store_id`** — every table carries a `store_id`. The `requireStore` middleware checks on every request that the authenticated user has access to the store in the `X-Store-Id` header, which Axios injects automatically from the Pinia auth store.

**SQLite transactions** — order creation (order + items) and account registration (user + store + default garments) both use `db.transaction()` to guarantee consistency if anything fails mid-way.

**Thermal ticket with CSS print** — the ticket is rendered as inline HTML and printed with `window.print()`, using `@media print` to hide the rest of the UI. Works with 80mm printers without any extra dependency.

**Pinia over Vuex** — lighter store with better Composition API support. The auth store persists to `localStorage` and exposes the active store as a computed property so any component can read it without extra setup.

## Card payments

The system records card payments as an accounting note. Processing real card transactions would require integrating a payment gateway (Stripe, Redsys) with a registered business account — outside the scope of this demo.

---

## License

Private — all rights reserved.
