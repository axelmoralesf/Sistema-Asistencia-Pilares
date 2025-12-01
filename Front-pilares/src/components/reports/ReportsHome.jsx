// Modificado: Corrección multi-empleado para descarga
// En la función handleDescargar reemplaza la lógica original por esta
const handleDescargar = async (item) => {
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

    // Obtener los IDs de empleados guardados para este reporte
    const empleadoIds = reporteEmpleadosMap[item.id];
    let request;
    if (empleadoIds === null || empleadoIds === undefined) {
      request = {
        empleadoId: item.empleadoId || null,
        fechaInicio: item.fechaInicio,
        fechaFin: item.fechaFin,
      };
    } else if (empleadoIds.length === 1) {
      request = {
        empleadoId: empleadoIds[0],
        fechaInicio: item.fechaInicio,
        fechaFin: item.fechaFin,
      };
    } else {
      // Modifica el backend para recibir empleadoIds si necesitas exportar por múltiples empleados
      request = {
        empleadoIds: empleadoIds,
        fechaInicio: item.fechaInicio,
        fechaFin: item.fechaFin,
      };
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

// El resto del archivo se mantiene igual. Aplica este bloque dentro de ReportsHome.jsx con tu lógica contextual.