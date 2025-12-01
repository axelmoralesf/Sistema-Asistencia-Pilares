import React, { useState, useEffect } from "react";
import "./ReportsHome.css";
import { FaEye, FaDownload, FaTrash, FaTimes } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import axios from "axios";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5172";

// Suma el tiempo trabajado a partir de los registros devueltos por /reportes
// y lo devuelve en formato compacto: "X h" / "Y m" / "Z s"
const calcularTiempoDesdeRegistros = (registros) => {
  if (!Array.isArray(registros) || registros.length === 0) return "";

  let totalMs = 0;

  registros.forEach((r) => {
    if (r.horaEntrada && r.horaSalida) {
      const entrada = new Date(r.horaEntrada);
      const salida = new Date(r.horaSalida);
      const diff = salida - entrada; // milisegundos

      if (!isNaN(diff) && diff > 0) {
        totalMs += diff;
      }
    }
  });

  if (totalMs <= 0) return "";

  let totalSeg = Math.floor(totalMs / 1000);
  const horas = Math.floor(totalSeg / 3600);
  totalSeg = totalSeg % 3600;
  const minutos = Math.floor(totalSeg / 60);
  const segundos = totalSeg % 60;

  if (horas >= 1) return `${horas} h`;
  if (minutos >= 1) return `${minutos} m`;
  return `${segundos} s`;
};

// Determina si un empleado está activo usando varios posibles campos
const esEmpleadoActivo = (emp) => {
  // Flags booleanos típicos
  const boolCampos = ["activo", "estaActivo", "isActive"];
  for (const campo of boolCampos) {
    if (emp[campo] !== undefined && emp[campo] !== null) {
      const v = emp[campo];
      if (v === true || v === 1) return true;
      if (v === false || v === 0) return false;
    }
  }

  // Campos string de estado
  const estadoCampos = ["estado", "estatus", "status"];
  for (const campo of estadoCampos) {
    if (emp[campo]) {
      const txt = String(emp[campo]).toLowerCase();
      if (txt.includes("inac")) return false; // inactivo, inactive, etc.
    }
  }

  // Si no hay información de estado, asumimos activo
  return true;
};

// Función para generar el nombre del reporte
const generarNombreReporte = (selectedEmployees, isTodosSelected, fechaInicio, fechaFin) => {
  // Arrays de nombres de meses
  const mesesCompletos = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
  ];
  
  const mesesAbreviados = [
    "Ene", "Feb", "Mar", "Abr", "May", "Jun",
    "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"
  ];

  // Obtener mes y año de inicio y fin
  const [yearInicio, mesInicio] = fechaInicio.split("-").map(Number);
  const [yearFin, mesFin] = fechaFin.split("-").map(Number);

  // Determinar el rango de meses
  let rangoMeses = "";
  
  if (mesInicio === mesFin && yearInicio === yearFin) {
    // Un solo mes - usar nombre completo
    rangoMeses = mesesCompletos[mesInicio - 1];
  } else {
    // Múltiples meses - usar abreviados
    rangoMeses = `${mesesAbreviados[mesInicio - 1]}-${mesesAbreviados[mesFin - 1]}`;
  }

  // Determinar la parte de empleados del nombre
  let parteEmpleados = "";
  
  if (isTodosSelected || selectedEmployees.length === 0) {
    parteEmpleados = "Todos";
  } else if (selectedEmployees.length === 1) {
    // Un solo empleado - usar primer nombre
    const nombreCompleto = selectedEmployees[0].nombre || selectedEmployees[0].name || "Empleado";
    parteEmpleados = nombreCompleto.split(" ")[0];
  } else {
    // Múltiples empleados - concatenar primeros nombres con guion bajo
    const nombres = selectedEmployees.map(emp => {
      const nombreCompleto = emp.nombre || emp.name || "Empleado";
      return nombreCompleto.split(" ")[0];
    });
    parteEmpleados = nombres.join("_");
  }

  // Construir el nombre completo sin guion bajo antes de la fecha
  return `Reporte${parteEmpleados}${rangoMeses}`;
};

const ReportsHome = () => {
  const navigate = useNavigate();
  const [showEmployeeModal, setShowEmployeeModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewData, setPreviewData] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [selectedEmployees, setSelectedEmployees] = useState([]); // Array de empleados seleccionados
  const [isTodosSelected, setIsTodosSelected] = useState(false); // Flag para "Todos"
  const [refreshKey, setRefreshKey] = useState(0);
  const [loading, setLoading] = useState(false);

  const [filters, setFilters] = useState({
    fechaInicio: "",
    fechaFin: "",
    horaEntrada: "",
    horaSalida: "",
    horasTrabajadas: "", // tiempo total trabajado formateado (desde registros)
  });

  const [historial, setHistorial] = useState([]);

  // Modal de confirmación propio
  const [confirmModal, setConfirmModal] = useState({
    visible: false,
    title: "",
    message: "",
  });

  const cerrarConfirmModal = () =>
    setConfirmModal({ visible: false, title: "", message: "" });

  // Verificar autenticación al cargar
  useEffect(() => {
    const token = localStorage.getItem("authToken");
    if (!token) {
      alert("Debes iniciar sesión primero");
      navigate("/login");
      return;
    }
  }, [navigate]);

  // Cargar empleados (solo activos)
  useEffect(() => {
    const cargarEmpleados = async () => {
      try {
        const token = localStorage.getItem("authToken");
        if (!token) return;

        const response = await axios.get(`${API_URL}/empleados`, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });

        const activos = response.data.filter(esEmpleadoActivo);
        setEmployees(activos);
      } catch (error) {
        if (error.response?.status === 401) {
          localStorage.removeItem("authToken");
          navigate("/login");
        }
      }
    };

    cargarEmpleados();
  }, [navigate]);

  // Cargar historial desde el backend
  useEffect(() => {
    const cargarHistorial = async () => {
      try {
        const token = localStorage.getItem("authToken");
        if (!token) return;

        const response = await axios.get(`${API_URL}/reportes/historial`, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });

        setHistorial(response.data);
      } catch (error) {
        if (error.response?.status === 401) {
          localStorage.removeItem("authToken");
          navigate("/login");
        }
      }
    };

    cargarHistorial();
  }, [navigate]);

  // Manejo de cambios en filtros (sin cálculo aquí; se hace al generar)
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  // GENERAR REPORTE
  const handleGenerarReporte = async () => {
    if (!filters.fechaInicio || !filters.fechaFin) {
      setConfirmModal({
        visible: true,
        title: "Parámetros incompletos",
        message: "Selecciona ambas fechas (inicio y fin) antes de generar el reporte.",
      });
      return;
    }

    setLoading(true);

    try {
      const token = localStorage.getItem("authToken");

      if (!token) {
        setConfirmModal({
          visible: true,
          title: "Sesión requerida",
          message: "No estás autenticado. Inicia sesión primero.",
        });
        navigate("/login");
        return;
      }

      let registros = [];
      let empleadoId = null;

      // Determinar qué empleados incluir en el reporte
      if (isTodosSelected) {
        // Todos los empleados - hacer una sola petición sin filtro
        const response = await axios.post(`${API_URL}/reportes`, {
          empleadoId: null,
          fechaInicio: filters.fechaInicio,
          fechaFin: filters.fechaFin,
        }, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });
        registros = response.data || [];
      } else if (selectedEmployees.length === 1) {
        // Un solo empleado
        empleadoId = selectedEmployees[0].id;
        const response = await axios.post(`${API_URL}/reportes`, {
          empleadoId: empleadoId,
          fechaInicio: filters.fechaInicio,
          fechaFin: filters.fechaFin,
        }, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });
        registros = response.data || [];
      } else if (selectedEmployees.length > 1) {
        // Múltiples empleados - hacer una petición por cada uno y combinar resultados
        const promises = selectedEmployees.map(emp =>
          axios.post(`${API_URL}/reportes`, {
            empleadoId: emp.id,
            fechaInicio: filters.fechaInicio,
            fechaFin: filters.fechaFin,
          }, {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          })
        );

        const responses = await Promise.all(promises);
        registros = responses.flatMap(response => response.data || []);
      }

      // 2) Calcular tiempo total trabajado
      const tiempoReal = calcularTiempoDesdeRegistros(registros);
      setFilters((prev) => ({
        ...prev,
        horasTrabajadas: tiempoReal,
      }));

      // 3) Generar nombre del reporte
      const nombreReporte = generarNombreReporte(
        selectedEmployees,
        isTodosSelected,
        filters.fechaInicio,
        filters.fechaFin
      );

      const guardarDto = {
        nombre: nombreReporte,
        fechaInicio: filters.fechaInicio,
        fechaFin: filters.fechaFin,
        empleadoId: empleadoId,
      };

      const saveResponse = await axios.post(`${API_URL}/reportes/guardar`, guardarDto, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      setHistorial((prev) => [saveResponse.data, ...prev]);
      setRefreshKey((prev) => prev + 1);

      setConfirmModal({
        visible: true,
        title: "Reporte generado",
        message: `Reporte generado y guardado: ${nombreReporte}\nRegistros encontrados: ${registros.length}`,
      });
    } catch (error) {
      if (error.response?.status === 401) {
        localStorage.removeItem("authToken");
        navigate("/login");
        setConfirmModal({
          visible: true,
          title: "Sesión expirada",
          message: "Tu sesión ha expirado. Inicia sesión nuevamente.",
        });
        return;
      }

      const errorMsg = error.response?.data?.message || error.message;
      setConfirmModal({
        visible: true,
        title: "Error al generar reporte",
        message: errorMsg,
      });
    } finally {
      setLoading(false);
    }
  };

  // VER REPORTE
  const handleVer = async (item) => {
    try {
      const token = localStorage.getItem("authToken");

      const request = {
        empleadoId: item.empleadoId || null,
        fechaInicio: item.fechaInicio,
        fechaFin: item.fechaFin,
      };

      const response = await axios.post(`${API_URL}/reportes`, request, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      const datos = response.data;

      if (datos && datos.length > 0) {
        setPreviewData({
          nombre: item.nombre,
          datos: datos,
        });
        setShowPreviewModal(true);
      } else {
        setConfirmModal({
          visible: true,
          title: "Sin datos",
          message: `Reporte: ${item.nombre}\nNo hay datos disponibles para este período.`,
        });
      }
    } catch {
      setConfirmModal({
        visible: true,
        title: "Error",
        message: "Error al cargar la vista previa del reporte.",
      });
    }
  };

  // DESCARGAR REPORTE
  const handleDescargar = async (item) => {
    try {
      const request = {
        empleadoId: item.empleadoId || null,
        fechaInicio: item.fechaInicio,
        fechaFin: item.fechaFin,
      };

      const token = localStorage.getItem("authToken");

      if (!token) {
        setConfirmModal({
          visible: true,
          title: "Sesión requerida",
          message: "No estás autenticado. Inicia sesión primero.",
        });
        navigate("/login");
        return;
      }

      const response = await axios.post(`${API_URL}/reportes/export`, request, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        responseType: "blob",
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `${item.nombre}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      setConfirmModal({
        visible: true,
        title: "Error",
        message: "Error al descargar el reporte.",
      });
    }
  };

  // ELIMINAR REPORTE
  const handleEliminarReporte = async (item) => {
    if (!window.confirm(`¿Estás seguro de eliminar el reporte "${item.nombre}"?`)) {
      return;
    }

    try {
      const token = localStorage.getItem("authToken");

      if (!token) {
        setConfirmModal({
          visible: true,
          title: "Sesión requerida",
          message: "No estás autenticado. Inicia sesión primero.",
        });
        navigate("/login");
        return;
      }

      await axios.delete(`${API_URL}/reportes/${item.id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      setHistorial((prev) => prev.filter((h) => h.id !== item.id));
      setRefreshKey((prev) => prev + 1);
    } catch (error) {
      if (error.response?.status === 401) {
        localStorage.removeItem("authToken");
        navigate("/login");
        setConfirmModal({
          visible: true,
          title: "Sesión expirada",
          message: "Tu sesión ha expirado. Inicia sesión nuevamente.",
        });
        return;
      }

      if (error.response?.status === 404) {
        setConfirmModal({
          visible: true,
          title: "No encontrado",
          message: "El reporte no existe.",
        });
        return;
      }

      setConfirmModal({
        visible: true,
        title: "Error",
        message: "Error al eliminar el reporte.",
      });
    }
  };

  // Seleccionar un empleado individual
  const handleSelectEmployee = (emp) => {
    // Si ya está seleccionado, no hacer nada
    if (selectedEmployees.some(e => e.id === emp.id)) {
      return;
    }
    
    // Agregar al array de seleccionados
    setSelectedEmployees(prev => [...prev, emp]);
    setIsTodosSelected(false);
    setShowEmployeeModal(false);
  };

  // Seleccionar "Todos los empleados"
  const handleSelectTodos = () => {
    setIsTodosSelected(true);
    setSelectedEmployees([]); // Limpiar selección individual
    setShowEmployeeModal(false);
  };

  // Eliminar un empleado específico de la selección
  const handleRemoveEmployee = (empId) => {
    setSelectedEmployees(prev => prev.filter(e => e.id !== empId));
  };

  // Limpiar toda la selección
  const clearAllSelection = () => {
    setSelectedEmployees([]);
    setIsTodosSelected(false);
  };

  // Determinar qué mostrar en el resumen
  const getSearchSummary = () => {
    if (isTodosSelected) {
      return "Todos los empleados";
    }
    if (selectedEmployees.length > 0) {
      return selectedEmployees.map(e => e.nombre || e.name).join(", ");
    }
    return "Ninguno";
  };

  // Verificar si hay chips seleccionados
  const hasChips = isTodosSelected || selectedEmployees.length > 0;

  return (
    <div className="reports-home">
      <h2 className="title-main">Reportes e Historial</h2>

      <div className="control-panel-right">
        <button className="back-button" onClick={() => navigate("/employees")}>
          ← Volver
        </button>
      </div>

      {/* MODAL DE EMPLEADOS */}
      {showEmployeeModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3>Seleccionar Empleados</h3>
              <button className="modal-close" onClick={() => setShowEmployeeModal(false)}>
                ✖
              </button>
            </div>

            <div className="modal-content">
              <div className="employee-grid">
                <button
                  className="employee-item"
                  onClick={handleSelectTodos}
                >
                  Todos los empleados
                </button>
                {employees.map((emp) => (
                  <button
                    key={emp.id}
                    className={`employee-item ${selectedEmployees.some(e => e.id === emp.id) ? 'selected' : ''}`}
                    onClick={() => handleSelectEmployee(emp)}
                  >
                    {emp.nombre || emp.name}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE CONFIRMACIÓN */}
      {confirmModal.visible && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3>{confirmModal.title}</h3>
              <button className="modal-close" onClick={cerrarConfirmModal}>
                ✖
              </button>
            </div>
            <div className="modal-content">
              {confirmModal.message.split("\n").map((line, idx) => (
                <p key={idx}>{line}</p>
              ))}
            </div>
            <div className="modal-footer">
              <button className="modal-save" onClick={cerrarConfirmModal}>
                Aceptar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE VISTA PREVIA */}
      {showPreviewModal && previewData && (
        <div className="preview-overlay" onClick={() => setShowPreviewModal(false)}>
          <div className="preview-modal" onClick={(e) => e.stopPropagation()}>
            <div className="preview-header">
              <span className="preview-title">Vista Previa</span>
              <button className="preview-close" onClick={() => setShowPreviewModal(false)}>
                <FaTimes />
              </button>
            </div>

            <div className="preview-content">
              <div className="preview-info">
                <h4 className="preview-nombre">{previewData.nombre}</h4>
                <p className="preview-total">
                  Total de registros: {previewData.datos.length}
                </p>
              </div>

              <div className="preview-table-container">
                <table className="preview-table">
                  <thead>
                    <tr>
                      <th>Empleado</th>
                      <th>Fecha</th>
                      <th>Hora Entrada</th>
                      <th>Hora Salida</th>
                    </tr>
                  </thead>
                  <tbody>
                    {previewData.datos.map((d, index) => (
                      <tr key={index}>
                        <td>{d.nombreEmpleado || "N/A"}</td>
                        <td>{new Date(d.fecha).toLocaleDateString("es-MX")}</td>
                        <td>
                          {new Date(d.horaEntrada).toLocaleTimeString("es-MX", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </td>
                        <td>
                          {d.horaSalida
                            ? new Date(d.horaSalida).toLocaleTimeString("es-MX", {
                                hour: "2-digit",
                                minute: "2-digit",
                              })
                            : "N/A"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="main-grid">
        {/* PANEL IZQUIERDO */}
        <div className="left-panel">
          <h3 className="panel-title">Parámetros</h3>

          <div className="search-row">
            <div className="search-input-wrapper-container">
              {/* Chips dentro del contenedor que simula el input */}
              {isTodosSelected ? (
                <div className="employee-chip-inline">
                  <span>Todos los empleados</span>
                  <button
                    type="button"
                    className="chip-close-inline"
                    onClick={clearAllSelection}
                  >
                    ✕
                  </button>
                </div>
              ) : (
                selectedEmployees.map((emp) => (
                  <div key={emp.id} className="employee-chip-inline">
                    <span>{emp.nombre || emp.name}</span>
                    <button
                      type="button"
                      className="chip-close-inline"
                      onClick={() => handleRemoveEmployee(emp.id)}
                    >
                      ✕
                    </button>
                  </div>
                ))
              )}
              
              {/* Input invisible que solo muestra placeholder cuando no hay chips */}
              <input
                className={`search-input-inline ${hasChips ? 'has-chips' : ''}`}
                placeholder={hasChips ? '' : "Haz clic en 'Buscar' para seleccionar empleados"}
                readOnly
              />
            </div>
            <button className="btn-search" onClick={() => setShowEmployeeModal(true)}>
              Buscar
            </button>
          </div>

          <div className="filters-grid">
            <div className="input-group">
              <label>Fecha de inicio</label>
              <input
                type="date"
                name="fechaInicio"
                value={filters.fechaInicio}
                onChange={handleChange}
              />
            </div>

            <div className="input-group">
              <label>Hora de entrada</label>
              <input
                type="time"
                name="horaEntrada"
                value={filters.horaEntrada}
                onChange={handleChange}
              />
            </div>

            <div className="input-group">
              <label>Fecha de fin</label>
              <input
                type="date"
                name="fechaFin"
                value={filters.fechaFin}
                onChange={handleChange}
              />
            </div>

            <div className="input-group">
              <label>Hora de salida</label>
              <input
                type="time"
                name="horaSalida"
                value={filters.horaSalida}
                onChange={handleChange}
              />
            </div>
          </div>

          <div className="input-group full">
            <label>Tiempo total trabajado</label>
            <input
              type="text"
              name="horasTrabajadas"
              placeholder="Se calcula al generar el reporte (ej. 175 h)"
              value={filters.horasTrabajadas}
              onChange={handleChange}
            />
          </div>

          <button
            className="btn-report"
            onClick={handleGenerarReporte}
            disabled={loading}
          >
            {loading ? "GENERANDO..." : "GENERAR REPORTE"}
          </button>
        </div>

        {/* PANEL DERECHO - RESUMEN */}
        <div className="right-panel">
          <h3 className="panel-title">Parámetros</h3>

          <div className="summary-card">
            <div className="summary-row">
              <span className="summary-label">Empleado(s)</span>
              <span className="summary-value">{getSearchSummary()}</span>
            </div>
            <div className="summary-row">
              <span className="summary-label">Fecha inicio</span>
              <span className="summary-value">
                {filters.fechaInicio || "N/A"}
              </span>
            </div>
            <div className="summary-row">
              <span className="summary-label">Hora entrada</span>
              <span className="summary-value">
                {filters.horaEntrada || "N/A"}
              </span>
            </div>
            <div className="summary-row">
              <span className="summary-label">Fecha fin</span>
              <span className="summary-value">
                {filters.fechaFin || "N/A"}
              </span>
            </div>
            <div className="summary-row">
              <span className="summary-label">Hora salida</span>
              <span className="summary-value">
                {filters.horaSalida || "N/A"}
              </span>
            </div>
            <div className="summary-row summary-row-strong">
              <span className="summary-label">Tiempo total trabajado</span>
              <span className="summary-value">
                {filters.horasTrabajadas || "N/A"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* TABLA DE HISTORIAL */}
      <div className="table-container" key={refreshKey}>
        <table>
          <thead>
            <tr>
              <th>NOMBRE</th>
              <th>FECHA</th>
              <th>VER</th>
              <th>DESCARGAR</th>
              <th>ELIMINAR</th>
            </tr>
          </thead>

          <tbody>
            {historial.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ textAlign: "center", padding: 12 }}>
                  No se encontraron reportes.
                </td>
              </tr>
            ) : (
              historial.map((h) => (
                <tr key={h.id}>
                  <td>{h.nombre}</td>
                  <td>{h.fecha}</td>
                  <td
                    onClick={() => handleVer(h)}
                    style={{ cursor: "pointer", textAlign: "center" }}
                  >
                    <FaEye className="icon" />
                  </td>
                  <td
                    onClick={() => handleDescargar(h)}
                    style={{ cursor: "pointer", textAlign: "center" }}
                  >
                    <FaDownload className="icon" />
                  </td>
                  <td
                    onClick={() => handleEliminarReporte(h)}
                    style={{ cursor: "pointer", textAlign: "center" }}
                  >
                    <FaTrash className="icon icon-delete" />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ReportsHome;