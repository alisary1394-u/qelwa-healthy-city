Imports Microsoft.AspNetCore.Authorization
Imports Microsoft.AspNetCore.Mvc
Imports Microsoft.AspNetCore.Mvc.RazorPages
Imports Microsoft.EntityFrameworkCore
Imports QelwaApp.Data
Imports QelwaApp.Models

Namespace QelwaApp.Pages

    <Authorize>
    Public Class ReportsModel
        Inherits PageModel

        Private ReadOnly _db As AppDbContext
        Public Property Axes As List(Of Axis) = New List(Of Axis)()
        Public Property Reports As List(Of PerformanceReport) = New List(Of PerformanceReport)()
        Public Property AvgCompletion As Double = 0
        Public Property ExcellentAxes As Integer = 0
        Public Property NeedsImprovementAxes As Integer = 0
        Public Property ChartJson As String = "{}"

        Public Sub New(db As AppDbContext)
            _db = db
        End Sub

        Public Sub OnGet()
            LoadData()
        End Sub

        Private Sub LoadData()
            Axes = _db.Axes.Include(Function(a) a.Standards).OrderBy(Function(a) a.AxisOrder).ToList()
            Reports = _db.PerformanceReports.Include(Function(r) r.GeneratedBy).OrderByDescending(Function(r) r.GeneratedAt).ToList()

            Dim allStds = _db.Standards.ToList()
            AvgCompletion = If(allStds.Any(), allStds.Average(Function(s) CDbl(s.CompletionPercentage)), 0)
            ExcellentAxes = Axes.Count(Function(a) a.CompletionPercentage >= 80)
            NeedsImprovementAxes = Axes.Count(Function(a) a.CompletionPercentage < 60)

            Dim labels = String.Join(",", Axes.Select(Function(a) $"""{EscJ(a.ShortName)}"""))
            Dim scores = String.Join(",", Axes.Select(Function(a) Math.Round(a.CompletionPercentage, 1).ToString("F1", System.Globalization.CultureInfo.InvariantCulture)))
            Dim colors = String.Join(",", Axes.Select(Function(a) $"""{a.Color}"""))
            ChartJson = $"{{""labels"":[{labels}],""scores"":[{scores}],""colors"":[{colors}]}}"
        End Sub

        Public IActionResult Function OnPostGenerateReport(axisOrder As Integer) As IActionResult
            Dim ax = _db.Axes.Include(Function(a) a.Standards).FirstOrDefault(Function(a) a.AxisOrder = axisOrder)
            If ax Is Nothing Then
                TempData("Error") = "المحور غير موجود."
                Return RedirectToPage()
            End If

            Dim score = If(ax.Standards.Any(), ax.Standards.Average(Function(s) CDbl(s.CompletionPercentage)), 0.0)
            Dim statusLabel = If(score >= 80, "ممتاز", If(score >= 60, "جيد", If(score >= 40, "مقبول", "يحتاج تحسين")))

            _db.PerformanceReports.Add(New PerformanceReport With {
                .AxisOrder = axisOrder,
                .ReportType = "تقرير محور",
                .OverallScore = CDec(Math.Round(score, 2)),
                .Status = statusLabel,
                .GeneratedAt = DateTime.UtcNow
            })
            _db.SaveChanges()
            TempData("Success") = $"تم توليد تقرير المحور {axisOrder} بنجاح. النتيجة: {Math.Round(score, 1)}%"
            Return RedirectToPage()
        End Function

        Public Function GetRatingLabel(score As Double) As String
            If score >= 80 Then Return "ممتاز"
            If score >= 60 Then Return "جيد"
            If score >= 40 Then Return "مقبول"
            Return "يحتاج تحسين"
        End Function

        Public Function GetRatingBadge(score As Double) As String
            If score >= 80 Then Return "bg-success text-white"
            If score >= 60 Then Return "bg-primary text-white"
            If score >= 40 Then Return "bg-warning text-dark"
            Return "bg-danger text-white"
        End Function

        Private Shared Function EscJ(s As String) As String
            Return If(s, "").Replace("\", "\\").Replace("""", "\""")
        End Function
    End Class

End Namespace
