const { app, BrowserWindow } = require('electron');
const { spawn } = require('child_process');
const path = require('path');
const http = require('http');

let mainWindow;
let apiProcess;

const API_URL = 'http://localhost:5000';
const API_TIMEOUT = 60000; // 60 segundos

// Buscar el ejecutable de la API
function getApiExecutablePath() {
  const isDev = !app.isPackaged;
  
  if (isDev) {
    // En desarrollo
    const apiPath = path.join(__dirname, '..', 'API', 'bin', 'Release', 'net8.0', 'win-x64', 'publish', 'AsistenciaAPI.API.exe');
    if (require('fs').existsSync(apiPath)) {
      return apiPath;
    }
  } else {
    // En producción: dentro de resources/API
    const apiPath = path.join(process.resourcesPath, 'API', 'AsistenciaAPI.API.exe');
    if (require('fs').existsSync(apiPath)) {
      return apiPath;
    }
  }
  
  return null;
}

// Esperar a que la API esté lista
function waitForApi(timeout = API_TIMEOUT) {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    
    const checkApi = () => {
      http.get(API_URL + '/health/db', (res) => {
        if (res.statusCode === 200) {
          console.log('[Electron] API lista!');
          resolve();
        } else {
          setTimeout(checkApi, 1000);
        }
      }).on('error', () => {
        if (Date.now() - startTime > timeout) {
          reject(new Error('API timeout'));
        } else {
          setTimeout(checkApi, 1000);
        }
      });
    };
    
    checkApi();
  });
}

// Iniciar API
function startApi() {
  return new Promise((resolve, reject) => {
    const apiPath = getApiExecutablePath();
    
    if (!apiPath) {
      reject(new Error('No se encontró AsistenciaAPI.API.exe'));
      return;
    }
    
    console.log('[Electron] Iniciando API desde:', apiPath);
    
    apiProcess = spawn(apiPath, [], {
      stdio: ['ignore', 'pipe', 'pipe'],
      detached: false,
      cwd: path.dirname(apiPath)
    });
    
    apiProcess.stdout.on('data', (data) => {
      console.log('[API]', data.toString());
    });
    
    apiProcess.stderr.on('data', (data) => {
      console.error('[API Error]', data.toString());
    });
    
    apiProcess.on('error', (err) => {
      reject(new Error(`Error al iniciar API: ${err.message}`));
    });
    
    // Dar tiempo para que la API arranque
    setTimeout(() => {
      waitForApi()
        .then(resolve)
        .catch(reject);
    }, 2000);
  });
}

// Crear ventana principal
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 720,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      devTools: true
    },
    show: false
  });

  // Mostrar mensaje de carga
  mainWindow.loadURL(`data:text/html;charset=utf-8,
    <html>
      <head>
        <style>
          body { 
            margin: 0; 
            display: flex; 
            justify-content: center; 
            align-items: center; 
            height: 100vh; 
            font-family: Arial, sans-serif;
            background: #f5f5f5;
          }
          .container {
            text-align: center;
          }
          .spinner {
            border: 4px solid #f3f3f3;
            border-top: 4px solid #3498db;
            border-radius: 50%;
            width: 50px;
            height: 50px;
            animation: spin 1s linear infinite;
            margin: 0 auto 20px;
          }
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
          h1 { color: #333; margin: 0 0 10px; }
          p { color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="spinner"></div>
          <h1>PILARES - Sistema de Asistencia</h1>
          <p>Iniciando servidor...</p>
        </div>
      </body>
    </html>
  `);

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    console.error('[Electron] Error al cargar:', errorCode, errorDescription);
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Cargar la aplicación cuando la API esté lista
function loadApp() {
  console.log('[Electron] Cargando aplicación desde:', API_URL);
  mainWindow.loadURL(API_URL);
}

// Evento: app ready
app.on('ready', async () => {
  try {
    console.log('[Electron] Iniciando...');
    createWindow();
    
    console.log('[Electron] Iniciando API...');
    await startApi();
    
    console.log('[Electron] Cargando aplicación...');
    loadApp();
  } catch (error) {
    console.error('[Electron] Error:', error.message);
    
    if (mainWindow) {
      mainWindow.loadURL(`data:text/html;charset=utf-8,
        <html>
          <head>
            <style>
              body { 
                margin: 0; 
                display: flex; 
                justify-content: center; 
                align-items: center; 
                height: 100vh; 
                font-family: Arial, sans-serif;
                background: #f5f5f5;
              }
              .error {
                text-align: center;
                padding: 40px;
                background: white;
                border-radius: 8px;
                box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                max-width: 500px;
              }
              h1 { color: #e74c3c; margin: 0 0 20px; }
              p { color: #666; line-height: 1.6; }
              code { 
                background: #f8f8f8; 
                padding: 2px 6px; 
                border-radius: 3px;
                display: block;
                margin: 10px 0;
                color: #e74c3c;
              }
            </style>
          </head>
          <body>
            <div class="error">
              <h1>⚠️ Error al iniciar</h1>
              <p>No se pudo iniciar el servidor de la aplicación.</p>
              <code>${error.message}</code>
              <p style="margin-top: 20px; font-size: 14px;">
                Cierre esta ventana e intente nuevamente.
              </p>
            </div>
          </body>
        </html>
      `);
    }
  }
});

// Evento: window-all-closed
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Evento: activate
app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});

// Limpiar al salir
app.on('quit', () => {
  if (apiProcess) {
    try {
      console.log('[Electron] Cerrando API...');
      apiProcess.kill('SIGTERM');
      
      // Forzar cierre si no responde
      setTimeout(() => {
        if (apiProcess && !apiProcess.killed) {
          apiProcess.kill('SIGKILL');
        }
      }, 2000);
    } catch (e) {
      console.error('[Electron] Error al cerrar API:', e);
    }
  }
});

// Manejo de errores no capturados
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  if (apiProcess) {
    try {
      apiProcess.kill('SIGKILL');
    } catch (e) {}
  }
  app.quit();
});
