Imports Microsoft.AspNetCore.Authorization
Imports Microsoft.AspNetCore.Mvc.RazorPages
Imports Microsoft.EntityFrameworkCore
Imports QelwaApp.Data
Imports QelwaApp.Models

Namespace Pages

    <Authorize>
    Public Class DashboardModel
        Inherits PageModel

        Private ReadOnly _db As AppDbContext
        Public Property Stats As DashboardStats = New DashboardStats()
        Public Property Axes As List(Of Axis) = New List(Of Axis)()
        Public Property OverdueTasks As List(Of AppTask) = New List(Of AppTask)()
        Public Property ChartDataJson As String = "{}"

        Public Sub New(db As AppDbContext)
            _db = db
        End Sub

        Public Sub OnGet()
            Axes = _db.Axes.Include(Function(a) a.Standards).OrderBy(Function(a) a.AxisOrder).ToList()

            Dim allStandards = _db.Standards.ToList()
            Dim allTasks = _db.Tasks.ToList()

            Stats = New DashboardStats With {
                .TotalStandards = allStandards.Count,
                .CompletedStandards = allStandards.Count(Function(s) s.Status = "completed"),
                .InProgressStandards = allStandards.Count(Function(s) s.Status = "in_progress"),
                .NotStartedStandards = allStandards.Count(Function(s) s.Status = "not_started"),
                .AvgCompletion = If(allStandards.Any(), allStandards.Average(Function(s) CDbl(s.CompletionPercentage)), 0),
                .OpenTasks = allTasks.Count(Function(t) t.Status <> "completed"),
                .CompletedTasks = allTasks.Count(Function(t) t.Status = "completed"),
                .OverdueTasks = allTasks.Count(Function(t) t.DueDate.HasValue AndAlso t.DueDate.Value < DateTime.UtcNow AndAlso t.Status <> "completed"),
                .ActiveUsers = _db.Users.Count(Function(u) u.IsActive),
                .TotalAxes = Axes.Count
            }

            OverdueTasks = _db.Tasks
                .Where(Function(t) t.DueDate.HasValue AndAlso t.DueDate.Value < DateTime.UtcNow AndAlso t.Status <> "completed")
                .OrderBy(Function(t) t.DueDate)
                .Take(5).ToList()

            BuildChartData()
        End Sub

        Private Sub BuildChartData()
            Dim labels = String.Join(",", Axes.Select(Function(a) $"""{EscJ(a.ShortName)}"""))
            Dim scores = String.Join(",", Axes.Select(Function(a) Math.Round(a.CompletionPercentage, 1).ToString("F1", System.Globalization.CultureInfo.InvariantCulture)))
            Dim colors = String.Join(",", Axes.Select(Function(a) $"""{a.Color}"""))
            ChartDataJson = $"{{""completed"":{Stats.CompletedStandards},""inProgress"":{Stats.InProgressStandards},""notStarted"":{Stats.NotStartedStandards},""axisLabels"":[{labels}],""axisScores"":[{scores}],""axisColors"":[{colors}]}}"
        End Sub

        Private Shared Function EscJ(s As String) As String
            Return If(s, "").Replace("\", "\\").Replace("""", "\""")
        End Function
    End Class

End Namespace
