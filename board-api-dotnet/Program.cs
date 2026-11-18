using System.Diagnostics;
using System.Net.Mail;
using System.Text;
using System.Text.Json;
using System.Threading.RateLimiting;
using Board.Api;
using Board.Api.Data;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using static Board.Api.ApiSupport;

var builder = WebApplication.CreateBuilder(args);
var secret = builder.Configuration["Jwt:Secret"] ?? throw new InvalidOperationException("Jwt__Secret를 설정하세요.");
if (Encoding.UTF8.GetByteCount(secret) < 32) throw new InvalidOperationException("Jwt__Secret은 32바이트 이상이어야 합니다.");
var connection = builder.Configuration.GetConnectionString("Board") ?? throw new InvalidOperationException("ConnectionStrings__Board를 설정하세요.");
var origins = builder.Configuration.GetSection("AllowedOrigins").Get<string[]>() ?? [];
var missingUserHash = new PasswordHasher<BoardUser>().HashPassword(new BoardUser(), "invalid-account-placeholder");
if (!string.IsNullOrWhiteSpace(builder.Configuration["CORS_ORIGIN"])) origins = builder.Configuration["CORS_ORIGIN"]!.Split(',', StringSplitOptions.TrimEntries);
builder.Services.AddDbContext<BoardDb>(o => o.UseSqlServer(connection, sql => sql.EnableRetryOnFailure()));
builder.Services.AddScoped<IPasswordHasher<BoardUser>, PasswordHasher<BoardUser>>();
builder.Services.AddHttpClient("ai", client => client.Timeout = TimeSpan.FromSeconds(30));
builder.Services.AddOpenApi();
builder.Services.AddCors(o => o.AddDefaultPolicy(p => p.WithOrigins(origins).AllowAnyHeader().AllowAnyMethod().AllowCredentials().WithExposedHeaders("X-Request-Id", "Location")));
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme).AddJwtBearer(o =>
{
    o.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = true, ValidateAudience = true, ValidateLifetime = true, ValidateIssuerSigningKey = true,
        ValidIssuer = builder.Configuration["Jwt:Issuer"], ValidAudience = builder.Configuration["Jwt:Audience"],
        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secret)), ClockSkew = TimeSpan.FromSeconds(10)
    };
    o.Events = new JwtBearerEvents
    {
        OnMessageReceived = ctx =>
        {
            if (!ctx.Request.Headers.ContainsKey("Authorization")) ctx.Token = ctx.Request.Cookies["board_token"];
            return Task.CompletedTask;
        },
        OnChallenge = async ctx =>
        {
            ctx.HandleResponse();
            await Error(ctx.HttpContext, 401, "UNAUTHORIZED", "로그인이 필요합니다.").ExecuteAsync(ctx.HttpContext);
        },
        OnForbidden = ctx => Error(ctx.HttpContext, 403, "FORBIDDEN", "권한이 없습니다.").ExecuteAsync(ctx.HttpContext)
    };
});
builder.Services.AddAuthorization();
builder.Services.AddRateLimiter(o =>
{
    o.AddPolicy("auth", ctx => RateLimitPartition.GetFixedWindowLimiter(ctx.Connection.RemoteIpAddress?.ToString() ?? "unknown",
        _ => new FixedWindowRateLimiterOptions { PermitLimit = 30, Window = TimeSpan.FromMinutes(1), QueueLimit = 0 }));
    o.AddPolicy("ai", ctx => RateLimitPartition.GetFixedWindowLimiter(ctx.User.Identity?.Name ?? ctx.Connection.RemoteIpAddress?.ToString() ?? "unknown",
        _ => new FixedWindowRateLimiterOptions { PermitLimit = 10, Window = TimeSpan.FromMinutes(1), QueueLimit = 0 }));
    o.OnRejected = (ctx, _) => new ValueTask(Error(ctx.HttpContext, 429, "RATE_LIMITED", "잠시 후 다시 시도하세요.").ExecuteAsync(ctx.HttpContext));
});
builder.WebHost.ConfigureKestrel(o => o.Limits.MaxRequestBodySize = 64 * 1024);
builder.Services.Configure<Microsoft.AspNetCore.Routing.RouteHandlerOptions>(o => o.ThrowOnBadRequest = true);
var app = builder.Build();
var started = Stopwatch.StartNew();

// 모든 오류와 로그가 같은 요청 번호를 쓴다. 헤더와 비밀번호·토큰은 로그에 넣지 않는다.
app.Use(async (ctx, next) =>
{
    var incoming = ctx.Request.Headers["X-Request-Id"].FirstOrDefault();
    ctx.TraceIdentifier = incoming is { Length: > 0 and <= 100 } && incoming.All(c => char.IsAsciiLetterOrDigit(c) || c is '-' or '_')
        ? incoming : Guid.NewGuid().ToString();
    ctx.Response.Headers["X-Request-Id"] = ctx.TraceIdentifier;
    ctx.Response.Headers["X-Content-Type-Options"] = "nosniff";
    ctx.Response.Headers.CacheControl = "no-store";
    try
    {
        await next(ctx);
    }
    catch (ApiException ex) { await Error(ctx, ex.Status, ex.Code, ex.Message, ex.Fields).ExecuteAsync(ctx); }
    catch (BadHttpRequestException ex)
    {
        var tooLarge = ex.StatusCode == 413;
        await Error(ctx, tooLarge ? 413 : 400, tooLarge ? "PAYLOAD_TOO_LARGE" : "BAD_REQUEST", "요청 형식이나 크기를 확인하세요.").ExecuteAsync(ctx);
    }
    catch (Exception ex)
    {
        app.Logger.LogError(ex, "Request {RequestId} failed", ctx.TraceIdentifier);
        await Error(ctx, 500, "INTERNAL", "서버 오류가 발생했습니다.").ExecuteAsync(ctx);
    }
    app.Logger.LogInformation("{Method} {Path} {Status} {RequestId}", ctx.Request.Method, ctx.Request.Path, ctx.Response.StatusCode, ctx.TraceIdentifier);
});
app.UseCors();
app.UseStatusCodePages(async context =>
{
    var ctx = context.HttpContext;
    var code = ctx.Response.StatusCode switch { 404 => "NOT_FOUND", 413 => "PAYLOAD_TOO_LARGE", _ => "BAD_REQUEST" };
    await Error(ctx, ctx.Response.StatusCode, code, "요청을 처리할 수 없습니다.").ExecuteAsync(ctx);
});
app.UseAuthentication();
app.UseAuthorization();
app.UseRateLimiter();
// 쿠키를 자동 전송하는 브라우저의 CSRF 차단: JSON + 사용자 정의 헤더 + 출처 허용 목록.
app.Use(async (ctx, next) =>
{
    if (ctx.Request.Method is "POST" or "PATCH" or "PUT" or "DELETE")
    {
        var origin = ctx.Request.Headers.Origin.ToString();
        if (ctx.Request.Headers["X-Board-Request"] != "1" || (origin.Length > 0 && !origins.Contains(origin, StringComparer.Ordinal)))
        { await Error(ctx, 403, "FORBIDDEN", "허용되지 않은 요청 출처 또는 요청 헤더입니다.").ExecuteAsync(ctx); return; }
        if (ctx.Request.ContentLength > 0 && !ctx.Request.HasJsonContentType())
        { await Error(ctx, 400, "BAD_REQUEST", "JSON 본문이 필요합니다.").ExecuteAsync(ctx); return; }
    }
    await next(ctx);
});

app.MapGet("/health", () => Results.Ok(new { status = "ok" }));
app.MapGet("/api/health", async (BoardDb db, HttpContext ctx) => await db.Database.CanConnectAsync()
    ? Results.Ok(new { status = "ok", ok = true, backend = "aspnetcore", database = "sqlserver", uptimeSec = (int)started.Elapsed.TotalSeconds })
    : Error(ctx, 503, "UNAVAILABLE", "데이터베이스에 연결할 수 없습니다."));
app.MapOpenApi("/api-docs");

var auth = app.MapGroup("/api/auth");
auth.MapPost("/signup", async (SignupInput input, BoardDb db, IPasswordHasher<BoardUser> hasher) =>
{
    var fields = new Dictionary<string, string[]>();
    var email = input.Email?.Trim().ToLowerInvariant() ?? "";
    if (email.Length > 254 || !MailAddress.TryCreate(email, out var address) || address.Address != email) fields["email"] = ["올바른 이메일을 입력하세요."];
    if (input.Password is null || input.Password.Length is < 8 or > 128) fields["password"] = ["8~128자로 입력하세요."];
    if (string.IsNullOrWhiteSpace(input.Nickname) || input.Nickname.Trim().Length > 50) fields["nickname"] = ["1~50자로 입력하세요."];
    if (fields.Count > 0) throw new ApiException(400, "VALIDATION_ERROR", "입력값을 확인하세요.", fields);
    if (await db.Users.AnyAsync(u => u.Email == email)) throw new ApiException(409, "EMAIL_TAKEN", "이미 등록된 이메일입니다.");
    var user = new BoardUser { Email = email, Nickname = input.Nickname!.Trim() };
    user.PasswordHash = hasher.HashPassword(user, input.Password!);
    db.Users.Add(user);
    try { await db.SaveChangesAsync(); }
    catch (DbUpdateException ex) when (ex.InnerException is Microsoft.Data.SqlClient.SqlException { Number: 2601 or 2627 })
    { throw new ApiException(409, "EMAIL_TAKEN", "이미 등록된 이메일입니다."); }
    return Results.Json(new { data = UserDto(user) }, statusCode: 201);
}).RequireRateLimiting("auth");
auth.MapPost("/login", async (LoginInput input, BoardDb db, IPasswordHasher<BoardUser> hasher, HttpContext ctx) =>
{
    var email = input.Email?.Trim().ToLowerInvariant();
    var user = await db.Users.SingleOrDefaultAsync(u => u.Email == email);
    // 없는 이메일에도 해시 검사를 수행해 응답 시간 차이를 줄인다.
    var candidate = user ?? new BoardUser();
    var hash = user?.PasswordHash ?? missingUserHash;
    if (input.Password is not { Length: >= 8 and <= 128 } || hasher.VerifyHashedPassword(candidate, hash, input.Password) == PasswordVerificationResult.Failed || user is null)
        throw new ApiException(401, "INVALID_CREDENTIALS", "이메일 또는 비밀번호가 올바르지 않습니다.");
    var token = IssueToken(user, builder.Configuration, secret);
    ctx.Response.Cookies.Append("board_token", token, CookieOptions());
    return Data(new { user = UserDto(user), accessToken = token });
}).RequireRateLimiting("auth");
auth.MapGet("/me", async (BoardDb db, HttpContext ctx) =>
{
    var user = await db.Users.FindAsync(UserId(ctx));
    return user is null ? Error(ctx, 401, "UNAUTHORIZED", "계정을 찾을 수 없습니다.") : Data(UserDto(user));
}).RequireAuthorization();
auth.MapPost("/logout", (HttpContext ctx) => { ctx.Response.Cookies.Delete("board_token", CookieOptions()); return Results.NoContent(); }).RequireAuthorization();
app.MapGet("/api/admin/status", (HttpContext ctx) => Data(new { ok = true, userId = UserId(ctx) })).RequireAuthorization(p => p.RequireRole("admin"));

app.MapGet("/api/posts", async (HttpContext ctx, BoardDb db) =>
{
    var page = QueryNumber(ctx, "page", 1);
    var limit = Math.Min(QueryNumber(ctx, "limit", 10), 50);
    var q = ctx.Request.Query["q"].ToString().Trim();
    var sort = ctx.Request.Query["sort"].FirstOrDefault() ?? "-createdAt";
    if (q.Length > 200 || (long)(page - 1) * limit > int.MaxValue) throw new ApiException(400, "VALIDATION_ERROR", "검색어나 페이지 범위를 확인하세요.");
    var query = db.Posts.AsNoTracking().Where(p => q == "" || p.Title.Contains(q) || p.Body.Contains(q));
    var total = await query.CountAsync();
    var ordered = sort switch
    {
        "createdAt" => query.OrderBy(p => p.CreatedAt).ThenBy(p => p.Id),
        "-createdAt" => query.OrderByDescending(p => p.CreatedAt).ThenByDescending(p => p.Id),
        "-commentCount" => query.OrderByDescending(p => p.Comments.Count).ThenByDescending(p => p.Id),
        _ => throw new ApiException(400, "VALIDATION_ERROR", "지원하지 않는 정렬입니다.")
    };
    var posts = await ordered.Skip((page - 1) * limit).Take(limit).Include(p => p.Author).Include(p => p.Comments).ToListAsync();
    return Results.Ok(new { data = posts.Select(PostDto), meta = new { page, limit, total, totalPages = (int)Math.Ceiling((double)total / limit), q } });
});
app.MapGet("/api/posts/{id}", async (string id, BoardDb db) => Data(PostDto(await FindPost(id, db))));
app.MapPost("/api/posts", async (PostInput input, BoardDb db, HttpContext ctx) =>
{
    ValidatePost(input.Title, input.Body, input.Tags);
    var post = new Post { UserId = UserId(ctx), Title = input.Title!.Trim(), Body = input.Body!, TagsJson = JsonSerializer.Serialize(input.Tags ?? []) };
    db.Posts.Add(post);
    await db.SaveChangesAsync();
    await db.Entry(post).Reference(p => p.Author).LoadAsync();
    return Results.Created($"/api/posts/{post.Id}", new { data = PostDto(post) });
}).RequireAuthorization();
app.MapPatch("/api/posts/{id}", async (string id, PostInput input, BoardDb db, HttpContext ctx) =>
{
    var post = await FindPost(id, db);
    if (post.UserId != UserId(ctx)) throw new ApiException(403, "FORBIDDEN", "작성자만 수정할 수 있습니다.");
    ValidatePost(input.Title, input.Body, input.Tags, partial: true);
    if (input.Title is not null) post.Title = input.Title.Trim();
    if (input.Body is not null) post.Body = input.Body;
    if (input.Tags is not null) post.TagsJson = JsonSerializer.Serialize(input.Tags);
    post.UpdatedAt = DateTime.UtcNow;
    await db.SaveChangesAsync();
    return Data(PostDto(post));
}).RequireAuthorization();
app.MapDelete("/api/posts/{id}", async (string id, BoardDb db, HttpContext ctx) =>
{
    var post = await FindPost(id, db);
    if (post.UserId != UserId(ctx)) throw new ApiException(403, "FORBIDDEN", "작성자만 삭제할 수 있습니다.");
    db.Posts.Remove(post);
    await db.SaveChangesAsync();
    return Results.NoContent();
}).RequireAuthorization();
app.MapGet("/api/posts/{id}/comments", async (string id, BoardDb db) =>
{
    var post = await FindPost(id, db);
    var comments = await db.Comments.AsNoTracking().Where(c => c.PostId == post.Id).Include(c => c.Author).OrderBy(c => c.Id).ToListAsync();
    return Data(comments.Select(CommentDto));
});
app.MapPost("/api/posts/{id}/comments", async (string id, CommentInput input, BoardDb db, HttpContext ctx) =>
{
    var post = await FindPost(id, db);
    if (string.IsNullOrWhiteSpace(input.Body) || input.Body.Length > 2000) throw new ApiException(400, "VALIDATION_ERROR", "댓글은 1~2000자입니다.", new { body = new[] { "댓글은 1~2000자입니다." } });
    var comment = new Comment { PostId = post.Id, UserId = UserId(ctx), Body = input.Body.Trim() };
    db.Comments.Add(comment);
    await db.SaveChangesAsync();
    await db.Entry(comment).Reference(c => c.Author).LoadAsync();
    return Results.Json(new { data = CommentDto(comment) }, statusCode: 201);
}).RequireAuthorization();
app.MapDelete("/api/comments/{id}", async (string id, BoardDb db, HttpContext ctx) =>
{
    var comment = await db.Comments.FindAsync(ParseId(id)) ?? throw new ApiException(404, "NOT_FOUND", "댓글이 없습니다.");
    if (comment.UserId != UserId(ctx)) throw new ApiException(403, "FORBIDDEN", "작성자만 삭제할 수 있습니다.");
    db.Comments.Remove(comment);
    await db.SaveChangesAsync();
    return Results.NoContent();
}).RequireAuthorization();
app.MapPost("/api/summarize", async (SummaryInput input, IHttpClientFactory clients) =>
{
    if (string.IsNullOrWhiteSpace(input.Text) || input.Text.Length > 4000) throw new ApiException(400, "VALIDATION_ERROR", "요약 문장은 1~4000자입니다.");
    var key = builder.Configuration["OPENAI_API_KEY"];
    if (string.IsNullOrWhiteSpace(key)) return Data(new { summary = $"목 응답: {input.Text[..Math.Min(40, input.Text.Length)]} — API 키가 없어 모델을 호출하지 않았습니다.", mode = "mock" });
    using var request = new HttpRequestMessage(HttpMethod.Post, "https://api.openai.com/v1/chat/completions");
    request.Headers.Authorization = new("Bearer", key);
    request.Content = JsonContent.Create(new { model = builder.Configuration["OPENAI_MODEL"] ?? "gpt-4o-mini", max_completion_tokens = 200,
        messages = new[] { new { role = "system", content = "한 문장으로 한국어 요약만 답한다." }, new { role = "user", content = input.Text } } });
    using var response = await clients.CreateClient("ai").SendAsync(request);
    if (!response.IsSuccessStatusCode) throw new ApiException(502, "AI_UPSTREAM_ERROR", "모델 서비스 호출에 실패했습니다.");
    using var result = await JsonDocument.ParseAsync(await response.Content.ReadAsStreamAsync());
    return Data(new { summary = result.RootElement.GetProperty("choices")[0].GetProperty("message").GetProperty("content").GetString(), mode = "model" });
}).RequireAuthorization().RequireRateLimiting("ai");
app.MapFallback((HttpContext ctx) => Error(ctx, 404, "NOT_FOUND", "없는 주소입니다."));

// 학습용 단일 인스턴스에서만 시작 시 마이그레이션. 운영은 별도 배포 작업으로 실행한다.
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<BoardDb>();
    await db.Database.MigrateAsync();
    if (app.Environment.IsDevelopment() && builder.Configuration.GetValue<bool>("SeedDemoData")) await BoardDb.SeedAsync(db);
}
app.Run();

CookieOptions CookieOptions() => new() { HttpOnly = true, Secure = builder.Configuration.GetValue<bool>("CookieSecure"), SameSite = SameSiteMode.Lax, Path = "/", MaxAge = TimeSpan.FromHours(1) };
static int ParseId(string id) => int.TryParse(id, out var n) && n > 0 ? n : throw new ApiException(400, "BAD_REQUEST", "양의 정수 id가 필요합니다.");
static int QueryNumber(HttpContext ctx, string key, int fallback) => !ctx.Request.Query.ContainsKey(key) ? fallback
    : int.TryParse(ctx.Request.Query[key], out var n) && n > 0 ? n : throw new ApiException(400, "VALIDATION_ERROR", $"{key}는 양의 정수입니다.");
static async Task<Post> FindPost(string id, BoardDb db)
{
    var number = ParseId(id);
    return await db.Posts.Include(p => p.Author).Include(p => p.Comments).SingleOrDefaultAsync(p => p.Id == number)
        ?? throw new ApiException(404, "NOT_FOUND", "글이 없습니다.");
}
