Imports Microsoft.AspNetCore.Builder
Imports Microsoft.AspNetCore.Authentication.Cookies
Imports Microsoft.EntityFrameworkCore
Imports Microsoft.Extensions.DependencyInjection
Imports Microsoft.Extensions.Hosting
Imports QelwaApp.Data

Module Program
    Sub Main(args As String())
        Dim builder = WebApplication.CreateBuilder(args)

        ' Razor Pages
        builder.Services.AddRazorPages()

        ' Cookie Authentication
        builder.Services.AddAuthentication(CookieAuthenticationDefaults.AuthenticationScheme) _
            .AddCookie(Sub(opts)
                opts.LoginPath = "/Account/Login"
                opts.LogoutPath = "/Account/Logout"
                opts.Cookie.Name = "QelwaAuth"
                opts.ExpireTimeSpan = TimeSpan.FromHours(8)
                opts.SlidingExpiration = True
                opts.Cookie.HttpOnly = True
                opts.Cookie.SecurePolicy = Http.CookieSecurePolicy.SameAsRequest
            End Sub)

        builder.Services.AddAuthorization()

        ' SQLite - use /data volume on Railway, local path otherwise
        Dim dbPath As String
        If Not String.IsNullOrEmpty(Environment.GetEnvironmentVariable("RAILWAY_ENVIRONMENT")) Then
            Directory.CreateDirectory("/data")
            dbPath = "/data/qelwa.db"
        Else
            dbPath = Path.Combine(AppContext.BaseDirectory, "qelwa.db")
        End If

        builder.Services.AddDbContext(Of AppDbContext)(
            Sub(opts) opts.UseSqlite($"Data Source={dbPath}"))

        Dim app = builder.Build()

        ' Seed database
        Using scope = app.Services.CreateScope()
            Dim db = scope.ServiceProvider.GetRequiredService(Of AppDbContext)()
            db.Database.EnsureCreated()
            DbInitializer.Initialize(db)
        End Using

        If Not app.Environment.IsDevelopment() Then
            app.UseExceptionHandler("/Error")
            app.UseHsts()
        End If

        app.UseStaticFiles()
        app.UseRouting()
        app.UseAuthentication()
        app.UseAuthorization()
        app.MapRazorPages()

        ' PORT env var for Railway
        Dim port = Environment.GetEnvironmentVariable("PORT") ?? "8080"
        app.Run($"http://0.0.0.0:{port}")
    End Sub
End Module
