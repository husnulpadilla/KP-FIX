import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '../stores/auth.js'

const routes = [
  {
    path: '/',
    redirect: '/dashboard',
  },
  {
    path: '/dashboard',
    name: 'dashboard',
    component: () => import('../views/DashboardView.vue'),
    meta: { label: 'Dashboard', icon: 'grid' },
  },
  {
    path: '/upload',
    name: 'upload',
    component: () => import('../views/UploadView.vue'),
    meta: { label: 'Upload Data', icon: 'upload', requiresAuth: true },
  },
  {
    path: '/analisis',
    name: 'analisis',
    component: () => import('../views/AnalisisView.vue'),
    meta: { label: 'Analisis', icon: 'chart', requiresAuth: true },
  },
  {
    path: '/peta',
    name: 'peta',
    component: () => import('../views/PetaView.vue'),
    meta: { label: 'Peta Interaktif', icon: 'map', requiresAuth: true },
  },
  {
    path: '/tren',
    name: 'tren',
    component: () => import('../views/TrenView.vue'),
    meta: { label: 'Tren Waktu', icon: 'trending-up', requiresAuth: true },
  },
  {
    path: '/log-aktivitas',
    name: 'log-aktivitas',
    component: () => import('../views/LogAktivitasView.vue'),
    meta: { label: 'Log Aktivitas', icon: 'clock', requiresAuth: true },
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior() {
    return { top: 0 }
  },
})

// Halaman yang ditandai requiresAuth cuma bisa diakses kalau sudah login;
// kalau belum, redirect ke Dashboard supaya tidak mentok di halaman kosong/blank.
router.beforeEach((to) => {
  const auth = useAuthStore()
  if (to.meta.requiresAuth && !auth.sudahLogin) {
    return { name: 'dashboard' }
  }
  return true
})

export default router