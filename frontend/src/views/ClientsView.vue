<template>
  <div class="page fade-up">
    <div class="page-header">
      <h1 class="page-title">Clientes</h1>
      <button class="btn-accent" @click="showForm = true">+ Nuevo cliente</button>
    </div>

    <div class="search-bar">
      <input v-model="q" class="search-input" placeholder="🔍 Buscar por nombre, teléfono o email…" @input="load" />
    </div>

    <div v-if="loading" class="loading-rows">
      <div v-for="n in 6" :key="n" class="skeleton-row" />
    </div>

    <div v-else class="table-card">
      <table class="table">
        <thead>
          <tr><th>Cliente</th><th>Teléfono</th><th>Email</th><th>Pedidos</th><th>Último pedido</th></tr>
        </thead>
        <tbody>
          <tr
            v-for="c in clients" :key="c.id"
            class="table-row"
            @click="router.push(`/clients/${c.id}`)"
          >
            <td>
              <div class="client-cell">
                <div class="avatar">{{ c.name[0].toUpperCase() }}</div>
                <span class="fw-medium">{{ c.name }}</span>
              </div>
            </td>
            <td class="text-muted">{{ c.phone || '—' }}</td>
            <td class="text-muted">{{ c.email || '—' }}</td>
            <td class="td-mono">{{ c.order_count }}</td>
            <td class="text-muted">{{ c.last_order ? fmtDate(c.last_order) : '—' }}</td>
          </tr>
        </tbody>
      </table>
      <p v-if="!clients.length" class="empty">No hay clientes aún</p>
    </div>

    <!-- New client modal -->
    <div v-if="showForm" class="overlay" @mousedown.self="showForm = false">
      <div class="modal">
        <div class="modal-header">
          <h2>Nuevo cliente</h2>
          <button @click="showForm = false">✕</button>
        </div>
        <div class="modal-body">
          <div class="field"><label>Nombre *</label><input v-model="form.name" class="field-input" placeholder="Nombre completo" /></div>
          <div class="fields-row">
            <div class="field"><label>Teléfono</label><input v-model="form.phone" class="field-input" placeholder="600 000 000" /></div>
            <div class="field"><label>Email</label><input v-model="form.email" class="field-input" type="email" placeholder="correo@ejemplo.com" /></div>
          </div>
          <div class="field"><label>Notas</label><textarea v-model="form.notes" class="field-input" rows="2" placeholder="Preferencias, alergias…" /></div>
        </div>
        <div class="modal-footer">
          <button class="btn-ghost" @click="showForm = false">Cancelar</button>
          <button class="btn-primary" :disabled="!form.name.trim() || saving" @click="createClient">
            <span v-if="saving" class="spinner" /><span v-else>Crear cliente</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import api from '@/utils/api'
import { format } from 'date-fns'

const router   = useRouter()
const clients  = ref([])
const loading  = ref(true)
const q        = ref('')
const showForm = ref(false)
const saving   = ref(false)
const form     = ref({ name: '', phone: '', email: '', notes: '' })

const fmtDate = d => format(new Date(d), 'dd/MM/yyyy')

async function load() {
  loading.value = true
  try {
    const { data } = await api.get('/clients', { params: q.value ? { q: q.value } : {} })
    clients.value = data
  } finally { loading.value = false }
}

async function createClient() {
  saving.value = true
  try {
    await api.post('/clients', form.value)
    form.value = { name: '', phone: '', email: '', notes: '' }
    showForm.value = false
    load()
  } finally { saving.value = false }
}

onMounted(load)
</script>

<style scoped>
.page { max-width: 900px; }
.page-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; }
.page-title  { font-size: 24px; font-weight: 700; letter-spacing: -0.03em; }
.btn-accent  { background: var(--accent); color: #fff; padding: 9px 20px; border-radius: var(--radius); font-size: 14px; font-weight: 600; }
.search-bar  { margin-bottom: 16px; }
.search-input { width: 100%; padding: 10px 14px; border: 1.5px solid var(--border); border-radius: var(--radius); font-size: 14px; background: var(--bg-2); color: var(--ink); outline: none; }
.search-input:focus { border-color: var(--accent); }

.loading-rows { display: flex; flex-direction: column; gap: 8px; }
.skeleton-row { height: 52px; background: linear-gradient(90deg, var(--bg-2) 25%, var(--bg-3) 50%, var(--bg-2) 75%); background-size: 200% 100%; animation: shimmer 1.4s infinite; border-radius: var(--radius); }
@keyframes shimmer { from { background-position: 200% 0; } to { background-position: -200% 0; } }

.table-card { background: var(--bg-2); border: 1px solid var(--border); border-radius: var(--radius-lg); overflow: hidden; }
.table { width: 100%; border-collapse: collapse; }
.table th { padding: 10px 16px; text-align: left; font-size: 11px; font-weight: 700; color: var(--ink-4); text-transform: uppercase; letter-spacing: 0.05em; background: var(--bg-3); }
.table-row td { padding: 12px 16px; border-top: 1px solid var(--border); font-size: 13px; }
.table-row { cursor: pointer; transition: background 0.1s; }
.table-row:hover { background: var(--bg-3); }
.client-cell { display: flex; align-items: center; gap: 10px; }
.avatar { width: 32px; height: 32px; background: var(--accent); color: #fff; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 700; flex-shrink: 0; }
.fw-medium  { font-weight: 500; }
.text-muted { color: var(--ink-3); }
.td-mono    { font-family: var(--font-mono); font-size: 12px; }
.empty { text-align: center; padding: 40px; color: var(--ink-4); }

.overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center; z-index: 200; backdrop-filter: blur(3px); }
.modal { background: var(--bg-2); border-radius: var(--radius-xl); width: 100%; max-width: 480px; box-shadow: var(--shadow-lg); animation: fadeUp 0.2s ease both; }
.modal-header { display: flex; align-items: center; justify-content: space-between; padding: 20px 24px; border-bottom: 1px solid var(--border); font-size: 16px; font-weight: 700; }
.modal-header button { color: var(--ink-3); font-size: 16px; }
.modal-body { padding: 20px 24px; display: flex; flex-direction: column; gap: 12px; }
.modal-footer { padding: 16px 24px; border-top: 1px solid var(--border); display: flex; gap: 10px; justify-content: flex-end; }
.field { display: flex; flex-direction: column; gap: 5px; }
.field label { font-size: 12px; font-weight: 600; color: var(--ink-3); }
.field-input { background: var(--bg-3); border: 1.5px solid var(--border); border-radius: var(--radius); padding: 8px 12px; font-size: 14px; color: var(--ink); outline: none; width: 100%; }
.field-input:focus { border-color: var(--accent); }
.fields-row { display: flex; gap: 12px; }
.btn-ghost  { padding: 9px 18px; border: 1px solid var(--border); border-radius: var(--radius); font-size: 14px; color: var(--ink-2); }
.btn-primary { padding: 9px 20px; background: var(--accent); color: #fff; border-radius: var(--radius); font-size: 14px; font-weight: 600; display: flex; align-items: center; gap: 8px; }
.btn-primary:disabled { opacity: 0.4; cursor: not-allowed; }
.spinner { width: 16px; height: 16px; border: 2px solid rgba(255,255,255,0.3); border-top-color: #fff; border-radius: 50%; animation: spin 0.6s linear infinite; }
</style>
