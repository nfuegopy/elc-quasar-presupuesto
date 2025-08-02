<template>
  <q-page padding>
    <div class="q-pa-md">
      <h3>Gestión de Usuarios</h3>

      <q-card class="my-card">
        <q-card-section>
          <q-table
            :rows="users"
            :columns="columns"
            row-key="id"
            flat
            bordered
            :loading="loadingTable"
            class="q-mt-md"
          >
            <template v-slot:body-cell-actions="props">
              <q-td :props="props">
                <div v-if="props.row.role === 'seller' || props.row.role === 'bloqueado'">
                  <q-btn
                    :color="props.row.role === 'seller' ? 'negative' : 'positive'"
                    :label="props.row.role === 'seller' ? 'Bloquear' : 'Desbloquear'"
                    @click="toggleUserBlock(props.row)"
                    dense
                    unelevated
                  />
                </div>
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
const users = ref([])
const loadingTable = ref(true)

const columns = [
  { name: 'email', label: 'Correo Electrónico', field: 'email', align: 'left', sortable: true },
  { name: 'role', label: 'Rol', field: 'role', align: 'left', sortable: true },
  { name: 'actions', label: 'Acciones', field: 'actions', align: 'center' },
]

async function loadUsers() {
  loadingTable.value = true
  try {
    const result = await window.electron.getUsers()
    if (result.success) {
      users.value = result.data
    } else {
      throw new Error(result.error)
    }
  } catch (error) {
    $q.notify({
      message: 'Error al cargar usuarios: ' + error.message,
      color: 'negative',
      icon: 'warning',
    })
  } finally {
    loadingTable.value = false
  }
}

async function toggleUserBlock(user) {
  const newRole = user.role === 'seller' ? 'bloqueado' : 'seller'
  const actionText = user.role === 'seller' ? 'bloquear' : 'desbloquear'

  $q.dialog({
    title: 'Confirmar Acción',
    message: `¿Estás seguro de que deseas ${actionText} al usuario "${user.email}"?`,
    cancel: true,
    persistent: true,
  }).onOk(async () => {
    try {
      const result = await window.electron.updateUserRole(user.id, newRole)
      if (result.success) {
        $q.notify({
          message: `Usuario ${actionText}do exitosamente.`,
          color: 'positive',
          icon: 'check_circle',
        })
        loadUsers() // Recargar la lista de usuarios
      } else {
        throw new Error(result.error)
      }
    } catch (error) {
      $q.notify({
        message: `Error al ${actionText} el usuario: ` + error.message,
        color: 'negative',
        icon: 'error',
      })
    }
  })
}

onMounted(() => {
  loadUsers()
})
</script>

<style lang="scss" scoped>
.my-card {
  border-radius: 15px;
  box-shadow: 0 5px 20px rgba(0, 0, 0, 0.05);
}
h3 {
  color: #2c3e50;
  font-weight: 600;
  margin-bottom: 20px;
  font-size: 1.8rem;
  text-align: center;
}
</style>
