<template>
  <div class="page fade-up">
    <div class="page-header">
      <h1 class="page-title">Pedidos</h1>
      <RouterLink to="/orders/new" class="btn-accent">+ Nuevo pedido</RouterLink>
    </div>

    <!-- Filters -->
    <div class="filters">
      <input v-model="q" class="search-input" placeholder="🔍 Buscar cliente…" />
      <select v-model="statusFilter" class="select">
        <option value="">Todos los estados</option>
        <option value="received">Recibido</option>
        <option value="processing">En proceso</option>
        <option value="ready">Listo</option>
        <option value="delivered">Entregado</option>
      </select>
      <input v-model="fromDate" type="date" class="select" title="Desde" />
      <input v-model="toDate"   type="date" class="select" title="Hasta" />
    </div>

    <div v-if="loading" class="loading-rows">
      <div v-for="n in 6" :key="n" class="skeleton-row" />
    </div>

    <div v-else class="table-card">
      <table class="table">
        <thead>
          <tr>
            <th>#</th><th>Cliente</th><th>Prendas</th><th>Estado</th>
            <th>Total</th><th>Cobrado</th><th>Fecha entrada</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="o in orders" :key="o.id"
            class="table-row"
            @click="router.push(`/orders/${o.id}`)"
          >
            <td class="td-mono">#{{ o.id }}</td>
            <td>
              <p class="fw-medium">{{ o.client_name }}</p>
              <p class="text-sm text-muted">{{ o.client_phone }}</p>
            </td>
            <td class="td-mono">{{ o.item_count }}</td>
            <td><StatusBadge :status="o.status" /></td>
            <td class="td-mono">{{ fmt(o.total) }}</td>
            <td>
              <span :class="o.paid >= o.total ? 'paid-full' : 'paid-partial'">
                {{ fmt(o.paid) }}
              </span>
            </td>
            <td class="td-mono text-muted">{{ fmtDate(o.created_at) }}</td>
          </tr>
        </tbody>
      </table>
      <p v-if="!orders.length" class="empty">No hay pedidos con ese filtro</p>
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'
import { useRouter, RouterLink } from 'vue-router'
import api from '@/utils/api'
import { format } from 'date-fns'
import StatusBadge from '@/components/UI/StatusBadge.vue'

const router       = useRouter()
const orders       = ref([])
const loading      = ref(true)
const q            = ref('')
const statusFilter = ref('')
const fromDate     = ref('')
const toDate       = ref('')

const fmt     = v => `${Number(v || 0).toFixed(2)} €`
const fmtDate = d => format(new Date(d), 'dd/MM/yy HH:mm')

async function load() {
  loading.value = true
  try {
    const params = {}
    if (q.value)            params.q      = q.value
    if (statusFilter.value) params.status = statusFilter.value
    if (fromDate.value)     params.from   = fromDate.value
    if (toDate.value)       params.to     = toDate.value
    const { data } = await api.get('/orders', { params })
    orders.value = data
  } finally { loading.value = false }
}

watch([q, statusFilter, fromDate, toDate], () => load(), { debounce: 300 })
load()
</script>

<style scoped>
.page { max-width: 1100px; }
.page-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; }
.page-title  { font-size: 24px; font-weight: 700; letter-spacing: -0.03em; }
.btn-accent  { background: var(--accent); color: #fff; padding: 9px 20px; border-radius: var(--radius); font-size: 14px; font-weight: 600; }
.filters { display: flex; gap: 10px; margin-bottom: 16px; flex-wrap: wrap; }
.search-input { flex: 1; min-width: 180px; padding: 9px 13px; border: 1.5px solid var(--border); border-radius: var(--radius); font-size: 14px; background: var(--bg-2); color: var(--ink); outline: none; }
.search-input:focus { border-color: var(--accent); }
.select { padding: 9px 13px; border: 1.5px solid var(--border); border-radius: var(--radius); font-size: 14px; background: var(--bg-2); color: var(--ink); outline: none; cursor: pointer; }

.loading-rows { display: flex; flex-direction: column; gap: 8px; }
.skeleton-row { height: 52px; background: linear-gradient(90deg, var(--bg-2) 25%, var(--bg-3) 50%, var(--bg-2) 75%); background-size: 200% 100%; animation: shimmer 1.4s infinite; border-radius: var(--radius); }
@keyframes shimmer { from { background-position: 200% 0; } to { background-position: -200% 0; } }

.table-card { background: var(--bg-2); border: 1px solid var(--border); border-radius: var(--radius-lg); overflow: hidden; }
.table { width: 100%; border-collapse: collapse; }
.table th { padding: 10px 16px; text-align: left; font-size: 11px; font-weight: 700; color: var(--ink-4); text-transform: uppercase; letter-spacing: 0.05em; background: var(--bg-3); }
.table-row td { padding: 12px 16px; border-top: 1px solid var(--border); font-size: 13px; }
.table-row { cursor: pointer; transition: background 0.1s; }
.table-row:hover { background: var(--bg-3); }
.td-mono   { font-family: var(--font-mono); font-size: 12px; }
.fw-medium { font-weight: 500; }
.text-sm   { font-size: 12px; }
.text-muted { color: var(--ink-3); }
.paid-full    { color: var(--green); font-weight: 600; font-family: var(--font-mono); font-size: 12px; }
.paid-partial { color: var(--yellow); font-weight: 600; font-family: var(--font-mono); font-size: 12px; }
.empty { text-align: center; padding: 40px; color: var(--ink-4); font-size: 14px; }
</style>
