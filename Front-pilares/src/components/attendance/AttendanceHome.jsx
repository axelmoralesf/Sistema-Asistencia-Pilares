// AttendanceHome.jsx
import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Scanner } from '@yudiel/react-qr-scanner';
import './AttendanceHome.css';
import AdminLoginModal from './../common/AdminLoginModal';
import SuccessModal from './../common/SuccessModal';
import ErrorModal from './../common/ErrorModal';
import LoadingSpinner from './../common/LoadingSpinner';

// *** CONFIGURACIÓN DE LA API ***
const API_BASE_URL = 'http://localhost:5000';

const AttendanceHome = () => {
  const navigate = useNavigate();

  // Estados
  const [employeeId, setEmployeeId] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [showError, setShowError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [showLoading, setShowLoading] = useState(false); // se usará para login/admin, no para cada escaneo
  const [isScannerActive, setIsScannerActive] = useState(false);
  const [scannerPaused, setScannerPaused] = useState(false);
  const [scanError, setScanError] = useState('');

  // Flags para evitar múltiples registros
  const isProcessingRef = useRef(false);
  const lastScanRef = useRef('');

  // ================= MODALES =================

  const showSuccessModal = (message) => {
    setSuccessMessage(message);
    setShowSuccess(true);
  };

  const handleCloseSuccess = () => {
    setShowSuccess(false);
    setSuccessMessage('');
    // Liberar para permitir nuevo escaneo
    isProcessingRef.current = false;
    lastScanRef.current = '';
    setScannerPaused(false);
  };

  const showErrorModal = (message) => {
    setErrorMessage(message);
    setShowError(true);
  };

  const handleCloseError = () => {
    const msg = errorMessage || '';
    setShowError(false);
    setErrorMessage('');
    // Liberar también en caso de error
    isProcessingRef.current = false;
    lastScanRef.current = '';
    setScannerPaused(false);

    if (msg.includes('contraseña') || msg.includes('permisos')) {
      setIsModalOpen(true);
    }
  };

  // ================= API ASISTENCIA =================

  const registrarAsistenciaBackend = async (idEmpleado) => {
    try {
      const response = await fetch(`${API_BASE_URL}/asistencia/marcar`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ idEmpleado })
      });

      const data = await response.json();

      if (response.ok && data.exito) {
        const tipoMarcacion = data.tipo || 'Asistencia';
        const nombreEmpleado = data.nombreEmpleado || `ID: ${idEmpleado}`;
        showSuccessModal(`${tipoMarcacion} registrada para ${nombreEmpleado}`);
        return true;
      } else {
        showErrorModal(data.mensaje || 'Error al registrar asistencia');
        return false;
      }
    } catch (error) {
      console.error('Error al conectar con el backend:', error);
      showErrorModal('No se pudo conectar con el servidor');
      return false;
    }
  };

  // ================= FORMULARIO MANUAL =================

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!employeeId.trim()) {
      showErrorModal('Por favor ingrese un ID válido');
      return;
    }

    // Aquí sí mostramos spinner porque es una acción puntual
    setShowLoading(true);
    isProcessingRef.current = true;
    lastScanRef.current = employeeId.trim();

    const exitoso = await registrarAsistenciaBackend(employeeId.trim());
    setShowLoading(false);

    if (exitoso) {
      setEmployeeId('');
    } else {
      isProcessingRef.current = false;
      lastScanRef.current = '';
    }
  };

  // ================= ESCÁNER QR =================

  const handleQrScan = async (detectedCodes) => {
    if (!detectedCodes || detectedCodes.length === 0) return;

    const scannedData = detectedCodes[0].rawValue?.trim();
    if (!scannedData) return;

    // Si ya estamos procesando un QR o está pausado, ignorar
    if (isProcessingRef.current || scannerPaused) return;

    // Evitar repetir exactamente el mismo código enseguida
    if (lastScanRef.current === scannedData) return;

    console.log('QR escaneado:', scannedData);

    isProcessingRef.current = true;
    lastScanRef.current = scannedData;
    setScannerPaused(true);      // Pausar decodificación, pero dejar cámara encendida

    // Mostrar el ID en el input (solo feedback visual)
    setEmployeeId(scannedData);

    // OJO: no usamos showLoading aquí para no tapar la cámara con un overlay grande
    const ok = await registrarAsistenciaBackend(scannedData);

    if (!ok) {
      // Si falló, desbloquear para permitir reintento
      isProcessingRef.current = false;
      lastScanRef.current = '';
      setScannerPaused(false);
    }
    // Si fue bien, se desbloquea en handleCloseSuccess / handleCloseError
  };

  const handleScanError = (error) => {
    console.error('Error en el escáner:', error);
    setScanError('Error al acceder a la cámara');
  };

  const toggleScanner = () => {
    const next = !isScannerActive;
    setIsScannerActive(next);
    setScanError('');

    if (!next) {
      // Al apagar la cámara, resetear estados de escaneo
      isProcessingRef.current = false;
      lastScanRef.current = '';
      setScannerPaused(false);
    }
  };

  // ================= ADMIN LOGIN =================

  const toggleAdminModal = () => {
    setIsModalOpen(!isModalOpen);
  };

  const handleAdminLogin = async (username, password) => {
    setShowLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          idEmpleadoExterno: username,
          password: password
        })
      });

      if (response.ok) {
        const data = await response.json();
        console.log('¡Acceso de Administrador Concedido!');

        localStorage.setItem('authToken', data.token);
        localStorage.setItem('userName', username);
        
        setIsModalOpen(false);
        
        setTimeout(() => {
          setShowLoading(false);
          navigate('/employees');
        }, 1500);
        
        return true;
      } else {
        setShowLoading(false);
        setIsModalOpen(false);
        
        if (response.status === 401) {
          showErrorModal('ID de empleado o contraseña incorrectos');
        } else if (response.status === 403) {
          showErrorModal('Este empleado no tiene permisos de administrador');
        } else {
          showErrorModal('Error al iniciar sesión');
        }
        return false;
      }
    } catch (error) {
      console.error('Error al autenticar:', error);
      setShowLoading(false);
      setIsModalOpen(false);
      showErrorModal('No se pudo conectar con el servidor');
      return false;
    }
  };

  // ================= RENDER =================

  return (
    <div className="attendance-home">
      <div className="attendance-container">
        {/* Lado izquierdo - Formulario */}
        <div className="attendance-left">
          <h2 className="attendance-title">Registro de Asistencia</h2>
          
          <form className="attendance-form" onSubmit={handleSubmit}>
            <input
              type="text"
              className="attendance-input"
              placeholder="Ingrese su ID"
              value={employeeId}
              onChange={(e) => setEmployeeId(e.target.value)}
              required
            />
            
            <button type="submit" className="attendance-button">
              INGRESAR
            </button>
          </form>

          <div 
            className="attendance-settings-icon" 
            onClick={toggleAdminModal}
            title="Acceso Administrador"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
              <path d="M12,1L3,5V11C3,16.55 6.84,21.74 12,23C17.16,21.74 21,16.55 21,11V5L12,1M12,5A3,3 0 0,1 15,8A3,3 0 0,1 12,11A3,3 0 0,1 9,8A3,3 0 0,1 12,5M17.13,17C15.92,18.85 14.11,20.24 12,20.92C9.89,20.24 8.08,18.85 6.87,17C6.53,16.5 6.24,16 6,15.47C6,13.82 8.71,12.47 12,12.47C15.29,12.47 18,13.79 18,15.47C17.76,16 17.47,16.5 17.13,17Z" />
            </svg>
          </div>
        </div>

        {/* Lado derecho - Escáner QR */}
        <div className="attendance-right">
          <div className="qr-title-fixed">ESCANEA CÓDIGO QR</div>
          
          <div className="qr-scanner">
            {!isScannerActive ? (
              <div className="scanner-frame" onClick={toggleScanner}>
                <div className="scanner-corner scanner-tl"></div>
                <div className="scanner-corner scanner-tr"></div>
                <div className="scanner-corner scanner-bl"></div>
                <div className="scanner-corner scanner-br"></div>
                <div className="scanner-dot"></div>
                <div className="scanner-text">Toca para escanear</div>
              </div>
            ) : (
              <div className="scanner-camera-container">
                <Scanner
                  onScan={handleQrScan}
                  onError={handleScanError}
                  constraints={{
                    facingMode: 'environment',
                    width: { ideal: 640 },
                    height: { ideal: 480 },
                    frameRate: { ideal: 15, max: 20 }
                  }}
                  formats={['qr_code']}     // solo QR, menos trabajo [web:20]
                  allowMultiple={true}      // ignora mismo código repetido [web:20]
                  scanDelay={1200}          // 1.2s entre escaneos [web:20]
                  paused={scannerPaused}    // pausa decodificación mientras procesas [web:24]
                  components={{ finder: false }}
                  styles={{
                    container: { 
                      width: '100%', 
                      height: '100%', 
                      borderRadius: '1.25rem', 
                      overflow: 'hidden' 
                    },
                    video: { 
                      width: '100%', 
                      height: '100%', 
                      objectFit: 'cover' 
                    }
                  }}
                />
                
                <div className="scanner-overlay">
                  <div className="scanner-corner scanner-tl"></div>
                  <div className="scanner-corner scanner-tr"></div>
                  <div className="scanner-corner scanner-bl"></div>
                  <div className="scanner-corner scanner-br"></div>
                  <div className="scanner-grid"></div>
                  <div className="scanner-line"></div>
                  <div className="scanner-status-text">
                    {scannerPaused ? 'Procesando...' : 'Escaneando...'}
                  </div>
                </div>
                
                <button className="scanner-close-btn" onClick={toggleScanner}>
                  ✕
                </button>
                
                {scanError && <div className="scanner-error">{scanError}</div>}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modales */}
      {isModalOpen && (
        <AdminLoginModal
          isOpen={isModalOpen}
          onClose={toggleAdminModal}
          onLogin={handleAdminLogin}
        />
      )}

      <SuccessModal
        isOpen={showSuccess}
        onClose={handleCloseSuccess}
        message={successMessage}
        autoCloseDelay={3000}
      />

      <ErrorModal
        isOpen={showError}
        onClose={handleCloseError}
        message={errorMessage}
        autoCloseDelay={3000}
      />

      {showLoading && (
        <LoadingSpinner
          size="large"
          text="Procesando..."
          fullScreen={true}
        />
      )}
    </div>
  );
};

export default AttendanceHome;
