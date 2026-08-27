<template>
  <div class="auth-page">
    <div class="auth-card fade-up">
      <div class="auth-logo">
        <span class="logo-mark">T</span>
        <div>
          <p class="logo-title">TPV Tintorería</p>
          <p class="logo-sub">Sistema de gestión</p>
        </div>
      </div>

      <h1 class="auth-heading">Crear cuenta</h1>
      <p class="auth-desc">Se creará tu cuenta y tu primera tienda. Podrás añadir más tiendas después.</p>

      <form @submit.prevent="submit" novalidate>
        <p class="section-label">Tus datos</p>
        <div class="field">
          <label>Nombre</label>
          <input v-model="form.name" type="text" placeholder="Tu nombre" required />
          <span v-if="errors.name" class="field-error">{{ errors.name }}</span>
        </div>
        <div class="field">
          <label>Email</label>
          <input v-model="form.email" type="email" placeholder="tu@email.com" required />
          <span v-if="errors.email" class="field-error">{{ errors.email }}</span>
        </div>
        <div class="field">
          <label>Contraseña</label>
          <input v-model="form.password" type="password" placeholder="Mínimo 8 caracteres" required />
          <span v-if="errors.password" class="field-error">{{ errors.password }}</span>
        </div>

        <p class="section-label" style="margin-top: 20px">Primera tienda</p>
        <div class="field">
          <label>Nombre de la tienda</label>
          <input v-model="form.storeName" type="text" placeholder="Ej: Tintorería Centro" required />
          <span v-if="errors.storeName" class="field-error">{{ errors.storeName }}</span>
        </div>
        <div class="fields-row">
          <div class="field">
            <label>Ciudad</label>
            <input v-model="form.storeCity" type="text" placeholder="Valencia" />
          </div>
          <div class="field">
            <label>Teléfono</label>
            <input v-model="form.storePhone" type="text" placeholder="600 000 000" />
          </div>
        </div>
        <div class="field">
          <label>Dirección</label>
          <input v-model="form.storeAddress" type="text" placeholder="Calle y número" />
        </div>
        <div class="field">
          <label>NIF / CIF (opcional)</label>
          <input v-model="form.storeTaxId" type="text" placeholder="B12345678" />
        </div>

        <span v-if="serverError" class="field-error" style="display:block;margin-bottom:12px">{{ serverError }}</span>

        <button type="submit" class="btn-primary" :disabled="loading">
          <span v-if="loading" class="spinner" />
          <span v-else>Crear cuenta</span>
        </button>
      </form>

      <p class="auth-foot">¿Ya tienes cuenta? <RouterLink to="/login">Inicia sesión</RouterLink></p>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter, RouterLink } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import api from '@/utils/api'

const router = useRouter()
const auth   = useAuthStore()

const form = ref({
  name: '', email: '', password: '',
  storeName: '', storeCity: '', storePhone: '', storeAddress: '', storeTaxId: '',
})
const errors      = ref({})
const serverError = ref('')
const loading     = ref(false)

function validate() {
  const e = {}
  if (!form.value.name.trim())          e.name      = 'El nombre es obligatorio'
  if (!form.value.email.trim())         e.email     = 'El email es obligatorio'
  if (form.value.password.length < 8)   e.password  = 'Mínimo 8 caracteres'
  if (!/[A-Z]/.test(form.value.password)) e.password = 'Debe incluir una mayúscula'
  if (!/[0-9]/.test(form.value.password)) e.password = 'Debe incluir un número'
  if (!form.value.storeName.trim())     e.storeName = 'El nombre de la tienda es obligatorio'
  errors.value = e
  return Object.keys(e).length === 0
}

async function submit() {
  if (!validate()) return
  serverError.value = ''
  loading.value     = true
  try {
    const { data } = await api.post('/auth/register', form.value)
    auth.setSession(data)
    router.push('/dashboard')
  } catch (err) {
    serverError.value = err.response?.data?.error || 'Error al crear la cuenta'
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.auth-page {
  min-height: 100vh; display: flex; align-items: center;
  justify-content: center; padding: 24px; background: var(--bg);
}
.auth-card {
  width: 100%; max-width: 480px;
  background: var(--bg-2); border: 1px solid var(--border);
  border-radius: var(--radius-xl); padding: 36px; box-shadow: var(--shadow);
}
.auth-logo  { display: flex; align-items: center; gap: 12px; margin-bottom: 24px; }
.logo-mark  { width: 40px; height: 40px; background: var(--accent); color: #fff; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 20px; font-weight: 700; }
.logo-title { font-size: 15px; font-weight: 700; }
.logo-sub   { font-size: 12px; color: var(--ink-3); }
.auth-heading { font-size: 22px; font-weight: 700; letter-spacing: -0.03em; margin-bottom: 6px; }
.auth-desc    { font-size: 13px; color: var(--ink-3); margin-bottom: 22px; line-height: 1.5; }
.section-label { font-size: 11px; font-weight: 700; color: var(--ink-4); text-transform: uppercase; letter-spacing: 0.07em; margin-bottom: 12px; }
.fields-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.field { display: flex; flex-direction: column; gap: 5px; margin-bottom: 12px; }
.field label { font-size: 13px; font-weight: 600; color: var(--ink-2); }
.field input {
  background: var(--bg-3); border: 1.5px solid var(--border);
  border-radius: var(--radius); padding: 9px 13px; font-size: 14px; color: var(--ink);
  outline: none; transition: border-color 0.15s, box-shadow 0.15s;
}
.field input:focus { border-color: var(--accent); box-shadow: 0 0 0 3px rgba(37,99,235,0.1); }
.field-error { font-size: 12px; color: var(--red); }
.btn-primary {
  width: 100%; padding: 11px; margin-top: 8px;
  background: var(--accent); color: #fff;
  border-radius: var(--radius); font-size: 14px; font-weight: 600;
  display: flex; align-items: center; justify-content: center; height: 42px;
  transition: opacity 0.15s;
}
.btn-primary:hover:not(:disabled) { opacity: 0.9; }
.btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
.spinner { width: 18px; height: 18px; border: 2px solid rgba(255,255,255,0.3); border-top-color: #fff; border-radius: 50%; animation: spin 0.6s linear infinite; }
.auth-foot { text-align: center; font-size: 13px; color: var(--ink-3); margin-top: 20px; }
.auth-foot a { color: var(--accent); font-weight: 600; }
</style>
