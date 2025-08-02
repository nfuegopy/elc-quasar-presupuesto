import { app, BrowserWindow, ipcMain } from 'electron' //
import path from 'node:path' //
import os from 'node:os' //
import { fileURLToPath } from 'node:url' //

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
} from 'firebase/firestore' //
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage' //

// Importación de XLSX para manejar archivos Excel (requerido para la carga masiva)
import XLSX from 'xlsx' //

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
// --- FIN DEL CÓDIGO AÑADIDO PARA FIREBASE Y XLSX ---

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

// Actualizar el rol de un usuario
ipcMain.handle('update-user-role', async (event, userId, newRole) => {
  try {
    const userDocRef = doc(db, 'users', userId)
    await updateDoc(userDocRef, {
      role: newRole,
    })
    return { success: true }
  } catch (error) {
    return { success: false, error: error.message }
  }
})

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

// Cargar archivo Excel masivamente
ipcMain.handle('upload-excel', async (event, excelFile) => {
  //
  try {
    //
    // Leer el archivo Excel
    const workbook = XLSX.read(Buffer.from(excelFile.data), { type: 'buffer' }) //
    const sheetName = workbook.SheetNames[0] //
    const sheet = workbook.Sheets[sheetName] //
    const data = XLSX.utils.sheet_to_json(sheet) //

    let count = 0 //
    for (const row of data) {
      //
      // Mapear los campos del Excel a la estructura de Firestore
      const productData = {
        //
        articleNumber: row['Número de artículo'] || '', //
        name: row['Descripción del artículo'] || '', //
        type: row['Tipo'] || '', //
        brand: row['Marca'] ? row['Marca'].toLowerCase() : '', //
        model: row['Modelo'] || '', //
        fuelType: '', // No está en el Excel, dejar vacío
        price: 0, // No está en el Excel, establecer en 0
        currency: 'USD', // Predeterminado en USD
        features: '', // No está en el Excel, dejar vacío
        image_url: '', // No hay imágenes en el Excel
        image_description_url: '', // No hay imágenes en el Excel
        created_at: new Date().toISOString(), //
      }

      // Validar campos obligatorios
      if (
        //
        !productData.articleNumber || //
        !productData.name || //
        !productData.type || //
        !productData.brand || //
        !productData.model //
      ) {
        console.warn('Fila omitida por datos incompletos:', productData) //
        continue //
      }

      // Guardar en Firestore
      await addDoc(collection(db, 'products'), productData) //
      count++ //
    }

    return { success: true, count } //
  } catch (error) {
    //
    return { success: false, error: error.message } //
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

ipcMain.handle('register-user', async (event, email, password) => {
  //
  try {
    //
    // 1. Crear el usuario en Firebase Authentication
    const userCredential = await createUserWithEmailAndPassword(auth, email, password) //
    const user = userCredential.user //

    // 2. Guardar el rol en Firestore (o actualizar si ya existe)
    // Usamos setDoc con merge:true para no sobrescribir otros campos si ya hay un documento para ese UID
    await setDoc(
      //
      doc(db, 'users', user.uid), //
      {
        //
        email: user.email, //
        role: 'admin', // Asignar el rol de administrador
        created_at: new Date().toISOString(), //
      },
      { merge: true }, //
    )

    return { success: true, uid: user.uid } //
  } catch (error) {
    //
    let errorMessage = error.message //
    if (error.code === 'auth/email-already-in-use') {
      //
      errorMessage = 'El correo electrónico ya está en uso.' //
    } else if (error.code === 'auth/weak-password') {
      //
      errorMessage = 'La contraseña es demasiado débil (debe tener al menos 6 caracteres).' //
    } else if (error.code === 'auth/invalid-email') {
      //
      errorMessage = 'El formato del correo electrónico es inválido.' //
    }
    return { success: false, error: errorMessage } //
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
ipcMain.handle('update-interest', async (event, docId, value) => {
  try {
    if (docId) {
      // Si ya tenemos un ID de documento, lo actualizamos
      await updateDoc(doc(db, 'interes', docId), { interes: value })
      return { success: true, id: docId }
    } else {
      // Si no hay ID (primera vez o no encontrado), creamos un nuevo documento
      const newDocRef = await addDoc(collection(db, 'interes'), {
        interes: value,
        created_at: new Date().toISOString(),
      })
      return { success: true, id: newDocRef.id }
    }
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
