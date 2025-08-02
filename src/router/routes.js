// src/router/routes.js
const routes = [
  {
    path: '/',
    component: () => import('layouts/MainLayout.vue'),
    children: [
      { path: 'home', component: () => import('pages/HomePage.vue') }, //
      // Futuras páginas que usarán el MainLayout (descomentar cuando se creen)
      { path: 'dashboard', component: () => import('pages/DashboardPage.vue') }, //
      // { path: 'max-upload', component: () => import('pages/MaxUploadPage.vue') }, //
      // { path: 'create-user', component: () => import('pages/CreateUserPage.vue') }, //
      { path: 'interes', component: () => import('pages/InteresPage.vue') },
      {
        path: 'users',
        component: () => import('pages/UsersPage.vue'),
        meta: { requiresAuth: true },
      },
    ],
  },
  {
    path: '/login', // Ruta de la página de inicio de sesión
    component: () => import('pages/LoginPage.vue'),
  },
  {
    path: '/register', // Ruta de la página de registro de nuevos administradores
    component: () => import('pages/RegisterPage.vue'),
  },

  // Siempre deja esto como la última ruta.
  {
    path: '/:catchAll(.*)*',
    component: () => import('pages/ErrorNotFound.vue'),
  },
]

export default routes //
