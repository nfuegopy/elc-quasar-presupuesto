<template>
  <q-page padding>
    <div class="q-pa-md q-gutter-md">
      <h3>Carga y Gestión de Productos</h3>

      <q-card class="my-card">
        <q-card-section>
          <div class="text-h6" id="formTitle">
            {{ isEditing ? 'Editar Producto' : 'Cargar Nuevo Producto' }}
          </div>
          <q-form @submit="onSubmitProductForm" class="q-gutter-md q-pt-md">
            <div class="row q-col-gutter-md">
              <div class="col-xs-12 col-sm-6">
                <q-input
                  filled
                  v-model="productForm.articleNumber"
                  label="Número de Artículo"
                  required
                />
              </div>
              <div class="col-xs-12 col-sm-6">
                <q-input filled v-model="productForm.name" label="Nombre" required />
              </div>
              <div class="col-xs-12 col-sm-6">
                <q-select
                  filled
                  v-model="productForm.type"
                  label="Tipo de Maquinaria"
                  :options="[
                    'pala cargadora',
                    'tractor',
                    'montacargas',
                    'apilador',
                    'retro pala',
                    'excavadora',
                  ]"
                  required
                />
              </div>
              <div class="col-xs-12 col-sm-6">
                <q-select
                  filled
                  v-model="productForm.brand"
                  label="Marca"
                  :options="['noblelift', 'michigan', 'koten', 'maximal', 'lugong', 'hanomag']"
                  required
                />
              </div>
              <div class="col-xs-12 col-sm-6">
                <q-select
                  filled
                  v-model="productForm.fuelType"
                  label="Movido a"
                  :options="['Diesel', 'Nafta/Gas', 'Eléctrico', 'Manual']"
                  required
                />
              </div>
              <div class="col-xs-12 col-sm-6">
                <q-input filled v-model="productForm.model" label="Modelo" required />
              </div>
              <div class="col-xs-12 col-sm-6">
                <q-input
                  filled
                  v-model="productForm.price"
                  label="Precio"
                  type="number"
                  step="0.01"
                  required
                />
              </div>
              <div class="col-xs-12 col-sm-6">
                <q-select
                  filled
                  v-model="productForm.currency"
                  label="Moneda"
                  :options="['USD', 'GS']"
                  required
                />
              </div>
              <div class="col-xs-12 col-sm-6">
                <q-file
                  filled
                  v-model="productForm.image"
                  label="Imagen"
                  accept="image/*"
                  clearable
                />
              </div>
              <div class="col-xs-12 col-sm-6">
                <q-file
                  filled
                  v-model="productForm.imageDescription"
                  label="Descripción de la Imagen"
                  accept="image/*"
                  clearable
                />
              </div>
            </div>
            <q-input
              filled
              v-model="productForm.features"
              label="Características"
              type="textarea"
              rows="3"
              class="q-mt-md"
            />

            <div class="q-mt-md q-gutter-sm">
              <q-btn type="submit" color="primary" :disable="loadingForm">
                <span v-if="!loadingForm">{{
                  isEditing ? 'Actualizar Producto' : 'Cargar Producto'
                }}</span>
                <q-spinner v-else color="white" size="1em" class="q-ml-sm" />
              </q-btn>
              <q-btn
                v-if="isEditing"
                label="Cancelar Edición"
                color="secondary"
                @click="resetForm"
              />
            </div>
          </q-form>
        </q-card-section>
      </q-card>

      <q-card class="my-card q-mt-lg">
        <q-card-section>
          <div class="text-h6">Productos Existentes</div>
          <q-table
            :rows="products"
            :columns="columns"
            row-key="id"
            flat
            bordered
            :loading="loadingTable"
            class="q-mt-md"
          >
            <template v-slot:body-cell-image="props">
              <q-td :props="props">
                <q-img
                  v-if="props.row.image_url"
                  :src="props.row.image_url"
                  style="width: 50px; height: 50px; object-fit: cover"
                />
                <span v-else>Sin imagen</span>
              </q-td>
            </template>
            <template v-slot:body-cell-image_description="props">
              <q-td :props="props">
                <q-img
                  v-if="props.row.image_description_url"
                  :src="props.row.image_description_url"
                  style="width: 50px; height: 50px; object-fit: cover"
                />
                <span v-else>Sin imagen</span>
              </q-td>
            </template>
            <template v-slot:body-cell-actions="props">
              <q-td :props="props">
                <q-btn
                  flat
                  dense
                  icon="edit"
                  color="warning"
                  @click="editProduct(props.row)"
                  class="q-mr-sm"
                />
                <q-btn
                  flat
                  dense
                  icon="delete"
                  color="negative"
                  @click="confirmDelete(props.row.id)"
                />
              </q-td>
            </template>
          </q-table>
        </q-card-section>
      </q-card>
    </div>
  </q-page>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useQuasar } from 'quasar'

const $q = useQuasar()

const products = ref([])
const loadingTable = ref(true)
const loadingForm = ref(false)
const isEditing = ref(false)
const editingProductId = ref(null)

const productForm = ref({
  articleNumber: '',
  name: '',
  type: '',
  brand: '',
  fuelType: '',
  model: '',
  price: 0,
  currency: 'USD',
  features: '',
  image: null, // File object for main image
  imageDescription: null, // File object for description image
})

// Columnas para la QTable
const columns = [
  { name: 'articleNumber', label: 'Número de Artículo', field: 'articleNumber', align: 'left' },
  { name: 'name', label: 'Nombre', field: 'name', align: 'left' },
  { name: 'type', label: 'Tipo', field: 'type', align: 'left' },
  { name: 'brand', label: 'Marca', field: 'brand', align: 'left' },
  { name: 'fuelType', label: 'Movido a', field: 'fuelType', align: 'left' },
  { name: 'model', label: 'Modelo', field: 'model', align: 'left' },
  { name: 'price', label: 'Precio', field: 'price', align: 'right' },
  { name: 'currency', label: 'Moneda', field: 'currency', align: 'left' },
  { name: 'features', label: 'Características', field: 'features', align: 'left' },
  { name: 'image', label: 'Imagen', field: 'image_url', align: 'center' },
  {
    name: 'image_description',
    label: 'Descripción de la Imagen',
    field: 'image_description_url',
    align: 'center',
  },
  { name: 'actions', label: 'Acciones', field: 'actions', align: 'center' },
]

// --- Métodos de CRUD y Carga ---
async function loadProducts() {
  loadingTable.value = true
  try {
    const fetchedProducts = await window.electron.loadProducts()
    products.value = fetchedProducts
  } catch (error) {
    $q.notify({
      message: 'Error al cargar productos: ' + error.message,
      color: 'negative',
      icon: 'warning',
    })
  } finally {
    loadingTable.value = false
  }
}

async function onSubmitProductForm() {
  loadingForm.value = true

  // Basic validation (more comprehensive validation would be in rules of q-input/q-select)
  if (productForm.value.price <= 0) {
    $q.notify({
      message: 'El precio debe ser mayor que 0.',
      color: 'negative',
      icon: 'warning',
    })
    loadingForm.value = false
    return
  }
  if (
    !productForm.value.articleNumber ||
    !productForm.value.name ||
    !productForm.value.type ||
    !productForm.value.brand ||
    !productForm.value.model
  ) {
    $q.notify({
      message: 'Los campos Número de Artículo, Nombre, Tipo, Marca y Modelo son obligatorios.',
      color: 'negative',
      icon: 'warning',
    })
    loadingForm.value = false
    return
  }

  try {
    const productData = { ...productForm.value }

    productData.price = parseFloat(productData.price)

    const imageFile =
      productForm.value.image instanceof File
        ? { name: productForm.value.image.name, data: await productForm.value.image.arrayBuffer() }
        : null
    const imageDescriptionFile =
      productForm.value.imageDescription instanceof File
        ? {
            name: productForm.value.imageDescription.name,
            data: await productForm.value.imageDescription.arrayBuffer(),
          }
        : null

    let result
    if (isEditing.value) {
      result = await window.electron.updateProduct(
        editingProductId.value,
        productData,
        imageFile,
        imageDescriptionFile,
      )
    } else {
      result = await window.electron.addProduct(productData, imageFile, imageDescriptionFile)
    }

    if (result.success) {
      $q.notify({
        message: `Producto ${isEditing.value ? 'actualizado' : 'cargado'} exitosamente.`,
        color: 'positive',
        icon: 'check_circle',
      })
      resetForm()
      loadProducts() // Recargar productos después de añadir/actualizar
    } else {
      $q.notify({
        message: 'Error: ' + result.error,
        color: 'negative',
        icon: 'warning',
      })
    }
  } catch (error) {
    $q.notify({
      message: 'Error inesperado: ' + error.message,
      color: 'negative',
      icon: 'error',
    })
  } finally {
    loadingForm.value = false
  }
}

function editProduct(product) {
  isEditing.value = true
  editingProductId.value = product.id
  // Copia profunda de los campos del formulario para evitar modificar el objeto original
  productForm.value = {
    articleNumber: product.articleNumber || '',
    name: product.name || '',
    type: product.type || '',
    brand: product.brand || '',
    fuelType: product.fuelType || '',
    model: product.model || '',
    price: product.price || 0,
    currency: product.currency || 'USD',
    features: product.features || '',
    image: null, // No pre-llenar los inputs de tipo file por seguridad y UX, el usuario debe re-seleccionarlos
    imageDescription: null,
    // Almacenar las URLs existentes para pasarlas al proceso principal al actualizar/eliminar
    image_url: product.image_url || '',
    image_description_url: product.image_description_url || '',
  }
  // Desplazar al inicio de la página para mostrar el formulario
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

function resetForm() {
  isEditing.value = false
  editingProductId.value = null
  productForm.value = {
    articleNumber: '',
    name: '',
    type: '',
    brand: '',
    fuelType: '',
    model: '',
    price: 0,
    currency: 'USD',
    features: '',
    image: null,
    imageDescription: null,
  }
  // Si usas refs en q-form, podrías llamar a formRef.value.resetValidation() aquí.
}

function confirmDelete(productId) {
  $q.dialog({
    title: 'Confirmar Eliminación',
    message: '¿Estás seguro de que deseas eliminar este producto?',
    cancel: true,
    persistent: true,
  }).onOk(async () => {
    await deleteProduct(productId)
  })
}

async function deleteProduct(productId) {
  try {
    const result = await window.electron.deleteProduct(productId)
    if (result.success) {
      $q.notify({
        message: 'Producto eliminado exitosamente.',
        color: 'positive',
        icon: 'delete_forever',
      })
      loadProducts() // Recargar productos después de la eliminación
    } else {
      $q.notify({
        message: 'Error al eliminar producto: ' + result.error,
        color: 'negative',
        icon: 'warning',
      })
    }
  } catch (error) {
    $q.notify({
      message: 'Error inesperado al eliminar: ' + error.message,
      color: 'negative',
      icon: 'error',
    })
  }
}

// Cargar productos al montar el componente (al iniciar la página)
onMounted(() => {
  loadProducts()
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
