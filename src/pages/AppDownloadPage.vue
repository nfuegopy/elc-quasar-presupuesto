<template>
  <q-page padding>
    <div class="page-container q-gutter-y-md" style="max-width: 520px">
      <q-card flat class="panel-card">
        <q-card-section>
          <div class="text-subtitle1 text-weight-medium">App para vendedores</div>
          <div class="text-caption text-muted">
            Descargá el instalador (APK) y pasáselo a los vendedores. Para instalarlo, en el
            celular hay que permitir "instalar apps de origen desconocido".
          </div>
        </q-card-section>
        <q-card-section class="q-pt-none">
          <q-skeleton v-if="loading" type="text" width="60%" />
          <div v-else-if="apk">
            <div class="text-body1">Versión {{ apk.version || 'sin número' }}</div>
            <div class="text-caption text-muted">
              {{ formatSize(apk.size) }} · subida el {{ formatDate(apk.updated) }}
              <span v-if="apk.uploadedBy">por {{ apk.uploadedBy }}</span>
            </div>
          </div>
          <div v-else class="text-caption text-orange-9">Todavía no se subió ningún APK.</div>
        </q-card-section>
        <q-card-actions align="right" class="q-pa-md">
          <q-btn
            unelevated
            no-caps
            color="primary"
            icon="download"
            label="Descargar APK"
            :disable="!apk"
            :href="apk?.url"
          />
        </q-card-actions>
      </q-card>

      <q-card flat class="panel-card">
        <q-card-section>
          <div class="text-subtitle1 text-weight-medium">Subir nueva versión</div>
          <div class="text-caption text-muted">Reemplaza al APK actual.</div>
        </q-card-section>
        <q-form @submit="upload">
          <q-card-section class="q-pt-none q-gutter-y-sm">
            <q-file
              outlined
              v-model="file"
              accept=".apk"
              label="Archivo APK"
              :rules="[(v) => !!v || 'Elegí el archivo']"
            >
              <template #prepend><q-icon name="android" /></template>
            </q-file>
            <q-input
              outlined
              v-model.trim="version"
              label="Versión (ej. 7.2.0)"
              :rules="[(v) => !!v || 'Ingresá la versión']"
            />
            <q-linear-progress v-if="uploading" :value="progress" rounded size="8px" />
          </q-card-section>
          <q-card-actions align="right" class="q-pa-md">
            <q-btn
              unelevated
              no-caps
              color="primary"
              type="submit"
              icon="upload"
              label="Subir"
              :loading="uploading"
            />
          </q-card-actions>
        </q-form>
      </q-card>
    </div>
  </q-page>
</template>

<script setup>
import api from 'src/services/api'
import { ref, onMounted } from 'vue'
import { useQuasar } from 'quasar'

const $q = useQuasar()

const apk = ref(null)
const loading = ref(true)
const file = ref(null)
const version = ref('')
const uploading = ref(false)
const progress = ref(0)

const formatSize = (bytes) => `${(bytes / 1024 / 1024).toFixed(1)} MB`
const formatDate = (iso) => new Date(iso).toLocaleString('es-PY')

async function loadApk() {
  loading.value = true
  const result = await api.getApkInfo()
  if (result.success) {
    apk.value = result.data
  } else {
    $q.notify({ message: 'Error al cargar el APK: ' + result.error, color: 'negative' })
  }
  loading.value = false
}

async function upload() {
  uploading.value = true
  progress.value = 0
  const result = await api.uploadApk(file.value, version.value, (p) => (progress.value = p))
  uploading.value = false
  if (result.success) {
    $q.notify({ message: 'APK subido.', color: 'positive', icon: 'check_circle' })
    file.value = null
    version.value = ''
    await loadApk()
  } else {
    $q.notify({ message: 'Error al subir el APK: ' + result.error, color: 'negative' })
  }
}

onMounted(loadApk)
</script>
