import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const routes = [
  { path: '/login',    name: 'Login',    component: () => import('@/views/LoginView.vue'),    meta: { public: true } },
  { path: '/register', name: 'Register', component: () => import('@/views/RegisterView.vue'), meta: { public: true } },
  {
    path: '/',
    component: () => import('@/views/AppLayout.vue'),
    children: [
      { path: '',          redirect: '/dashboard' },
      { path: 'dashboard', name: 'Dashboard', component: () => import('@/views/DashboardView.vue') },
      { path: 'clients',   name: 'Clients',   component: () => import('@/views/ClientsView.vue') },
      { path: 'clients/:id', name: 'ClientDetail', component: () => import('@/views/ClientDetailView.vue'), props: true },
      { path: 'orders',    name: 'Orders',    component: () => import('@/views/OrdersView.vue') },
      { path: 'orders/new', name: 'NewOrder', component: () => import('@/views/NewOrderView.vue') },
      { path: 'orders/:id', name: 'OrderDetail', component: () => import('@/views/OrderDetailView.vue'), props: true },
      { path: 'catalog',   name: 'Catalog',   component: () => import('@/views/CatalogView.vue') },
      { path: 'cash',      name: 'Cash',      component: () => import('@/views/CashView.vue') },
      { path: 'global',    name: 'Global',    component: () => import('@/views/GlobalView.vue') },
    ],
  },
  { path: '/:pathMatch(.*)*', redirect: '/dashboard' },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

router.beforeEach((to) => {
  const auth = useAuthStore()
  if (!to.meta.public && !auth.isLoggedIn) return '/login'
  if (to.meta.public && auth.isLoggedIn) return '/dashboard'
})

export default router
