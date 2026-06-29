Imports Microsoft.AspNetCore.Builder
Imports Microsoft.AspNetCore.Hosting
Imports System

Module Program
    Sub Main(args As String())
        Dim builder = WebApplication.CreateBuilder(args)

        ' قراءة PORT من Railway
        Dim port = If(Environment.GetEnvironmentVariable("PORT"), "8080")
        builder.WebHost.UseUrls($"http://+:{port}")

        Dim app = builder.Build()

        app.MapGet("/", Function() "Hello from Railway! App is working!")
        app.MapGet("/health", Function() "OK")
        app.MapGet("/test", Function() $"PORT={port} - Working!")

        Console.WriteLine($"[STARTUP] Listening on port {port}")
        app.Run()
    End Sub
End Module
