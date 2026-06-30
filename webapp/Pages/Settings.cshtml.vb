Imports Microsoft.AspNetCore.Mvc
Imports Microsoft.AspNetCore.Mvc.RazorPages
Imports QelwaApp.Data
Imports QelwaApp.Models

Namespace Pages

    <Microsoft.AspNetCore.Authorization.Authorize>
    Public Class SettingsModel
        Inherits PageModel

        Private ReadOnly _db As AppDbContext

        Public Sub New(db As AppDbContext)
            _db = db
        End Sub

        Public Property Settings As CitySettings
        Public Property CurrentUser As User
        Public Property TotalStandards As Integer
        Public Property TotalAxes As Integer
        Public Property OpenTasks As Integer
        Public Property TotalInitiatives As Integer
        Public Property TeamCount As Integer
        Public Property ActiveUsers As Integer

        Public Sub OnGet()
            Settings = _db.CitySettings.FirstOrDefault()
            Dim email = User.Identity?.Name
            CurrentUser = _db.Users.FirstOrDefault(Function(u) u.Email = email)
            TotalStandards = _db.Standards.Count()
            TotalAxes = _db.Axes.Count()
            OpenTasks = _db.Tasks.Count(Function(t) t.Status <> "completed")
            TotalInitiatives = _db.Initiatives.Count()
            TeamCount = _db.TeamMembers.Count(Function(m) m.IsActive)
            ActiveUsers = _db.Users.Count(Function(u) u.IsActive)
        End Sub

    End Class

End Namespace
