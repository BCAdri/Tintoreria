import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import api from '@/utils/api'

export const useAuthStore = defineStore('auth', () => {
  const token         = ref(localStorage.getItem('token') || '')
  const user          = ref(JSON.parse(localStorage.getItem('user') || 'null'))
  const stores        = ref(JSON.parse(localStorage.getItem('stores') || '[]'))
  const activeStoreId = ref(parseInt(localStorage.getItem('activeStoreId') || '0') || null)

  const isLoggedIn    = computed(() => !!token.value)
  const activeStore   = computed(() => stores.value.find(s => s.id === activeStoreId.value) || null)
  const isOwner       = computed(() => activeStore.value?.role === 'owner' || user.value?.role === 'owner')

  function setSession(data) {
    token.value  = data.token
    user.value   = data.user
    stores.value = data.stores || []
    localStorage.setItem('token',  data.token)
    localStorage.setItem('user',   JSON.stringify(data.user))
    localStorage.setItem('stores', JSON.stringify(data.stores || []))
    if (data.stores?.length && !activeStoreId.value) {
      setActiveStore(data.stores[0].id)
    }
  }

  function setActiveStore(id) {
    activeStoreId.value = id
    localStorage.setItem('activeStoreId', id)
  }

  function logout() {
    token.value  = ''
    user.value   = null
    stores.value = []
    activeStoreId.value = null
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    localStorage.removeItem('stores')
    localStorage.removeItem('activeStoreId')
  }

  async function fetchMe() {
    const { data } = await api.get('/auth/me')
    user.value   = { id: data.id, name: data.name, email: data.email, role: data.role }
    stores.value = data.stores
    localStorage.setItem('user',   JSON.stringify(user.value))
    localStorage.setItem('stores', JSON.stringify(data.stores))
  }

  return { token, user, stores, activeStoreId, activeStore, isLoggedIn, isOwner, setSession, setActiveStore, logout, fetchMe }
})
