<template>
  <q-card flat class="panel-card">
    <q-card-section>
      <div class="text-subtitle1 text-weight-medium">Descuento máximo</div>
      <div class="text-caption text-muted">
        Porcentaje máximo de descuento que los vendedores pueden aplicar en un presupuesto.
      </div>
    </q-card-section>
    <q-form @submit="save">
      <q-card-section class="q-pt-none">
        <q-input
          outlined
          :model-value="value"
          @update:model-value="(v) => setDecimal(v, (clean) => (value = clean))"
          @keydown="blockNonDecimalKeys"
          inputmode="decimal"
          label="Descuento máximo"
          :readonly="!isEditing"
          :loading="loading"
          lazy-rules
          :rules="[validPercentage]"
        >
          <template #append><q-icon name="percent" /></template>
        </q-input>
        <div v-if="updatedInfo" class="text-caption text-muted">{{ updatedInfo }}</div>
        <div v-else-if="!loading" class="text-caption text-orange-9">Aún no está definido.</div>
      </q-card-section>
      <q-card-actions align="right" class="q-pa-md">
        <q-btn
          v-if="!isEditing"
          unelevated
          no-caps
          color="primary"
          icon="edit"
          label="Editar"
          :disable="loading"
          @click="isEditing = true"
        />
        <template v-else>
          <q-btn flat no-caps label="Cancelar" @click="cancel" :disable="saving" />
          <q-btn
            unelevated
            no-caps
            color="primary"
            type="submit"
            label="Guardar"
            :loading="saving"
          />
        </template>
      </q-card-actions>
    </q-form>
  </q-card>
</template>

<script setup>
import api from 'src/services/api'
import { ref, computed, onMounted } from 'vue'
import { useQuasar } from 'quasar'
import { blockNonDecimalKeys, setDecimal } from 'src/utils/numberInput'

const $q = useQuasar()

const value = ref('')
const config = ref(null)
const isEditing = ref(false)
const loading = ref(true)
const saving = ref(false)

// Se muestra con coma decimal (ej. 7,5) como el resto del panel
const toText = (n) => (n === null || n === undefined ? '' : String(n).replace('.', ','))
const toNumber = (text) =>
  Number(
    String(text ?? '')
      .trim()
      .replace(',', '.'),
  )

const validPercentage = (val) => {
  if (!String(val ?? '').trim()) return 'Ingresa un porcentaje'
  if (!/^\d+(,\d{1,2})?$/.test(String(val).trim())) return 'Solo números (ej. 10 o 7,5)'
  const n = toNumber(val)
  return (n >= 0 && n <= 100) || 'Debe estar entre 0 y 100'
}

const updatedInfo = computed(() => {
  if (!config.value?.updated_at) return ''
  const date = new Date(config.value.updated_at).toLocaleString('es-PY')
  return `Última modificación: ${date}${config.value.updated_by ? ` por ${config.value.updated_by}` : ''}`
})

async function load() {
  loading.value = true
  try {
    const result = await api.loadDiscountConfig()
    if (!result.success) throw new Error(result.error)
    config.value = result.data
    value.value = toText(result.data?.max_discount_percentage)
  } catch (error) {
    $q.notify({
      type: 'negative',
      message: 'Error al cargar el descuento máximo: ' + error.message,
    })
  } finally {
    loading.value = false
  }
}

async function save() {
  saving.value = true
  try {
    const result = await api.updateMaxDiscount(toNumber(value.value))
    if (!result.success) throw new Error(result.error)
    config.value = result.data
    value.value = toText(result.data.max_discount_percentage)
    isEditing.value = false
    $q.notify({ type: 'positive', message: 'Descuento máximo guardado.' })
  } catch (error) {
    $q.notify({ type: 'negative', message: 'Error al guardar: ' + error.message })
  } finally {
    saving.value = false
  }
}

function cancel() {
  value.value = toText(config.value?.max_discount_percentage)
  isEditing.value = false
}

onMounted(load)
</script>
