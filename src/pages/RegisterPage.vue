<template>
  <div class="flex flex-center register-page-bg">
    <q-card class="register-card shadow-10">
      <q-card-section class="text-center q-pt-md">
        <img src="~assets/logo.png" alt="Logo de la Empresa" class="register-logo" />
        <div class="text-h5 q-mt-md text-weight-bold text-primary">
          Registrar Nuevo Administrador
        </div>
      </q-card-section>

      <q-card-section>
        <q-form @submit="onSubmit" class="q-gutter-md">
          <q-input
            filled
            v-model="emailPrefix"
            label="Prefijo de Correo"
            lazy-rules
            :rules="[
              (val) => (val && val.length > 0) || 'Por favor, ingresa el prefijo de tu correo',
              (val) => /^[a-zA-Z0-9._%+-]+$/.test(val) || 'Caracteres inválidos en el prefijo',
            ]"
          >
            <template v-slot:append>
              <span class="text-grey-8 text-subtitle1">@enginepy.com</span>
            </template>
          </q-input>

          <q-input
            filled
            v-model="password"
            label="Contraseña"
            type="password"
            lazy-rules
            :rules="[
              (val) => (val && val.length > 5) || 'La contraseña debe tener al menos 6 caracteres',
            ]"
          />

          <q-input
            filled
            v-model="confirmPassword"
            label="Confirmar Contraseña"
            type="password"
            lazy-rules
            :rules="[
              (val) => (val && val.length > 0) || 'Por favor, confirma tu contraseña',
              (val) => val === password || 'Las contraseñas no coinciden',
            ]"
          />

          <div>
            <q-btn
              label="Registrar"
              type="submit"
              color="primary"
              class="full-width register-btn"
              :disable="loading"
            >
              <q-spinner v-if="loading" color="white" size="1em" class="q-ml-sm" />
            </q-btn>
            <q-btn
              label="Volver al Login"
              flat
              color="grey-8"
              class="full-width q-mt-sm"
              @click="router.push('/login')"
            />
          </div>
        </q-form>

        <p v-if="errorMessage" class="text-negative text-center q-mt-md">{{ errorMessage }}</p>
        <p v-if="successMessage" class="text-positive text-center q-mt-md">{{ successMessage }}</p>
      </q-card-section>
    </q-card>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useQuasar } from 'quasar' // Para notificaciones

const router = useRouter()
const $q = useQuasar() // Instancia de Quasar para mostrar notificaciones

const emailPrefix = ref('') // Ahora el v-model se enlaza solo al prefijo
const password = ref('')
const confirmPassword = ref('')
const errorMessage = ref('')
const successMessage = ref('')
const loading = ref(false)

async function onSubmit() {
  errorMessage.value = '' // Limpiar mensajes
  successMessage.value = ''
  loading.value = true

  if (password.value !== confirmPassword.value) {
    errorMessage.value = 'Las contraseñas no coinciden.'
    loading.value = false
    return
  }

  // Construir el correo electrónico completo para el registro
  const fullEmail = emailPrefix.value + '@enginepy.com'

  try {
    // Llamar a la función de registro expuesta por Electron Preload con el correo completo
    const result = await window.electron.registerUser(fullEmail, password.value)

    if (result.success) {
      successMessage.value = 'Usuario administrador registrado exitosamente.'
      emailPrefix.value = '' // Limpiar solo el prefijo
      password.value = ''
      confirmPassword.value = ''
      // Opcional: Redirigir al login después de un éxito
      $q.notify({
        message: 'Usuario registrado. Redirigiendo al login...',
        color: 'positive',
        icon: 'check',
        timeout: 2000,
      })
      setTimeout(() => {
        router.push('/login')
      }, 2000)
    } else {
      errorMessage.value = result.error
    }
  } catch (error) {
    errorMessage.value = 'Error inesperado al registrar usuario: ' + error.message
  } finally {
    loading.value = false
  }
}
</script>

<style lang="scss" scoped>
.register-page-bg {
  background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%);
  overflow: hidden;
  position: relative;
  min-height: 100vh;

  &::before {
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

.register-card {
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

.register-logo {
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

.register-btn {
  background: linear-gradient(90deg, #3498db, #2a5298);
  border: none;
  font-size: 16px;
  font-weight: 600;
  border-radius: 10px;
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
}

.register-btn:hover {
  background: linear-gradient(90deg, #2a5298, #3498db);
  transform: translateY(-2px);
  box-shadow: 0 5px 15px rgba(52, 152, 219, 0.4);
}
</style>
