import { createRouter, createWebHistory } from 'vue-router'

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
    meta: { label: 'Upload Data', icon: 'upload' },
  },
  {
    path: '/analisis',
    name: 'analisis',
    component: () => import('../views/AnalisisView.vue'),
    meta: { label: 'Analisis', icon: 'chart' },
  },
  {
  path: '/peta',
  name: 'peta',
  component: () => import('../views/PetaView.vue'),
  meta: { label: 'Peta Interaktif', icon: 'map' },
  },
  {
  path: '/tren',
  name: 'tren',
  component: () => import('../views/TrenView.vue'),
  meta: { label: 'Tren Waktu', icon: 'trending-up' },
  },
  {
    path: '/log-aktivitas',
    name: 'log-aktivitas',
    component: () => import('../views/LogAktivitasView.vue'),
    meta: { label: 'Log Aktivitas', icon: 'clock' },
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior() {
    return { top: 0 }
  },
})

export default router
