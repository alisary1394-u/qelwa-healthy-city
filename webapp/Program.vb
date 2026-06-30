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

        ' Razor Pages - تحميل webapp.Views.dll يدوياً لأنه لا يُكتشف تلقائياً في VB.NET
        Dim viewsDllPath = Path.Combine(AppContext.BaseDirectory, "webapp.Views.dll")
        builder.Services.AddRazorPages() _
            .AddRazorRuntimeCompilation() _
            .ConfigureApplicationPartManager(
                Sub(pm)
                    If File.Exists(viewsDllPath) Then
                        Dim viewsAsm = System.Reflection.Assembly.LoadFrom(viewsDllPath)
                        pm.ApplicationParts.Add(
                            New Microsoft.AspNetCore.Mvc.ApplicationParts.CompiledRazorAssemblyPart(viewsAsm))
                    End If
                End Sub)

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

                    ' التحقق من وجود الجداول الأساسية والجديدة
                    Dim hasAxes = False
                    Dim hasNewTables = False
                    Try
                        db.Database.ExecuteSqlRaw("SELECT 1 FROM ""Axes"" LIMIT 1")
                        hasAxes = True
                    Catch
                        hasAxes = False
                    End Try

                    If hasAxes Then
                        ' تحقق من وجود الجداول الجديدة
                        Try
                            db.Database.ExecuteSqlRaw("SELECT 1 FROM ""TeamMembers"" LIMIT 1")
                            hasNewTables = True
                        Catch
                            hasNewTables = False
                        End Try
                    End If

                    ' إذا لم تكن قاعدة البيانات موجودة أو الجداول الجديدة مفقودة → أعد الإنشاء
                    If Not hasAxes OrElse Not hasNewTables Then
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
        app.MapRazorPages()

        app.Run()
    End Sub
End Module
