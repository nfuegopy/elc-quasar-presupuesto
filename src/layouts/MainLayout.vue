<template>
  <q-layout view="hHh lpR fFf">
    <q-header elevated class="bg-primary text-white" height-hint="98">
      <q-toolbar>
        <q-toolbar-title>
          <q-avatar size="32px" class="q-mr-sm">
            <img src="~assets/logo.png" alt="LoanCalc Admin Logo" />
          </q-avatar>
          LoanCalc Admin
        </q-toolbar-title>
      </q-toolbar>

      <q-toolbar class="main-tabs-toolbar">
        <q-tabs align="left" class="main-tabs">
          <q-route-tab to="/home" label="Inicio" icon="home" />
          <q-route-tab to="/dashboard" label="Carga Productos" icon="add_shopping_cart" />
          <q-route-tab to="/interes" label="Interes" icon="attach_money" />
        </q-tabs>

        <q-space />
        <q-btn flat label="Cerrar Sesión" @click="onLogout" class="q-ml-md">
          <q-icon name="logout" class="q-ml-sm" />
        </q-btn>
      </q-toolbar>
    </q-header>

    <q-page-container>
      <router-view />
    </q-page-container>
  </q-layout>
</template>

<script setup>
import { useRouter } from 'vue-router'
import { useQuasar } from 'quasar'

const router = useRouter()
const $q = useQuasar()

// Lógica para cerrar sesión
async function onLogout() {
  console.log('Botón de Cerrar Sesión Clicked') // <-- Añadido para depuración
  $q.dialog({
    title: 'Confirmar Cierre de Sesión',
    message: '¿Estás seguro de que quieres cerrar sesión?',
    cancel: true,
    persistent: true,
  }).onOk(async () => {
    try {
      console.log('Confirmado cierre de sesión, llamando a window.electron.logout()') // <-- Añadido para depuración
      await window.electron.logout() // Llama a la función de logout expuesta por Electron
      console.log('Logout IPC llamado, redirigiendo a /login') // <-- Añadido para depuración
      router.push('/login') // Redirige al login después de cerrar sesión
      $q.notify({
        message: 'Sesión cerrada correctamente.',
        color: 'info',
        icon: 'logout',
        position: 'top-right',
      })
    } catch (error) {
      console.error('Error durante el cierre de sesión:', error) // <-- Añadido para depuración
      $q.notify({
        message: 'Error al cerrar sesión: ' + error.message,
        color: 'negative',
        icon: 'warning',
        position: 'top-right',
      })
    }
  })
}
</script>

<style lang="scss" scoped>
.bg-primary {
  background: linear-gradient(90deg, #1e3c72 0%, #2a5298 100%) !important;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
}

.q-toolbar-title {
  font-family: 'Poppins', sans-serif;
  font-weight: 600;
  font-size: 1.3rem;
  display: flex;
  align-items: center;
}

.main-tabs-toolbar {
  // Asegura que esta toolbar tenga un fondo si la principal es transparente o no está elevada
  background: linear-gradient(
    90deg,
    #2a5298 0%,
    #1e3c72 100%
  ) !important; // Un tono similar al header principal
  min-height: 48px; // Altura estándar para toolbars con tabs
}

.main-tabs {
  // El fondo de las tabs está ahora en .main-tabs-toolbar
  .q-tab {
    padding: 0 15px;
    min-width: unset;
    text-transform: none;
    font-weight: 500;
    font-size: 0.95rem;

    .q-tab__indicator {
      height: 3px;
    }
  }
}
</style>
