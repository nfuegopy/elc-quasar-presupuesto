// Acceso a Firebase del panel de administración.
//
// Antes estas funciones vivían en el proceso principal de Electron (IPC). Se
// pasaron acá con los mismos nombres y respuestas para que el panel funcione
// igual como página web y dentro de Electron (su ventana también es un
// navegador). Usa el SDK web de Firebase inicializado en boot/firebase.js.
import { initializeApp } from 'firebase/app'
import {
  signInWithEmailAndPassword,
  signOut,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  initializeAuth,
  inMemoryPersistence,
} from 'firebase/auth'
import {
  collection,
  getDocs,
  addDoc,
  doc,
  getDoc,
  updateDoc,
  deleteDoc,
  setDoc,
  writeBatch,
} from 'firebase/firestore'
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage'
import { auth, db, storage, firebaseConfig } from 'boot/firebase'

// App secundaria solo para crear cuentas: createUserWithEmailAndPassword inicia
// sesión con el usuario nuevo, y así no se cierra la sesión del administrador.
// En memoria para que esa sesión no quede guardada en el navegador.
let provisioningAuth = null
function getProvisioningAuth() {
  if (!provisioningAuth) {
    const provisioningApp = initializeApp(firebaseConfig, 'provisioning')
    provisioningAuth = initializeAuth(provisioningApp, { persistence: inMemoryPersistence })
  }
  return provisioningAuth
}

// Usuario actual una vez que Firebase terminó de restaurar la sesión
const currentUser = () =>
  new Promise((resolve) => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      unsubscribe()
      resolve(user)
    })
  })

async function isAdmin(uid) {
  const snapshot = await getDoc(doc(db, 'users', uid))
  return snapshot.exists() && snapshot.data().role === 'admin'
}

// Contraseña aleatoria descartable: el usuario define la suya desde el correo
function randomPassword() {
  const bytes = crypto.getRandomValues(new Uint8Array(24))
  return btoa(String.fromCharCode(...bytes))
}

async function uploadImage(file) {
  const storageRef = ref(storage, `products/${Date.now()}_${file.name}`)
  await uploadBytes(storageRef, new Uint8Array(file.data))
  return getDownloadURL(storageRef)
}

const deleteImage = (url) => deleteObject(ref(storage, url.split('?')[0]))

const productFields = (data) => ({
  articleNumber: data.articleNumber,
  name: data.name,
  type: data.type,
  brand: data.brand,
  fuelType: data.fuelType,
  model: data.model,
  price: data.price,
  currency: data.currency,
  features: data.features,
})

const discountConfigRef = () => doc(db, 'config', 'descuentos')

export default {
  // --- Sesión ---
  async login(email, password) {
    try {
      const { user } = await signInWithEmailAndPassword(auth, email, password)
      const snapshot = await getDoc(doc(db, 'users', user.uid))
      if (!snapshot.exists()) throw new Error('Usuario no encontrado en la base de datos.')
      if (snapshot.data().role !== 'admin') {
        throw new Error('Acceso denegado: Solo los administradores pueden iniciar sesión.')
      }
      return { success: true }
    } catch (error) {
      // Sin rol admin no puede quedar la sesión abierta
      await signOut(auth).catch(() => {})
      return { success: false, error: error.message }
    }
  },

  async logout() {
    await signOut(auth)
    return { success: true }
  },

  // true solo si hay sesión y el usuario es administrador
  async checkAuthStatus() {
    const user = await currentUser()
    if (!user) return false
    try {
      if (await isAdmin(user.uid)) return true
    } catch {
      // sin permiso para leer el perfil: se trata como no autorizado
    }
    await signOut(auth).catch(() => {})
    return false
  },

  async getCurrentUserId() {
    return (await currentUser())?.uid || null
  },

  async resetPassword(email) {
    try {
      await sendPasswordResetEmail(auth, email)
      return { success: true }
    } catch (error) {
      let errorMessage = error.message
      if (error.code === 'auth/user-not-found') {
        errorMessage = 'No se encontró ningún usuario con ese correo electrónico.'
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'El formato del correo electrónico es inválido.'
      }
      return { success: false, error: errorMessage }
    }
  },

  // --- Productos ---
  async loadProducts() {
    const snapshot = await getDocs(collection(db, 'products'))
    return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }))
  },

  async getProduct(productId) {
    try {
      const snapshot = await getDoc(doc(db, 'products', productId))
      return snapshot.exists()
        ? { success: true, data: { id: snapshot.id, ...snapshot.data() } }
        : { success: false, error: 'Producto no encontrado' }
    } catch (error) {
      return { success: false, error: error.message }
    }
  },

  // imageFile / imageDescriptionFile: { name, data: ArrayBuffer } o null
  async addProduct(productData, imageFile, imageDescriptionFile) {
    try {
      const docRef = await addDoc(collection(db, 'products'), {
        ...productFields(productData),
        image_url: imageFile ? await uploadImage(imageFile) : '',
        image_description_url: imageDescriptionFile
          ? await uploadImage(imageDescriptionFile)
          : '',
        created_at: new Date().toISOString(),
      })
      return { success: true, id: docRef.id }
    } catch (error) {
      return { success: false, error: error.message }
    }
  },

  async updateProduct(productId, productData, imageFile, imageDescriptionFile) {
    try {
      let imageUrl = productData.image_url || ''
      let imageDescriptionUrl = productData.image_description_url || ''
      if (imageFile) {
        imageUrl = await uploadImage(imageFile)
        if (productData.image_url) await deleteImage(productData.image_url)
      }
      if (imageDescriptionFile) {
        imageDescriptionUrl = await uploadImage(imageDescriptionFile)
        if (productData.image_description_url) {
          await deleteImage(productData.image_description_url)
        }
      }
      await updateDoc(doc(db, 'products', productId), {
        ...productFields(productData),
        image_url: imageUrl,
        image_description_url: imageDescriptionUrl,
      })
      return { success: true }
    } catch (error) {
      return { success: false, error: error.message }
    }
  },

  async deleteProduct(productId) {
    try {
      const snapshot = await getDoc(doc(db, 'products', productId))
      const product = snapshot.data()
      if (product.image_url) await deleteImage(product.image_url)
      if (product.image_description_url) await deleteImage(product.image_description_url)
      await deleteDoc(doc(db, 'products', productId))
      return { success: true }
    } catch (error) {
      return { success: false, error: error.message }
    }
  },

  // Alta / actualización masiva desde CSV (no toca imágenes)
  // rows: [{ id?, data }] -> con id se actualizan solo los campos enviados, sin id se crea
  async bulkUpsertProducts(rows) {
    try {
      let updated = 0
      let created = 0
      // Firestore admite hasta 500 operaciones por batch
      for (let i = 0; i < rows.length; i += 400) {
        const batch = writeBatch(db)
        for (const row of rows.slice(i, i + 400)) {
          if (row.id) {
            batch.update(doc(db, 'products', row.id), row.data)
            updated++
          } else {
            batch.set(doc(collection(db, 'products')), {
              articleNumber: '',
              name: '',
              type: '',
              brand: '',
              fuelType: '',
              model: '',
              price: 0,
              currency: 'USD',
              features: '',
              ...row.data,
              image_url: '',
              image_description_url: '',
              created_at: new Date().toISOString(),
            })
            created++
          }
        }
        await batch.commit()
      }
      return { success: true, updated, created }
    } catch (error) {
      return { success: false, error: error.message }
    }
  },

  // --- Usuarios ---
  async getUsers() {
    try {
      const snapshot = await getDocs(collection(db, 'users'))
      return { success: true, data: snapshot.docs.map((d) => ({ id: d.id, ...d.data() })) }
    } catch (error) {
      return { success: false, error: error.message }
    }
  },

  // Crea un usuario (vendedor o admin) y le envía el enlace para definir su contraseña
  async createAppUser({ email, nombre, apellido, role }) {
    const newAuth = getProvisioningAuth()
    try {
      const { user } = await createUserWithEmailAndPassword(newAuth, email, randomPassword())
      await signOut(newAuth)
      // El perfil (con su rol) lo escribe la sesión del administrador: las reglas
      // de Firestore no dejan que un usuario se asigne su propio rol
      await setDoc(doc(db, 'users', user.uid), {
        email: user.email,
        nombre,
        apellido,
        role,
        created_at: new Date().toISOString(),
      })
      await sendPasswordResetEmail(auth, email)
      return { success: true, uid: user.uid }
    } catch (error) {
      await signOut(newAuth).catch(() => {})
      let errorMessage = error.message
      if (error.code === 'auth/email-already-in-use') {
        errorMessage = 'El correo electrónico ya está en uso.'
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'El formato del correo electrónico es inválido.'
      }
      return { success: false, error: errorMessage }
    }
  },

  // Estados de usuario: activo (role = admin/seller), bloqueado o eliminado.
  // Se guardan en "role" porque la app móvil solo deja entrar a role === 'seller' y el
  // panel solo a role === 'admin'. "eliminado" es un borrado lógico.
  async setUserStatus(userId, status) {
    try {
      if (userId === auth.currentUser?.uid) {
        throw new Error('No puedes bloquear ni eliminar tu propio usuario.')
      }
      const userDocRef = doc(db, 'users', userId)
      const snapshot = await getDoc(userDocRef)
      if (!snapshot.exists()) throw new Error('Usuario no encontrado.')
      const user = snapshot.data()
      const activeRole = ['admin', 'seller'].includes(user.role)
        ? user.role
        : user.previous_role || 'seller'

      let changes
      if (status === 'activo') {
        changes = { role: activeRole }
      } else if (status === 'bloqueado') {
        changes = { role: 'bloqueado', previous_role: activeRole }
      } else if (status === 'eliminado') {
        changes = {
          role: 'eliminado',
          previous_role: activeRole,
          deleted_at: new Date().toISOString(),
        }
      } else {
        throw new Error(`Estado inválido: ${status}`)
      }
      await updateDoc(userDocRef, changes)
      return { success: true }
    } catch (error) {
      return { success: false, error: error.message }
    }
  },

  // --- Parámetros ---
  async loadInterest() {
    try {
      const snapshot = await getDocs(collection(db, 'interes'))
      if (snapshot.empty) return { success: true, data: null }
      const first = snapshot.docs[0]
      return { success: true, data: { id: first.id, ...first.data() } }
    } catch (error) {
      return { success: false, error: error.message }
    }
  },

  // Actualiza (o crea) la tasa; `margin` (margen por cargos bancarios) es opcional
  async updateInterest(docId, value, margin) {
    try {
      const fields = { interes: value }
      if (margin !== undefined) fields.margen_cargos = margin
      if (docId) {
        await updateDoc(doc(db, 'interes', docId), fields)
        return { success: true, id: docId }
      }
      const newDocRef = await addDoc(collection(db, 'interes'), {
        ...fields,
        created_at: new Date().toISOString(),
      })
      return { success: true, id: newDocRef.id }
    } catch (error) {
      return { success: false, error: error.message }
    }
  },

  async loadDiscountConfig() {
    try {
      const snapshot = await getDoc(discountConfigRef())
      return { success: true, data: snapshot.exists() ? snapshot.data() : null }
    } catch (error) {
      return { success: false, error: error.message }
    }
  },

  async updateMaxDiscount(value) {
    try {
      const percentage = Number(value)
      if (!Number.isFinite(percentage) || percentage < 0 || percentage > 100) {
        return { success: false, error: 'El porcentaje debe estar entre 0 y 100.' }
      }
      const data = {
        max_discount_percentage: percentage,
        updated_at: new Date().toISOString(),
        updated_by: auth.currentUser?.email || null,
      }
      await setDoc(discountConfigRef(), data, { merge: true })
      return { success: true, data }
    } catch (error) {
      return { success: false, error: error.message }
    }
  },
}
