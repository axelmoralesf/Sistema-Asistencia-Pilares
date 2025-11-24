using System;
using System.Security.Claims;
using System.Threading.Tasks;
using AsistenciaAPI.Application.Common.Interfaces;
using AsistenciaAPI.Application.DTOs;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;

namespace AsistenciaAPI.API.Controllers
{
    [ApiController]
    [Route("reportes")]
    [Authorize(Policy = "AdminOnly")]
    public class ReportesController : ControllerBase
    {
        private readonly IReporteService _svc;

        public ReportesController(IReporteService svc)
        {
            _svc = svc;
        }

        [HttpPost]
        public async Task<IActionResult> ObtenerReporte([FromBody] ReporteRequestDto request)
        {
            var filas = await _svc.ObtenerReporteAsync(request);
            return Ok(filas);
        }

        [HttpPost("export")]
        public async Task<IActionResult> ExportarReporte([FromBody] ReporteRequestDto request)
        {
            var contenido = await _svc.ExportarReporteExcelAsync(request);
            var fileName = $"reporte_{DateTime.UtcNow:yyyyMMddHHmmss}.xlsx";
            return File(contenido, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", fileName);
        }

        // ✅ NUEVOS ENDPOINTS

        [HttpPost("guardar")]
        public async Task<IActionResult> GuardarReporte([FromBody] GuardarReporteDto dto)
        {
            var usuario = User.FindFirst(ClaimTypes.Name)?.Value ?? "Desconocido";
            var reporte = await _svc.GuardarReporteAsync(dto, usuario);
            return Ok(reporte);
        }

        [HttpGet("historial")]
        public async Task<IActionResult> ObtenerHistorial()
        {
            var historial = await _svc.ObtenerHistorialAsync();
            return Ok(historial);
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> EliminarReporte(Guid id)
        {
            var eliminado = await _svc.EliminarReporteAsync(id);
            if (!eliminado) return NotFound();
            return NoContent();
        }
    }
}
