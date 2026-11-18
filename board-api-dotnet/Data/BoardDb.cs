using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace Board.Api.Data;

public sealed class BoardUser
{
    public int Id { get; set; }
    public string Email { get; set; } = "";
    public string Nickname { get; set; } = "";
    public string PasswordHash { get; set; } = "";
    public string Role { get; set; } = "user";
}

public sealed class Post
{
    public int Id { get; set; }
    public int UserId { get; set; }
    public BoardUser Author { get; set; } = null!;
    public string Title { get; set; } = "";
    public string Body { get; set; } = "";
    public string TagsJson { get; set; } = "[]";
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    public List<Comment> Comments { get; set; } = [];
}

public sealed class Comment
{
    public int Id { get; set; }
    public int PostId { get; set; }
    public Post Post { get; set; } = null!;
    public int UserId { get; set; }
    public BoardUser Author { get; set; } = null!;
    public string Body { get; set; } = "";
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

public sealed class BoardDb(DbContextOptions<BoardDb> options) : DbContext(options)
{
    public DbSet<BoardUser> Users => Set<BoardUser>();
    public DbSet<Post> Posts => Set<Post>();
    public DbSet<Comment> Comments => Set<Comment>();

    protected override void OnModelCreating(ModelBuilder model)
    {
        model.Entity<BoardUser>(e =>
        {
            e.HasIndex(x => x.Email).IsUnique();
            e.Property(x => x.Email).HasMaxLength(254);
            e.Property(x => x.Nickname).HasMaxLength(50);
            e.Property(x => x.Role).HasMaxLength(20);
        });
        model.Entity<Post>(e =>
        {
            e.Property(x => x.Title).HasMaxLength(200);
            e.Property(x => x.Body).HasMaxLength(20000);
            e.HasIndex(x => new { x.CreatedAt, x.Id });
            e.HasOne(x => x.Author).WithMany().HasForeignKey(x => x.UserId).OnDelete(DeleteBehavior.Restrict);
        });
        model.Entity<Comment>(e =>
        {
            e.Property(x => x.Body).HasMaxLength(2000);
            e.HasOne(x => x.Author).WithMany().HasForeignKey(x => x.UserId).OnDelete(DeleteBehavior.Restrict);
            e.HasOne(x => x.Post).WithMany(x => x.Comments).HasForeignKey(x => x.PostId).OnDelete(DeleteBehavior.Cascade);
        });
    }

    public static async Task SeedAsync(BoardDb db)
    {
        var hasher = new PasswordHasher<BoardUser>();
        if (await db.Users.AnyAsync()) return;
        var user = new BoardUser { Email = "test@example.com", Nickname = "test" };
        var admin = new BoardUser { Email = "admin@example.com", Nickname = "admin", Role = "admin" };
        user.PasswordHash = hasher.HashPassword(user, "password123");
        admin.PasswordHash = hasher.HashPassword(admin, "password123");
        db.Users.AddRange(user, admin);
        db.Posts.AddRange(Enumerable.Range(1, 100).Select(i => new Post
        {
            Author = user, Title = $"서버 글 {i}", Body = $"SQL Server가 보관한 본문 {i}",
            CreatedAt = DateTime.UtcNow.AddMinutes(-i), UpdatedAt = DateTime.UtcNow.AddMinutes(-i),
            Comments = [new Comment { Author = user, Body = $"댓글 {i}" }]
        }));
        await db.SaveChangesAsync();
    }
}
