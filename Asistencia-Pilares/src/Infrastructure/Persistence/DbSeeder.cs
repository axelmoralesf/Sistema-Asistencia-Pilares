using System;
using System.Linq;
using Core.Entities;
using AsistenciaAPI.Infrastructure.Services;
using AsistenciaAPI.Application.Common.Interfaces;

namespace AsistenciaAPI.Infrastructure.Persistence
{
    public class DbSeeder : ISeeder
    {
        private readonly AsistenciaDbContext _context;
        private readonly IPasswordHasher _hasher;
        private readonly Microsoft.Extensions.Configuration.IConfiguration _configuration;

        public DbSeeder(AsistenciaDbContext context, IPasswordHasher hasher, Microsoft.Extensions.Configuration.IConfiguration configuration)
        {
            _context = context;
            _hasher = hasher;
            _configuration = configuration;
        }

        public void Seed()
        {
            // Si ya hay datos, no sembrar de nuevo
            if (_context.Areas.Any() || _context.Roles.Any() || _context.Empleados.Any())
            {
                return;
            }

            // Areas
            var areaAdmin = new Area { Nombre = "Administración" };
            var areaIT = new Area { Nombre = "TI" };
            var areaFin = new Area { Nombre = "Finanzas" };

            _context.Areas.AddRange(areaAdmin, areaIT, areaFin);

            // Roles
            var rolAdmin = new Rol { Nombre = "Administrador" };
            var rolDev = new Rol { Nombre = "Desarrollador" };
            var rolGerente = new Rol { Nombre = "Gerente" };
            var rolAnalista = new Rol { Nombre = "Analista" };

            _context.Roles.AddRange(rolAdmin, rolDev, rolGerente, rolAnalista);

            _context.SaveChanges();

            // Empleados: varios con distintos horarios y roles
            // Crear un usuario administrador por defecto (desarrollo). Cambia la contraseña en producción.
            var defaultAdminPassword = _configuration["Admin:DefaultPassword"];
            if (string.IsNullOrWhiteSpace(defaultAdminPassword))
            {
                // Fallback a una contraseña por defecto de desarrollo si no está configurada
                defaultAdminPassword = "Admin123!";
            }

            var admin = new Empleado
            {
                IdEmpleadoExterno = "admin",
                Nombre = "Administrador del Sistema",
                EstaActivo = true,
                EsAdmin = true,
                AreaId = areaAdmin.Id,
                RolId = rolAdmin.Id,
                PasswordHash = _hasher.Hash(defaultAdminPassword),
                Email = "admin@example.com",
                Telefono = "123-456-7890" 
            };

            var empleados = new[]
            {
                admin
            };

            _context.Empleados.AddRange(empleados);
            _context.SaveChanges();

            // Horarios laborales: crear para cada empleado varios dias
            var horarios = empleados.SelectMany((e, idx) => new[]
            {
                new HorarioLaboral { Dia = DayOfWeek.Monday, HoraInicio = new TimeSpan(9,0,0), HoraFin = new TimeSpan(18,0,0), EmpleadoId = e.Id },
                new HorarioLaboral { Dia = DayOfWeek.Tuesday, HoraInicio = new TimeSpan(9,0,0), HoraFin = new TimeSpan(18,0,0), EmpleadoId = e.Id },
                new HorarioLaboral { Dia = DayOfWeek.Wednesday, HoraInicio = new TimeSpan(9,0,0), HoraFin = new TimeSpan(18,0,0), EmpleadoId = e.Id },
            }).ToArray();

            _context.HorariosLaborales.AddRange(horarios);
            _context.SaveChanges();

            // Registros de asistencia: generar varios dias por empleado
            var today = DateTime.UtcNow.Date;
            var registros = empleados.SelectMany((e, idx) => Enumerable.Range(0, 5).Select(offset => new RegistroAsistencia
            {
                Fecha = today.AddDays(-offset),
                HoraEntrada = new TimeSpan(9 + (idx % 2), 0, 0),
                HoraSalida = new TimeSpan(17 + (idx % 3), 30, 0),
                EmpleadoId = e.Id
            })).ToArray();

            // Para empleados inactivos no generar registros recientes
            registros = registros.Where(r => !empleados.Any(emp => !emp.EstaActivo && emp.Id == r.EmpleadoId && r.Fecha > today.AddDays(-30))).ToArray();

            _context.RegistrosAsistencia.AddRange(registros);
            _context.SaveChanges();
        }
    }
}
