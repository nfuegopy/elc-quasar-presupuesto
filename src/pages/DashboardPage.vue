<template>
  <q-page padding>
    <div class="page-container q-gutter-y-md">
      <!-- Acciones -->
      <div class="row items-center q-col-gutter-sm">
        <div class="col-12 col-md">
          <q-input
            v-model="search"
            dense
            outlined
            bg-color="white"
            placeholder="Buscar por nombre, artículo, marca o modelo"
            clearable
          >
            <template #prepend><q-icon name="search" /></template>
          </q-input>
        </div>
        <div class="col-12 col-md-auto row q-gutter-sm justify-end">
          <q-btn
            outline
            no-caps
            color="primary"
            icon="download"
            label="Descargar CSV"
            :disable="!products.length"
            @click="exportCsv"
          />
          <q-btn
            outline
            no-caps
            color="primary"
            icon="note_add"
            label="Plantilla vacía"
            @click="exportTemplate"
          >
            <q-tooltip>Solo encabezados, para cargar productos nuevos</q-tooltip>
          </q-btn>
          <q-btn outline no-caps color="primary" icon="upload" label="Subir CSV" @click="pickCsv" />
          <q-btn
            unelevated
            no-caps
            color="primary"
            icon="add"
            :label="showingBenefits ? 'Nuevo beneficio' : 'Nuevo producto'"
            @click="openCreate"
          />
          <input ref="csvInput" type="file" accept=".csv,text/csv" hidden @change="onCsvSelected" />
        </div>
      </div>

      <q-banner rounded class="bg-blue-1 text-blue-10">
        <template #avatar><q-icon name="info" color="primary" /></template>
        <b>Actualizar precios:</b> descarga el CSV, edita lo que necesites en Excel (no cambies la
        columna <b>ID</b>) y súbelo. <b>Productos nuevos:</b> usa la plantilla vacía y deja el ID en
        blanco; el ID se genera al crearlos. No se permiten números de artículo repetidos. Las
        imágenes se cargan una a una desde la edición. <b>Beneficios:</b> son productos con Tipo
        <b>beneficio</b>; en la app no aparecen en el catálogo, se eligen como beneficios incluidos.
      </q-banner>

      <!-- Tabla -->
      <q-card flat class="panel-card">
        <q-tabs
          v-model="tab"
          dense
          align="left"
          no-caps
          active-color="primary"
          indicator-color="primary"
          class="text-grey-7"
        >
          <q-tab
            name="maquinaria"
            icon="precision_manufacturing"
            :label="`Maquinaria (${machinery.length})`"
          />
          <q-tab
            name="beneficios"
            icon="card_giftcard"
            :label="`Beneficios (${benefits.length})`"
          />
        </q-tabs>
        <q-separator />
        <q-table
          :rows="showingBenefits ? benefits : machinery"
          :columns="columns"
          row-key="id"
          flat
          :filter="search"
          :loading="loadingTable"
          :pagination="{ rowsPerPage: 25, sortBy: 'name' }"
          :rows-per-page-options="[25, 50, 100, 0]"
          :no-data-label="
            showingBenefits ? 'No hay beneficios cargados' : 'No hay productos cargados'
          "
          no-results-label="Ningún resultado coincide con la búsqueda"
        >
          <template #body-cell-image="props">
            <q-td :props="props">
              <q-avatar rounded size="44px" class="bg-grey-2">
                <img
                  v-if="props.row.image_url"
                  :src="props.row.image_url"
                  style="object-fit: cover"
                />
                <q-icon v-else name="image_not_supported" color="grey-5" />
              </q-avatar>
            </q-td>
          </template>
          <template #body-cell-name="props">
            <q-td :props="props">
              <div class="text-weight-medium">{{ props.row.name }}</div>
              <div class="text-caption text-muted">Art. {{ props.row.articleNumber }}</div>
            </q-td>
          </template>
          <template #body-cell-price="props">
            <q-td :props="props" class="text-weight-medium">
              {{ formatPrice(props.row.price, props.row.currency) }}
            </q-td>
          </template>
          <template #body-cell-actions="props">
            <q-td :props="props">
              <q-btn flat round dense icon="edit" color="primary" @click="openEdit(props.row)">
                <q-tooltip>Editar</q-tooltip>
              </q-btn>
              <q-btn
                flat
                round
                dense
                icon="delete"
                color="negative"
                @click="confirmDelete(props.row)"
              >
                <q-tooltip>Eliminar</q-tooltip>
              </q-btn>
            </q-td>
          </template>
        </q-table>
      </q-card>
    </div>

    <!-- Alta / edición de producto -->
    <q-dialog v-model="formOpen" persistent>
      <q-card style="width: 720px; max-width: 95vw">
        <q-card-section class="row items-center">
          <div class="text-h6">
            {{ isEditing ? 'Editar' : 'Nuevo' }} {{ formIsBenefit ? 'beneficio' : 'producto' }}
          </div>
          <q-space />
          <q-btn flat round dense icon="close" v-close-popup :disable="loadingForm" />
        </q-card-section>

        <q-form @submit="onSubmitProductForm">
          <q-card-section class="row q-col-gutter-md q-pt-none">
            <q-input
              class="col-12 col-sm-6"
              outlined
              v-model="productForm.articleNumber"
              label="Número de artículo"
              :rules="[required]"
            />
            <q-input
              class="col-12 col-sm-6"
              outlined
              v-model="productForm.name"
              label="Nombre"
              :rules="[required]"
            />
            <template v-if="!formIsBenefit">
              <q-select
                class="col-12 col-sm-6"
                outlined
                v-model="productForm.type"
                label="Tipo de maquinaria"
                :options="typeOptions"
                use-input
                new-value-mode="add-unique"
                :rules="[required, notBenefitType]"
              />
              <q-select
                class="col-12 col-sm-6"
                outlined
                v-model="productForm.brand"
                label="Marca"
                :options="brandOptions"
                use-input
                new-value-mode="add-unique"
                :rules="[required]"
              />
              <q-input
                class="col-12 col-sm-6"
                outlined
                v-model="productForm.model"
                label="Modelo"
                :rules="[required]"
              />
              <q-select
                class="col-12 col-sm-6"
                outlined
                v-model="productForm.fuelType"
                label="Movido a"
                :options="['Diesel', 'Nafta/Gas', 'Eléctrico', 'Manual']"
              />
            </template>
            <q-input
              class="col-8"
              outlined
              v-model.number="productForm.price"
              label="Precio"
              type="number"
              step="0.01"
              :rules="[(v) => v > 0 || 'El precio debe ser mayor que 0']"
            />
            <q-select
              class="col-4"
              outlined
              v-model="productForm.currency"
              label="Moneda"
              :options="['USD', 'GS']"
            />
            <q-input
              class="col-12"
              outlined
              v-model="productForm.features"
              :label="formIsBenefit ? 'Descripción interna (no sale en el PDF)' : 'Características'"
              type="textarea"
              autogrow
            />
            <q-file
              v-if="!formIsBenefit"
              class="col-12 col-sm-6"
              outlined
              v-model="productForm.image"
              label="Imagen"
              accept="image/*"
              clearable
              :hint="productForm.image_url ? 'Ya tiene imagen; elegir otra la reemplaza' : ''"
            >
              <template #prepend><q-icon name="image" /></template>
            </q-file>
            <q-file
              v-if="!formIsBenefit"
              class="col-12 col-sm-6"
              outlined
              v-model="productForm.imageDescription"
              label="Imagen de descripción"
              accept="image/*"
              clearable
              :hint="
                productForm.image_description_url ? 'Ya tiene imagen; elegir otra la reemplaza' : ''
              "
            >
              <template #prepend><q-icon name="image" /></template>
            </q-file>
          </q-card-section>

          <q-card-actions align="right" class="q-pa-md">
            <q-btn flat no-caps label="Cancelar" v-close-popup :disable="loadingForm" />
            <q-btn
              unelevated
              no-caps
              color="primary"
              type="submit"
              :loading="loadingForm"
              :label="
                isEditing ? 'Guardar cambios' : formIsBenefit ? 'Crear beneficio' : 'Crear producto'
              "
            />
          </q-card-actions>
        </q-form>
      </q-card>
    </q-dialog>

    <!-- Vista previa de importación CSV -->
    <q-dialog v-model="importOpen" persistent>
      <q-card v-if="importPlan" style="width: 860px; max-width: 95vw">
        <q-card-section class="row items-center">
          <div class="text-h6">Revisar cambios del CSV</div>
          <q-space />
          <q-btn flat round dense icon="close" v-close-popup :disable="applyingImport" />
        </q-card-section>

        <q-card-section class="row q-gutter-sm q-pt-none">
          <q-chip color="blue-1" text-color="primary" icon="edit">
            {{ importPlan.updates.length }} a actualizar
          </q-chip>
          <q-chip color="green-1" text-color="positive" icon="add">
            {{ importPlan.creates.length }} nuevos
          </q-chip>
          <q-chip color="grey-3" text-color="grey-8" icon="check">
            {{ importPlan.unchanged }} sin cambios
          </q-chip>
          <q-chip v-if="importPlan.errors.length" color="red-1" text-color="negative" icon="error">
            {{ importPlan.errors.length }} con errores (se omiten)
          </q-chip>
        </q-card-section>

        <q-card-section class="q-pt-none" style="max-height: 55vh; overflow: auto">
          <q-list bordered separator class="rounded-borders">
            <q-item v-for="e in importPlan.errors" :key="'e' + e.line">
              <q-item-section avatar><q-icon name="error" color="negative" /></q-item-section>
              <q-item-section>
                <q-item-label>Fila {{ e.line }} {{ e.name ? '· ' + e.name : '' }}</q-item-label>
                <q-item-label caption class="text-negative">{{ e.message }}</q-item-label>
              </q-item-section>
            </q-item>
            <q-item v-for="u in importPlan.updates" :key="'u' + u.line">
              <q-item-section avatar><q-icon name="edit" color="primary" /></q-item-section>
              <q-item-section>
                <q-item-label>{{ u.name }}</q-item-label>
                <q-item-label caption v-for="c in u.changes" :key="c.field">
                  {{ fieldLabels[c.field] }}: <s>{{ displayValue(c.field, c.from) }}</s> →
                  <b>{{ displayValue(c.field, c.to) }}</b>
                </q-item-label>
              </q-item-section>
            </q-item>
            <q-item v-for="c in importPlan.creates" :key="'c' + c.line">
              <q-item-section avatar><q-icon name="add_circle" color="positive" /></q-item-section>
              <q-item-section>
                <q-item-label>{{ c.data.name }}</q-item-label>
                <q-item-label caption>
                  Art. {{ c.data.articleNumber }} ·
                  {{ formatPrice(c.data.price, c.data.currency || 'USD') }}
                </q-item-label>
              </q-item-section>
            </q-item>
          </q-list>
        </q-card-section>

        <q-card-actions align="right" class="q-pa-md">
          <q-btn flat no-caps label="Cancelar" v-close-popup :disable="applyingImport" />
          <q-btn
            unelevated
            no-caps
            color="primary"
            icon="done_all"
            :label="`Aplicar ${importPlan.updates.length + importPlan.creates.length} cambios`"
            :disable="!importPlan.updates.length && !importPlan.creates.length"
            :loading="applyingImport"
            @click="applyImport"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useQuasar } from 'quasar'
import { productsToCsv, downloadCsv, buildImportPlan, CSV_COLUMNS } from 'src/utils/productsCsv'
import { BENEFIT_DEFAULTS, isBenefit } from 'src/utils/productKinds'

const $q = useQuasar()
const route = useRoute()

const products = ref([])
const search = ref('')
const loadingTable = ref(true)

// Maquinaria y beneficios conviven en `products`; se muestran en pestañas separadas
const tab = ref(route.query.tab === 'beneficios' ? 'beneficios' : 'maquinaria')
const showingBenefits = computed(() => tab.value === 'beneficios')
const machinery = computed(() => products.value.filter((p) => !isBenefit(p)))
const benefits = computed(() => products.value.filter(isBenefit))

const formOpen = ref(false)
const loadingForm = ref(false)
const editingProductId = ref(null)
const isEditing = computed(() => !!editingProductId.value)
const formIsBenefit = ref(false)

const csvInput = ref(null)
const importOpen = ref(false)
const importPlan = ref(null)
const applyingImport = ref(false)

const emptyForm = () => ({
  articleNumber: '',
  name: '',
  type: '',
  brand: '',
  fuelType: '',
  model: '',
  price: null,
  currency: 'USD',
  features: '',
  image: null,
  imageDescription: null,
  image_url: '',
  image_description_url: '',
})
const productForm = ref(emptyForm())

const required = (v) => !!v || 'Campo obligatorio'
const notBenefitType = (v) =>
  !isBenefit({ type: v }) || 'Para un beneficio usa la pestaña Beneficios'

// Las opciones base más las que ya existen en la maquinaria cargada
const withExisting = (base, field) =>
  [...new Set([...base, ...machinery.value.map((p) => p[field]).filter(Boolean)])].sort()
const typeOptions = computed(() =>
  withExisting(
    [
      'pala cargadora',
      'tractor',
      'montacargas',
      'apilador',
      'retro pala',
      'excavadora',
      'transpaleta',
      'separador de pedidos',
      'generadores',
      'sembradoras',
      'forestal',
    ],
    'type',
  ),
)
const brandOptions = computed(() =>
  withExisting(
    ['noblelift', 'michigan', 'koten', 'maximal', 'lugong', 'hanomag', 'fercam', 'xuvol', 'otros'],
    'brand',
  ),
)

const fieldLabels = Object.fromEntries(CSV_COLUMNS.map((c) => [c.key, c.header]))

const allColumns = [
  { name: 'image', label: '', field: 'image_url', align: 'left', style: 'width: 60px' },
  {
    name: 'name',
    label: 'Producto',
    field: (row) => `${row.name} ${row.articleNumber}`,
    align: 'left',
    sortable: true,
    sort: (a, b) => a.localeCompare(b),
  },
  { name: 'type', label: 'Tipo', field: 'type', align: 'left', sortable: true },
  { name: 'brand', label: 'Marca', field: 'brand', align: 'left', sortable: true },
  { name: 'model', label: 'Modelo', field: 'model', align: 'left', sortable: true },
  { name: 'fuelType', label: 'Movido a', field: 'fuelType', align: 'left' },
  { name: 'price', label: 'Precio', field: 'price', align: 'right', sortable: true },
  { name: 'actions', label: '', field: 'id', align: 'right' },
]
const MACHINE_ONLY_COLUMNS = ['image', 'type', 'brand', 'model', 'fuelType']
const columns = computed(() =>
  showingBenefits.value
    ? allColumns
        .filter((c) => !MACHINE_ONLY_COLUMNS.includes(c.name))
        .map((c) => (c.name === 'name' ? { ...c, label: 'Beneficio' } : c))
    : allColumns,
)

function formatPrice(price, currency) {
  const n = Number(price) || 0
  return currency === 'GS'
    ? `Gs. ${n.toLocaleString('es-PY', { maximumFractionDigits: 0 })}`
    : `USD ${n.toLocaleString('es-PY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

const displayValue = (field, value) =>
  field === 'price' ? Number(value).toLocaleString('es-PY') : value || '—'

async function loadProducts() {
  loadingTable.value = true
  try {
    products.value = await window.electron.loadProducts()
  } catch (error) {
    $q.notify({ type: 'negative', message: 'Error al cargar productos: ' + error.message })
  } finally {
    loadingTable.value = false
  }
}

// --- Alta / edición ---
function openCreate() {
  editingProductId.value = null
  formIsBenefit.value = showingBenefits.value
  productForm.value = formIsBenefit.value ? { ...emptyForm(), ...BENEFIT_DEFAULTS } : emptyForm()
  formOpen.value = true
}

function openEdit(product) {
  editingProductId.value = product.id
  formIsBenefit.value = isBenefit(product)
  productForm.value = {
    ...emptyForm(),
    ...product,
    image: null,
    imageDescription: null,
  }
  formOpen.value = true
}

const toFilePayload = async (file) =>
  file instanceof File ? { name: file.name, data: await file.arrayBuffer() } : null

async function onSubmitProductForm() {
  loadingForm.value = true
  try {
    const { image, imageDescription, ...productData } = productForm.value
    productData.price = parseFloat(productData.price)
    if (formIsBenefit.value) Object.assign(productData, BENEFIT_DEFAULTS, { fuelType: '' })
    const imageFile = await toFilePayload(image)
    const imageDescriptionFile = await toFilePayload(imageDescription)

    const result = isEditing.value
      ? await window.electron.updateProduct(
          editingProductId.value,
          productData,
          imageFile,
          imageDescriptionFile,
        )
      : await window.electron.addProduct(productData, imageFile, imageDescriptionFile)

    if (!result.success) throw new Error(result.error)
    $q.notify({
      type: 'positive',
      message: `${formIsBenefit.value ? 'Beneficio' : 'Producto'} ${isEditing.value ? 'actualizado' : 'creado'}.`,
    })
    formOpen.value = false
    loadProducts()
  } catch (error) {
    $q.notify({ type: 'negative', message: 'Error: ' + error.message })
  } finally {
    loadingForm.value = false
  }
}

function confirmDelete(product) {
  $q.dialog({
    title: isBenefit(product) ? 'Eliminar beneficio' : 'Eliminar producto',
    message: `¿Seguro que quieres eliminar "${product.name}"? Esta acción no se puede deshacer.`,
    cancel: { label: 'Cancelar', flat: true },
    ok: { label: 'Eliminar', color: 'negative', unelevated: true },
  }).onOk(async () => {
    const result = await window.electron.deleteProduct(product.id)
    if (result.success) {
      $q.notify({ type: 'positive', message: 'Producto eliminado.' })
      loadProducts()
    } else {
      $q.notify({ type: 'negative', message: 'Error al eliminar: ' + result.error })
    }
  })
}

// --- CSV ---
function exportCsv() {
  const date = new Date().toISOString().slice(0, 10)
  downloadCsv(productsToCsv(products.value), `productos_${date}.csv`)
}

function exportTemplate() {
  downloadCsv(productsToCsv([]), 'plantilla_productos_nuevos.csv')
}

function pickCsv() {
  csvInput.value.value = ''
  csvInput.value.click()
}

async function onCsvSelected(event) {
  const file = event.target.files[0]
  if (!file) return
  try {
    // Se recargan los productos para comparar contra el estado más reciente
    await loadProducts()
    importPlan.value = buildImportPlan(await file.text(), products.value)
    importOpen.value = true
  } catch (error) {
    $q.notify({ type: 'negative', message: 'No se pudo leer el CSV: ' + error.message })
  }
}

async function applyImport() {
  applyingImport.value = true
  try {
    const rows = [
      ...importPlan.value.updates.map((u) => ({ id: u.id, data: u.data })),
      ...importPlan.value.creates.map((c) => ({ data: c.data })),
    ]
    // El plan es reactivo (Proxy de Vue) y el IPC de Electron no puede clonarlo: se envía plano
    const result = await window.electron.bulkUpsertProducts(JSON.parse(JSON.stringify(rows)))
    if (!result.success) throw new Error(result.error)
    $q.notify({
      type: 'positive',
      message: `Listo: ${result.updated} actualizados, ${result.created} creados.`,
    })
    importOpen.value = false
    loadProducts()
  } catch (error) {
    $q.notify({ type: 'negative', message: 'Error al aplicar el CSV: ' + error.message })
  } finally {
    applyingImport.value = false
  }
}

onMounted(loadProducts)
</script>
