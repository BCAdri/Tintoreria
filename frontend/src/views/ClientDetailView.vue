<template>
  <div class="page fade-up">
    <RouterLink to="/clients" class="back-link">← Clientes</RouterLink>

    <div v-if="loading" class="loading-state">Cargando…</div>

    <template v-else-if="client">
      <div class="page-header">
        <div class="client-hero">
          <div class="avatar">{{ client.name[0].toUpperCase() }}</div>
          <div>
            <h1 class="page-title">{{ client.name }}</h1>
            <p class="page-sub">Cliente desde {{ fmtDate(client.created_at) }}</p>
          </div>
        </div>
        <div class="header-actions">
          <button class="btn-ghost" @click="showEdit = true">✏️ Editar</button>
          <RouterLink :to="`/orders/new`" class="btn-accent">+ Nuevo pedido</RouterLink>
        </div>
      </div>

      <div class="layout">
        <div class="main-col">
          <div class="card">
            <h2 class="card-title">Historial de pedidos</h2>
            <table class="table" v-if="client.orders.length">
              <thead><tr><th>#</th><th>Estado</th><th>Total</th><th>Fecha</th></tr></thead>
              <tbody>
                <tr
                  v-for="o in client.orders" :key="o.id"
                  class="table-row"
                  @click="router.push(`/orders/${o.id}`)"
                >
                  <td class="td-mono">#{{ o.id }}</td>
                  <td><StatusBadge :status="o.status" /></td>
                  <td class="td-mono">{{ o.total.toFixed(2) }} €</td>
                  <td class="text-muted">{{ fmtDate(o.created_at) }}</td>
                </tr>
              </tbody>
            </table>
            <p v-else class="empty">Este cliente no tiene pedidos aún</p>
          </div>
        </div>

        <div class="side-col">
          <div class="card">
            <h2 class="card-title">Información de contacto</h2>
            <div class="info-rows">
              <div class="info-row"><span>📞</span><span>{{ client.phone || '—' }}</span></div>
              <div class="info-row"><span>✉️</span><span>{{ client.email || '—' }}</span></div>
            </div>
            <div v-if="client.notes" class="notes-box">
              <p class="notes-label">Notas</p>
              <p class="notes-text">{{ client.notes }}</p>
            </div>
          </div>
          <div class="card stats-card">
            <div class="stat"><p class="stat-value">{{ client.orders.length }}</p><p class="stat-label">Pedidos totales</p></div>
            <div class="stat"><p class="stat-value">{{ totalSpent.toFixed(2) }} €</p><p class="stat-label">Gasto total</p></div>
          </div>
        </div>
      </div>

      <!-- Edit modal -->
      <div v-if="showEdit" class="overlay" @mousedown.self="showEdit = false">
        <div class="modal">
          <div class="modal-header"><h2>Editar cliente</h2><button @click="showEdit = false">✕</button></div>
          <div class="modal-body">
            <div class="field"><label>Nombre</label><input v-model="editForm.name" class="field-input" /></div>
            <div class="fields-row">
              <div class="field"><label>Teléfono</label><input v-model="editForm.phone" class="field-input" /></div>
              <div class="field"><label>Email</label><input v-model="editForm.email" class="field-input" type="email" /></div>
            </div>
            <div class="field"><label>Notas</label><textarea v-model="editForm.notes" class="field-input" rows="2" /></div>
          </div>
          <div class="modal-footer">
            <button class="btn-ghost" @click="showEdit = false">Cancelar</button>
            <button class="btn-primary" @click="saveEdit" :disabled="saving">
              <span v-if="saving" class="spinner" /><span v-else>Guardar</span>
            </button>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter, RouterLink } from 'vue-router'
import api from '@/utils/api'
import { format } from 'date-fns'
import StatusBadge from '@/components/UI/StatusBadge.vue'

const props  = defineProps({ id: { type: String, required: true } })
const router = useRouter()
const client   = ref(null)
const loading  = ref(true)
const showEdit = ref(false)
const saving   = ref(false)
const editForm = ref({})

const fmtDate    = d => format(new Date(d), 'dd/MM/yyyy')
const totalSpent = computed(() => client.value?.orders.reduce((s, o) => s + o.total, 0) || 0)

async function load() {
  loading.value = true
  try {
    const { data } = await api.get(`/clients/${props.id}`)
    client.value  = data
    editForm.value = { name: data.name, phone: data.phone || '', email: data.email || '', notes: data.notes || '' }
  } finally { loading.value = false }
}

async function saveEdit() {
  saving.value = true
  try {
    const { data } = await api.patch(`/clients/${props.id}`, editForm.value)
    client.value = { ...client.value, ...data }
    showEdit.value = false
  } finally { saving.value = false }
}

onMounted(load)
</script>

<style scoped>
.page { max-width: 900px; }
.back-link { font-size: 13px; color: var(--accent); display: block; margin-bottom: 16px; }
.page-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 24px; gap: 16px; flex-wrap: wrap; }
.client-hero { display: flex; align-items: center; gap: 14px; }
.avatar { width: 48px; height: 48px; background: var(--accent); color: #fff; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 20px; font-weight: 700; }
.page-title { font-size: 22px; font-weight: 700; letter-spacing: -0.02em; }
.page-sub   { font-size: 13px; color: var(--ink-3); margin-top: 2px; }
.header-actions { display: flex; gap: 10px; }
.loading-state  { padding: 60px; text-align: center; color: var(--ink-3); }
.layout    { display: grid; grid-template-columns: 1fr 260px; gap: 16px; }
.main-col, .side-col { display: flex; flex-direction: column; gap: 16px; }
.side-col  { position: sticky; top: 20px; }
.card      { background: var(--bg-2); border: 1px solid var(--border); border-radius: var(--radius-lg); padding: 20px; }
.card-title { font-size: 12px; font-weight: 700; color: var(--ink-3); text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 14px; }
.table { width: 100%; border-collapse: collapse; }
.table th { padding: 8px 12px; text-align: left; font-size: 11px; font-weight: 700; color: var(--ink-4); text-transform: uppercase; letter-spacing: 0.05em; background: var(--bg-3); }
.table-row td { padding: 11px 12px; border-top: 1px solid var(--border); font-size: 13px; }
.table-row { cursor: pointer; transition: background 0.1s; }
.table-row:hover { background: var(--bg-3); }
.td-mono  { font-family: var(--font-mono); font-size: 12px; }
.text-muted { color: var(--ink-3); font-size: 12px; }
.empty { padding: 30px; text-align: center; color: var(--ink-4); font-size: 13px; }
.info-rows { display: flex; flex-direction: column; gap: 10px; margin-bottom: 14px; }
.info-row  { display: flex; align-items: center; gap: 10px; font-size: 14px; color: var(--ink-2); }
.notes-box   { background: var(--bg-3); border-radius: var(--radius); padding: 12px; }
.notes-label { font-size: 11px; font-weight: 700; color: var(--ink-3); text-transform: uppercase; margin-bottom: 6px; }
.notes-text  { font-size: 13px; color: var(--ink-2); line-height: 1.5; }
.stats-card  { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.stat        { text-align: center; }
.stat-value  { font-size: 22px; font-weight: 700; font-family: var(--font-mono); color: var(--accent); }
.stat-label  { font-size: 11px; color: var(--ink-3); margin-top: 2px; }
.btn-accent  { background: var(--accent); color: #fff; padding: 8px 16px; border-radius: var(--radius); font-size: 13px; font-weight: 600; }
.btn-ghost   { padding: 8px 16px; border: 1px solid var(--border); border-radius: var(--radius); font-size: 13px; color: var(--ink-2); transition: background 0.1s; }
.btn-ghost:hover { background: var(--bg-3); }
.overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center; z-index: 200; backdrop-filter: blur(3px); }
.modal { background: var(--bg-2); border-radius: var(--radius-xl); width: 100%; max-width: 480px; box-shadow: var(--shadow-lg); animation: fadeUp 0.2s ease both; }
.modal-header { display: flex; align-items: center; justify-content: space-between; padding: 18px 24px; border-bottom: 1px solid var(--border); font-size: 16px; font-weight: 700; }
.modal-header button { color: var(--ink-3); font-size: 16px; }
.modal-body { padding: 20px 24px; display: flex; flex-direction: column; gap: 12px; }
.modal-footer { padding: 14px 24px; border-top: 1px solid var(--border); display: flex; gap: 10px; justify-content: flex-end; }
.field { display: flex; flex-direction: column; gap: 5px; flex: 1; }
.field label { font-size: 12px; font-weight: 600; color: var(--ink-3); }
.field-input { background: var(--bg-3); border: 1.5px solid var(--border); border-radius: var(--radius); padding: 8px 12px; font-size: 14px; color: var(--ink); outline: none; width: 100%; }
.field-input:focus { border-color: var(--accent); }
.fields-row { display: flex; gap: 12px; }
.btn-primary { padding: 9px 20px; background: var(--accent); color: #fff; border-radius: var(--radius); font-size: 14px; font-weight: 600; display: flex; align-items: center; gap: 8px; }
.btn-primary:disabled { opacity: 0.4; cursor: not-allowed; }
.spinner { width: 16px; height: 16px; border: 2px solid rgba(255,255,255,0.3); border-top-color: #fff; border-radius: 50%; animation: spin 0.6s linear infinite; }
</style>
