// Preload script para Electron
// Este archivo se ejecuta antes de que se cargue el contenido de la página
// Permite exponer APIs de Node.js de forma segura al renderer process

const { contextBridge } = require('electron');

// Exponer APIs si es necesario
contextBridge.exposeInMainWorld('electron', {
  // Aquí puedes agregar funciones que necesites exponer al frontend
  platform: process.platform,
  version: process.versions.electron
});

console.log('[Preload] Script cargado');
