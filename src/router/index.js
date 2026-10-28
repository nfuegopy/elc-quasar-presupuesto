// src/router/index.js
import { route } from 'quasar/wrappers'
import {
  createRouter,
  createMemoryHistory,
  createWebHistory,
  createWebHashHistory,
} from 'vue-router'
import routes from './routes' //
import api from 'src/services/api'

export default route(function (/* { store, ssrContext } */) {
  const createHistory = process.env.SERVER
    ? createMemoryHistory
    : process.env.VUE_ROUTER_MODE === 'history'
      ? createWebHistory
      : createWebHashHistory

  const Router = createRouter({
    scrollBehavior: () => ({ left: 0, top: 0 }),
    routes: [{ path: '/', redirect: '/login' }, ...routes], //

    history: createHistory(process.env.VUE_ROUTER_BASE),
  })

  // --- Descomenta todo este bloque (si no lo has hecho ya) ---
  Router.beforeEach(async (to, from, next) => {
    // Rutas que no requieren autenticación
    const publicPages = ['/login']
    const authRequired = !publicPages.includes(to.path)

    // Sesión abierta y con rol admin (funciona igual en web y en Electron)
    const isAuthenticated = await api.checkAuthStatus()

    if (authRequired && !isAuthenticated) {
      next('/login') // Redirige al login si requiere autenticación y no está logueado
    } else if (to.path === '/login' && isAuthenticated) {
      next('/home') // Si ya está autenticado e intenta ir al login, redirige a home
    } else {
      next() // Continúa normalmente
    }
  })
  // --- Fin del bloque descomentado ---

  return Router
})
