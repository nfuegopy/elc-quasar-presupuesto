<template>
  <q-layout view="lHh LpR lFf" class="admin-layout">
    <q-drawer
      v-model="drawerOpen"
      show-if-above
      :width="232"
      :breakpoint="700"
      class="admin-drawer"
    >
      <div class="drawer-brand">
        <img src="~assets/logo.png" alt="Logo" />
        <div>
          <div class="brand-title">Panel Admin</div>
          <div class="brand-subtitle">Presupuestos</div>
        </div>
      </div>

      <q-list class="q-px-sm q-pt-md">
        <q-item
          v-for="link in links"
          :key="link.to"
          :to="link.to"
          clickable
          v-ripple
          class="nav-item"
          active-class="nav-item--active"
        >
          <q-item-section avatar>
            <q-icon :name="link.icon" />
          </q-item-section>
          <q-item-section>{{ link.label }}</q-item-section>
        </q-item>
      </q-list>

      <div class="drawer-footer q-pa-sm">
        <q-btn
          flat
          no-caps
          class="full-width"
          icon="logout"
          label="Cerrar sesión"
          @click="onLogout"
        />
      </div>
    </q-drawer>

    <q-header class="admin-header">
      <q-toolbar>
        <q-btn flat round dense icon="menu" class="lt-md" @click="drawerOpen = !drawerOpen" />
        <q-toolbar-title class="page-title">{{ currentTitle }}</q-toolbar-title>
      </q-toolbar>
    </q-header>

    <q-page-container>
      <router-view />
    </q-page-container>
  </q-layout>
</template>

<script setup>
import api from 'src/services/api'
import { ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useQuasar } from 'quasar'

const route = useRoute()
const router = useRouter()
const $q = useQuasar()

const drawerOpen = ref(false)

const links = [
  { to: '/home', label: 'Inicio', icon: 'space_dashboard' },
  { to: '/dashboard', label: 'Productos', icon: 'inventory_2' },
  { to: '/users', label: 'Usuarios', icon: 'group' },
  { to: '/interes', label: 'Parámetros', icon: 'tune' },
]

const currentTitle = computed(() => links.find((l) => l.to === route.path)?.label || '')

function onLogout() {
  $q.dialog({
    title: 'Cerrar sesión',
    message: '¿Seguro que quieres cerrar sesión?',
    cancel: { label: 'Cancelar', flat: true },
    ok: { label: 'Cerrar sesión', color: 'primary', unelevated: true },
  }).onOk(async () => {
    try {
      await api.logout()
      router.push('/login')
    } catch (error) {
      $q.notify({ type: 'negative', message: 'Error al cerrar sesión: ' + error.message })
    }
  })
}
</script>

<style lang="scss" scoped>
.admin-drawer {
  display: flex;
  flex-direction: column;
}

:deep(.q-drawer__content) {
  display: flex;
  flex-direction: column;
  background: #ffffff;
  border-right: 1px solid $border-color;
}

.drawer-brand {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 20px 16px;
  border-bottom: 1px solid $border-color;

  img {
    width: 40px;
    height: 40px;
    object-fit: contain;
  }
}

.brand-title {
  font-weight: 700;
  font-size: 1rem;
  color: $primary;
}

.brand-subtitle {
  font-size: 0.8rem;
  color: $text-muted;
}

.nav-item {
  border-radius: 10px;
  margin-bottom: 4px;
  color: #475569;
  font-weight: 500;
}

.nav-item--active {
  background: rgba($primary, 0.1);
  color: $primary;
}

.drawer-footer {
  margin-top: auto;
  border-top: 1px solid $border-color;
  color: #475569;
}

.admin-header {
  background: $page-bg;
  color: #0f172a;
  border-bottom: 1px solid $border-color;
}

.page-title {
  font-weight: 600;
  font-size: 1.15rem;
}
</style>
