<template>
  <div class="page fade-up">
    <div class="page-header">
      <div>
        <h1 class="page-title">Catálogo de prendas</h1>
        <p class="page-sub">Precios y tiempos de entrega por tipo de prenda</p>
      </div>
      <button class="btn-accent" @click="openForm()">+ Nueva prenda</button>
    </div>

    <div class="table-card">
      <table class="table">
        <thead>
          <tr><th>Prenda</th><th>Precio</th><th>Plazo (días)</th><th>Estado</th><th></th></tr>
        </thead>
        <tbody>
          <tr v-for="g in garments" :key="g.id" class="table-row">
            <td class="fw-medium">{{ g.name }}</td>
            <td class="td-mono accent">{{ g.price.toFixed(2) }} €</td>
            <td class="td-mono">{{ g.turnaround_days }} d</td>
            <td>
              <span :class="g.active ? 'badge-active' : 'badge-inactive'">
                {{ g.active ? 'Activo' : 'Inactivo' }}
              </span>
            </td>
            <td class="td-actions">
              <button class="btn-icon" @click="openForm(g)">✏️</button>
              <button class="btn-icon btn-icon--danger" @click="toggleActive(g)">
                {{ g.active ? '⏸' : '▶' }}
              </button>
            </td>
          </tr>
        </tbody>
      </table>
      <p v-if="!garments.length" class="empty">No hay prendas configuradas</p>
    </div>

    <!-- Form modal -->
    <div v-if="showForm" class="overlay" @mousedown.self="showForm = false">
      <div class="modal">
        <div class="modal-header">
          <h2>{{ editing ? 'Editar prenda' : 'Nueva prenda' }}</h2>
          <button @click="showForm = false">✕</button>
        </div>
        <div class="modal-body">
          <div class="field"><label>Nombre *</label><input v-model="form.name" class="field-input" placeholder="Ej: Camisa" /></div>
          <div class="fields-row">
            <div class="field">
              <label>Precio (€)</label>
              <input v-model.number="form.price" class="field-input" type="number" step="0.01" min="0" />
            </div>
            <div class="field">
              <label>Plazo (días)</label>
              <input v-model.number="form.turnaround_days" class="field-input" type="number" min="1" />
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn-ghost" @click="showForm = false">Cancelar</button>
          <button class="btn-primary" :disabled="!form.name.trim() || saving" @click="save">
            <span v-if="saving" class="spinner" /><span v-else>{{ editing ? 'Guardar' : 'Crear' }}</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import api from '@/utils/api'

const garments  = ref([])
const showForm  = ref(false)
const editing   = ref(null)
const saving    = ref(false)
const form      = ref({ name: '', price: 0, turnaround_days: 2 })

function openForm(g = null) {
  editing.value = g
  form.value = g
    ? { name: g.name, price: g.price, turnaround_days: g.turnaround_days }
    : { name: '', price: 0, turnaround_days: 2 }
  showForm.value = true
}

async function load() {
  const { data } = await api.get('/garments')
  garments.value = data
}

async function save() {
  saving.value = true
  try {
    if (editing.value) {
      await api.patch(`/garments/${editing.value.id}`, form.value)
    } else {
      await api.post('/garments', form.value)
    }
    showForm.value = false
    load()
  } finally { saving.value = false }
}

async function toggleActive(g) {
  await api.patch(`/garments/${g.id}`, { active: !g.active })
  load()
}

onMounted(load)
</script>

<style scoped>
.page { max-width: 800px; }
.page-header { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 20px; gap: 16px; }
.page-title  { font-size: 24px; font-weight: 700; letter-spacing: -0.03em; }
.page-sub    { font-size: 13px; color: var(--ink-3); margin-top: 3px; }
.btn-accent  { background: var(--accent); color: #fff; padding: 9px 20px; border-radius: var(--radius); font-size: 14px; font-weight: 600; flex-shrink: 0; }
.table-card  { background: var(--bg-2); border: 1px solid var(--border); border-radius: var(--radius-lg); overflow: hidden; }
.table { width: 100%; border-collapse: collapse; }
.table th { padding: 10px 16px; text-align: left; font-size: 11px; font-weight: 700; color: var(--ink-4); text-transform: uppercase; letter-spacing: 0.05em; background: var(--bg-3); }
.table-row td { padding: 13px 16px; border-top: 1px solid var(--border); font-size: 14px; vertical-align: middle; }
.fw-medium  { font-weight: 500; }
.td-mono    { font-family: var(--font-mono); font-size: 13px; }
.accent     { color: var(--accent); font-weight: 600; }
.td-actions { display: flex; gap: 6px; justify-content: flex-end; }
.btn-icon   { width: 30px; height: 30px; border-radius: var(--radius); border: 1px solid var(--border); font-size: 14px; transition: background 0.1s; }
.btn-icon:hover { background: var(--bg-3); }
.badge-active   { padding: 3px 10px; border-radius: 100px; background: var(--green-bg); color: var(--green); font-size: 12px; font-weight: 600; }
.badge-inactive { padding: 3px 10px; border-radius: 100px; background: var(--bg-3); color: var(--ink-3); font-size: 12px; font-weight: 600; }
.empty { text-align: center; padding: 40px; color: var(--ink-4); }
.overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center; z-index: 200; backdrop-filter: blur(3px); }
.modal { background: var(--bg-2); border-radius: var(--radius-xl); width: 100%; max-width: 420px; box-shadow: var(--shadow-lg); animation: fadeUp 0.2s ease both; }
.modal-header { display: flex; align-items: center; justify-content: space-between; padding: 18px 24px; border-bottom: 1px solid var(--border); font-size: 16px; font-weight: 700; }
.modal-header button { color: var(--ink-3); }
.modal-body { padding: 20px 24px; display: flex; flex-direction: column; gap: 14px; }
.modal-footer { padding: 14px 24px; border-top: 1px solid var(--border); display: flex; gap: 10px; justify-content: flex-end; }
.field { display: flex; flex-direction: column; gap: 5px; flex: 1; }
.field label { font-size: 12px; font-weight: 600; color: var(--ink-3); }
.field-input { background: var(--bg-3); border: 1.5px solid var(--border); border-radius: var(--radius); padding: 9px 12px; font-size: 14px; color: var(--ink); outline: none; width: 100%; }
.field-input:focus { border-color: var(--accent); }
.fields-row { display: flex; gap: 12px; }
.btn-ghost  { padding: 9px 18px; border: 1px solid var(--border); border-radius: var(--radius); font-size: 14px; color: var(--ink-2); }
.btn-primary { padding: 9px 20px; background: var(--accent); color: #fff; border-radius: var(--radius); font-size: 14px; font-weight: 600; display: flex; align-items: center; gap: 8px; }
.btn-primary:disabled { opacity: 0.4; cursor: not-allowed; }
.spinner { width: 16px; height: 16px; border: 2px solid rgba(255,255,255,0.3); border-top-color: #fff; border-radius: 50%; animation: spin 0.6s linear infinite; }
</style>
