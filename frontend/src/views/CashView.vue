<template>
  <div class="page fade-up">
    <div class="page-header">
      <div>
        <h1 class="page-title">Caja</h1>
        <p class="page-sub">{{ dateLabel }}</p>
      </div>
      <div class="date-nav">
        <button class="btn-ghost" @click="changeDay(-1)">←</button>
        <span class="date-label">{{ shortDate }}</span>
        <button class="btn-ghost" @click="changeDay(1)" :disabled="isToday">→</button>
      </div>
    </div>

    <div v-if="loading" class="loading-state">Cargando caja…</div>

    <template v-else>
      <!-- Summary KPIs -->
      <div class="kpi-grid">
        <div class="kpi">
          <p class="kpi__label">Total cobrado</p>
          <p class="kpi__value">{{ fmt(summary.total) }}</p>
        </div>
        <div class="kpi kpi--green">
          <p class="kpi__label">Efectivo</p>
          <p class="kpi__value">{{ fmt(summary.cash) }}</p>
        </div>
        <div class="kpi kpi--blue">
          <p class="kpi__label">Tarjeta</p>
          <p class="kpi__value">{{ fmt(summary.card) }}</p>
        </div>
        <div class="kpi kpi--purple">
          <p class="kpi__label">Bizum</p>
          <p class="kpi__value">{{ fmt(summary.bizum) }}</p>
        </div>
      </div>

      <!-- Payments list -->
      <div class="card">
        <h2 class="card-title">Movimientos del día ({{ payments.length }})</h2>
        <table class="table" v-if="payments.length">
          <thead>
            <tr><th>Hora</th><th>Cliente</th><th>Pedido</th><th>Método</th><th>Importe</th></tr>
          </thead>
          <tbody>
            <tr
              v-for="p in payments" :key="p.id"
              class="table-row"
              @click="router.push(`/orders/${p.order_id}`)"
            >
              <td class="td-mono">{{ fmtTime(p.created_at) }}</td>
              <td>{{ p.client_name || '—' }}</td>
              <td class="td-mono">#{{ p.order_id }}</td>
              <td>
                <span class="method-badge" :class="`method-${p.method}`">
                  {{ methodIcons[p.method] }} {{ methodNames[p.method] }}
                </span>
              </td>
              <td class="td-mono fw-bold">{{ fmt(p.amount) }}</td>
            </tr>
          </tbody>
          <tfoot>
            <tr>
              <td colspan="4" class="tf-label">Total del día</td>
              <td class="td-mono fw-bold total-val">{{ fmt(summary.total) }}</td>
            </tr>
          </tfoot>
        </table>
        <p v-else class="empty">Sin movimientos este día</p>
      </div>

      <!-- Pending orders -->
      <div class="card">
        <h2 class="card-title">Pedidos pendientes de cobro</h2>
        <table class="table" v-if="pending.length">
          <thead>
            <tr><th>#</th><th>Cliente</th><th>Estado</th><th>Total</th><th>Pendiente</th></tr>
          </thead>
          <tbody>
            <tr
              v-for="o in pending" :key="o.id"
              class="table-row"
              @click="router.push(`/orders/${o.id}`)"
            >
              <td class="td-mono">#{{ o.id }}</td>
              <td>{{ o.client_name }}</td>
              <td><StatusBadge :status="o.status" /></td>
              <td class="td-mono">{{ fmt(o.total) }}</td>
              <td class="td-mono fw-bold pending-val">{{ fmt(o.total - o.paid) }}</td>
            </tr>
          </tbody>
        </table>
        <p v-else class="empty">✓ No hay pedidos pendientes de cobro</p>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import api from '@/utils/api'
import { format, isToday as isTodayFn } from 'date-fns'
import { es } from 'date-fns/locale'
import StatusBadge from '@/components/UI/StatusBadge.vue'

const router   = useRouter()
const date     = ref(new Date())
const payments = ref([])
const pending  = ref([])
const loading  = ref(true)

const fmt       = v => `${Number(v || 0).toFixed(2)} €`
const fmtTime   = d => format(new Date(d), 'HH:mm')
const shortDate = computed(() => format(date.value, 'dd/MM/yyyy'))
const dateLabel = computed(() => format(date.value, "EEEE d 'de' MMMM yyyy", { locale: es }))
const isToday   = computed(() => isTodayFn(date.value))

const methodIcons = { cash: '💵', card: '💳', bizum: '📱' }
const methodNames = { cash: 'Efectivo', card: 'Tarjeta', bizum: 'Bizum' }

const summary = computed(() => {
  return payments.value.reduce((acc, p) => {
    acc.total += p.amount
    acc[p.method] = (acc[p.method] || 0) + p.amount
    return acc
  }, { total: 0, cash: 0, card: 0, bizum: 0 })
})

async function load() {
  loading.value = true
  const day = date.value.toISOString().slice(0, 10)
  try {
    const { data } = await api.get('/cash', { params: { date: day } })
    payments.value = data.payments
    pending.value  = data.pending
  } finally { loading.value = false }
}

function changeDay(delta) {
  const d = new Date(date.value)
  d.setDate(d.getDate() + delta)
  if (d <= new Date()) { date.value = d; load() }
}

onMounted(load)
</script>

<style scoped>
.page { max-width: 900px; }
.page-header { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 24px; gap: 16px; flex-wrap: wrap; }
.page-title  { font-size: 24px; font-weight: 700; letter-spacing: -0.03em; }
.page-sub    { font-size: 13px; color: var(--ink-3); margin-top: 3px; text-transform: capitalize; }
.date-nav    { display: flex; align-items: center; gap: 10px; }
.date-label  { font-size: 14px; font-weight: 600; font-family: var(--font-mono); min-width: 90px; text-align: center; }
.btn-ghost   { padding: 8px 14px; border: 1px solid var(--border); border-radius: var(--radius); font-size: 14px; color: var(--ink-2); background: var(--bg-2); transition: background 0.1s; }
.btn-ghost:hover:not(:disabled) { background: var(--bg-3); }
.btn-ghost:disabled { opacity: 0.3; cursor: not-allowed; }
.loading-state { padding: 60px; text-align: center; color: var(--ink-3); }
.kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; margin-bottom: 20px; }
.kpi { background: var(--bg-2); border: 1px solid var(--border); border-radius: var(--radius-lg); padding: 18px; }
.kpi--green  { border-color: #bbf7d0; background: var(--green-bg); }
.kpi--blue   { border-color: #bfdbfe; background: var(--accent-bg); }
.kpi--purple { border-color: #ddd6fe; background: #f5f3ff; }
.kpi__label  { font-size: 11px; font-weight: 700; color: var(--ink-3); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 8px; }
.kpi__value  { font-size: 22px; font-weight: 700; font-family: var(--font-mono); letter-spacing: -0.02em; }
.card        { background: var(--bg-2); border: 1px solid var(--border); border-radius: var(--radius-lg); overflow: hidden; margin-bottom: 16px; }
.card-title  { font-size: 12px; font-weight: 700; color: var(--ink-3); text-transform: uppercase; letter-spacing: 0.06em; padding: 14px 18px; border-bottom: 1px solid var(--border); background: var(--bg-3); }
.table { width: 100%; border-collapse: collapse; }
.table th { padding: 10px 16px; text-align: left; font-size: 11px; font-weight: 700; color: var(--ink-4); text-transform: uppercase; letter-spacing: 0.05em; background: var(--bg-3); }
.table-row td { padding: 12px 16px; border-top: 1px solid var(--border); font-size: 13px; }
.table-row { cursor: pointer; transition: background 0.1s; }
.table-row:hover { background: var(--bg-3); }
.table tfoot td { padding: 12px 16px; border-top: 2px solid var(--border-2); }
.td-mono   { font-family: var(--font-mono); font-size: 12px; }
.fw-bold   { font-weight: 700; }
.tf-label  { font-size: 13px; font-weight: 700; color: var(--ink-2); }
.total-val   { font-size: 16px; color: var(--accent); }
.pending-val { color: var(--red); }
.method-badge { display: inline-flex; align-items: center; gap: 5px; padding: 3px 8px; border-radius: var(--radius); font-size: 12px; font-weight: 500; }
.method-cash   { background: var(--green-bg); color: var(--green); }
.method-card   { background: var(--accent-bg); color: var(--accent); }
.method-bizum  { background: #f5f3ff; color: var(--purple); }
.empty { text-align: center; padding: 32px; color: var(--ink-4); font-size: 13px; }
</style>
