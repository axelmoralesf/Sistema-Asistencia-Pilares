using System.Collections.Generic;
using System.Threading.Tasks;
using AsistenciaAPI.Application.DTOs;
using System;

namespace AsistenciaAPI.Application.Common.Interfaces
{
    public interface IReporteService
    {
        Task<List<ReporteFilaDto>> ObtenerReporteAsync(ReporteRequestDto request);
        Task<byte[]> ExportarReporteExcelAsync(ReporteRequestDto request);
        
        // ✅ NUEVOS MÉTODOS
        Task<ReporteGuardadoDto> GuardarReporteAsync(GuardarReporteDto dto, string usuarioGenerador);
        Task<List<ReporteGuardadoDto>> ObtenerHistorialAsync();
        Task<bool> EliminarReporteAsync(Guid id);
    }
}
