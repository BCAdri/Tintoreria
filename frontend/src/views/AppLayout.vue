<template>
  <div class="layout">
    <aside class="sidebar">
      <div class="sidebar__top">
        <div class="sidebar__brand">
          <span class="sidebar__logo">T</span>
          <div class="sidebar__brandText">
            <span class="sidebar__name">TPV</span>
            <span class="sidebar__sub">Tintorería</span>
          </div>
        </div>

        <!-- Store switcher -->
        <div class="store-switcher">
          <button class="store-btn" @click="showStorePicker = !showStorePicker">
            <span class="store-dot" />
            <span class="store-label">{{ auth.activeStore?.name || 'Sin tienda' }}</span>
            <span class="store-chevron">⌄</span>
          </button>
          <div v-if="showStorePicker" class="store-dropdown">
            <button
              v-for="store in auth.stores"
              :key="store.id"
              class="store-option"
              :class="{ active: store.id === auth.activeStoreId }"
              @click="selectStore(store.id)"
            >
              <span class="store-option__dot" />
              <div>
                <p class="store-option__name">{{ store.name }}</p>
                <p class="store-option__city">{{ store.city || '—' }}</p>
              </div>
              <span v-if="store.id === auth.activeStoreId" class="store-option__check">✓</span>
            </button>
            <div class="store-dropdown__divider" />
            <RouterLink to="/global" class="store-option store-option--global" @click="showStorePicker = false">
              <span>🌐</span>
              <span>Vista global</span>
            </RouterLink>
          </div>
        </div>

        <!-- Nav -->
        <nav class="nav">
          <RouterLink v-for="item in navItems" :key="item.to" :to="item.to" class="nav__item">
            <span class="nav__icon">{{ item.icon }}</span>
            <span>{{ item.label }}</span>
          </RouterLink>
        </nav>
      </div>

      <div class="sidebar__bottom">
        <div class="user-info">
          <div class="user-avatar">{{ auth.user?.name?.[0]?.toUpperCase() }}</div>
          <div class="user-meta">
            <p class="user-name">{{ auth.user?.name }}</p>
            <p class="user-role">{{ auth.user?.role === 'owner' ? 'Propietario' : 'Empleado' }}</p>
          </div>
        </div>
        <button class="logout-btn" @click="handleLogout">Cerrar sesión</button>
      </div>
    </aside>

    <main class="content">
      <RouterView />
    </main>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter, RouterLink, RouterView } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const auth   = useAuthStore()
const router = useRouter()
const showStorePicker = ref(false)

const navItems = [
  { to: '/dashboard', icon: '📊', label: 'Dashboard' },
  { to: '/orders',    icon: '📋', label: 'Pedidos'   },
  { to: '/clients',   icon: '👥', label: 'Clientes'  },
  { to: '/cash',      icon: '💰', label: 'Caja'      },
  { to: '/catalog',   icon: '🏷️', label: 'Catálogo'  },
]

function selectStore(id) {
  auth.setActiveStore(id)
  showStorePicker.value = false
  router.push('/dashboard')
}

function handleLogout() {
  auth.logout()
  router.push('/login')
}
</script>

<style scoped>
.layout { display: flex; min-height: 100vh; }

.sidebar {
  width: var(--sidebar-w);
  background: var(--bg-2);
  border-right: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  position: fixed;
  top: 0; left: 0; bottom: 0;
  z-index: 50;
  overflow-y: auto;
}
.sidebar__top    { flex: 1; padding: 20px 12px; display: flex; flex-direction: column; gap: 8px; }
.sidebar__bottom { padding: 16px 12px; border-top: 1px solid var(--border); }

.sidebar__brand { display: flex; align-items: center; gap: 10px; padding: 0 4px; margin-bottom: 8px; }
.sidebar__logo {
  width: 32px; height: 32px; background: var(--accent); color: #fff;
  border-radius: 8px; display: flex; align-items: center; justify-content: center;
  font-weight: 700; font-size: 16px; flex-shrink: 0;
}
.sidebar__name { font-size: 15px; font-weight: 700; display: block; }
.sidebar__sub  { font-size: 11px; color: var(--ink-3); display: block; }

/* Store switcher */
.store-switcher { position: relative; }
.store-btn {
  width: 100%;
  display: flex; align-items: center; gap: 8px;
  padding: 8px 10px;
  border-radius: var(--radius);
  background: var(--bg-3);
  border: 1px solid var(--border);
  font-size: 13px; color: var(--ink-2);
  transition: background 0.15s;
}
.store-btn:hover { background: var(--border); }
.store-dot { width: 7px; height: 7px; border-radius: 50%; background: var(--green); flex-shrink: 0; }
.store-label { flex: 1; text-align: left; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.store-chevron { color: var(--ink-4); font-size: 14px; }

.store-dropdown {
  position: absolute; top: calc(100% + 6px); left: 0; right: 0;
  background: var(--bg-2); border: 1px solid var(--border);
  border-radius: var(--radius-lg); box-shadow: var(--shadow-lg);
  z-index: 100; overflow: hidden;
  animation: fadeUp 0.15s ease both;
}
.store-option {
  width: 100%; display: flex; align-items: center; gap: 10px;
  padding: 10px 14px; font-size: 13px; text-align: left;
  transition: background 0.1s;
}
.store-option:hover { background: var(--bg-3); }
.store-option.active { background: var(--accent-bg); }
.store-option--global { color: var(--accent); font-weight: 500; gap: 8px; }
.store-option__dot  { width: 6px; height: 6px; border-radius: 50%; background: var(--border-2); flex-shrink: 0; }
.store-option__name { font-weight: 500; color: var(--ink); }
.store-option__city { font-size: 11px; color: var(--ink-3); }
.store-option__check { color: var(--accent); font-size: 13px; margin-left: auto; }
.store-dropdown__divider { height: 1px; background: var(--border); margin: 4px 0; }

/* Nav */
.nav { display: flex; flex-direction: column; gap: 2px; margin-top: 8px; }
.nav__item {
  display: flex; align-items: center; gap: 10px;
  padding: 9px 10px;
  border-radius: var(--radius);
  font-size: 14px; font-weight: 500; color: var(--ink-3);
  transition: background 0.15s, color 0.15s;
}
.nav__item:hover { background: var(--bg-3); color: var(--ink); }
.nav__item.router-link-active { background: var(--accent-bg); color: var(--accent); }
.nav__icon { font-size: 16px; width: 20px; text-align: center; }

/* User */
.user-info { display: flex; align-items: center; gap: 10px; margin-bottom: 12px; }
.user-avatar {
  width: 32px; height: 32px; border-radius: 50%; background: var(--accent);
  color: #fff; display: flex; align-items: center; justify-content: center;
  font-size: 14px; font-weight: 700; flex-shrink: 0;
}
.user-name { font-size: 13px; font-weight: 600; color: var(--ink); }
.user-role { font-size: 11px; color: var(--ink-3); margin-top: 1px; }
.logout-btn {
  width: 100%; padding: 8px; border-radius: var(--radius);
  border: 1px solid var(--border); font-size: 13px; color: var(--ink-3);
  transition: background 0.15s, color 0.15s;
}
.logout-btn:hover { background: var(--red-bg); color: var(--red); border-color: var(--red); }

.content {
  margin-left: var(--sidebar-w);
  flex: 1;
  min-height: 100vh;
  padding: 28px;
}
</style>
