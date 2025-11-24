using System.Threading;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Core.Entities;

namespace AsistenciaAPI.Application.Common.Interfaces
{
    public interface IApplicationDbContext
    {
        DbSet<Empleado> Empleados { get; }
        DbSet<Area> Areas { get; }
        DbSet<Rol> Roles { get; }
        DbSet<HorarioLaboral> HorariosLaborales { get; }
        DbSet<RegistroAsistencia> RegistrosAsistencia { get; }
        DbSet<ReporteGuardado> ReportesGuardados { get; }
        
        Task<int> SaveChangesAsync(CancellationToken cancellationToken = default);
    }
}
