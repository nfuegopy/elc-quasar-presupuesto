# LoanCalc Admin - Aplicación de Gestión de Productos

## Descripción

**LoanCalc Admin** es una aplicación de escritorio desarrollada con **Electron.js** y **Quasar Framework (Vue 3)** para la administración de un catálogo de productos. Permite a los administradores iniciar sesión, gestionar productos (cargar, listar, editar, eliminar), realizar cargas masivas de productos mediante Excel, gestionar un valor de interés global y crear nuevas cuentas de usuario administrador.

La aplicación utiliza **Firebase** como backend para la autenticación de usuarios (Authentication), el almacenamiento de datos (Firestore) y la gestión de imágenes de productos (Storage).

Este proyecto ha sido migrado desde una aplicación Electron/Bootstrap original a una moderna pila Quasar/Vite/Vue 3 para una mejor experiencia de desarrollo y una interfaz de usuario más robusta.

## Características Principales

- **Autenticación de Usuarios:** Sistema de inicio de sesión con Firebase Authentication.
- **Gestión de Productos:**
  - Carga de nuevos productos con detalles (número de artículo, nombre, tipo, marca, modelo, precio, moneda, características, imágenes).
  - Listado de productos existentes en una tabla interactiva.
  - Edición y eliminación de productos individuales.
  - Carga masiva de productos mediante archivos Excel.
- **Gestión de Usuarios Administradores:**
  - Registro de nuevos usuarios administradores (con validación de dominio `@enginepy.com`).
- **Gestión de Intereses:**
  - Visualización y edición de un único valor de interés (numérico con coma decimal).
- **Interfaz de Usuario Moderna:** Desarrollada con Quasar Framework para una experiencia de usuario fluida y adaptable.
- **Comunicación Segura:** Utiliza `ipcRenderer` e `ipcMain` de Electron para la comunicación segura entre el frontend y el backend.

## Requisitos Previos

Antes de clonar y ejecutar el proyecto, asegúrate de tener instalado lo siguiente:

- **Node.js** (versión 20 o superior, recomendada 22): [Descargar Node.js](https://nodejs.org/)
- **Git:** Para clonar el repositorio. [Descargar Git](https://git-scm.com/)
- **Una cuenta de Firebase y un proyecto configurado** con los siguientes servicios habilitados:
  - **Authentication:** Con el método de inicio de sesión **Email/Password** habilitado.
  - **Firestore Database:** Para almacenar la información de usuarios y productos.
  - **Cloud Storage:** Para almacenar las imágenes de los productos.

## Configuración de Firebase

1.  **Obtén tus Credenciales de Firebase:**
    - Ve a la [Consola de Firebase](https://console.firebase.google.com/).
    - Selecciona tu proyecto.
    - Haz clic en "Project settings" (el icono de engranaje) > "Project settings".
    - En la pestaña "General", desplázate hacia abajo hasta la sección "Your apps".
    - Selecciona tu aplicación web y copia los valores de `apiKey`, `authDomain`, `projectId`, `storageBucket`, `messagingSenderId`, `appId` y `measurementId`.

2.  **Crea el Archivo `.env`:**
    - En la **raíz del proyecto** (donde está `package.json`), crea un archivo llamado `.env`.
    - Pega tus credenciales de Firebase en este archivo, duplicándolas con y sin el prefijo `VITE_` (necesario para que funcionen tanto en el proceso principal de Electron como en el frontend de Quasar/Vite):

    ```env
    # Credenciales de Firebase para el proceso principal de Electron
    FIREBASE_API_KEY="TU_API_KEY_AQUI"
    FIREBASE_AUTH_DOMAIN="TU_AUTH_DOMAIN_AQUI"
    FIREBASE_PROJECT_ID="TU_PROJECT_ID_AQUI"
    FIREBASE_STORAGE_BUCKET="TU_STORAGE_BUCKET_AQUI"
    FIREBASE_MESSAGING_SENDER_ID="TU_MESSAGING_SENDER_ID_AQUI"
    FIREBASE_APP_ID="TU_APP_ID_AQUI"
    FIREBASE_MEASUREMENT_ID="TU_MEASUREMENT_ID_AQUI"

    # Credenciales de Firebase para el frontend de Quasar/Vite
    VITE_FIREBASE_API_KEY="TU_API_KEY_AQUI"
    VITE_FIREBASE_AUTH_DOMAIN="TU_AUTH_DOMAIN_AQUI"
    VITE_FIREBASE_PROJECT_ID="TU_PROJECT_ID_AQUI"
    VITE_FIREBASE_STORAGE_BUCKET="TU_STORAGE_BUCKET_AQUI"
    VITE_FIREBASE_MESSAGING_SENDER_ID="TU_MESSAGING_SENDER_ID_AQUI"
    VITE_FIREBASE_APP_ID="TU_APP_ID_AQUI"
    VITE_FIREBASE_MEASUREMENT_ID="TU_MEASUREMENT_ID_AQUI"
    ```

    - **¡Reemplaza `TU_API_KEY_AQUI` y el resto con tus valores reales!**

3.  **Configura Firebase Authentication:**
    - En la Consola de Firebase, ve a **Build > Authentication > Sign-in method**.
    - Asegúrate de que **Email/Password** esté **Habilitado**.
    - En la pestaña **Users**, puedes crear un usuario administrador inicial manualmente si lo deseas:
      - **Correo:** `admin@test.com`
      - **Contraseña:** `admin123` (o la que prefieras)

4.  **Configura Firestore Database:**
    - En la Consola de Firebase, ve a **Build > Firestore Database**.
    - Crea una colección llamada `users` y añade un documento para tu usuario administrador inicial con su UID (que obtendrás al crear el usuario en Authentication) y el campo `role: "admin"`. Ejemplo de documento (el ID es el UID del usuario):
      ```json
      // Colección: users
      // Documento ID: [UID_DEL_USUARIO_ADMIN]
      {
        "email": "admin@test.com",
        "role": "admin"
      }
      ```
    - Crea una colección llamada `interes`. Esta colección debe contener **un único documento** con un campo `interes` (tipo string) que almacene el valor actual. Ejemplo (el ID del documento puede ser automático o uno fijo como `config`):
      ```json
      // Colección: interes
      // Documento ID: [ID_AUTOMATICO_O_FIJO]
      {
        "interes": "9,5"
      }
      ```

## Instrucciones para Descargar e Instalar

1.  **Clona el repositorio:**
    ```bash
    git clone [https://github.com/tu-usuario/nombre-de-tu-repo.git](https://github.com/tu-usuario/nombre-de-tu-repo.git)
    ```
    (Reemplaza `tu-usuario/nombre-de-tu-repo` con la URL real de tu repositorio).
2.  **Navega al directorio del proyecto:**
    ```bash
    cd nombre-de-tu-repo
    ```
3.  **Instala las dependencias:**
    ```bash
    npm install
    ```
    Si es la primera vez que usas Quasar, te pedirá instalar `@quasar/cli` y luego te hará preguntas de configuración (Vue 3, Electron, JavaScript, Vite, SCSS, Linting, Pinia, Prettier). Acepta las opciones recomendadas para una configuración estándar.

## Ejecutar el Proyecto

1.  **Inicia la aplicación en modo de desarrollo:**

    ```bash
    quasar dev -m electron
    ```

    Esto compilará la aplicación y abrirá una ventana de Electron.

2.  **Inicia sesión:**
    - En la pantalla de login, usa las credenciales de tu usuario administrador (ej. `admin@test.com` / `admin123`).
    - También puedes usar el botón "Registrar nuevo administrador" si necesitas crear una nueva cuenta con dominio `@enginepy.com`.

## Notas Adicionales

- **Entorno de Desarrollo:** La aplicación se ejecutará en modo de desarrollo, lo que incluye DevTools y hot-reloading.
- **Empaquetado para Producción:** Para crear una versión ejecutable de la aplicación para Windows, macOS o Linux, puedes usar el comando `quasar build -m electron`.
- **Depuración:** Para obtener logs detallados en el proceso principal de Electron, puedes usar `quasar dev -m electron --debug`.

---

**Autor:** [Tu Nombre o Antonio Barrios si lo mantienes]
**Licencia:** ISC (o la que prefieras)
