<script setup>
import { onMounted } from 'vue'
import AppSidebar from './components/layout/AppSidebar.vue'
import AppTopbar from './components/layout/AppTopbar.vue'
import { useDatasetStore } from './stores/dataset.js'
import { useLogStore } from './stores/log.js'

const ds = useDatasetStore()
const logStore = useLogStore()

onMounted(() => {
  ds.fetchDatasets()
  logStore.fetchLogs()
})
</script>

<template>
  <div class="shell">
    <AppSidebar />
    <div class="main">
      <AppTopbar />
      <main class="content">
        <RouterView v-slot="{ Component }">
          <transition name="route-fade" mode="out-in">
            <component :is="Component" />
          </transition>
        </RouterView>
      </main>
    </div>
  </div>
</template>

<style scoped>
.shell {
  display: flex;
  height: 100vh;      /* was: min-height: 100vh */
  overflow: hidden;   /* baru -- shell sendiri tidak pernah scroll */
}

.main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  height: 100vh;       /* baru */
  overflow: hidden;    /* baru -- main juga tidak scroll, cuma .content di dalamnya */
}

.content {
  flex: 1;
  overflow-y: auto;         /* baru -- di sinilah scroll sesungguhnya terjadi */
  overscroll-behavior: contain;  /* baru -- cegah "efek pantul" ikut nge-scroll body belakang */
  padding: 32px 36px 60px;
  max-width: 1320px;
  width: 100%;
  margin: 0 auto;
}
</style>