Imports Microsoft.AspNetCore.Builder
Imports Microsoft.AspNetCore.Authentication.Cookies
Imports Microsoft.AspNetCore.Hosting
Imports Microsoft.AspNetCore.Http
Imports Microsoft.EntityFrameworkCore
Imports Microsoft.Extensions.DependencyInjection
Imports Microsoft.Extensions.Hosting
Imports QelwaApp.Data
Imports System.IO

Module Program
    Sub Main(args As String())
        Dim builder = WebApplication.CreateBuilder(args)

        ' قراءة PORT من Railway
        Dim port = If(Environment.GetEnvironmentVariable("PORT"), "8080")
        builder.WebHost.UseUrls($"http://+:{port}")

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

        ' مسار قاعدة البيانات
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

        ' تهيئة قاعدة البيانات بعد بدء التشغيل
        app.Lifetime.ApplicationStarted.Register(Sub()
            Try
                Using scope = app.Services.CreateScope()
                    Dim db = scope.ServiceProvider.GetRequiredService(Of AppDbContext)()
                    Dim hasTable = False
                    Try
                        db.Database.ExecuteSqlRaw("SELECT 1 FROM ""Axes"" LIMIT 1")
                        hasTable = True
                    Catch
                        hasTable = False
                    End Try
                    If Not hasTable Then
                        db.Database.EnsureDeleted()
                        db.Database.EnsureCreated()
                    End If
                    DbInitializer.Initialize(db)
                End Using
            Catch ex As Exception
                Console.Error.WriteLine($"[DB-INIT] {ex.Message}")
            End Try
        End Sub)

        app.UseStaticFiles()
        app.UseRouting()
        app.UseAuthentication()
        app.UseAuthorization()

        app.MapGet("/health", Function() "OK")

        ' Diagnostic: assembly types
        app.MapGet("/debug/asm", Function(ctx As HttpContext) As Task
            Dim sb = New System.Text.StringBuilder()
            Try
                Dim viewsPath = Path.Combine(AppContext.BaseDirectory, "webapp.Views.dll")
                sb.AppendLine($"Views.dll exists: {File.Exists(viewsPath)}")
                If File.Exists(viewsPath) Then
                    Dim asm = System.Reflection.Assembly.LoadFrom(viewsPath)
                    Dim types = asm.GetTypes()
                    sb.AppendLine($"Types count: {types.Length}")
                    For Each t In types.Take(20)
                        sb.AppendLine($"  {t.FullName}")
                    Next
                End If
            Catch ex As Exception
                sb.AppendLine($"ERROR: {ex.GetType().Name}: {ex.Message}")
                If ex.InnerException IsNot Nothing Then
                    sb.AppendLine($"INNER: {ex.InnerException.Message}")
                End If
            End Try
            ctx.Response.ContentType = "text/plain; charset=utf-8"
            Return ctx.Response.WriteAsync(sb.ToString())
        End Function)

        app.MapRazorPages()

        app.Run()
    End Sub
End Module
