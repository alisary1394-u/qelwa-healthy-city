Imports Microsoft.AspNetCore.Mvc
Imports Microsoft.AspNetCore.Mvc.RazorPages
Imports Microsoft.EntityFrameworkCore
Imports QelwaApp.Data
Imports QelwaApp.Models

Namespace Pages

    <Microsoft.AspNetCore.Authorization.Authorize>
    Public Class CommitteesModel
        Inherits PageModel

        Private ReadOnly _db As AppDbContext

        Public Sub New(db As AppDbContext)
            _db = db
        End Sub

        Public Property Committees As List(Of Committee) = New List(Of Committee)()
        Public Property Members As List(Of TeamMember) = New List(Of TeamMember)()
        Public Property Axes As List(Of Axis) = New List(Of Axis)()

        Public Sub OnGet()
            Committees = _db.Committees.OrderBy(Function(c) c.Name).ToList()
            Members = _db.TeamMembers.Where(Function(m) m.IsActive).ToList()
            Axes = _db.Axes.OrderBy(Function(a) a.AxisOrder).ToList()
        End Sub

    End Class

End Namespace
