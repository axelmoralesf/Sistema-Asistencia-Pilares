using System;

namespace AsistenciaAPI.Application.DTOs
{
    public record ReporteRequestDto
    {
        public DateTime FechaInicio { get; init; }
        public DateTime FechaFin { get; init; }
        public Guid? EmpleadoId { get; init; }
    }
}
