<script setup>
import { ref } from 'vue'
import { useRoute } from 'vue-router'
import { useAuthStore } from '../../stores/auth.js'

const route = useRoute()
const auth = useAuthStore()

const showLogin = ref(false)
const username = ref('')
const password = ref('')
const errorMsg = ref('')

function submitLogin() {
  errorMsg.value = ''
  if (auth.login(username.value.trim(), password.value)) {
    showLogin.value = false
    username.value = ''
    password.value = ''
  } else {
    errorMsg.value = 'Username atau password salah.'
  }
}
</script>

<template>
  <header class="topbar">
    <div class="crumb">
      <span class="dot" /> {{ route.meta.label || 'Dashboard' }}
    </div>

    <div class="actions">
      <template v-if="auth.sudahLogin">
        <span class="badge badge-success">Login sebagai {{ auth.username }}</span>
        <button class="btn btn-ghost" @click="auth.logout()">Keluar</button>
      </template>
      <template v-else>
        <button class="btn btn-ghost" @click="showLogin = !showLogin">🔐 Login Admin</button>
      </template>
    </div>

    <div v-if="showLogin && !auth.sudahLogin" class="login-pop card">
      <p class="login-title">Login Administrator</p>
      <input v-model="username" type="text" placeholder="Username" @keyup.enter="submitLogin" />
      <input v-model="password" type="password" placeholder="Password" @keyup.enter="submitLogin" />
      <button class="btn btn-primary" @click="submitLogin">Masuk</button>
      <p v-if="errorMsg" class="error-text">{{ errorMsg }}</p>
      <p class="hint">Demo: admin / admin123</p>
    </div>
  </header>
</template>

<style scoped>
.topbar {
  height: var(--topbar-h);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 28px;
  border-bottom: 1px solid var(--color-border);
  background: var(--color-surface);
  position: sticky;
  top: 0;
  z-index: 5;
}

.crumb {
  font-family: var(--font-mono);
  font-size: 12.5px;
  color: var(--color-muted);
  display: flex;
  align-items: center;
  gap: 8px;
}

.dot { width: 6px; height: 6px; border-radius: 50%; background: var(--color-accent); }

.actions { display: flex; align-items: center; gap: 10px; position: relative; }

.login-pop {
  position: absolute;
  top: 56px;
  right: 28px;
  width: 250px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  z-index: 10;
}

.login-title { font-weight: 600; font-size: 14px; margin: 0 0 4px; }

.login-pop input {
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: 8px 10px;
  font-size: 13.5px;
  font-family: var(--font-body);
}

.error-text { color: var(--color-danger); font-size: 12.5px; margin: 0; }
.hint { color: var(--color-muted); font-size: 11.5px; margin: 0; }
</style>
