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

      <h1 class="auth-heading">Iniciar sesión</h1>

      <form @submit.prevent="submit">
        <div class="field">
          <label>Email</label>
          <input v-model="form.email" type="email" placeholder="tu@email.com" autocomplete="email" required />
        </div>
        <div class="field">
          <label>Contraseña</label>
          <input v-model="form.password" type="password" placeholder="••••••••" autocomplete="current-password" required />
          <span v-if="error" class="field-error">{{ error }}</span>
        </div>
        <button type="submit" class="btn-primary" :disabled="loading">
          <span v-if="loading" class="spinner" />
          <span v-else>Entrar</span>
        </button>
      </form>

      <p class="auth-foot">¿No tienes cuenta? <RouterLink to="/register">Regístrate</RouterLink></p>
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
const form   = ref({ email: '', password: '' })
const loading = ref(false)
const error   = ref('')

async function submit() {
  error.value   = ''
  loading.value = true
  try {
    const { data } = await api.post('/auth/login', form.value)
    auth.setSession(data)
    router.push('/dashboard')
  } catch (err) {
    error.value = err.response?.data?.error || 'Error al iniciar sesión'
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.auth-page {
  min-height: 100vh; display: flex; align-items: center;
  justify-content: center; padding: 24px;
  background: var(--bg);
}
.auth-card {
  width: 100%; max-width: 400px;
  background: var(--bg-2); border: 1px solid var(--border);
  border-radius: var(--radius-xl); padding: 36px;
  box-shadow: var(--shadow);
}
.auth-logo { display: flex; align-items: center; gap: 12px; margin-bottom: 28px; }
.logo-mark {
  width: 40px; height: 40px; background: var(--accent); color: #fff;
  border-radius: 10px; display: flex; align-items: center; justify-content: center;
  font-size: 20px; font-weight: 700;
}
.logo-title { font-size: 15px; font-weight: 700; }
.logo-sub   { font-size: 12px; color: var(--ink-3); }
.auth-heading { font-size: 22px; font-weight: 700; margin-bottom: 22px; letter-spacing: -0.03em; }

.field { display: flex; flex-direction: column; gap: 5px; margin-bottom: 14px; }
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

.spinner {
  width: 18px; height: 18px;
  border: 2px solid rgba(255,255,255,0.3); border-top-color: #fff;
  border-radius: 50%; animation: spin 0.6s linear infinite;
}

.auth-foot { text-align: center; font-size: 13px; color: var(--ink-3); margin-top: 20px; }
.auth-foot a { color: var(--accent); font-weight: 600; }
</style>
