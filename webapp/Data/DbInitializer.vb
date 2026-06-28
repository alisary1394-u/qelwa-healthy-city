Imports System.Security.Cryptography
Imports System.Text
Imports QelwaApp.Models

Namespace QelwaApp.Data

    Public Module DbInitializer

        Public Sub Initialize(db As AppDbContext)
            ' تجنب إعادة الإدراج
            If db.Axes.Any() Then Return

            ' ===== المحاور التسعة =====
            Dim axes = New List(Of Axis) From {
                New Axis With {.AxisOrder=1, .Name="السياسات والقيادة الصحية",    .ShortName="سياسات", .Color="#3B82F6", .Icon="bi-briefcase"},
                New Axis With {.AxisOrder=2, .Name="البيئة الصحية والمستدامة",    .ShortName="بيئة",   .Color="#10B981", .Icon="bi-tree"},
                New Axis With {.AxisOrder=3, .Name="الرعاية الصحية الأولية",      .ShortName="رعاية",  .Color="#F59E0B", .Icon="bi-hospital"},
                New Axis With {.AxisOrder=4, .Name="الصحة الاجتماعية والمجتمعية", .ShortName="مجتمع",  .Color="#EF4444", .Icon="bi-people"},
                New Axis With {.AxisOrder=5, .Name="البنية التحتية والخدمات",     .ShortName="بنية",   .Color="#8B5CF6", .Icon="bi-building"},
                New Axis With {.AxisOrder=6, .Name="التوعية والتثقيف الصحي",      .ShortName="توعية",  .Color="#EC4899", .Icon="bi-megaphone"},
                New Axis With {.AxisOrder=7, .Name="الطوارئ والكوارث الصحية",     .ShortName="طوارئ",  .Color="#06B6D4", .Icon="bi-shield-plus"},
                New Axis With {.AxisOrder=8, .Name="الرصد والتقييم والجودة",      .ShortName="جودة",   .Color="#84CC16", .Icon="bi-graph-up"},
                New Axis With {.AxisOrder=9, .Name="الشراكات والتمويل الصحي",     .ShortName="شراكات", .Color="#F97316", .Icon="bi-handshake"}
            }
            db.Axes.AddRange(axes)
            db.SaveChanges()

            ' ===== مستخدم المشرف =====
            db.Users.Add(New User With {
                .Email = "admin@qelwa.gov.sa",
                .FullName = "مدير النظام",
                .PasswordHash = HashPassword("Admin@2024"),
                .Role = "admin",
                .Department = "الإدارة العامة",
                .IsActive = True
            })
            db.SaveChanges()

            ' ===== معايير تجريبية (3 لكل محور) =====
            Dim standards = New List(Of Standard)()
            Dim globalNum = 1
            For axisIdx = 0 To axes.Count - 1
                Dim ax = db.Axes.OrderBy(Function(a) a.AxisOrder).Skip(axisIdx).First()
                For stdIdx = 1 To 3
                    standards.Add(New Standard With {
                        .Code = $"H-{ax.AxisOrder}-{stdIdx:00}",
                        .Title = $"معيار {ax.ShortName} رقم {stdIdx}",
                        .Description = $"وصف المعيار {stdIdx} للمحور: {ax.Name}",
                        .AxisId = ax.Id,
                        .AxisOrder = ax.AxisOrder,
                        .GlobalNum = globalNum,
                        .Status = If(stdIdx = 1, "completed", If(stdIdx = 2, "in_progress", "not_started")),
                        .CompletionPercentage = If(stdIdx = 1, 100, If(stdIdx = 2, 50, 0)),
                        .Priority = If(stdIdx = 1, "عالية", "متوسطة"),
                        .LastUpdated = DateTime.UtcNow
                    })
                    globalNum += 1
                Next
            Next
            db.Standards.AddRange(standards)
            db.SaveChanges()

            ' ===== مهام تجريبية =====
            Dim user = db.Users.First()
            Dim std1 = db.Standards.First()
            db.Tasks.AddRange(New List(Of AppTask) From {
                New AppTask With {.Title="مراجعة معايير المحور الأول",       .Status="in_progress", .Priority="عالية",   .AssignedToId=user.Id, .DueDate=DateTime.UtcNow.AddDays(7)},
                New AppTask With {.Title="إعداد تقرير ربع سنوي",             .Status="pending",     .Priority="متوسطة",  .AssignedToId=user.Id, .DueDate=DateTime.UtcNow.AddDays(14)},
                New AppTask With {.Title="تحديث بيانات مؤشرات الأداء",      .Status="pending",     .Priority="عالية",   .AssignedToId=user.Id, .DueDate=DateTime.UtcNow.AddDays(-2)},
                New AppTask With {.Title="اجتماع لجنة الجودة",               .Status="completed",   .Priority="منخفضة",  .CompletedAt=DateTime.UtcNow.AddDays(-3)},
                New AppTask With {.Title="رفع وثائق التحقق للمعيار الأول",  .Status="in_progress", .Priority="عالية",   .StandardId=std1.Id, .DueDate=DateTime.UtcNow.AddDays(3)}
            })
            db.SaveChanges()
        End Sub

        Public Function HashPassword(password As String) As String
            Using sha = SHA256.Create()
                Dim bytes = sha.ComputeHash(Encoding.UTF8.GetBytes(password))
                Return BitConverter.ToString(bytes).Replace("-", "").ToLower()
            End Using
        End Function

    End Module

End Namespace
