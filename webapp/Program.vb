Imports Microsoft.AspNetCore.Builder
Imports Microsoft.AspNetCore.Authentication.Cookies
Imports Microsoft.Data.Sqlite
Imports Microsoft.EntityFrameworkCore
Imports Microsoft.Extensions.DependencyInjection
Imports Microsoft.Extensions.Hosting
Imports QelwaApp.Data
Imports System.IO

Module Program
    Sub Main(args As String())
        Dim builder = WebApplication.CreateBuilder(args)

        ' Razor Pages
        builder.Services.AddRazorPages()

        ' Cookie Authentication
        builder.Services.AddAuthentication(CookieAuthenticationDefaults.AuthenticationScheme) _
            .AddCookie(CookieAuthenticationDefaults.AuthenticationScheme, _
                Sub(opts As CookieAuthenticationOptions)
                    opts.LoginPath = "/Account/Login"
                    opts.LogoutPath = "/Account/Logout"
                    opts.Cookie.Name = "QelwaAuth"
                    opts.ExpireTimeSpan = TimeSpan.FromHours(8)
                    opts.SlidingExpiration = True
                    opts.Cookie.HttpOnly = True
                End Sub)

        builder.Services.AddAuthorization()

        ' SQLite path: use /data when running in container (Railway), local otherwise
        Dim dbPath As String
        If Not String.IsNullOrEmpty(Environment.GetEnvironmentVariable("DOTNET_RUNNING_IN_CONTAINER")) Then
            Directory.CreateDirectory("/data")
            dbPath = "/data/qelwa.db"
        Else
            dbPath = Path.Combine(AppContext.BaseDirectory, "qelwa.db")
        End If

        builder.Services.AddDbContext(Of AppDbContext)(
            Sub(opts) opts.UseSqlite($"Data Source={dbPath}"))

        Dim app = builder.Build()

        ' Seed database — robust init for Docker volume
        Using scope = app.Services.CreateScope()
            Dim db = scope.ServiceProvider.GetRequiredService(Of AppDbContext)()
            Try
                ' Check if Axes table exists using raw SQL
                Dim tableExists As Boolean = False
                Try
                    Using rawConn = New Microsoft.Data.Sqlite.SqliteConnection($"Data Source={dbPath}")
                        rawConn.Open()
                        Using cmd = rawConn.CreateCommand()
                            cmd.CommandText = "SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name='Axes'"
                            tableExists = CInt(cmd.ExecuteScalar()) > 0
                        End Using
                    End Using
                Catch
                    tableExists = False
                End Try

                If Not tableExists Then
                    ' File exists but has no schema — delete and recreate
                    If File.Exists(dbPath) Then File.Delete(dbPath)
                    db.Database.EnsureCreated()
                End If

                DbInitializer.Initialize(db)
            Catch
                ' App continues even if DB init fails
            End Try
        End Using

        app.UseStaticFiles()
        app.UseRouting()
        app.UseAuthentication()
        app.UseAuthorization()
        app.MapRazorPages()

        ' Health check endpoint (no auth required)
        app.MapGet("/health", Function() "OK")

        Dim port = If(Environment.GetEnvironmentVariable("PORT"), "8080")
        app.Run($"http://0.0.0.0:{port}")
    End Sub
End Module
