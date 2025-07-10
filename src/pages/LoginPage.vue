<template>
  <div class="flex flex-center login-page-bg">
    <q-card class="login-card shadow-10">
      <q-card-section class="text-center q-pt-md">
        <img src="~assets/logo.png" alt="Logo de la Empresa" class="login-logo" />
      </q-card-section>

      <q-card-section>
        <q-form @submit="onSubmit" class="q-gutter-md">
          <q-input
            filled
            v-model="email"
            label="Correo Electrónico"
            type="email"
            lazy-rules
            :rules="[
              (val) => (val && val.length > 0) || 'Por favor, ingresa tu correo electrónico',
            ]"
          />

          <q-input
            filled
            v-model="password"
            label="Contraseña"
            type="password"
            lazy-rules
            :rules="[(val) => (val && val.length > 0) || 'Por favor, ingresa tu contraseña']"
          />

          <q-checkbox v-model="rememberMe" label="Recordar usuario" class="q-mt-md" />

          <div>
            <q-btn
              label="Iniciar Sesión"
              type="submit"
              color="primary"
              class="full-width login-btn"
              :disable="loading"
            >
              <q-spinner v-if="loading" color="white" size="1em" class="q-ml-sm" />
            </q-btn>
            <q-btn
              label="Registrar nuevo administrador"
              flat
              color="grey-8"
              class="full-width q-mt-md"
              @click="router.push('/register')"
            />
          </div>
        </q-form>

        <p v-if="errorMessage" class="text-negative text-center q-mt-md">{{ errorMessage }}</p>
      </q-card-section>
    </q-card>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
// 'useQuasar' se eliminó porque no se usaba directamente en esta lógica. Si necesitas notificaciones, puedes descomentarlo.

const router = useRouter()

const email = ref('')
const password = ref('')
const rememberMe = ref(false)
const errorMessage = ref('')
const loading = ref(false)

onMounted(() => {
  // Cargar credenciales guardadas desde localStorage, si existen
  const savedEmail = localStorage.getItem('savedEmail')
  const savedPassword = localStorage.getItem('savedPassword')
  if (savedEmail && savedPassword) {
    email.value = savedEmail
    password.value = savedPassword
    rememberMe.value = true
  }
})

async function onSubmit() {
  errorMessage.value = '' // Limpiar mensaje de error previo
  loading.value = true

  // Guardar credenciales en localStorage si el usuario marcó "Recordar usuario"
  if (rememberMe.value) {
    localStorage.setItem('savedEmail', email.value)
    localStorage.setItem('savedPassword', password.value)
  } else {
    // Limpiar credenciales guardadas si la casilla no está marcada
    localStorage.removeItem('savedEmail')
    localStorage.removeItem('savedPassword')
  }

  try {
    // Llamar a la función de login expuesta por Electron Preload
    const result = await window.electron.login(email.value, password.value)

    if (result.success) {
      // Redirigir a la página de inicio (home)
      router.push('/home')
    } else {
      errorMessage.value = result.error
    }
  } catch (error) {
    errorMessage.value = 'Error inesperado: ' + error.message
  } finally {
    loading.value = false
  }
}
</script>

<style lang="scss" scoped>
.login-page-bg {
  background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%); /* Fondo animado de index.html */
  overflow: hidden;
  position: relative;
  min-height: 100vh; /* Asegura que el div ocupe toda la altura */

  &::before {
    /* Fondo animado */
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: url('https://www.transparenttextures.com/patterns/cubes.png');
    opacity: 0.1;
    z-index: 0;
    animation: moveBackground 20s linear infinite;
  }

  @keyframes moveBackground {
    0% {
      background-position: 0 0;
    }
    100% {
      background-position: 100% 100%;
    }
  }
}

.login-card {
  background: rgba(255, 255, 255, 0.95);
  border-radius: 20px;
  padding: 20px;
  max-width: 450px;
  width: 100%;
  position: relative;
  z-index: 1;
  animation: fadeIn 1s ease-in-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.login-logo {
  display: block;
  margin: 0 auto 20px;
  max-width: 150px;
  animation: bounceIn 0.8s ease-in-out;
}

@keyframes bounceIn {
  0% {
    transform: scale(0.5);
    opacity: 0;
  }
  60% {
    transform: scale(1.2);
    opacity: 1;
  }
  100% {
    transform: scale(1);
  }
}

.login-btn {
  background: linear-gradient(
    90deg,
    #3498db,
    #2a5298
  ); /* Mismo gradiente que btn-primary en index.html */
  border: none;
  font-size: 16px;
  font-weight: 600;
  border-radius: 10px;
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
}

.login-btn:hover {
  background: linear-gradient(90deg, #2a5298, #3498db);
  transform: translateY(-2px);
  box-shadow: 0 5px 15px rgba(52, 152, 219, 0.4);
}
</style>
