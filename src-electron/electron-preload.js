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
  uploadExcel: (excelFile) => ipcRenderer.invoke('upload-excel', excelFile), //
  checkAuthStatus: () => ipcRenderer.invoke('check-auth-status'), //
  registerUser: (email, password) => ipcRenderer.invoke('register-user', email, password), //

  loadInterest: () => ipcRenderer.invoke('load-interest'),
  updateInterest: (docId, value) => ipcRenderer.invoke('update-interest', docId, value),
  resetPassword: (email) => ipcRenderer.invoke('reset-password', email),

  getUsers: () => ipcRenderer.invoke('get-users'),
  updateUserRole: (userId, newRole) => ipcRenderer.invoke('update-user-role', userId, newRole),
})
