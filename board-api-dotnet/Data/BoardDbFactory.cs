using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace Board.Api.Data;

public sealed class BoardDbFactory : IDesignTimeDbContextFactory<BoardDb>
{
    public BoardDb CreateDbContext(string[] args) => new(new DbContextOptionsBuilder<BoardDb>()
        .UseSqlServer(Environment.GetEnvironmentVariable("ConnectionStrings__Board")
            ?? "Server=localhost,14333;Database=AngularBoard;Integrated Security=true;TrustServerCertificate=true")
        .Options);
}
