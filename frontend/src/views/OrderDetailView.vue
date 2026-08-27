<template>
  <div class="page fade-up">
    <div class="page-header">
      <RouterLink to="/orders" class="back-link">← Pedidos</RouterLink>
      <div class="header-row">
        <div>
          <h1 class="page-title">Pedido #{{ order?.id }}</h1>
          <p class="page-sub" v-if="order">{{ fmtDate(order.created_at) }} · {{ order.client?.name }}</p>
        </div>
        <div class="header-actions" v-if="order">
          <button class="btn-ghost" @click="printTicket">🖨️ Imprimir ticket</button>
          <button
            v-if="order.status !== 'delivered'"
            class="btn-danger"
            @click="confirmDelete"
          >Eliminar</button>
        </div>
      </div>
    </div>

    <div v-if="loading" class="loading-state">Cargando pedido…</div>

    <template v-else-if="order">
      <div class="layout">
        <!-- Left column -->
        <div class="main-col">

          <!-- Status stepper -->
          <div class="card">
            <h2 class="card-title">Estado del pedido</h2>
            <div class="stepper">
              <div
                v-for="(step, i) in steps"
                :key="step.key"
                class="step"
                :class="{
                  'step--done':   stepIndex >= i,
                  'step--active': stepIndex === i,
                }"
              >
                <div class="step__dot">
                  <span v-if="stepIndex > i">✓</span>
                  <span v-else>{{ i + 1 }}</span>
                </div>
                <div class="step__info">
                  <p class="step__label">{{ step.label }}</p>
                  <p v-if="step.key === 'delivered' && order.delivered_at" class="step__date">
                    {{ fmtDate(order.delivered_at) }}
                  </p>
                </div>
                <div v-if="i < steps.length - 1" class="step__line" :class="{ 'step__line--done': stepIndex > i }" />
              </div>
            </div>
            <div class="status-actions">
              <button
                v-if="order.status !== 'delivered'"
                class="btn-primary"
                :disabled="updatingStatus"
                @click="advanceStatus"
              >
                <span v-if="updatingStatus" class="spinner" />
                <span v-else>{{ nextStepLabel }}</span>
              </button>
              <span v-else class="delivered-badge">✓ Entregado</span>
            </div>
          </div>

          <!-- Order items -->
          <div class="card">
            <h2 class="card-title">Prendas</h2>
            <table class="items-table">
              <thead>
                <tr>
                  <th>Descripción</th><th>Uds.</th><th>Precio/ud</th><th>Subtotal</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="item in order.items" :key="item.id">
                  <td>
                    <p class="fw-medium">{{ item.description }}</p>
                    <p class="text-sm text-muted" v-if="item.garment_name">{{ item.garment_name }}</p>
                  </td>
                  <td class="td-mono">{{ item.qty }}</td>
                  <td class="td-mono">{{ item.unit_price.toFixed(2) }} €</td>
                  <td class="td-mono fw-bold">{{ (item.qty * item.unit_price).toFixed(2) }} €</td>
                </tr>
              </tbody>
              <tfoot>
                <tr>
                  <td colspan="3" class="tf-label">Total</td>
                  <td class="td-mono fw-bold total-value">{{ order.total.toFixed(2) }} €</td>
                </tr>
              </tfoot>
            </table>
          </div>

          <!-- Notes -->
          <div class="card" v-if="order.notes">
            <h2 class="card-title">Observaciones</h2>
            <p class="notes-text">{{ order.notes }}</p>
          </div>
        </div>

        <!-- Right column -->
        <div class="side-col">

          <!-- Client info -->
          <div class="card">
            <h2 class="card-title">Cliente</h2>
            <div class="client-row">
              <div class="client-avatar">{{ order.client?.name?.[0]?.toUpperCase() }}</div>
              <div>
                <p class="fw-medium">{{ order.client?.name }}</p>
                <p class="text-sm text-muted">{{ order.client?.phone || '—' }}</p>
                <p class="text-sm text-muted">{{ order.client?.email || '' }}</p>
              </div>
            </div>
            <RouterLink :to="`/clients/${order.client_id}`" class="link-small">
              Ver historial del cliente →
            </RouterLink>
          </div>

          <!-- Pickup date -->
          <div class="card" v-if="order.pickup_date">
            <h2 class="card-title">Recogida estimada</h2>
            <p class="pickup-date">📅 {{ fmtDate(order.pickup_date) }}</p>
          </div>

          <!-- Payments -->
          <div class="card">
            <h2 class="card-title">Cobros</h2>

            <div class="balance-row">
              <div class="balance-item">
                <p class="balance-label">Total</p>
                <p class="balance-value">{{ order.total.toFixed(2) }} €</p>
              </div>
              <div class="balance-item">
                <p class="balance-label">Cobrado</p>
                <p class="balance-value balance-value--green">{{ order.paid.toFixed(2) }} €</p>
              </div>
              <div class="balance-item">
                <p class="balance-label">Pendiente</p>
                <p class="balance-value" :class="order.balance > 0 ? 'balance-value--red' : 'balance-value--green'">
                  {{ order.balance.toFixed(2) }} €
                </p>
              </div>
            </div>

            <!-- Payment history -->
            <div class="payments-list" v-if="order.payments.length">
              <div v-for="p in order.payments" :key="p.id" class="payment-row">
                <span class="payment-icon">{{ methodIcons[p.method] }}</span>
                <span class="payment-amount">{{ p.amount.toFixed(2) }} €</span>
                <span class="payment-method">{{ methodNames[p.method] }}</span>
                <span class="payment-date">{{ fmtDate(p.created_at) }}</span>
              </div>
            </div>

            <!-- Add payment -->
            <div v-if="order.balance > 0" class="add-payment-form">
              <p class="add-payment-title">Registrar cobro</p>
              <div class="fields-row">
                <div class="field">
                  <label>Importe</label>
                  <input
                    v-model.number="payForm.amount"
                    type="number" step="0.01" min="0.01"
                    class="field-input"
                    :placeholder="order.balance.toFixed(2)"
                  />
                </div>
                <div class="field">
                  <label>Método</label>
                  <select v-model="payForm.method" class="field-input">
                    <option value="cash">💵 Efectivo</option>
                    <option value="card">💳 Tarjeta</option>
                    <option value="bizum">📱 Bizum</option>
                  </select>
                </div>
              </div>
              <button
                class="btn-primary"
                :disabled="!payForm.amount || payingNow"
                @click="registerPayment"
              >
                <span v-if="payingNow" class="spinner" />
                <span v-else>Cobrar {{ payForm.amount ? payForm.amount.toFixed(2) + ' €' : '' }}</span>
              </button>
            </div>
            <div v-else class="paid-notice">✓ Pedido completamente cobrado</div>
          </div>
        </div>
      </div>

      <!-- Printable ticket (hidden, shown on print) -->
      <div id="ticket" style="display:none">
        <div class="ticket-header">
          <p class="ticket-shop">{{ activeStore?.name }}</p>
          <p class="ticket-address">{{ activeStore?.address }}</p>
          <p class="ticket-phone">{{ activeStore?.phone }}</p>
          <p class="ticket-divider">--------------------------------</p>
          <p class="ticket-title">TICKET DE PEDIDO</p>
          <p class="ticket-divider">--------------------------------</p>
        </div>
        <p>Nº pedido: #{{ order.id }}</p>
        <p>Cliente: {{ order.client?.name }}</p>
        <p>Tel: {{ order.client?.phone || '—' }}</p>
        <p>Fecha: {{ fmtDate(order.created_at) }}</p>
        <p v-if="order.pickup_date">Recogida: {{ fmtDate(order.pickup_date) }}</p>
        <p class="ticket-divider">--------------------------------</p>
        <div v-for="item in order.items" :key="item.id" class="ticket-item">
          <p>{{ item.description }}</p>
          <p>{{ item.qty }} x {{ item.unit_price.toFixed(2) }}€ = {{ (item.qty * item.unit_price).toFixed(2) }}€</p>
        </div>
        <p class="ticket-divider">--------------------------------</p>
        <p class="ticket-total">TOTAL: {{ order.total.toFixed(2) }} €</p>
        <p>Cobrado: {{ order.paid.toFixed(2) }} €</p>
        <p v-if="order.balance > 0">Pendiente: {{ order.balance.toFixed(2) }} €</p>
        <p class="ticket-divider">--------------------------------</p>
        <p v-if="order.notes">Obs: {{ order.notes }}</p>
        <p class="ticket-footer">Gracias por su confianza</p>
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

const props  = defineProps({ id: { type: String, required: true } })
const router = useRouter()
const auth   = useAuthStore()

const order         = ref(null)
const loading       = ref(true)
const updatingStatus = ref(false)
const payingNow     = ref(false)
const payForm       = ref({ amount: null, method: 'cash' })

const activeStore = computed(() => auth.activeStore)

const steps = [
  { key: 'received',   label: 'Recibido'   },
  { key: 'processing', label: 'En proceso' },
  { key: 'ready',      label: 'Listo'      },
  { key: 'delivered',  label: 'Entregado'  },
]

const nextStepMap = { received: 'processing', processing: 'ready', ready: 'delivered' }
const nextLabelMap = { received: 'Marcar en proceso', processing: 'Marcar como listo', ready: 'Marcar como entregado' }

const stepIndex   = computed(() => steps.findIndex(s => s.key === order.value?.status))
const nextStepLabel = computed(() => nextLabelMap[order.value?.status] || '')

const methodIcons = { cash: '💵', card: '💳', bizum: '📱' }
const methodNames = { cash: 'Efectivo', card: 'Tarjeta', bizum: 'Bizum' }
const fmtDate = d => { try { return format(new Date(d), "dd/MM/yyyy HH:mm", { locale: es }) } catch { return d } }

async function load() {
  loading.value = true
  try {
    const { data } = await api.get(`/orders/${props.id}`)
    order.value = data
    if (data.balance > 0) payForm.value.amount = parseFloat(data.balance.toFixed(2))
  } finally { loading.value = false }
}

async function advanceStatus() {
  const next = nextStepMap[order.value.status]
  if (!next) return
  updatingStatus.value = true
  try {
    const { data } = await api.patch(`/orders/${props.id}/status`, { status: next })
    order.value = data
  } finally { updatingStatus.value = false }
}

async function registerPayment() {
  payingNow.value = true
  try {
    const { data } = await api.post(`/orders/${props.id}/payments`, payForm.value)
    order.value = data
    payForm.value.amount = data.balance > 0 ? parseFloat(data.balance.toFixed(2)) : null
  } finally { payingNow.value = false }
}

async function confirmDelete() {
  if (!confirm(`¿Eliminar el pedido #${order.value.id}? Esta acción no se puede deshacer.`)) return
  await api.delete(`/orders/${props.id}`)
  router.push('/orders')
}

function printTicket() {
  const ticket = document.getElementById('ticket')
  ticket.style.display = 'block'
  window.print()
  ticket.style.display = 'none'
}

onMounted(load)
</script>

<style scoped>
.page       { max-width: 1100px; }
.page-header { margin-bottom: 24px; }
.back-link  { font-size: 13px; color: var(--accent); display: block; margin-bottom: 8px; }
.header-row { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; flex-wrap: wrap; }
.page-title { font-size: 24px; font-weight: 700; letter-spacing: -0.03em; }
.page-sub   { font-size: 13px; color: var(--ink-3); margin-top: 3px; }
.header-actions { display: flex; gap: 10px; align-items: center; flex-shrink: 0; }

.loading-state { padding: 60px; text-align: center; color: var(--ink-3); }

.layout   { display: grid; grid-template-columns: 1fr 300px; gap: 20px; align-items: start; }
.main-col { display: flex; flex-direction: column; gap: 16px; }
.side-col { display: flex; flex-direction: column; gap: 16px; position: sticky; top: 20px; }

.card       { background: var(--bg-2); border: 1px solid var(--border); border-radius: var(--radius-lg); padding: 20px; }
.card-title { font-size: 13px; font-weight: 700; color: var(--ink-3); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 16px; }

/* Stepper */
.stepper { display: flex; align-items: flex-start; gap: 0; margin-bottom: 20px; }
.step    { display: flex; flex-direction: column; align-items: center; flex: 1; position: relative; }
.step__dot {
  width: 32px; height: 32px; border-radius: 50%;
  border: 2px solid var(--border-2); background: var(--bg-3);
  display: flex; align-items: center; justify-content: center;
  font-size: 12px; font-weight: 700; color: var(--ink-3);
  transition: all 0.2s; z-index: 1;
}
.step--done .step__dot  { background: var(--accent); border-color: var(--accent); color: #fff; }
.step__info  { text-align: center; margin-top: 8px; }
.step__label { font-size: 12px; font-weight: 600; color: var(--ink-3); }
.step--done .step__label { color: var(--accent); }
.step__date  { font-size: 11px; color: var(--ink-4); margin-top: 2px; }
.step__line  { position: absolute; top: 16px; left: 50%; right: -50%; height: 2px; background: var(--border); z-index: 0; }
.step__line--done { background: var(--accent); }
.step:last-child .step__line { display: none; }
.status-actions { padding-top: 16px; border-top: 1px solid var(--border); }
.delivered-badge { display: inline-flex; align-items: center; gap: 6px; color: var(--green); font-size: 14px; font-weight: 600; }

/* Items table */
.items-table { width: 100%; border-collapse: collapse; }
.items-table th { padding: 8px 12px; text-align: left; font-size: 11px; font-weight: 700; color: var(--ink-4); text-transform: uppercase; letter-spacing: 0.05em; background: var(--bg-3); }
.items-table td { padding: 11px 12px; border-top: 1px solid var(--border); font-size: 13px; }
.items-table tfoot td { padding: 12px; border-top: 2px solid var(--border-2); }
.tf-label    { font-size: 13px; font-weight: 700; color: var(--ink-2); }
.total-value { font-size: 16px; }

.notes-text { font-size: 14px; color: var(--ink-2); line-height: 1.6; white-space: pre-wrap; }

/* Client */
.client-row    { display: flex; align-items: center; gap: 12px; margin-bottom: 12px; }
.client-avatar { width: 36px; height: 36px; background: var(--accent); color: #fff; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 700; flex-shrink: 0; }
.link-small    { font-size: 12px; color: var(--accent); }
.pickup-date   { font-size: 14px; font-weight: 500; }

/* Payments */
.balance-row   { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-bottom: 16px; }
.balance-item  { text-align: center; padding: 10px; background: var(--bg-3); border-radius: var(--radius); }
.balance-label { font-size: 11px; color: var(--ink-3); font-weight: 600; text-transform: uppercase; margin-bottom: 4px; }
.balance-value { font-size: 16px; font-weight: 700; font-family: var(--font-mono); }
.balance-value--green { color: var(--green); }
.balance-value--red   { color: var(--red); }

.payments-list { display: flex; flex-direction: column; gap: 8px; margin-bottom: 16px; padding-bottom: 16px; border-bottom: 1px solid var(--border); }
.payment-row   { display: flex; align-items: center; gap: 8px; font-size: 13px; }
.payment-icon  { font-size: 16px; }
.payment-amount { font-weight: 700; font-family: var(--font-mono); flex: 1; }
.payment-method { color: var(--ink-3); }
.payment-date   { color: var(--ink-4); font-size: 11px; }

.add-payment-form  { padding-top: 12px; }
.add-payment-title { font-size: 12px; font-weight: 700; color: var(--ink-3); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 10px; }
.paid-notice { font-size: 13px; color: var(--green); font-weight: 600; text-align: center; padding: 12px 0; }

/* Shared */
.field        { display: flex; flex-direction: column; gap: 5px; flex: 1; }
.field label  { font-size: 12px; font-weight: 600; color: var(--ink-3); }
.field-input  { background: var(--bg-3); border: 1.5px solid var(--border); border-radius: var(--radius); padding: 8px 12px; font-size: 14px; color: var(--ink); outline: none; width: 100%; }
.field-input:focus { border-color: var(--accent); }
.fields-row   { display: flex; gap: 10px; margin-bottom: 10px; }
.btn-primary  { width: 100%; padding: 10px; background: var(--accent); color: #fff; border-radius: var(--radius); font-size: 14px; font-weight: 600; display: flex; align-items: center; justify-content: center; height: 40px; transition: opacity 0.15s; }
.btn-primary:disabled { opacity: 0.4; cursor: not-allowed; }
.btn-ghost    { padding: 8px 16px; border: 1px solid var(--border); border-radius: var(--radius); font-size: 13px; color: var(--ink-2); transition: background 0.1s; }
.btn-ghost:hover { background: var(--bg-3); }
.btn-danger   { padding: 8px 16px; border: 1px solid var(--red); border-radius: var(--radius); font-size: 13px; color: var(--red); background: var(--red-bg); transition: opacity 0.1s; }
.btn-danger:hover { opacity: 0.8; }
.fw-medium    { font-weight: 500; }
.fw-bold      { font-weight: 700; }
.td-mono      { font-family: var(--font-mono); font-size: 13px; }
.text-sm      { font-size: 12px; }
.text-muted   { color: var(--ink-3); }
.spinner      { width: 16px; height: 16px; border: 2px solid rgba(255,255,255,0.3); border-top-color: #fff; border-radius: 50%; animation: spin 0.6s linear infinite; }

/* Ticket print styles */
.ticket-header { text-align: center; margin-bottom: 8px; }
.ticket-shop   { font-size: 14px; font-weight: bold; }
.ticket-address, .ticket-phone { font-size: 11px; }
.ticket-divider { letter-spacing: 0; }
.ticket-title  { font-weight: bold; text-align: center; }
.ticket-item   { margin: 4px 0; }
.ticket-total  { font-weight: bold; font-size: 14px; }
.ticket-footer { text-align: center; margin-top: 12px; }
</style>
