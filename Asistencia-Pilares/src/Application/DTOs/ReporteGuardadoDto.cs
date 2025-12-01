using System;
using System.Collections.Generic;

namespace AsistenciaAPI.Application.DTOs
{
    public record ReporteGuardadoDto
    {
        public Guid Id { get; init; }
        public string Nombre { get; init; } = string.Empty;
        public string Fecha { get; init; } = string.Empty;
        public DateTime FechaInicio { get; init; }
        public DateTime FechaFin { get; init; }
        public Guid? EmpleadoId { get; init; }
        public List<Guid>? EmpleadoIds { get; init; }
        public string UsuarioGenerador { get; init; } = string.Empty;
    }

    public record GuardarReporteDto
    {
        public string Nombre { get; init; } = string.Empty;
        public DateTime FechaInicio { get; init; }
        public DateTime FechaFin { get; init; }
        public Guid? EmpleadoId { get; init; }
        public List<Guid>? EmpleadoIds { get; init; }
    }
}
