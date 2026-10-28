<template>
  <q-page padding>
    <div class="page-container q-gutter-y-md" style="max-width: 520px">
      <MaxDiscountCard />

      <q-card flat class="panel-card">
        <q-card-section>
          <div class="text-subtitle1 text-weight-medium">Financiación</div>
          <div class="text-caption text-muted">
            La app calcula la cuota para que, al ceder la cartera, el banco pague el saldo
            financiado más el margen. Usar la tasa del banco más caro (hoy Sudameris, 9,5).
          </div>
        </q-card-section>
        <q-form @submit="saveInterest">
          <q-card-section class="q-pt-none q-gutter-y-sm">
            <q-input
              outlined
              :model-value="currentInterest"
              @update:model-value="(v) => setDecimal(v, (clean) => (currentInterest = clean))"
              @keydown="blockNonDecimalKeys"
              inputmode="decimal"
              label="Tasa de descuento bancaria anual (%)"
              :readonly="!isEditing"
              lazy-rules
              :rules="percentRules"
            >
              <template #append><q-icon name="percent" /></template>
            </q-input>
            <q-input
              outlined
              :model-value="currentMargin"
              @update:model-value="(v) => setDecimal(v, (clean) => (currentMargin = clean))"
              @keydown="blockNonDecimalKeys"
              inputmode="decimal"
              label="Margen por cargos bancarios (%)"
              hint="Cubre IVA, seguro y comisiones del banco (ej. 2)"
              :readonly="!isEditing"
              lazy-rules
              :rules="percentRules"
            >
              <template #append><q-icon name="percent" /></template>
            </q-input>
          </q-card-section>
          <q-card-actions align="right" class="q-pa-md">
            <q-btn
              v-if="!isEditing"
              unelevated
              no-caps
              color="primary"
              icon="edit"
              label="Editar"
              @click="isEditing = true"
            />
            <template v-else>
              <q-btn flat no-caps label="Cancelar" @click="cancelEdit" :disable="loadingSave" />
              <q-btn
                unelevated
                no-caps
                color="primary"
                type="submit"
                label="Guardar"
                :loading="loadingSave"
              />
            </template>
          </q-card-actions>
        </q-form>
      </q-card>
    </div>
  </q-page>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useQuasar } from 'quasar'
import MaxDiscountCard from 'components/MaxDiscountCard.vue'
import { blockNonDecimalKeys, setDecimal } from 'src/utils/numberInput'

const $q = useQuasar()

// La app usa 2% si el margen todavía no se guardó
const DEFAULT_MARGIN = '2'

const currentInterest = ref('')
const initialInterest = ref('') // Para restaurar si se cancela la edición
const currentMargin = ref(DEFAULT_MARGIN)
const initialMargin = ref(DEFAULT_MARGIN)
const interestDocId = ref(null) // ID del documento en Firestore
const isEditing = ref(false)
const loadingSave = ref(false)

const percentRules = [
  (val) => (val && val.length > 0) || 'Por favor, ingresa un valor',
  (val) =>
    /^\d+(,\d+)?$/.test(val) ||
    'Solo se permiten números y una coma como separador decimal (ej. 9,5)',
  (val) => Number(String(val).replace(',', '.')) < 100 || 'Debe ser menor a 100',
]

// Cargar el valor de interés desde Firestore
async function loadInterest() {
  try {
    const result = await window.electron.loadInterest()
    if (result.success && result.data) {
      currentInterest.value = result.data.interes
      initialInterest.value = result.data.interes
      currentMargin.value = result.data.margen_cargos ?? DEFAULT_MARGIN
      initialMargin.value = currentMargin.value
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
    const result = await window.electron.updateInterest(
      interestDocId.value,
      currentInterest.value,
      currentMargin.value,
    )
    if (result.success) {
      $q.notify({
        message: 'Parámetros de financiación guardados.',
        color: 'positive',
        icon: 'check_circle',
      })
      isEditing.value = false
      initialInterest.value = currentInterest.value // Actualizar valor inicial
      initialMargin.value = currentMargin.value
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
  currentMargin.value = initialMargin.value
  isEditing.value = false
}

// Cargar interés al montar el componente
onMounted(() => {
  loadInterest()
})
</script>
