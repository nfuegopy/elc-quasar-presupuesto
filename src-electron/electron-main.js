import { app, BrowserWindow, ipcMain } from 'electron' //
import path from 'node:path' //
import os from 'node:os' //
import { fileURLToPath } from 'node:url' //
import crypto from 'node:crypto'

// --- COMIENZO DE CÓDIGO AÑADIDO PARA LA INICIALIZACIÓN DE FIREBASE EN EL PROCESO PRINCIPAL ---
import { initializeApp } from 'firebase/app' //
import {
  //
  getAuth, //
  signInWithEmailAndPassword, //
  signOut, //
  createUserWithEmailAndPassword,
  sendPasswordResetEmail, //
} from 'firebase/auth' //
import {
  //
  getFirestore, //
  collection, //
  getDocs, //
  addDoc, //
  doc, //
  getDoc, //
  updateDoc, //
  deleteDoc, //
  setDoc, //
  writeBatch,
} from 'firebase/firestore' //
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage' //

// Configuración de Firebase usando variables de entorno para el proceso principal (sin prefijo VITE_)
const firebaseConfig = {
  //
  apiKey: process.env.FIREBASE_API_KEY, //
  authDomain: process.env.FIREBASE_AUTH_DOMAIN, //
  projectId: process.env.FIREBASE_PROJECT_ID, //
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET, //
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID, //
  appId: process.env.FIREBASE_APP_ID, //
  measurementId: process.env.FIREBASE_MEASUREMENT_ID, //
}

// Inicializar Firebase para el proceso principal
const firebaseApp = initializeApp(firebaseConfig) //
const auth = getAuth(firebaseApp) //
const db = getFirestore(firebaseApp) //
const storage = getStorage(firebaseApp) //

// App secundaria solo para crear cuentas: createUserWithEmailAndPassword inicia sesión
// con el usuario nuevo, y así no se cierra la sesión del administrador en la app principal.
const provisioningApp = initializeApp(firebaseConfig, 'provisioning')
const provisioningAuth = getAuth(provisioningApp)
const provisioningDb = getFirestore(provisioningApp)
// --- FIN DEL CÓDIGO AÑADIDO PARA FIREBASE ---

// needed in case process is undefined under Linux
const platform = process.platform || os.platform() //

const currentDir = fileURLToPath(new URL('.', import.meta.url)) //

let mainWindow //

async function createWindow() {
  //
  /**
   * Initial window options
   */
  mainWindow = new BrowserWindow({
    //
    icon: path.resolve(currentDir, 'icons/icon.png'), // tray icon
    width: 1000, //
    height: 600, //
    useContentSize: true, //
    webPreferences: {
      //
      contextIsolation: true, //
      // More info: https://v2.quasar.dev/quasar-cli-vite/developing-electron-apps/electron-preload-script
      preload: path.resolve(
        //
        currentDir, //
        path.join(
          //
          process.env.QUASAR_ELECTRON_PRELOAD_FOLDER, //
          'electron-preload' + process.env.QUASAR_ELECTRON_PRELOAD_EXTENSION, //
        ),
      ),
    },
  })

  if (process.env.DEV) {
    //
    await mainWindow.loadURL(process.env.APP_URL) //
  } else {
    await mainWindow.loadFile('index.html') //
  }

  if (process.env.DEBUGGING) {
    //
    // if on DEV or Production with debug enabled
    mainWindow.webContents.openDevTools() //
  } else {
    // we're on production; no access to devtools pls
    mainWindow.webContents.on('devtools-opened', () => {
      //
      mainWindow.webContents.closeDevTools() //
    })
  }

  mainWindow.on('closed', () => {
    //
    mainWindow = null //
  })
}

app.whenReady().then(createWindow) //

app.on('window-all-closed', () => {
  //
  if (platform !== 'darwin') {
    //
    app.quit() //
  }
})

app.on('activate', () => {
  //
  if (mainWindow === null) {
    //
    createWindow() //
  }
})

// --- COMIENZO DE MANEJADORES IPC MAIN COPIADOS DE TU ANTIGUO main.js ---

// Obtener todos los usuarios
ipcMain.handle('get-users', async () => {
  try {
    const usersCollection = collection(db, 'users')
    const userSnapshot = await getDocs(usersCollection)
    const usersList = userSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }))
    return { success: true, data: usersList }
  } catch (error) {
    return { success: false, error: error.message }
  }
})

// Estados de usuario: activo (role = admin/seller), bloqueado o eliminado.
// Se guardan en "role" porque la app móvil solo deja entrar a role === 'seller' y el panel
// solo a role === 'admin'; así bloqueado/eliminado quedan sin acceso sin tocar la app.
// "eliminado" es un borrado lógico: el documento se conserva pero no se lista.
ipcMain.handle('set-user-status', async (event, userId, status) => {
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
})

ipcMain.handle('get-current-user-id', async () => auth.currentUser?.uid || null)

// Manejar login
ipcMain.handle('login', async (event, email, password) => {
  //
  try {
    //
    const userCredential = await signInWithEmailAndPassword(auth, email, password) //
    const user = userCredential.user //
    console.log('UID del usuario autenticado:', user.uid) //
    const userDoc = await getDoc(doc(db, 'users', user.uid)) //
    if (userDoc.exists()) {
      //
      console.log('Datos del usuario en Firestore:', userDoc.data()) //
      if (userDoc.data().role === 'admin') {
        //
        return { success: true } //
      } else {
        throw new Error('Acceso denegado: Solo los administradores pueden iniciar sesión.') //
      }
    } else {
      throw new Error('Usuario no encontrado en la base de datos.') //
    }
  } catch (error) {
    //
    return { success: false, error: error.message } //
  }
})

// Manejar logout
ipcMain.handle('logout', async () => {
  //
  await signOut(auth) //
  return { success: true } //
})

// Cargar productos
ipcMain.handle('load-products', async () => {
  //
  const snapshot = await getDocs(collection(db, 'products')) //
  const products = [] //
  snapshot.forEach((doc) => {
    //
    products.push({ id: doc.id, ...doc.data() }) //
  })
  return products //
})

// Obtener un producto
ipcMain.handle('get-product', async (event, productId) => {
  //
  try {
    //
    const productDoc = await getDoc(doc(db, 'products', productId)) //
    if (productDoc.exists()) {
      //
      return { success: true, data: { id: productDoc.id, ...productDoc.data() } } //
    } else {
      return { success: false, error: 'Producto no encontrado' } //
    }
  } catch (error) {
    //
    return { success: false, error: error.message } //
  }
})

// Añadir producto
ipcMain.handle('add-product', async (event, productData, imageFile, imageDescriptionFile) => {
  //
  try {
    //
    let imageUrl = '' //
    let imageDescriptionUrl = '' //
    if (imageFile) {
      //
      const imageBuffer = Buffer.from(imageFile.data) //
      const storageRef = ref(storage, `products/${Date.now()}_${imageFile.name}`) //
      await uploadBytes(storageRef, imageBuffer) //
      imageUrl = await getDownloadURL(storageRef) //
    }
    if (imageDescriptionFile) {
      //
      const imageDescriptionBuffer = Buffer.from(imageDescriptionFile.data) //
      const storageRef = ref(storage, `products/${Date.now()}_${imageDescriptionFile.name}`) //
      await uploadBytes(storageRef, imageDescriptionBuffer) //
      imageDescriptionUrl = await getDownloadURL(storageRef) //
    }
    const docRef = await addDoc(collection(db, 'products'), {
      //
      articleNumber: productData.articleNumber, //
      name: productData.name, //
      type: productData.type, //
      brand: productData.brand, //
      fuelType: productData.fuelType, //
      model: productData.model, //
      price: productData.price, //
      currency: productData.currency, //
      features: productData.features, //
      image_url: imageUrl, //
      image_description_url: imageDescriptionUrl, //
      created_at: new Date().toISOString(), //
    })
    return { success: true, id: docRef.id } //
  } catch (error) {
    //
    return { success: false, error: error.message } //
  }
})

// Actualizar producto
ipcMain.handle(
  //
  'update-product', //
  async (event, productId, productData, imageFile, imageDescriptionFile) => {
    //
    try {
      //
      let imageUrl = productData.image_url || '' //
      let imageDescriptionUrl = productData.image_description_url || '' //
      if (imageFile) {
        //
        const imageBuffer = Buffer.from(imageFile.data) //
        const storageRef = ref(storage, `products/${Date.now()}_${imageFile.name}`) //
        await uploadBytes(storageRef, imageBuffer) //
        imageUrl = await getDownloadURL(storageRef) //
        // Eliminar la imagen anterior si existe
        if (productData.image_url) {
          //
          const oldImageRef = ref(storage, productData.image_url.split('?')[0]) //
          await deleteObject(oldImageRef) //
        }
      }
      if (imageDescriptionFile) {
        //
        const imageDescriptionBuffer = Buffer.from(imageDescriptionFile.data) //
        const storageRef = ref(storage, `products/${Date.now()}_${imageDescriptionFile.name}`) //
        await uploadBytes(storageRef, imageDescriptionBuffer) //
        imageDescriptionUrl = await getDownloadURL(storageRef) //
        // Eliminar la imagen anterior si existe
        if (productData.image_description_url) {
          //
          const oldImageRef = ref(storage, productData.image_description_url.split('?')[0]) //
          await deleteObject(oldImageRef) //
        }
      }
      await updateDoc(doc(db, 'products', productId), {
        //
        articleNumber: productData.articleNumber, //
        name: productData.name, //
        type: productData.type, //
        brand: productData.brand, //
        fuelType: productData.fuelType, //
        model: productData.model, //
        price: productData.price, //
        currency: productData.currency, //
        features: productData.features, //
        image_url: imageUrl, //
        image_description_url: imageDescriptionUrl, //
      })
      return { success: true } //
    } catch (error) {
      //
      return { success: false, error: error.message } //
    }
  },
)

// Eliminar producto
ipcMain.handle('delete-product', async (event, productId) => {
  //
  try {
    //
    const productDoc = await getDoc(doc(db, 'products', productId)) //
    const product = productDoc.data() //
    if (product.image_url) {
      //
      const imageRef = ref(storage, product.image_url.split('?')[0]) //
      await deleteObject(imageRef) //
    }
    if (product.image_description_url) {
      //
      const imageDescriptionRef = ref(storage, product.image_description_url.split('?')[0]) //
      await deleteObject(imageDescriptionRef) //
    }
    await deleteDoc(doc(db, 'products', productId)) //
    return { success: true } //
  } catch (error) {
    //
    return { success: false, error: error.message } //
  }
})

// Actualización / alta masiva de productos desde CSV (no toca imágenes)
// rows: [{ id?, data }] -> con id se actualizan solo los campos enviados, sin id se crea
ipcMain.handle('bulk-upsert-products', async (event, rows) => {
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
})

ipcMain.handle('check-auth-status', async () => {
  //
  return new Promise((resolve) => {
    //
    const unsubscribe = auth.onAuthStateChanged((user) => {
      //
      unsubscribe() // Desuscribirse después de la primera llamada
      resolve(!!user) // Devuelve true si hay un usuario logueado, false si no
    })
  })
})

// Crear un usuario (vendedor o admin) y enviarle el enlace para definir su contraseña
ipcMain.handle('create-app-user', async (event, { email, nombre, apellido, role }) => {
  try {
    // Contraseña aleatoria descartable: el usuario define la suya desde el correo
    const tempPassword = crypto.randomBytes(24).toString('base64url')
    const { user } = await createUserWithEmailAndPassword(provisioningAuth, email, tempPassword)

    // Se escribe con la sesión del propio usuario nuevo (igual que lo hacía la app móvil)
    await setDoc(doc(provisioningDb, 'users', user.uid), {
      email: user.email,
      nombre,
      apellido,
      role,
      created_at: new Date().toISOString(),
    })
    await signOut(provisioningAuth)

    await sendPasswordResetEmail(auth, email)
    return { success: true, uid: user.uid }
  } catch (error) {
    await signOut(provisioningAuth).catch(() => {})
    let errorMessage = error.message
    if (error.code === 'auth/email-already-in-use') {
      errorMessage = 'El correo electrónico ya está en uso.'
    } else if (error.code === 'auth/invalid-email') {
      errorMessage = 'El formato del correo electrónico es inválido.'
    }
    return { success: false, error: errorMessage }
  }
})

// Cargar el valor de interés
ipcMain.handle('load-interest', async () => {
  try {
    const interestSnapshot = await getDocs(collection(db, 'interes'))
    if (!interestSnapshot.empty) {
      // Si hay documentos, toma el primero (asumimos que solo hay uno)
      const doc = interestSnapshot.docs[0]
      return { success: true, data: { id: doc.id, ...doc.data() } }
    } else {
      // Si no hay documentos, retorna éxito pero sin datos
      return { success: true, data: null }
    }
  } catch (error) {
    return { success: false, error: error.message }
  }
})

// Actualizar (o crear si no existe) el valor de interés
// `margin` (margen para cargos bancarios, texto con coma: "2") es opcional
ipcMain.handle('update-interest', async (event, docId, value, margin) => {
  try {
    const fields = { interes: value }
    if (margin !== undefined) fields.margen_cargos = margin
    if (docId) {
      // Si ya tenemos un ID de documento, lo actualizamos
      await updateDoc(doc(db, 'interes', docId), fields)
      return { success: true, id: docId }
    } else {
      // Si no hay ID (primera vez o no encontrado), creamos un nuevo documento
      const newDocRef = await addDoc(collection(db, 'interes'), {
        ...fields,
        created_at: new Date().toISOString(),
      })
      return { success: true, id: newDocRef.id }
    }
  } catch (error) {
    return { success: false, error: error.message }
  }
})

// Parámetros de descuento (AMIN-09): documento fijo para que la app lo lea directo
const discountConfigRef = () => doc(db, 'config', 'descuentos')

ipcMain.handle('load-discount-config', async () => {
  try {
    const snap = await getDoc(discountConfigRef())
    return { success: true, data: snap.exists() ? snap.data() : null }
  } catch (error) {
    return { success: false, error: error.message }
  }
})

ipcMain.handle('update-max-discount', async (event, value) => {
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
})

ipcMain.handle('reset-password', async (event, email) => {
  try {
    await sendPasswordResetEmail(auth, email)
    return { success: true }
  } catch (error) {
    let errorMessage = error.message
    // Personaliza los mensajes de error de Firebase si lo deseas
    if (error.code === 'auth/user-not-found') {
      errorMessage = 'No se encontró ningún usuario con ese correo electrónico.'
    } else if (error.code === 'auth/invalid-email') {
      errorMessage = 'El formato del correo electrónico es inválido.'
    }
    return { success: false, error: errorMessage }
  }
})

// --- FIN DE MANEJADORES IPC MAIN COPIADOS DE TU ANTIGUO main.js ---
