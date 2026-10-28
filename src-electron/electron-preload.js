// src-electron/electron-preload.js
const { contextBridge, ipcRenderer } = require('electron') //

contextBridge.exposeInMainWorld('electron', {
  //
  login: (email, password) => ipcRenderer.invoke('login', email, password), //
  logout: () => ipcRenderer.invoke('logout'), //
  loadProducts: () => ipcRenderer.invoke('load-products'), //
  getProduct: (productId) => ipcRenderer.invoke('get-product', productId), //
  addProduct: (
    productData,
    imageFile,
    imageDescriptionFile, //
  ) => ipcRenderer.invoke('add-product', productData, imageFile, imageDescriptionFile), //
  updateProduct: (
    productId,
    productData,
    imageFile,
    imageDescriptionFile, //
  ) =>
    ipcRenderer.invoke('update-product', productId, productData, imageFile, imageDescriptionFile), //
  deleteProduct: (productId) => ipcRenderer.invoke('delete-product', productId), //
  bulkUpsertProducts: (rows) => ipcRenderer.invoke('bulk-upsert-products', rows),
  checkAuthStatus: () => ipcRenderer.invoke('check-auth-status'), //
  createAppUser: (userData) => ipcRenderer.invoke('create-app-user', userData),

  loadInterest: () => ipcRenderer.invoke('load-interest'),
  updateInterest: (docId, value, margin) =>
    ipcRenderer.invoke('update-interest', docId, value, margin),
  loadDiscountConfig: () => ipcRenderer.invoke('load-discount-config'),
  updateMaxDiscount: (value) => ipcRenderer.invoke('update-max-discount', value),
  resetPassword: (email) => ipcRenderer.invoke('reset-password', email),

  getUsers: () => ipcRenderer.invoke('get-users'),
  setUserStatus: (userId, status) => ipcRenderer.invoke('set-user-status', userId, status),
  getCurrentUserId: () => ipcRenderer.invoke('get-current-user-id'),
})
