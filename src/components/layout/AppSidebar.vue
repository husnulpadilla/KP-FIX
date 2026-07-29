<script setup>
import { RouterLink, useRoute } from 'vue-router'

const route = useRoute()

const nav = [
  { to: '/dashboard', label: 'Dashboard', icon: 'grid' },
  { to: '/upload', label: 'Upload Data', icon: 'upload' },
  { to: '/analisis', label: 'Analisis', icon: 'chart' },
  { to: '/log-aktivitas', label: 'Log Aktivitas', icon: 'clock' },
]
</script>

<template>
  <aside class="sidebar">
    <div class="brand">
      <svg width="34" height="34" viewBox="0 0 64 64" aria-hidden="true">
        <rect width="64" height="64" rx="14" fill="var(--color-primary)"/>
        <path d="M6 40 C 16 30, 22 30, 32 40 C 42 50, 48 50, 58 40" stroke="var(--color-accent)" stroke-width="4" fill="none" stroke-linecap="round"/>
        <path d="M6 26 C 16 16, 22 16, 32 26 C 42 36, 48 36, 58 26" stroke="#fff" stroke-width="3" fill="none" stroke-linecap="round" opacity="0.55"/>
      </svg>
      <div class="brand-text">
        <strong>Statistik Riau</strong>
        <span>Diskominfotik</span>
      </div>
    </div>

    <nav class="nav">
      <RouterLink
        v-for="item in nav"
        :key="item.to"
        :to="item.to"
        class="nav-item"
        :class="{ active: route.path === item.to }"
      >
        <span class="icon" v-html="icons[item.icon]" />
        <span>{{ item.label }}</span>
      </RouterLink>
    </nav>

    <div class="sidebar-footer">
      <div class="river-line" aria-hidden="true"></div>
      <p>Data mengalir, keputusan mengikuti.</p>
    </div>
  </aside>
</template>

<script>
const icons = {
  grid: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="8" height="8" rx="1.5"/><rect x="13" y="3" width="8" height="8" rx="1.5"/><rect x="3" y="13" width="8" height="8" rx="1.5"/><rect x="13" y="13" width="8" height="8" rx="1.5"/></svg>',
  upload: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 16V4M12 4l-4 4M12 4l4 4" stroke-linecap="round" stroke-linejoin="round"/><path d="M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3" stroke-linecap="round"/></svg>',
  chart: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 20V10M12 20V4M20 20v-6" stroke-linecap="round"/></svg>',
  clock: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3" stroke-linecap="round" stroke-linejoin="round"/></svg>',
}
export default { data: () => ({ icons }) }
</script>

<style scoped>
.sidebar {
  width: var(--sidebar-w);
  min-width: var(--sidebar-w);
  background: var(--color-primary);
  color: #fff;
  display: flex;
  flex-direction: column;
  padding: 22px 16px;
  height: 100vh;      /* was: position: sticky; top: 0; height: 100vh; */
  overflow: hidden;
}

.brand {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 6px 8px 26px;
}

.brand-text { display: flex; flex-direction: column; line-height: 1.25; }
.brand-text strong { font-family: var(--font-display); font-size: 16.5px; font-weight: 600; }
.brand-text span { font-size: 11.5px; color: rgba(255,255,255,0.6); letter-spacing: 0.03em; }

.nav { display: flex; flex-direction: column; gap: 3px; margin-top: 4px; }

.nav-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  border-radius: 10px;
  color: rgba(255,255,255,0.72);
  font-size: 14.5px;
  font-weight: 500;
  transition: background 0.12s ease, color 0.12s ease;
}

.nav-item .icon { display: flex; opacity: 0.85; }

.nav-item:hover { background: rgba(255,255,255,0.06); color: #fff; }

.nav-item.active {
  background: rgba(255,255,255,0.1);
  color: #fff;
  box-shadow: inset 3px 0 0 var(--color-accent);
}

.sidebar-footer {
  margin-top: auto;
  padding: 14px 8px 4px;
}

.river-line {
  height: 22px;
  background:
    repeating-linear-gradient(
      90deg,
      transparent 0 2px
    );
  position: relative;
  margin-bottom: 10px;
}
.river-line::before {
  content: '';
  position: absolute;
  inset: 0;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 120 22' preserveAspectRatio='none'%3E%3Cpath d='M0 14 C 10 6, 20 6, 30 14 C 40 22, 50 22, 60 14 C 70 6, 80 6, 90 14 C 100 22, 110 22, 120 14' stroke='%23C99A2E' stroke-width='2' fill='none' opacity='0.55'/%3E%3C/svg%3E");
  background-repeat: repeat-x;
  background-size: 120px 22px;
}

.sidebar-footer p {
  font-size: 11.5px;
  color: rgba(255,255,255,0.45);
  font-style: italic;
  font-family: var(--font-display);
  margin: 0;
}

@media (max-width: 900px) {
  .sidebar { display: none; }
}
</style>
