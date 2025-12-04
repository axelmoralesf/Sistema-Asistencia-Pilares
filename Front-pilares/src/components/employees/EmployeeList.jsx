import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import './EmployeeList.css';
import ConfirmModal from './../common/ConfirmModal';
import SuccessModal from './../common/SuccessModal';
import LoadingSpinner from './../common/LoadingSpinner';

const API_BASE_URL = 'http://localhost:5172';
const ITEMS_PER_PAGE = 6;

const EmployeeList = () => {
  const navigate = useNavigate();
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterActive, setFilterActive] = useState('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalData, setModalData] = useState({
    isNew: true,
    employee: null
  });

  const [currentPage, setCurrentPage] = useState(1);
  const [showConfirm, setShowConfirm] = useState(false);
  const [employeeToDelete, setEmployeeToDelete] = useState(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [isAdminInModal, setIsAdminInModal] = useState(false);
  const [roleValue, setRoleValue] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const token = localStorage.getItem('authToken');

  // ============ CERRAR SESIÓN (con useCallback) ============
  const handleLogout = useCallback(() => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('userData');
    localStorage.removeItem('userRole');
    localStorage.removeItem('userId');
    sessionStorage.clear();

    document.cookie.split(';').forEach((c) => {
      document.cookie = c
        .replace(/^ +/, '')
        .replace(/=.*/, '=;expires=' + new Date().toUTCString() + ';path=/');
    });

    navigate('/');
  }, [navigate]);

  // ============ CARGAR EMPLEADOS DESDE EL BACKEND ============
  useEffect(() => {
    const fetchEmployees = async () => {
      setLoading(true);
      try {
        const response = await fetch(`${API_BASE_URL}/empleados`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
        });

        if (response.ok) {
          const data = await response.json();

          const dayNames = {
            0: 'Domingo',
            1: 'Lunes',
            2: 'Martes',
            3: 'Miercoles',
            4: 'Jueves',
            5: 'Viernes',
            6: 'Sabado'
          };

          const transformedData = data.map(emp => {
            const scheduleObj = {
              Lunes: { from: '', to: '' },
              Martes: { from: '', to: '' },
              Miercoles: { from: '', to: '' },
              Jueves: { from: '', to: '' },
              Viernes: { from: '', to: '' },
              Sabado: { from: '', to: '' },
              Domingo: { from: '', to: '' }
            };

            if (emp.horarios && Array.isArray(emp.horarios)) {
              emp.horarios.forEach(horario => {
                const dayName = dayNames[horario.dia];
                if (dayName && scheduleObj[dayName]) {
                  scheduleObj[dayName] = {
                    from: horario.horaInicio ? horario.horaInicio.substring(0, 5) : '',
                    to: horario.horaFin ? horario.horaFin.substring(0, 5) : ''
                  };
                }
              });
            }

            return {
              id: emp.idEmpleadoExterno || emp.IdEmpleadoExterno,
              dbId: emp.id || emp.Id,
              name: emp.nombre || emp.Nombre,
              email: emp.email || emp.Email || '',
              phone: emp.telefono || emp.Telefono || '',
              role: emp.nombreRol || emp.NombreRol || '',
              area: emp.nombreArea || emp.NombreArea || '',
              active: emp.estaActivo ?? emp.EstaActivo,
              admin: emp.esAdmin ?? emp.EsAdmin,
              schedule: scheduleObj
            };
          });

          setEmployees(transformedData);
        } else if (response.status === 401) {
          alert('No autorizado. Por favor inicia sesión nuevamente.');
          handleLogout();
        } else {
          alert('Error al cargar empleados');
        }
      } catch (error) {
        console.error('Error:', error);
        alert('No se pudo conectar al servidor');
      }
      setLoading(false);
    };

    if (token) {
      fetchEmployees();
    } else {
      navigate('/');
    }
  }, [token, navigate, handleLogout]);

  // ============ STICKY COLUMN FIX ============
  useEffect(() => {
    const applyStickyFix = () => {
      const lastCells = document.querySelectorAll(
        '.employee-table th:nth-child(8), .employee-table td:nth-child(8)'
      );
      lastCells.forEach(cell => {
        cell.style.position = 'sticky';
        cell.style.right = '0';
      });
    };

    if (employees.length > 0) {
      setTimeout(applyStickyFix, 100);
    }
  }, [employees, currentPage]);

  // ============ FILTRADO Y BÚSQUEDA ============
  const filteredEmployees = useMemo(() => {
    return employees.filter(emp => {
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        emp.name.toLowerCase().includes(q) ||
        emp.id.toLowerCase().includes(q) ||
        emp.email.toLowerCase().includes(q);

      const matchesFilter =
        filterActive === 'all' ||
        (filterActive === 'active' && emp.active) ||
        (filterActive === 'inactive' && !emp.active);

      return matchesSearch && matchesFilter;
    });
  }, [employees, searchQuery, filterActive]);

  // ============ PAGINACIÓN ============
  const totalPages = Math.ceil(filteredEmployees.length / ITEMS_PER_PAGE);

  const paginatedEmployees = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    return filteredEmployees.slice(startIndex, endIndex);
  }, [filteredEmployees, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filterActive]);

  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber);
    document.querySelector('.table-container')?.scrollIntoView({
      behavior: 'smooth',
      block: 'start'
    });
  };

  const handlePreviousPage = () => {
    if (currentPage > 1) handlePageChange(currentPage - 1);
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) handlePageChange(currentPage + 1);
  };

  // ============ ADMIN SWITCH ============
  const handleAdminSwitchChange = (e) => {
    const isChecked = e.target.checked;
    setIsAdminInModal(isChecked);
    if (isChecked) {
      setRoleValue('Administrador');
    } else {
      setRoleValue('');
    }
  };

  // ============ AGREGAR EMPLEADO ============
  const handleAddEmployee = () => {
    setModalData({
      isNew: true,
      employee: {
        id: '',
        name: '',
        email: '',
        phone: '',
        role: '',
        area: '',
        password: '',
        schedule: {
          Lunes: { from: '', to: '' },
          Martes: { from: '', to: '' },
          Miercoles: { from: '', to: '' },
          Jueves: { from: '', to: '' },
          Viernes: { from: '', to: '' },
          Sabado: { from: '', to: '' },
          Domingo: { from: '', to: '' }
        }
      }
    });
    setIsAdminInModal(false);
    setRoleValue('');
    setShowPassword(false);
    setIsModalOpen(true);
  };

  // ============ EDITAR EMPLEADO ============
  const handleEditEmployee = (employee) => {
    // Solo permitir editar si el empleado está activo
    if (!employee.active) {
      alert('No se pueden editar los datos de empleados inactivos. Activa el empleado primero.');
      return;
    }
    
    setModalData({
      isNew: false,
      employee: { ...employee }
    });
    
    // Detectar si el empleado es administrador - verificar múltiples casos
    const isAdmin = 
      employee.admin === true ||           // booleano true
      employee.admin === 'true' ||         // string 'true'
      employee.admin === 1 ||              // número 1
      employee.admin === 'True' ||         // string con mayúscula
      employee.admin === 'TRUE' ||         // string todo mayúsculas
      (typeof employee.role === 'string' && 
       employee.role.toLowerCase() === 'administrador');  // fallback por rol
    
    // Establecer el estado del switch basado en si el empleado es admin
    setIsAdminInModal(isAdmin);
    
    // Si es admin, establecer roleValue como 'Administrador', sino usar el rol actual
    setRoleValue(isAdmin ? 'Administrador' : (employee.role || ''));
    
    setShowPassword(false);
    setIsModalOpen(true);
  };

  const toggleModal = () => {
    setIsModalOpen(false);
    setShowPassword(false);
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  // ============ GUARDAR (CREAR/EDITAR) ============
  const handleSaveEmployee = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);

    const dayOfWeekMap = {
      'Domingo': 0,
      'Lunes': 1,
      'Martes': 2,
      'Miercoles': 3,
      'Jueves': 4,
      'Viernes': 5,
      'Sabado': 6
    };

    const horariosArray = [];
    ['Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes', 'Sabado', 'Domingo'].forEach(day => {
      const from = formData.get(`${day}-from`);
      const to = formData.get(`${day}-to`);
      if (from && to) {
        horariosArray.push({
          Dia: dayOfWeekMap[day],
          HoraInicio: from + ':00',
          HoraFin: to + ':00'
        });
      }
    });

    const idEmpleadoExterno = modalData.isNew
      ? formData.get('id')
      : modalData.employee.id;

    if (!idEmpleadoExterno) {
      alert('El ID de empleado es obligatorio');
      return;
    }

    const employeeData = {
      IdEmpleadoExterno: idEmpleadoExterno,
      Nombre: formData.get('name'),
      NombreArea: formData.get('area') || '',
      NombreRol: isAdminInModal ? 'Administrador' : (roleValue || ''),
      Horarios: horariosArray,
      EsAdmin: isAdminInModal
    };

    const email = formData.get('email');
    const phone = formData.get('phone');
    const password = formData.get('password');

    if (email) employeeData.Email = email;
    if (phone) employeeData.Telefono = phone;
    
    // Incluir contraseña si se proporciona (tanto para crear como editar)
    if (isAdminInModal && password) {
      employeeData.Password = password;
    }

    setLoading(true);

    const sendRequest = async () => {
      if (modalData.isNew) {
        return fetch(`${API_BASE_URL}/empleados`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify(employeeData)
        });
      } else {
        return fetch(`${API_BASE_URL}/empleados/${modalData.employee.dbId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify(employeeData)
        });
      }
    };

    try {
      const response = await sendRequest();

      if (response.ok || response.status === 204 || response.status === 201) {
        const actionText = modalData.isNew ? 'agregado' : 'actualizado';
        showSuccessNotification(`Empleado ${employeeData.IdEmpleadoExterno} ${actionText} correctamente`);
        setIsModalOpen(false);
        setShowPassword(false);
        setTimeout(() => window.location.reload(), 1500);
      } else {
        let errorBody = null;
        try {
          const text = await response.text();
          errorBody = text ? JSON.parse(text) : null;
        } catch {
          errorBody = null;
        }

        if (response.status === 401) {
          alert('No autorizado. Tu sesión puede haber expirado. Vuelve a iniciar sesión.');
          handleLogout();
        } else if (errorBody && errorBody.errors) {
          let errorMessage = 'Errores de validación:\n';
          Object.keys(errorBody.errors).forEach(key => {
            errorMessage += `\n• ${key}: ${errorBody.errors[key].join(', ')}`;
          });
          alert(errorMessage);
        } else {
          alert('Error al guardar el empleado');
        }

        setLoading(false);
      }
    } catch (error) {
      console.error('Error de conexión:', error);
      alert('No se pudo conectar al servidor');
      setLoading(false);
    }
  };

  // ============ ELIMINAR ============
  const handleDeleteEmployee = (id) => {
    setEmployeeToDelete(id);
    setShowConfirm(true);
  };

  const confirmDelete = async () => {
    if (employeeToDelete) {
      const employee = employees.find(emp => emp.id === employeeToDelete);

      setLoading(true);

      try {
        const response = await fetch(`${API_BASE_URL}/empleados/${employee.dbId}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (response.ok || response.status === 204) {
          setEmployees(employees.filter(emp => emp.id !== employeeToDelete));
          showSuccessNotification(`Empleado ${employeeToDelete} eliminado correctamente`);
        } else {
          alert('Error al eliminar el empleado');
        }
      } catch (error) {
        console.error('Error:', error);
        alert('No se pudo conectar al servidor');
      }

      setLoading(false);
      setEmployeeToDelete(null);
      setShowConfirm(false);
    }
  };

  const cancelDelete = () => {
    setShowConfirm(false);
    setEmployeeToDelete(null);
  };

  // ============ SUCCESS MODAL ============
  const showSuccessNotification = (message) => {
    setSuccessMessage(message);
    setShowSuccess(true);
  };

  const handleCloseSuccess = () => {
    setShowSuccess(false);
    setSuccessMessage('');
  };

  // ============ CAMBIAR ESTADO ============
  const toggleEmployeeStatus = async (id) => {
    const employee = employees.find(emp => emp.id === id);

    try {
      const response = await fetch(
        `${API_BASE_URL}/empleados/${employee.dbId}/estado?activo=${!employee.active}`,
        {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      if (response.ok || response.status === 204) {
        setEmployees(employees.map(emp =>
          emp.id === id ? { ...emp, active: !emp.active } : emp
        ));
      } else {
        alert('Error al cambiar el estado del empleado');
      }
    } catch (error) {
      console.error('Error:', error);
      alert('No se pudo conectar al servidor');
    }
  };

  // ============ LOADING ============
  if (loading) {
    return (
      <LoadingSpinner
        size="large"
        text="Cargando empleados..."
        fullScreen={true}
      />
    );
  }

  // ============ RENDER ============
  return (
    <div className="employee-list-container">
      <h1 className="page-title">Gestión de Empleados</h1>

      {/* Panel de controles */}
      <div className="control-panel">
        <div className="control-panel-center">
          <button className="control-button" onClick={handleAddEmployee}>
            ➕ Agregar Empleado
          </button>
          <button className="control-button" onClick={() => navigate('/reports')}>
            📊 Ver Reportes
          </button>
        </div>

        <button
          className="logout-button"
          onClick={handleLogout}
        >
          ➜] Salir
        </button>
      </div>

      {/* Barra de búsqueda y filtros */}
      <div className="search-filter-bar">
        <input
          type="text"
          placeholder="Buscar por nombre, ID o email..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="search-input"
        />

        <div className="filter-buttons">
          <button
            className={`filter-btn ${filterActive === 'all' ? 'active' : ''}`}
            onClick={() => setFilterActive('all')}
          >
            Todos
          </button>
          <button
            className={`filter-btn ${filterActive === 'active' ? 'active' : ''}`}
            onClick={() => setFilterActive('active')}
          >
            Activos
          </button>
          <button
            className={`filter-btn ${filterActive === 'inactive' ? 'active' : ''}`}
            onClick={() => setFilterActive('inactive')}
          >
            Inactivos
          </button>
        </div>
      </div>

      {/* Tabla de empleados */}
      <div className="table-container">
        <table className="employee-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>NOMBRE</th>
              <th>EMAIL</th>
              <th>TELÉFONO</th>
              <th>ROL</th>
              <th>ÁREA</th>
              <th>ESTADO</th>
              <th>ACCIONES</th>
            </tr>
          </thead>
          <tbody>
            {paginatedEmployees.length > 0 ? (
              paginatedEmployees.map((emp) => (
                <tr key={emp.id} className={emp.active ? '' : 'inactive-row'}>
                  <td>{emp.id}</td>
                  <td>{emp.name}</td>
                  <td>{emp.email || 'N/A'}</td>
                  <td>{emp.phone || 'N/A'}</td>
                  <td>{emp.role}</td>
                  <td>{emp.area}</td>
                  <td>
                    <span className={`status-badge ${emp.active ? 'active' : 'inactive'}`}>
                      {emp.active ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td>
                    <div className="action-buttons">
                      <button
                        className={`btn-edit ${!emp.active ? 'disabled' : ''}`}
                        onClick={() => handleEditEmployee(emp)}
                        title={emp.active ? 'Editar' : 'No se puede editar un empleado inactivo'}
                        disabled={!emp.active}
                      >
                        ✏️
                      </button>
                      <button
                        className="btn-toggle"
                        onClick={() => toggleEmployeeStatus(emp.id)}
                        title={emp.active ? 'Desactivar' : 'Activar'}
                      >
                        {emp.active ? '🔒' : '🔓'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="8" style={{ textAlign: 'center', padding: '40px', color: '#7D323F' }}>
                  No se encontraron empleados
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Paginación */}
      {filteredEmployees.length > ITEMS_PER_PAGE && (
        <div className="pagination-container">
          <div className="pagination-info">
            Mostrando {((currentPage - 1) * ITEMS_PER_PAGE) + 1} - {Math.min(currentPage * ITEMS_PER_PAGE, filteredEmployees.length)} de {filteredEmployees.length} empleados
          </div>

          <div className="pagination-controls">
            <button
              className="pagination-btn"
              onClick={handlePreviousPage}
              disabled={currentPage === 1}
            >
              ← Anterior
            </button>

            <div className="pagination-numbers">
              {[...Array(totalPages)].map((_, index) => {
                const pageNumber = index + 1;
                if (
                  pageNumber === 1 ||
                  pageNumber === totalPages ||
                  (pageNumber >= currentPage - 1 && pageNumber <= currentPage + 1)
                ) {
                  return (
                    <button
                      key={pageNumber}
                      className={`pagination-number ${currentPage === pageNumber ? 'active' : ''}`}
                      onClick={() => handlePageChange(pageNumber)}
                    >
                      {pageNumber}
                    </button>
                  );
                } else if (
                  pageNumber === currentPage - 2 ||
                  pageNumber === currentPage + 2
                ) {
                  return <span key={pageNumber} className="pagination-dots">...</span>;
                }
                return null;
              })}
            </div>

            <button
              className="pagination-btn"
              onClick={handleNextPage}
              disabled={currentPage === totalPages}
            >
              Siguiente →
            </button>
          </div>
        </div>
      )}

      {/* Modal para agregar/editar empleado */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={toggleModal}>
          <div className="add-employee-modal" onClick={(e) => e.stopPropagation()}>
            <h2 className="modal-title">
              {modalData.isNew ? 'Agregar nuevo empleado' : 'Editar empleado'}
            </h2>

            <form className="add-employee-form" onSubmit={handleSaveEmployee}>
              <div className="form-group">
                <label htmlFor="name">Nombre completo *</label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  defaultValue={modalData.employee?.name}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="id">ID de empleado *</label>
                <input
                  type="text"
                  id="id"
                  name="id"
                  defaultValue={modalData.employee?.id}
                  required
                  disabled={!modalData.isNew}
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="email">Email</label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    defaultValue={modalData.employee?.email}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="phone">Teléfono</label>
                  <input
                    type="tel"
                    id="phone"
                    name="phone"
                    defaultValue={modalData.employee?.phone}
                  />
                </div>
              </div>

              <div className="form-group admin-switch-container">
                <label className="admin-switch-label">
                  <span>¿Es Administrador?</span>
                  <label className="switch">
                    <input
                      type="checkbox"
                      checked={isAdminInModal}
                      onChange={handleAdminSwitchChange}
                    />
                    <span className="slider"></span>
                  </label>
                </label>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="role">Rol</label>
                  <input
                    type="text"
                    id="role"
                    name="role"
                    placeholder={isAdminInModal ? 'Administrador (automático)' : 'Ej: Docente, Coordinador, etc.'}
                    value={isAdminInModal ? 'Administrador' : roleValue}
                    onChange={(e) => setRoleValue(e.target.value)}
                    disabled={isAdminInModal}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="area">Área</label>
                  <input
                    type="text"
                    id="area"
                    name="area"
                    placeholder="Ej: Dirección, Cultura, etc."
                    defaultValue={modalData.employee?.area}
                  />
                </div>
              </div>

              {/* Mostrar campo de contraseña para administradores (crear o editar) */}
              {isAdminInModal && (
                <div className="form-group">
                  <label htmlFor="password">
                    Contraseña {modalData.isNew ? '*' : '(opcional - dejar en blanco para mantener la actual)'}
                  </label>
                  <div className="password-input-wrapper">
                    <input
                      type={showPassword ? "text" : "password"}
                      id="password"
                      name="password"
                      required={modalData.isNew}
                      placeholder={modalData.isNew ? "Requerida para administradores" : "Dejar en blanco para no cambiar"}
                    />
                    <button
                      type="button"
                      className="password-toggle-btn"
                      onClick={togglePasswordVisibility}
                      aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                    >
                      {showPassword ? (
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                          <line x1="1" y1="1" x2="23" y2="23"></line>
                        </svg>
                      ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                          <circle cx="12" cy="12" r="3"></circle>
                        </svg>
                      )}
                    </button>
                  </div>
                </div>
              )}

              <div className="horario-section">
                <div className="horario-grid">
                  <div className="grid-label"></div>
                  <div className="grid-day">Lun</div>
                  <div className="grid-day">Mar</div>
                  <div className="grid-day">Mié</div>
                  <div className="grid-day">Jue</div>
                  <div className="grid-day">Vie</div>
                  <div className="grid-day">Sáb</div>
                  <div className="grid-day">Dom</div>

                  <div className="grid-label">Entrada</div>
                  {['Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes', 'Sabado', 'Domingo'].map(day => (
                    <input
                      key={`${day}-from`}
                      type="time"
                      name={`${day}-from`}
                      className="time-input"
                      defaultValue={modalData.employee?.schedule?.[day]?.from || ''}
                    />
                  ))}

                  <div className="grid-label">Salida</div>
                  {['Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes', 'Sabado', 'Domingo'].map(day => (
                    <input
                      key={`${day}-to`}
                      type="time"
                      name={`${day}-to`}
                      className="time-input"
                      defaultValue={modalData.employee?.schedule?.[day]?.to || ''}
                    />
                  ))}
                </div>
              </div>

              <div className="modal-buttons">
                <button
                  type="button"
                  className="cancel-button"
                  onClick={toggleModal}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="submit-button"
                >
                  {modalData.isNew ? 'AGREGAR' : 'GUARDAR'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={showConfirm}
        onClose={cancelDelete}
        onConfirm={confirmDelete}
        message={`¿Estas seguro de eliminar a ${employeeToDelete}?`}
        employeeId={employeeToDelete}
      />

      <SuccessModal
        isOpen={showSuccess}
        onClose={handleCloseSuccess}
        message={successMessage}
        autoCloseDelay={3000}
      />
    </div>
  );
};

export default EmployeeList;