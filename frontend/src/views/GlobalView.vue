<template>
  <div class="page fade-up">
    <div class="page-header">
      <div>
        <h1 class="page-title">Vista global</h1>
        <p class="page-sub">Resumen de todas tus tiendas</p>
      </div>
    </div>

    <div v-if="loading" class="loading-state">Cargando…</div>

    <template v-else-if="data">
      <!-- Global KPIs -->
      <div class="kpi-grid">
        <div class="kpi">
          <p class="kpi__label">Ingresos totales</p>
          <p class="kpi__value">{{ fmt(data.totals.total_revenue) }}</p>
        </div>
        <div class="kpi">
          <p class="kpi__label">Pedidos totales</p>
          <p class="kpi__value">{{ data.totals.total_orders }}</p>
        </div>
        <div class="kpi">
          <p class="kpi__label">Clientes totales</p>
          <p class="kpi__value">{{ data.totals.total_clients }}</p>
        </div>
        <div class="kpi">
          <p class="kpi__label">Tiendas activas</p>
          <p class="kpi__value">{{ data.stores.length }}</p>
        </div>
      </div>

      <!-- Per store comparison -->
      <div class="card">
        <h2 class="card-title">Comparativa por tienda</h2>
        <table class="table">
          <thead>
            <tr><th>Tienda</th><th>Ciudad</th><th>Pedidos</th><th>Clientes</th><th>Ingresos</th><th>% del total</th></tr>
          </thead>
          <tbody>
            <tr v-for="store in data.stores" :key="store.id" class="table-row" @click="switchStore(store.id)">
              <td class="fw-medium">{{ store.name }}</td>
              <td class="text-muted">{{ store.city || '—' }}</td>
              <td class="td-mono">{{ store.total_orders }}</td>
              <td class="td-mono">{{ store.total_clients }}</td>
              <td class="td-mono fw-bold">{{ fmt(store.total_revenue) }}</td>
              <td>
                <div class="pct-bar-wrap">
                  <div class="pct-bar" :style="{ width: pct(store.total_revenue) + '%' }" />
                  <span class="pct-label">{{ pct(store.total_revenue).toFixed(0) }}%</span>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
        <p v-if="!data.stores.length" class="empty">Sin tiendas</p>
      </div>

      <!-- Monthly trend -->
      <div class="card" v-if="data.monthlyRevenue.length">
        <h2 class="card-title">Evolución mensual (ingresos combinados)</h2>
        <div class="bar-chart">
          <div
            v-for="m in data.monthlyRevenue"
            :key="m.month"
            class="bar-wrap"
            :title="`${m.month}: ${fmt(m.total)}`"
          >
            <span class="bar-value">{{ fmt(m.total) }}</span>
            <div class="bar" :style="{ height: `${barPct(m.total)}%` }" />
            <span class="bar-label">{{ m.month.slice(5) }}/{{ m.month.slice(2,4) }}</span>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import api from '@/utils/api'

const router = useRouter()
const auth   = useAuthStore()
const data    = ref(null)
const loading = ref(true)

const fmt = v => `${Number(v || 0).toFixed(2)} €`

const totalRev = () => data.value?.totals.total_revenue || 1
const pct      = val => Math.max((val / totalRev()) * 100, 0)
const maxMonth = () => Math.max(...(data.value?.monthlyRevenue.map(m => m.total) || [1]), 1)
const barPct   = val => Math.max((val / maxMonth()) * 100, 3)

function switchStore(id) {
  auth.setActiveStore(id)
  router.push('/dashboard')
}

onMounted(async () => {
  try {
    const { data: d } = await api.get('/dashboard/global')
    data.value = d
  } finally { loading.value = false }
})
</script>

<style scoped>
.page { max-width: 1000px; }
.page-header { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 24px; }
.page-title  { font-size: 24px; font-weight: 700; letter-spacing: -0.03em; }
.page-sub    { font-size: 13px; color: var(--ink-3); margin-top: 3px; }
.loading-state { padding: 60px; text-align: center; color: var(--ink-3); }
.kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; margin-bottom: 20px; }
.kpi { background: var(--bg-2); border: 1px solid var(--border); border-radius: var(--radius-lg); padding: 18px; }
.kpi__label  { font-size: 11px; font-weight: 700; color: var(--ink-3); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 8px; }
.kpi__value  { font-size: 26px; font-weight: 700; font-family: var(--font-mono); letter-spacing: -0.03em; }
.card        { background: var(--bg-2); border: 1px solid var(--border); border-radius: var(--radius-lg); overflow: hidden; margin-bottom: 16px; padding: 0; }
.card-title  { font-size: 12px; font-weight: 700; color: var(--ink-3); text-transform: uppercase; letter-spacing: 0.06em; padding: 14px 20px; border-bottom: 1px solid var(--border); background: var(--bg-3); }
.table { width: 100%; border-collapse: collapse; }
.table th { padding: 10px 18px; text-align: left; font-size: 11px; font-weight: 700; color: var(--ink-4); text-transform: uppercase; letter-spacing: 0.05em; background: var(--bg-3); }
.table-row td { padding: 13px 18px; border-top: 1px solid var(--border); font-size: 13px; }
.table-row { cursor: pointer; transition: background 0.1s; }
.table-row:hover { background: var(--bg-3); }
.fw-medium  { font-weight: 500; }
.fw-bold    { font-weight: 700; }
.td-mono    { font-family: var(--font-mono); font-size: 12px; }
.text-muted { color: var(--ink-3); }
.pct-bar-wrap { display: flex; align-items: center; gap: 8px; }
.pct-bar     { height: 6px; background: var(--accent); border-radius: 3px; transition: width 0.4s ease; min-width: 3px; }
.pct-label   { font-size: 11px; font-family: var(--font-mono); color: var(--ink-3); width: 36px; }
.empty { text-align: center; padding: 32px; color: var(--ink-4); }
.bar-chart { display: flex; align-items: flex-end; gap: 12px; height: 160px; padding: 20px; }
.bar-wrap  { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 6px; height: 100%; justify-content: flex-end; }
.bar-value { font-size: 10px; font-family: var(--font-mono); color: var(--ink-3); text-align: center; }
.bar       { width: 100%; background: var(--accent); border-radius: 4px 4px 0 0; min-height: 4px; opacity: 0.85; transition: height 0.3s ease; }
.bar-label { font-size: 11px; color: var(--ink-4); font-family: var(--font-mono); }
</style>
