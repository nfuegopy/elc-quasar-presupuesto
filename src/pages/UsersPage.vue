<template>
  <q-page padding>
    <div class="page-container q-gutter-y-md">
      <div class="row items-center q-col-gutter-sm">
        <div class="col-12 col-md">
          <q-input
            v-model="search"
            dense
            outlined
            bg-color="white"
            placeholder="Buscar usuario"
            clearable
          >
            <template #prepend><q-icon name="search" /></template>
          </q-input>
        </div>
        <div class="col-12 col-md-auto row justify-end">
          <q-btn
            unelevated
            no-caps
            color="primary"
            icon="person_add"
            label="Nuevo usuario"
            @click="openCreate"
          />
        </div>
      </div>

      <q-card flat class="panel-card">
        <q-table
          :rows="users"
          :columns="columns"
          row-key="id"
          flat
          :filter="search"
          :loading="loadingTable"
          :pagination="{ rowsPerPage: 25, sortBy: 'name' }"
          no-data-label="No hay usuarios"
        >
          <template #body-cell-name="props">
            <q-td :props="props">
              <div class="text-weight-medium">{{ fullName(props.row) || '—' }}</div>
              <div class="text-caption text-muted">{{ props.row.email }}</div>
            </q-td>
          </template>
          <template #body-cell-role="props">
            <q-td :props="props">
              <q-chip dense :color="roleInfo(props.row.role).color" text-color="white">
                {{ roleInfo(props.row.role).label }}
              </q-chip>
            </q-td>
          </template>
          <template #body-cell-actions="props">
            <q-td :props="props">
              <q-btn
                flat
                round
                dense
                icon="forward_to_inbox"
                color="primary"
                @click="resendLink(props.row)"
              >
                <q-tooltip>Reenviar enlace para definir contraseña</q-tooltip>
              </q-btn>
              <template v-if="props.row.id !== currentUserId">
                <q-btn
                  flat
                  round
                  dense
                  :icon="props.row.role === 'bloqueado' ? 'lock_open' : 'block'"
                  :color="props.row.role === 'bloqueado' ? 'positive' : 'warning'"
                  @click="
                    changeStatus(props.row, props.row.role === 'bloqueado' ? 'activo' : 'bloqueado')
                  "
                >
                  <q-tooltip>{{
                    props.row.role === 'bloqueado' ? 'Desbloquear' : 'Bloquear'
                  }}</q-tooltip>
                </q-btn>
                <q-btn
                  flat
                  round
                  dense
                  icon="delete"
                  color="negative"
                  @click="changeStatus(props.row, 'eliminado')"
                >
                  <q-tooltip>Eliminar</q-tooltip>
                </q-btn>
              </template>
              <q-chip v-else dense outline color="primary" label="Tú" />
            </q-td>
          </template>
        </q-table>
      </q-card>
    </div>

    <q-dialog v-model="createOpen" persistent>
      <q-card style="width: 480px; max-width: 95vw">
        <q-card-section class="row items-center">
          <div class="text-h6">Nuevo usuario</div>
          <q-space />
          <q-btn flat round dense icon="close" v-close-popup :disable="creating" />
        </q-card-section>

        <q-form @submit="createUser">
          <q-card-section class="q-pt-none q-gutter-y-sm">
            <div class="row q-col-gutter-sm">
              <q-input
                class="col-6"
                outlined
                v-model="form.nombre"
                label="Nombre"
                :rules="[required]"
              />
              <q-input
                class="col-6"
                outlined
                v-model="form.apellido"
                label="Apellido"
                :rules="[required]"
              />
            </div>
            <q-btn-toggle
              v-model="form.role"
              spread
              no-caps
              unelevated
              toggle-color="primary"
              color="grey-2"
              text-color="grey-9"
              class="q-mb-md"
              :options="[
                { label: 'Vendedor (app móvil)', value: 'seller', icon: 'smartphone' },
                { label: 'Administrador (panel)', value: 'admin', icon: 'admin_panel_settings' },
              ]"
            />

            <!-- Por defecto correo corporativo: solo se escribe el usuario -->
            <q-input
              v-if="!form.external"
              outlined
              v-model="form.emailUser"
              label="Usuario del correo"
              :rules="[
                required,
                (v) => /^[a-zA-Z0-9._%+-]+$/.test(v.trim()) || 'Solo letras, números y . _ - +',
              ]"
            >
              <template #append>
                <span class="text-body2 text-grey-8">@{{ COMPANY_DOMAIN }}</span>
              </template>
            </q-input>
            <q-input
              v-else
              outlined
              v-model="form.email"
              type="email"
              label="Correo externo (ej. nombre@gmail.com)"
              :rules="[required, (v) => EMAIL_RE.test(v.trim()) || 'Correo inválido']"
            />
            <div class="row justify-end">
              <q-btn
                flat
                dense
                no-caps
                size="sm"
                color="primary"
                :icon="form.external ? 'business' : 'alternate_email'"
                :label="
                  form.external
                    ? `Usar correo @${COMPANY_DOMAIN}`
                    : 'Usar correo externo (Gmail u otro)'
                "
                @click="form.external = !form.external"
              />
            </div>
            <q-banner rounded dense class="bg-blue-1 text-blue-10 q-mt-sm">
              El usuario recibirá un correo con un enlace para definir su contraseña. Después podrá
              ingresar y, si la olvida, restablecerla desde el login.
            </q-banner>
          </q-card-section>

          <q-card-actions align="right" class="q-pa-md">
            <q-btn flat no-caps label="Cancelar" v-close-popup :disable="creating" />
            <q-btn
              unelevated
              no-caps
              color="primary"
              type="submit"
              label="Crear y enviar correo"
              :loading="creating"
            />
          </q-card-actions>
        </q-form>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useQuasar } from 'quasar'

const $q = useQuasar()
const users = ref([])
const search = ref('')
const loadingTable = ref(true)
const currentUserId = ref(null)

const createOpen = ref(false)
const creating = ref(false)
// Dominio corporativo que usan la mayoría de los usuarios
const COMPANY_DOMAIN = 'enginepy.com'
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const emptyForm = () => ({
  nombre: '',
  apellido: '',
  emailUser: '',
  email: '',
  external: false,
  role: 'seller',
})
const form = ref(emptyForm())
const fullEmail = () =>
  (form.value.external ? form.value.email : `${form.value.emailUser}@${COMPANY_DOMAIN}`)
    .trim()
    .toLowerCase()

const required = (v) => !!(v && v.trim()) || 'Campo obligatorio'
const fullName = (u) => [u.nombre, u.apellido].filter(Boolean).join(' ')

const ROLES = {
  admin: { label: 'Administrador', color: 'primary' },
  seller: { label: 'Vendedor', color: 'teal' },
  bloqueado: { label: 'Bloqueado', color: 'grey-6' },
}
const roleInfo = (role) => ROLES[role] || { label: role || 'Sin rol', color: 'orange' }

const columns = [
  {
    name: 'name',
    label: 'Usuario',
    field: (row) => `${fullName(row)} ${row.email}`,
    align: 'left',
    sortable: true,
  },
  { name: 'role', label: 'Rol', field: 'role', align: 'left', sortable: true },
  {
    name: 'created_at',
    label: 'Alta',
    field: 'created_at',
    align: 'left',
    sortable: true,
    format: (v) => (v ? new Date(v).toLocaleDateString('es-PY') : '—'),
  },
  { name: 'actions', label: '', field: 'id', align: 'right' },
]

async function loadUsers() {
  loadingTable.value = true
  try {
    const result = await window.electron.getUsers()
    if (!result.success) throw new Error(result.error)
    // Los eliminados (borrado lógico) no se muestran
    users.value = result.data.filter((u) => u.role !== 'eliminado')
  } catch (error) {
    $q.notify({ type: 'negative', message: 'Error al cargar usuarios: ' + error.message })
  } finally {
    loadingTable.value = false
  }
}

function openCreate() {
  form.value = emptyForm()
  createOpen.value = true
}

async function createUser() {
  creating.value = true
  try {
    const payload = {
      nombre: form.value.nombre.trim(),
      apellido: form.value.apellido.trim(),
      email: fullEmail(),
      role: form.value.role,
    }
    const result = await window.electron.createAppUser(payload)
    if (!result.success) throw new Error(result.error)
    $q.notify({
      type: 'positive',
      message: `Usuario creado. Se envió el enlace a ${payload.email}.`,
    })
    createOpen.value = false
    loadUsers()
  } catch (error) {
    $q.notify({ type: 'negative', message: 'No se pudo crear el usuario: ' + error.message })
  } finally {
    creating.value = false
  }
}

async function resendLink(user) {
  const result = await window.electron.resetPassword(user.email)
  if (result.success) {
    $q.notify({ type: 'positive', message: `Enlace enviado a ${user.email}.` })
  } else {
    $q.notify({ type: 'negative', message: 'Error al enviar el enlace: ' + result.error })
  }
}

const STATUS_ACTIONS = {
  activo: {
    title: 'Desbloquear usuario',
    verb: 'desbloquear',
    done: 'desbloqueado',
    color: 'positive',
  },
  bloqueado: {
    title: 'Bloquear usuario',
    verb: 'bloquear',
    done: 'bloqueado',
    color: 'warning',
    detail: 'No podrá ingresar hasta que lo desbloquees.',
  },
  eliminado: {
    title: 'Eliminar usuario',
    verb: 'eliminar',
    done: 'eliminado',
    color: 'negative',
    detail: 'Dejará de aparecer en el listado y no podrá ingresar. Sus presupuestos se conservan.',
  },
}

function changeStatus(user, status) {
  const action = STATUS_ACTIONS[status]
  $q.dialog({
    title: action.title,
    message: `¿Seguro que quieres ${action.verb} a "${user.email}"? ${action.detail || ''}`,
    cancel: { label: 'Cancelar', flat: true },
    ok: { label: action.title.split(' ')[0], color: action.color, unelevated: true },
  }).onOk(async () => {
    const result = await window.electron.setUserStatus(user.id, status)
    if (result.success) {
      $q.notify({ type: 'positive', message: `Usuario ${action.done}.` })
      loadUsers()
    } else {
      $q.notify({ type: 'negative', message: 'Error: ' + result.error })
    }
  })
}

onMounted(async () => {
  currentUserId.value = await window.electron.getCurrentUserId()
  loadUsers()
})
</script>
