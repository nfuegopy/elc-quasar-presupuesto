<template>
  <q-page padding>
    <div class="q-pa-md q-gutter-md">
      <h3>Gestión de Interés</h3>

      <q-card class="my-card">
        <q-card-section>
          <div class="text-h6">Interés Actual</div>
          <q-form @submit="saveInterest" class="q-gutter-md q-pt-md">
            <q-input
              filled
              v-model="currentInterest"
              label="Valor de Interés"
              :readonly="!isEditing"
              lazy-rules
              :rules="[
                (val) => (val && val.length > 0) || 'Por favor, ingresa un valor de interés',
                // Nueva regla: solo números y una coma opcional como separador decimal
                (val) =>
                  /^\d+(,\d+)?$/.test(val) ||
                  'Solo se permiten números y una coma como separador decimal (ej. 9,5)',
              ]"
            >
              <template v-slot:append v-if="!isEditing">
                <q-icon name="percent" />
              </template>
            </q-input>

            <div class="q-mt-md q-gutter-sm">
              <q-btn v-if="!isEditing" label="Editar" color="primary" @click="isEditing = true" />
              <q-btn
                v-if="isEditing"
                label="Guardar"
                type="submit"
                color="positive"
                :disable="loadingSave"
              >
                <q-spinner v-if="loadingSave" color="white" size="1em" class="q-ml-sm" />
              </q-btn>
              <q-btn
                v-if="isEditing"
                label="Cancelar"
                color="secondary"
                @click="cancelEdit"
                :disable="loadingSave"
              />
            </div>
          </q-form>
        </q-card-section>
      </q-card>
    </div>
  </q-page>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useQuasar } from 'quasar'

const $q = useQuasar()

const currentInterest = ref('')
const initialInterest = ref('') // Para restaurar si se cancela la edición
const interestDocId = ref(null) // ID del documento en Firestore
const isEditing = ref(false)
const loadingSave = ref(false)

// Cargar el valor de interés desde Firestore
async function loadInterest() {
  try {
    const result = await window.electron.loadInterest()
    if (result.success && result.data) {
      currentInterest.value = result.data.interes
      initialInterest.value = result.data.interes
      interestDocId.value = result.data.id // Guardar el ID del documento
    } else if (result.success && !result.data) {
      $q.notify({
        message: 'No se encontró ningún valor de interés. Se puede crear uno al guardar.',
        color: 'info',
        icon: 'info',
      })
      currentInterest.value = '0' // Valor predeterminado si no hay ninguno
    } else {
      $q.notify({
        message: 'Error al cargar interés: ' + result.error,
        color: 'negative',
        icon: 'warning',
      })
    }
  } catch (error) {
    $q.notify({
      message: 'Error inesperado al cargar interés: ' + error.message,
      color: 'negative',
      icon: 'error',
    })
  }
}

// Guardar el valor de interés en Firestore
async function saveInterest() {
  loadingSave.value = true
  try {
    const result = await window.electron.updateInterest(interestDocId.value, currentInterest.value)
    if (result.success) {
      $q.notify({
        message: 'Interés guardado exitosamente.',
        color: 'positive',
        icon: 'check_circle',
      })
      isEditing.value = false
      initialInterest.value = currentInterest.value // Actualizar valor inicial
      interestDocId.value = result.id // Actualizar el ID si se creó uno nuevo (solo si es la primera vez)
    } else {
      $q.notify({
        message: 'Error al guardar interés: ' + result.error,
        color: 'negative',
        icon: 'warning',
      })
    }
  } catch (error) {
    $q.notify({
      message: 'Error inesperado al guardar interés: ' + error.message,
      color: 'negative',
      icon: 'error',
    })
  } finally {
    loadingSave.value = false
  }
}

// Cancelar la edición y restaurar el valor original
function cancelEdit() {
  currentInterest.value = initialInterest.value
  isEditing.value = false
}

// Cargar interés al montar el componente
onMounted(() => {
  loadInterest()
})
</script>

<style lang="scss" scoped>
.my-card {
  border-radius: 15px;
  box-shadow: 0 5px 20px rgba(0, 0, 0, 0.05);
  padding: 15px;
}
h3 {
  color: #2c3e50;
  font-weight: 600;
  margin-bottom: 20px;
  font-size: 1.8rem;
  text-align: center;
}
</style>
