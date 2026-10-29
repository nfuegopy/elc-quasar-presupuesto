// src/router/routes.js
const routes = [
  {
    path: '/',
    component: () => import('layouts/MainLayout.vue'),
    children: [
      { path: 'home', component: () => import('pages/HomePage.vue') }, //
      { path: 'dashboard', component: () => import('pages/DashboardPage.vue') }, //
      { path: 'interes', component: () => import('pages/InteresPage.vue') },
      { path: 'app', component: () => import('pages/AppDownloadPage.vue') },
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

  // Siempre deja esto como la última ruta.
  {
    path: '/:catchAll(.*)*',
    component: () => import('pages/ErrorNotFound.vue'),
  },
]

export default routes //
