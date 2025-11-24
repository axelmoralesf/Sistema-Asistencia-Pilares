using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Threading.Tasks;
using AsistenciaAPI.Application.Common.Interfaces;
using AsistenciaAPI.Application.DTOs;
using ClosedXML.Excel;
using Microsoft.EntityFrameworkCore;
using Core.Entities;

namespace AsistenciaAPI.Infrastructure.Services
{
    public class ReporteService : IReporteService
    {
        private readonly IApplicationDbContext _db;

        public ReporteService(IApplicationDbContext db)
        {
            _db = db ?? throw new ArgumentNullException(nameof(db));
        }

        public async Task<List<ReporteFilaDto>> ObtenerReporteAsync(ReporteRequestDto request)
        {
            if (request is null) throw new ArgumentNullException(nameof(request));

            var query = _db.RegistrosAsistencia
                .AsNoTracking()
                .Include(r => r.Empleado)
                .Where(r => r.Fecha >= request.FechaInicio.Date && r.Fecha <= request.FechaFin.Date);

            if (request.EmpleadoId.HasValue)
            {
                query = query.Where(r => r.EmpleadoId == request.EmpleadoId.Value);
            }

            var registrosDb = await query
                .OrderBy(r => r.Empleado.Nombre)
                .ThenBy(r => r.Fecha)
                .ToListAsync();

            var registros = registrosDb
                .OrderBy(r => r.Empleado?.Nombre ?? string.Empty)
                .ThenBy(r => r.Fecha)
                .ThenBy(r => r.HoraEntrada ?? TimeSpan.Zero)
                .ToList();

            var filas = registros.Select(r => new ReporteFilaDto
            {
                NombreEmpleado = r.Empleado?.Nombre ?? string.Empty,
                Fecha = r.Fecha.Date,
                HoraEntrada = r.HoraEntrada.HasValue ? r.Fecha.Date.Add(r.HoraEntrada.Value) : r.Fecha.Date,
                HoraSalida = r.HoraSalida.HasValue ? r.Fecha.Date.Add(r.HoraSalida.Value) : (DateTime?)null
            })
            .ToList();

            return filas;
        }

        public async Task<byte[]> ExportarReporteExcelAsync(ReporteRequestDto request)
        {
            var filas = await ObtenerReporteAsync(request);

            using var workbook = new XLWorkbook();
            var ws = workbook.Worksheets.Add("Reporte");

            // ============================
            // 1. Logo de Pilares arriba
            // ============================
            var logoPath = Path.Combine(AppContext.BaseDirectory, "Assets", "Logo.png");
            if (File.Exists(logoPath))
            {
                var pic = ws.AddPicture(logoPath);
                pic.MoveTo(ws.Cell("A1"));
                pic.Height = 60;   // píxeles aprox
                pic.Width  = 160;
            }

            // Dejamos un poco más de espacio después del logo
            int currentRow = 6;

            // ============================
            // 2. Título del reporte
            // ============================
            ws.Cell(currentRow, 1).Value = "Reporte de Asistencia - PILARES";
            ws.Range(currentRow, 1, currentRow, 4).Merge();
            ws.Range(currentRow, 1, currentRow, 4).Style
                .Font.SetBold()
                .Font.SetFontSize(14)
                .Font.SetFontColor(XLColor.White)
                .Fill.SetBackgroundColor(XLColor.FromHtml("#0C3175"))
                .Alignment.SetHorizontal(XLAlignmentHorizontalValues.Center)
                .Alignment.SetVertical(XLAlignmentVerticalValues.Center);
            currentRow++;

            // Subtítulo con fecha de generación
            ws.Cell(currentRow, 1).Value = $"Generado: {DateTime.Now:dd/MM/yyyy HH:mm}";
            ws.Range(currentRow, 1, currentRow, 4).Merge();
            ws.Range(currentRow, 1, currentRow, 4).Style
                .Font.SetFontSize(10)
                .Alignment.SetHorizontal(XLAlignmentHorizontalValues.Center);
            currentRow += 2;

            // ============================
            // 3. SECCIÓN DE PARÁMETROS DE BÚSQUEDA
            // ============================
            ws.Cell(currentRow, 1).Value = "PARÁMETROS DE BÚSQUEDA";
            ws.Range(currentRow, 1, currentRow, 2).Merge();
            ws.Range(currentRow, 1, currentRow, 2).Style
                .Font.SetBold()
                .Font.SetFontSize(11)
                .Fill.SetBackgroundColor(XLColor.FromHtml("#E8F0F8"))
                .Border.SetBottomBorder(XLBorderStyleValues.Thin);
            currentRow++;

            // Nombre del empleado (o "Todos")
            string nombreEmpleado = "Todos";
            if (request.EmpleadoId.HasValue && filas.Count > 0)
            {
                nombreEmpleado = filas.First().NombreEmpleado;
            }

            // Hora mínima de entrada
            TimeSpan? horaMinEntrada = null;
            if (filas.Count > 0)
            {
                var entradas = filas
                    .Where(f => f.HoraEntrada.TimeOfDay != TimeSpan.Zero)
                    .Select(f => f.HoraEntrada.TimeOfDay)
                    .ToList();

                if (entradas.Count > 0)
                    horaMinEntrada = entradas.Min();
            }

            // Hora máxima de salida
            TimeSpan? horaMaxSalida = null;
            if (filas.Count > 0)
            {
                var salidas = filas
                    .Where(f => f.HoraSalida.HasValue && f.HoraSalida.Value.TimeOfDay != TimeSpan.Zero)
                    .Select(f => f.HoraSalida.Value.TimeOfDay)
                    .ToList();

                if (salidas.Count > 0)
                    horaMaxSalida = salidas.Max();
            }

            // Total de horas trabajadas
            TimeSpan totalHoras = TimeSpan.Zero;
            foreach (var f in filas)
            {
                if (f.HoraEntrada != null && f.HoraSalida.HasValue)
                {
                    var duracion = f.HoraSalida.Value - f.HoraEntrada;
                    if (duracion.TotalSeconds > 0)
                    {
                        totalHoras = totalHoras.Add(duracion);
                    }
                }
            }

            // Total en forma compacta: X h / Y m / Z s
            string totalSimple;
            if (totalHoras.TotalHours >= 1)
            {
                int horas = (int)Math.Floor(totalHoras.TotalHours);
                totalSimple = $"{horas} h";
            }
            else if (totalHoras.TotalMinutes >= 1)
            {
                int minutos = (int)Math.Floor(totalHoras.TotalMinutes);
                totalSimple = $"{minutos} m";
            }
            else
            {
                int segundos = (int)Math.Floor(totalHoras.TotalSeconds);
                totalSimple = $"{segundos} s";
            }

            string totalHorasLabel = $"Total Horas Trabajadas {totalSimple}";
            string totalHorasHms   = $"{(int)totalHoras.TotalHours:D2}:{totalHoras.Minutes:D2}:{totalHoras.Seconds:D2}";

            var parametros = new List<(string Etiqueta, string Valor)>
            {
                ("Nombre del Empleado", nombreEmpleado),
                ("Fecha de Inicio", request.FechaInicio.ToString("dd/MM/yyyy")),
                ("Fecha de Fin", request.FechaFin.ToString("dd/MM/yyyy")),
                ("Hora Mínima Entrada", horaMinEntrada.HasValue ? horaMinEntrada.Value.ToString(@"hh\:mm") : "N/A"),
                ("Hora Máxima Salida", horaMaxSalida.HasValue ? horaMaxSalida.Value.ToString(@"hh\:mm") : "N/A"),
                (totalHorasLabel, totalHorasHms)
            };

            foreach (var p in parametros)
            {
                ws.Cell(currentRow, 1).Value = p.Etiqueta;
                ws.Cell(currentRow, 1).Style.Font.SetBold();
                ws.Cell(currentRow, 2).Value = p.Valor;
                currentRow++;
            }

            // Espacio antes de la tabla
            currentRow += 1;

            // ============================
            // 4. Encabezados de tabla
            // ============================
            int headerRow = currentRow;
            ws.Cell(headerRow, 1).Value = "Empleado";
            ws.Cell(headerRow, 2).Value = "Fecha";
            ws.Cell(headerRow, 3).Value = "Hora Entrada";
            ws.Cell(headerRow, 4).Value = "Hora Salida";

            var headerRange = ws.Range(headerRow, 1, headerRow, 4);
            headerRange.Style
                .Font.SetBold()
                .Font.SetFontColor(XLColor.White)
                .Fill.SetBackgroundColor(XLColor.FromHtml("#0C3175"))
                .Alignment.SetHorizontal(XLAlignmentHorizontalValues.Center)
                .Alignment.SetVertical(XLAlignmentVerticalValues.Center)
                .Border.SetOutsideBorder(XLBorderStyleValues.Thin)
                .Border.SetInsideBorder(XLBorderStyleValues.Thin);

            currentRow++;

            // ============================
            // 5. Datos
            // ============================
            int dataStartRow = currentRow;

            foreach (var f in filas)
            {
                ws.Cell(currentRow, 1).Value = f.NombreEmpleado;
                ws.Cell(currentRow, 2).Value = f.Fecha;
                ws.Cell(currentRow, 3).Value = f.HoraEntrada;
                ws.Cell(currentRow, 4).Value = f.HoraSalida;
                currentRow++;
            }

            int dataEndRow = currentRow - 1;

            if (filas.Count > 0)
            {
                var dataRange = ws.Range(dataStartRow, 1, dataEndRow, 4);

                dataRange.Style
                    .Border.SetOutsideBorder(XLBorderStyleValues.Thin)
                    .Border.SetInsideBorder(XLBorderStyleValues.Thin)
                    .Alignment.SetVertical(XLAlignmentVerticalValues.Center);

                ws.Column(2).Style.DateFormat.Format = "dd/MM/yyyy";
                ws.Column(3).Style.DateFormat.Format = "HH:mm";
                ws.Column(4).Style.DateFormat.Format = "HH:mm";

                for (int row = dataStartRow; row <= dataEndRow; row++)
                {
                    if ((row - dataStartRow) % 2 == 1)
                    {
                        ws.Range(row, 1, row, 4)
                          .Style.Fill.SetBackgroundColor(XLColor.FromHtml("#F0F4F8"));
                    }
                }
            }

            // ============================
            // 6. Ajuste de columnas
            // ============================
            ws.Column(1).Width = 30; // Empleado
            ws.Column(2).Width = 15; // Fecha
            ws.Column(3).Width = 15; // Hora Entrada
            ws.Column(4).Width = 15; // Hora Salida

            ws.Rows().AdjustToContents();

            using var ms = new MemoryStream();
            workbook.SaveAs(ms);
            return ms.ToArray();
        }

        // ============================
        // 7. REPORTES GUARDADOS
        // ============================

        public async Task<ReporteGuardadoDto> GuardarReporteAsync(GuardarReporteDto dto, string usuarioGenerador)
        {
            var reporte = new ReporteGuardado
            {
                Id = Guid.NewGuid(),
                Nombre = dto.Nombre,
                FechaGeneracion = DateTime.UtcNow,
                FechaInicio = dto.FechaInicio,
                FechaFin = dto.FechaFin,
                EmpleadoId = dto.EmpleadoId,
                UsuarioGenerador = usuarioGenerador
            };

            _db.ReportesGuardados.Add(reporte);
            await _db.SaveChangesAsync();

            return new ReporteGuardadoDto
            {
                Id = reporte.Id,
                Nombre = reporte.Nombre,
                Fecha = reporte.FechaGeneracion.ToLocalTime().ToString("dd/MM/yyyy"),
                FechaInicio = reporte.FechaInicio,
                FechaFin = reporte.FechaFin,
                EmpleadoId = reporte.EmpleadoId,
                UsuarioGenerador = reporte.UsuarioGenerador
            };
        }

        public async Task<List<ReporteGuardadoDto>> ObtenerHistorialAsync()
        {
            var reportes = await _db.ReportesGuardados
                .AsNoTracking()
                .OrderByDescending(r => r.FechaGeneracion)
                .ToListAsync();

            return reportes.Select(r => new ReporteGuardadoDto
            {
                Id = r.Id,
                Nombre = r.Nombre,
                Fecha = r.FechaGeneracion.ToLocalTime().ToString("dd/MM/yyyy"),
                FechaInicio = r.FechaInicio,
                FechaFin = r.FechaFin,
                EmpleadoId = r.EmpleadoId,
                UsuarioGenerador = r.UsuarioGenerador
            }).ToList();
        }

        public async Task<bool> EliminarReporteAsync(Guid id)
        {
            var reporte = await _db.ReportesGuardados.FindAsync(id);
            if (reporte == null) return false;

            _db.ReportesGuardados.Remove(reporte);
            await _db.SaveChangesAsync();
            return true;
        }
    }
}
