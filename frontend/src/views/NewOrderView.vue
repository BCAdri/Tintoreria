<template>
  <div class="page fade-up">
    <div class="page-header">
      <div>
        <RouterLink to="/orders" class="back-link">← Pedidos</RouterLink>
        <h1 class="page-title">Nuevo pedido</h1>
      </div>
    </div>

    <div class="layout">
      <!-- Left: client + items -->
      <div class="main-col">

        <!-- Client search -->
        <div class="card">
          <h2 class="card-title">Cliente</h2>
          <div class="search-wrap">
            <input
              v-model="clientQuery"
              class="field-input"
              placeholder="Buscar por nombre o teléfono…"
              @input="searchClients"
            />
            <div v-if="clientResults.length" class="client-dropdown">
              <button
                v-for="c in clientResults" :key="c.id"
                class="client-option"
                @click="selectClient(c)"
              >
                <div>
                  <p class="client-option__name">{{ c.name }}</p>
                  <p class="client-option__phone">{{ c.phone || '—' }}</p>
                </div>
              </button>
            </div>
          </div>

          <div v-if="selectedClient" class="client-selected">
            <div class="client-avatar">{{ selectedClient.name[0].toUpperCase() }}</div>
            <div>
              <p class="client-selected__name">{{ selectedClient.name }}</p>
              <p class="client-selected__phone">{{ selectedClient.phone || '—' }}</p>
            </div>
            <button class="btn-ghost-sm" @click="clearClient">Cambiar</button>
          </div>

          <!-- Quick create -->
          <div v-if="!selectedClient" class="new-client-form">
            <p class="new-client-label">O crea uno nuevo:</p>
            <div class="fields-row">
              <div class="field">
                <label>Nombre *</label>
                <input v-model="newClient.name" class="field-input" placeholder="Nombre completo" />
              </div>
              <div class="field">
                <label>Teléfono</label>
                <input v-model="newClient.phone" class="field-input" placeholder="600 000 000" />
              </div>
            </div>
            <button class="btn-ghost-sm" :disabled="!newClient.name.trim()" @click="createAndSelectClient">
              + Crear cliente
            </button>
          </div>
        </div>

        <!-- Items -->
        <div class="card">
          <h2 class="card-title">Prendas</h2>

          <div v-for="(item, i) in items" :key="i" class="item-row">
            <div class="item-row__fields">
              <div class="field" style="flex: 2">
                <label>Tipo de prenda</label>
                <select v-model="item.garment_type_id" class="field-input" @change="applyGarmentPrice(item)">
                  <option value="">Personalizado</option>
                  <option v-for="g in garments" :key="g.id" :value="g.id">
                    {{ g.name }} — {{ g.price.toFixed(2) }} €
                  </option>
                </select>
              </div>
              <div class="field" style="flex: 2">
                <label>Descripción *</label>
                <input v-model="item.description" class="field-input" placeholder="Ej: Camisa blanca manga larga" />
              </div>
              <div class="field" style="flex: 0 0 70px">
                <label>Uds.</label>
                <input v-model.number="item.qty" class="field-input" type="number" min="1" />
              </div>
              <div class="field" style="flex: 0 0 100px">
                <label>Precio/ud</label>
                <input v-model.number="item.unit_price" class="field-input" type="number" step="0.01" min="0" />
              </div>
              <div class="field field--total">
                <label>Subtotal</label>
                <span class="item-total">{{ (item.qty * item.unit_price).toFixed(2) }} €</span>
              </div>
            </div>
            <button class="btn-remove" @click="removeItem(i)" :disabled="items.length === 1">✕</button>
          </div>

          <button class="btn-add-item" @click="addItem">+ Añadir prenda</button>
        </div>

        <!-- Notes + pickup -->
        <div class="card">
          <h2 class="card-title">Detalles adicionales</h2>
          <div class="fields-row">
            <div class="field">
              <label>Fecha de recogida estimada</label>
              <input v-model="pickupDate" type="date" class="field-input" :min="today" />
            </div>
          </div>
          <div class="field">
            <label>Observaciones</label>
            <textarea v-model="notes" class="field-input" rows="3" placeholder="Manchas, instrucciones especiales…" />
          </div>
        </div>
      </div>

      <!-- Right: summary -->
      <div class="summary-col">
        <div class="summary-card">
          <h2 class="card-title">Resumen del pedido</h2>

          <div class="summary-lines">
            <div v-for="(item, i) in items" :key="i" class="summary-line">
              <span class="summary-line__desc">
                {{ item.description || `Prenda ${i + 1}` }} × {{ item.qty }}
              </span>
              <span class="summary-line__price">{{ (item.qty * item.unit_price).toFixed(2) }} €</span>
            </div>
          </div>

          <div class="summary-total">
            <span>Total</span>
            <span>{{ total.toFixed(2) }} €</span>
          </div>

          <p v-if="error" class="form-error">{{ error }}</p>

          <button
            class="btn-primary"
            :disabled="!canSubmit || saving"
            @click="submit"
          >
            <span v-if="saving" class="spinner" />
            <span v-else>Crear pedido</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter, RouterLink } from 'vue-router'
import api from '@/utils/api'

const router = useRouter()

const clientQuery   = ref('')
const clientResults = ref([])
const selectedClient = ref(null)
const newClient      = ref({ name: '', phone: '' })

const garments  = ref([])
const items     = ref([{ garment_type_id: '', description: '', qty: 1, unit_price: 0 }])
const notes     = ref('')
const pickupDate = ref('')
const saving    = ref(false)
const error     = ref('')

const today = new Date().toISOString().slice(0, 10)
const total = computed(() => items.value.reduce((s, i) => s + i.qty * i.unit_price, 0))
const canSubmit = computed(() =>
  selectedClient.value &&
  items.value.every(i => i.description.trim() && i.qty > 0 && i.unit_price >= 0)
)

async function searchClients() {
  if (clientQuery.value.trim().length < 2) { clientResults.value = []; return }
  const { data } = await api.get('/clients', { params: { q: clientQuery.value } })
  clientResults.value = data.slice(0, 6)
}

function selectClient(c) {
  selectedClient.value = c
  clientResults.value  = []
  clientQuery.value    = ''
}

function clearClient() {
  selectedClient.value = null
  newClient.value = { name: '', phone: '' }
}

async function createAndSelectClient() {
  const { data } = await api.post('/clients', newClient.value)
  selectClient(data)
  newClient.value = { name: '', phone: '' }
}

function addItem() {
  items.value.push({ garment_type_id: '', description: '', qty: 1, unit_price: 0 })
}

function removeItem(i) {
  items.value.splice(i, 1)
}

function applyGarmentPrice(item) {
  const g = garments.value.find(g => g.id === item.garment_type_id)
  if (g) {
    item.unit_price  = g.price
    item.description = item.description || g.name
  }
}

async function submit() {
  error.value  = ''
  saving.value = true
  try {
    const { data } = await api.post('/orders', {
      client_id:   selectedClient.value.id,
      notes:       notes.value,
      pickup_date: pickupDate.value || null,
      items: items.value.map(i => ({
        garment_type_id: i.garment_type_id || null,
        description:     i.description,
        qty:             i.qty,
        unit_price:      i.unit_price,
      })),
    })
    router.push(`/orders/${data.id}`)
  } catch (err) {
    error.value = err.response?.data?.error || 'Error al crear el pedido'
  } finally {
    saving.value = false
  }
}

onMounted(async () => {
  const { data } = await api.get('/garments')
  garments.value = data.filter(g => g.active)
})
</script>

<style scoped>
.page       { max-width: 1100px; }
.page-header { margin-bottom: 24px; }
.back-link  { font-size: 13px; color: var(--accent); display: block; margin-bottom: 6px; }
.page-title { font-size: 24px; font-weight: 700; letter-spacing: -0.03em; }

.layout     { display: grid; grid-template-columns: 1fr 300px; gap: 20px; align-items: start; }
.main-col   { display: flex; flex-direction: column; gap: 16px; }

.card        { background: var(--bg-2); border: 1px solid var(--border); border-radius: var(--radius-lg); padding: 20px; }
.card-title  { font-size: 14px; font-weight: 700; margin-bottom: 16px; color: var(--ink-2); }

/* Client */
.search-wrap     { position: relative; }
.client-dropdown {
  position: absolute; top: calc(100% + 4px); left: 0; right: 0;
  background: var(--bg-2); border: 1px solid var(--border);
  border-radius: var(--radius-lg); box-shadow: var(--shadow-lg);
  z-index: 20; overflow: hidden;
}
.client-option   { width: 100%; padding: 10px 14px; text-align: left; transition: background 0.1s; }
.client-option:hover { background: var(--bg-3); }
.client-option__name  { font-size: 14px; font-weight: 500; }
.client-option__phone { font-size: 12px; color: var(--ink-3); }

.client-selected { display: flex; align-items: center; gap: 12px; margin-top: 12px; padding: 12px; background: var(--accent-bg); border-radius: var(--radius); border: 1px solid #bfdbfe; }
.client-avatar   { width: 36px; height: 36px; background: var(--accent); color: #fff; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 700; flex-shrink: 0; }
.client-selected__name  { font-size: 14px; font-weight: 600; }
.client-selected__phone { font-size: 12px; color: var(--ink-3); }

.new-client-form  { margin-top: 16px; padding-top: 16px; border-top: 1px solid var(--border); }
.new-client-label { font-size: 12px; color: var(--ink-3); margin-bottom: 10px; }

/* Items */
.item-row        { display: flex; align-items: flex-end; gap: 10px; padding: 14px 0; border-top: 1px solid var(--border); }
.item-row__fields { display: flex; gap: 10px; flex: 1; flex-wrap: wrap; align-items: flex-end; }
.field--total    { align-self: center; padding-top: 18px; }
.item-total      { font-size: 14px; font-weight: 700; font-family: var(--font-mono); color: var(--accent); }
.btn-remove      { width: 30px; height: 30px; border-radius: var(--radius); border: 1px solid var(--border); color: var(--ink-3); font-size: 12px; flex-shrink: 0; transition: background 0.1s, color 0.1s; }
.btn-remove:hover:not(:disabled) { background: var(--red-bg); color: var(--red); border-color: var(--red); }
.btn-remove:disabled { opacity: 0.3; cursor: not-allowed; }
.btn-add-item    { margin-top: 12px; font-size: 13px; color: var(--accent); font-weight: 600; padding: 8px 0; }

/* Summary */
.summary-col    { position: sticky; top: 20px; }
.summary-card   { background: var(--bg-2); border: 1px solid var(--border); border-radius: var(--radius-lg); padding: 20px; }
.summary-lines  { display: flex; flex-direction: column; gap: 8px; margin-bottom: 16px; }
.summary-line   { display: flex; justify-content: space-between; font-size: 13px; }
.summary-line__desc  { color: var(--ink-2); flex: 1; margin-right: 8px; }
.summary-line__price { font-family: var(--font-mono); font-weight: 500; flex-shrink: 0; }
.summary-total  { display: flex; justify-content: space-between; padding-top: 12px; border-top: 1px solid var(--border); font-size: 18px; font-weight: 700; margin-bottom: 20px; }

/* Shared */
.field        { display: flex; flex-direction: column; gap: 5px; flex: 1; }
.field label  { font-size: 12px; font-weight: 600; color: var(--ink-3); }
.field-input  { background: var(--bg-3); border: 1.5px solid var(--border); border-radius: var(--radius); padding: 8px 12px; font-size: 14px; color: var(--ink); outline: none; width: 100%; transition: border-color 0.15s; }
.field-input:focus { border-color: var(--accent); }
.fields-row   { display: flex; gap: 12px; }
.btn-ghost-sm { font-size: 13px; color: var(--accent); font-weight: 500; padding: 6px 12px; border: 1px solid var(--border); border-radius: var(--radius); transition: background 0.1s; margin-top: 8px; }
.btn-ghost-sm:hover:not(:disabled) { background: var(--accent-bg); }
.btn-ghost-sm:disabled { opacity: 0.4; cursor: not-allowed; }
.btn-primary  { width: 100%; padding: 11px; background: var(--accent); color: #fff; border-radius: var(--radius); font-size: 14px; font-weight: 600; display: flex; align-items: center; justify-content: center; height: 42px; transition: opacity 0.15s; }
.btn-primary:disabled { opacity: 0.4; cursor: not-allowed; }
.form-error   { font-size: 13px; color: var(--red); margin-bottom: 12px; }
.spinner      { width: 18px; height: 18px; border: 2px solid rgba(255,255,255,0.3); border-top-color: #fff; border-radius: 50%; animation: spin 0.6s linear infinite; }
</style>
