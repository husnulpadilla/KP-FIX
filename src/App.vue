<script setup>
import AppSidebar from './components/layout/AppSidebar.vue'
import AppTopbar from './components/layout/AppTopbar.vue'
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
  min-height: 100vh;
}

.main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.content {
  padding: 32px 36px 60px;
  max-width: 1320px;
  width: 100%;
  margin: 0 auto;
}
</style>
