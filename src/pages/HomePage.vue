<template>
  <q-page padding>
    <div class="page-container">
      <div class="row q-col-gutter-md">
        <div v-for="card in cards" :key="card.label" class="col-12 col-sm-6 col-md">
          <q-card flat class="panel-card stat-card cursor-pointer" @click="router.push(card.to)">
            <q-card-section class="row items-center no-wrap">
              <q-avatar :color="card.color" text-color="white" :icon="card.icon" rounded />
              <div class="q-ml-md">
                <div class="text-caption text-muted">{{ card.label }}</div>
                <div class="text-h5 text-weight-bold">
                  <q-skeleton v-if="loading" type="text" width="48px" />
                  <template v-else>{{ card.value }}</template>
                </div>
              </div>
            </q-card-section>
          </q-card>
        </div>
      </div>

      <div class="text-subtitle1 text-weight-medium q-mt-lg q-mb-sm">Accesos rápidos</div>
      <div class="row q-col-gutter-md">
        <div v-for="action in actions" :key="action.title" class="col-12 col-md-4">
          <q-card
            flat
            class="panel-card cursor-pointer full-height"
            @click="router.push(action.to)"
          >
            <q-card-section>
              <q-icon :name="action.icon" size="28px" color="primary" />
              <div class="text-weight-medium q-mt-sm">{{ action.title }}</div>
              <div class="text-caption text-muted">{{ action.text }}</div>
            </q-card-section>
          </q-card>
        </div>
      </div>
    </div>
  </q-page>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { isBenefit } from 'src/utils/productKinds'

const router = useRouter()
const loading = ref(true)
const products = ref([])
const users = ref([])

const machinery = computed(() => products.value.filter((p) => !isBenefit(p)))

const cards = computed(() => [
  {
    label: 'Productos',
    value: machinery.value.length,
    icon: 'inventory_2',
    color: 'primary',
    to: '/dashboard',
  },
  {
    label: 'Beneficios',
    value: products.value.length - machinery.value.length,
    icon: 'card_giftcard',
    color: 'purple',
    to: '/dashboard?tab=beneficios',
  },
  {
    label: 'Sin imagen',
    value: machinery.value.filter((p) => !p.image_url).length,
    icon: 'image_not_supported',
    color: 'orange',
    to: '/dashboard',
  },
  {
    label: 'Vendedores',
    value: users.value.filter((u) => u.role === 'seller').length,
    icon: 'badge',
    color: 'teal',
    to: '/users',
  },
  {
    label: 'Administradores',
    value: users.value.filter((u) => u.role === 'admin').length,
    icon: 'admin_panel_settings',
    color: 'indigo',
    to: '/users',
  },
])

const actions = [
  {
    title: 'Actualizar precios con CSV',
    text: 'Descarga la lista, edítala en Excel y súbela de nuevo.',
    icon: 'upload_file',
    to: '/dashboard',
  },
  {
    title: 'Crear usuario',
    text: 'El vendedor recibe un correo para definir su contraseña.',
    icon: 'person_add',
    to: '/users',
  },
  {
    title: 'Parámetros',
    text: 'Descuento máximo de los vendedores e interés.',
    icon: 'tune',
    to: '/interes',
  },
]

onMounted(async () => {
  try {
    const [productList, usersResult] = await Promise.all([
      window.electron.loadProducts(),
      window.electron.getUsers(),
    ])
    products.value = productList
    users.value = usersResult.success ? usersResult.data : []
  } finally {
    loading.value = false
  }
})
</script>

<style lang="scss" scoped>
.stat-card {
  transition: box-shadow 0.15s ease;

  &:hover {
    box-shadow: 0 4px 14px rgba(15, 23, 42, 0.08);
  }
}
</style>
