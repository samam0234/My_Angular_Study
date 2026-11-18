using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using System.Text.Json;
using Board.Api.Data;
using Microsoft.IdentityModel.Tokens;

namespace Board.Api;

public sealed class ApiException(int status, string code, string message, object? fields = null) : Exception(message)
{
    public int Status { get; } = status;
    public string Code { get; } = code;
    public object Fields { get; } = fields ?? new Dictionary<string, string[]>();
}

public static class ApiSupport
{
    public static object UserDto(BoardUser u) => new { u.Id, u.Email, u.Nickname, name = u.Nickname, u.Role };
    public static object PostDto(Post p) => new
    {
        p.Id, p.Title, p.Body, tags = JsonSerializer.Deserialize<string[]>(p.TagsJson),
        author = new { p.Author.Id, p.Author.Nickname }, commentCount = p.Comments.Count,
        p.CreatedAt, p.UpdatedAt
    };
    public static object CommentDto(Comment c) => new
    {
        c.Id, c.PostId, c.Body, author = new { c.Author.Id, c.Author.Nickname }, c.CreatedAt
    };
    public static int UserId(HttpContext ctx) => int.Parse(ctx.User.FindFirstValue(ClaimTypes.NameIdentifier)!);
    public static IResult Data(object value) => Results.Json(new { data = value });
    public static IResult Error(HttpContext ctx, int status, string code, string message, object? fields = null) =>
        Results.Json(new { error = new { code, message, fields = fields ?? new Dictionary<string, string[]>(), requestId = ctx.TraceIdentifier } }, statusCode: status);

    public static void ValidatePost(string? title, string? body, string[]? tags, bool partial = false)
    {
        var fields = new Dictionary<string, string[]>();
        if ((!partial || title is not null) && (string.IsNullOrWhiteSpace(title) || title.Trim().Length > 200))
            fields["title"] = ["1~200자로 입력하세요."];
        if ((!partial || body is not null) && (string.IsNullOrWhiteSpace(body) || body.Length > 20000))
            fields["body"] = ["1~20000자로 입력하세요."];
        if (tags is not null && (tags.Length > 10 || tags.Any(t => string.IsNullOrWhiteSpace(t) || t.Length > 30)))
            fields["tags"] = ["태그는 각 1~30자, 최대 10개입니다."];
        if (fields.Count > 0) throw new ApiException(400, "VALIDATION_ERROR", "입력값을 확인하세요.", fields);
    }

    public static string IssueToken(BoardUser user, IConfiguration config, string secret)
    {
        var claims = new[]
        {
            new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new Claim(ClaimTypes.Role, user.Role), new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString())
        };
        var token = new JwtSecurityToken(config["Jwt:Issuer"], config["Jwt:Audience"], claims,
            expires: DateTime.UtcNow.AddHours(1),
            signingCredentials: new SigningCredentials(new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secret)), SecurityAlgorithms.HmacSha256));
        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}

public sealed record SignupInput(string? Email, string? Password, string? Nickname);
public sealed record LoginInput(string? Email, string? Password);
public sealed record PostInput(string? Title, string? Body, string[]? Tags);
public sealed record CommentInput(string? Body);
public sealed record SummaryInput(string? Text);
