using System;

namespace Core.Entities
{
    public class ReporteGuardado
    {
        public Guid Id { get; set; }
        public string Nombre { get; set; } = string.Empty;
        public DateTime FechaGeneracion { get; set; }
        public DateTime FechaInicio { get; set; }
        public DateTime FechaFin { get; set; }
        public Guid? EmpleadoId { get; set; }
        public string UsuarioGenerador { get; set; } = string.Empty; // Nombre del admin que lo generó
        
        // Relación opcional con Empleado
        public Empleado? Empleado { get; set; }
    }
}
