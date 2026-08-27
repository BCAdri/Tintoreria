<template>
  <div class="page fade-up">
    <div class="page-header">
      <div>
        <h1 class="page-title">Dashboard</h1>
        <p class="page-sub">{{ auth.activeStore?.name }} · {{ today }}</p>
      </div>
      <RouterLink to="/orders/new" class="btn-accent">+ Nuevo pedido</RouterLink>
    </div>

    <div v-if="loading" class="skeletons">
      <div v-for="n in 4" :key="n" class="skeleton-card" />
    </div>

    <template v-else-if="stats">
      <!-- KPI cards -->
      <div class="kpi-grid">
        <div class="kpi">
          <p class="kpi__label">Ingresos hoy</p>
          <p class="kpi__value">{{ fmt(stats.revenue.today) }}</p>
          <p class="kpi__sub">{{ fmt(stats.revenue.month) }} este mes</p>
        </div>
        <div class="kpi">
          <p class="kpi__label">Pedidos activos</p>
          <p class="kpi__value">{{ stats.orders.received + stats.orders.processing + stats.orders.ready }}</p>
          <p class="kpi__sub">{{ stats.orders.delivered }} entregados en total</p>
        </div>
        <div class="kpi kpi--warn">
          <p class="kpi__label">Pendiente de cobro</p>
          <p class="kpi__value">{{ fmt(stats.pendingBalance) }}</p>
          <p class="kpi__sub">En pedidos no entregados</p>
        </div>
        <div class="kpi">
          <p class="kpi__label">Ingresos semana</p>
          <p class="kpi__value">{{ fmt(stats.revenue.week) }}</p>
          <p class="kpi__sub">Últimos 7 días</p>
        </div>
      </div>

      <!-- Status row -->
      <div class="status-row">
        <div v-for="s in statusItems" :key="s.key" class="status-pill" :class="`status-${s.key}`">
          <span class="status-pill__count">{{ stats.orders[s.key] }}</span>
          <span class="status-pill__label">{{ s.label }}</span>
        </div>
      </div>

      <!-- Revenue chart + Payment methods -->
      <div class="charts-row">
        <div class="chart-card">
          <p class="chart-title">Ingresos últimos 14 días</p>
          <div class="bar-chart">
            <div
              v-for="day in chartDays"
              :key="day.label"
              class="bar-wrap"
              :title="`${day.label}: ${fmt(day.total)}`"
            >
              <div class="bar" :style="{ height: `${day.pct}%` }" />
              <span class="bar-label">{{ day.shortLabel }}</span>
            </div>
          </div>
        </div>

        <div class="chart-card chart-card--sm">
          <p class="chart-title">Métodos de pago</p>
          <div class="payment-methods">
            <div v-for="pm in stats.paymentMethods" :key="pm.method" class="pm-row">
              <span class="pm-icon">{{ pmIcons[pm.method] }}</span>
              <div class="pm-info">
                <div class="pm-bar-wrap">
                  <div class="pm-bar" :style="{ width: `${pmPct(pm.total)}%`, background: pmColors[pm.method] }" />
                </div>
                <div class="pm-labels">
                  <span class="pm-name">{{ pmNames[pm.method] }}</span>
                  <span class="pm-total">{{ fmt(pm.total) }} ({{ pm.cnt }})</span>
                </div>
              </div>
            </div>
            <p v-if="!stats.paymentMethods.length" class="empty-hint">Sin cobros registrados</p>
          </div>
        </div>
      </div>

      <!-- Recent orders -->
      <div class="section-card">
        <div class="section-card__header">
          <p class="chart-title">Pedidos recientes</p>
          <RouterLink to="/orders" class="link-more">Ver todos →</RouterLink>
        </div>
        <table class="table">
          <thead>
            <tr>
              <th>#</th>
              <th>Cliente</th>
              <th>Estado</th>
              <th>Total</th>
              <th>Fecha</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="o in stats.recentOrders" :key="o.id"
              class="table-row"
              @click="router.push(`/orders/${o.id}`)"
            >
              <td class="td-id">#{{ o.id }}</td>
              <td>{{ o.client_name }}</td>
              <td><span class="status-badge" :class="`status-${o.status}`">{{ statusLabels[o.status] }}</span></td>
              <td class="td-amount">{{ fmt(o.total) }}</td>
              <td class="td-date">{{ fmtDate(o.created_at) }}</td>
            </tr>
          </tbody>
        </table>
        <p v-if="!stats.recentOrders.length" class="empty-hint">No hay pedidos aún</p>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter, RouterLink } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import api from '@/utils/api'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

const auth   = useAuthStore()
const router = useRouter()
const stats   = ref(null)
const loading = ref(true)

const today = format(new Date(), "EEEE d 'de' MMMM", { locale: es })

const statusItems  = [
  { key: 'received',   label: 'Recibidos'   },
  { key: 'processing', label: 'En proceso'  },
  { key: 'ready',      label: 'Listos'      },
  { key: 'delivered',  label: 'Entregados'  },
]
const statusLabels = { received: 'Recibido', processing: 'En proceso', ready: 'Listo', delivered: 'Entregado' }
const pmIcons  = { cash: '💵', card: '💳', bizum: '📱' }
const pmNames  = { cash: 'Efectivo', card: 'Tarjeta', bizum: 'Bizum' }
const pmColors = { cash: '#16a34a', card: '#2563eb', bizum: '#7c3aed' }

const fmt     = v => `${Number(v || 0).toFixed(2)} €`
const fmtDate = d => format(new Date(d), 'dd/MM/yy')

const maxRevenue = computed(() => Math.max(...(stats.value?.dailyRevenue.map(d => d.total) || [1]), 1))

const chartDays = computed(() => {
  if (!stats.value) return []
  const map = Object.fromEntries(stats.value.dailyRevenue.map(d => [d.day, d.total]))
  const days = []
  for (let i = 13; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i)
    const key = d.toISOString().slice(0, 10)
    const total = map[key] || 0
    days.push({
      label: format(d, 'dd/MM'),
      shortLabel: format(d, 'dd'),
      total,
      pct: Math.max((total / maxRevenue.value) * 100, 2),
    })
  }
  return days
})

const totalPm  = computed(() => stats.value?.paymentMethods.reduce((s, p) => s + p.total, 0) || 1)
const pmPct    = total => Math.max((total / totalPm.value) * 100, 4)

onMounted(async () => {
  try {
    const { data } = await api.get('/dashboard')
    stats.value = data
  } catch {
    // handled by interceptor
  } finally {
    loading.value = false
  }
})
</script>

<style scoped>
.page { max-width: 1100px; }
.page-header { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 28px; gap: 16px; flex-wrap: wrap; }
.page-title  { font-size: 24px; font-weight: 700; letter-spacing: -0.03em; }
.page-sub    { font-size: 13px; color: var(--ink-3); margin-top: 3px; text-transform: capitalize; }
.btn-accent  { background: var(--accent); color: #fff; padding: 9px 20px; border-radius: var(--radius); font-size: 14px; font-weight: 600; transition: opacity 0.15s; }
.btn-accent:hover { opacity: 0.9; }

/* Skeletons */
.skeletons { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 20px; }
.skeleton-card { height: 110px; background: linear-gradient(90deg, var(--bg-2) 25%, var(--bg-3) 50%, var(--bg-2) 75%); background-size: 200% 100%; animation: shimmer 1.4s infinite; border-radius: var(--radius-lg); }
@keyframes shimmer { from { background-position: 200% 0; } to { background-position: -200% 0; } }

/* KPIs */
.kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 16px; }
.kpi { background: var(--bg-2); border: 1px solid var(--border); border-radius: var(--radius-lg); padding: 20px; }
.kpi--warn { border-color: #fde68a; background: var(--yellow-bg); }
.kpi__label { font-size: 12px; font-weight: 600; color: var(--ink-3); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 8px; }
.kpi__value { font-size: 26px; font-weight: 700; letter-spacing: -0.03em; margin-bottom: 4px; }
.kpi__sub   { font-size: 12px; color: var(--ink-3); }

/* Status row */
.status-row { display: flex; gap: 10px; margin-bottom: 20px; flex-wrap: wrap; }
.status-pill { display: flex; align-items: center; gap: 8px; padding: 8px 16px; border-radius: var(--radius-lg); font-size: 13px; font-weight: 500; }
.status-pill__count { font-size: 20px; font-weight: 700; }

/* Charts */
.charts-row { display: grid; grid-template-columns: 1fr 340px; gap: 16px; margin-bottom: 20px; }
.chart-card { background: var(--bg-2); border: 1px solid var(--border); border-radius: var(--radius-lg); padding: 20px; }
.chart-title { font-size: 13px; font-weight: 600; color: var(--ink-2); margin-bottom: 16px; }

.bar-chart { display: flex; align-items: flex-end; gap: 4px; height: 120px; }
.bar-wrap  { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 4px; height: 100%; justify-content: flex-end; }
.bar       { width: 100%; background: var(--accent); border-radius: 3px 3px 0 0; min-height: 3px; transition: height 0.3s ease; opacity: 0.8; }
.bar-label { font-size: 9px; color: var(--ink-4); font-family: var(--font-mono); }

/* Payment methods */
.payment-methods { display: flex; flex-direction: column; gap: 14px; }
.pm-row  { display: flex; align-items: center; gap: 10px; }
.pm-icon { font-size: 18px; width: 24px; text-align: center; }
.pm-info { flex: 1; }
.pm-bar-wrap { height: 6px; background: var(--bg-3); border-radius: 3px; margin-bottom: 5px; overflow: hidden; }
.pm-bar      { height: 100%; border-radius: 3px; transition: width 0.4s ease; }
.pm-labels   { display: flex; justify-content: space-between; }
.pm-name     { font-size: 12px; font-weight: 500; color: var(--ink-2); }
.pm-total    { font-size: 12px; color: var(--ink-3); font-family: var(--font-mono); }
.empty-hint  { font-size: 13px; color: var(--ink-4); text-align: center; padding: 20px 0; }

/* Section card */
.section-card { background: var(--bg-2); border: 1px solid var(--border); border-radius: var(--radius-lg); overflow: hidden; }
.section-card__header { display: flex; align-items: center; justify-content: space-between; padding: 16px 20px; border-bottom: 1px solid var(--border); }
.link-more { font-size: 13px; color: var(--accent); font-weight: 500; }

/* Table */
.table { width: 100%; border-collapse: collapse; }
.table th { padding: 10px 20px; text-align: left; font-size: 11px; font-weight: 700; color: var(--ink-4); text-transform: uppercase; letter-spacing: 0.05em; background: var(--bg-3); }
.table-row td { padding: 12px 20px; border-top: 1px solid var(--border); font-size: 13px; }
.table-row { cursor: pointer; transition: background 0.1s; }
.table-row:hover { background: var(--bg-3); }
.td-id     { font-family: var(--font-mono); color: var(--ink-3); font-size: 12px; }
.td-amount { font-weight: 600; font-family: var(--font-mono); }
.td-date   { color: var(--ink-3); font-size: 12px; }

.status-badge { padding: 3px 10px; border-radius: var(--radius); font-size: 12px; font-weight: 600; }
</style>
