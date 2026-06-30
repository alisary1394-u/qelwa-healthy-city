Imports Microsoft.AspNetCore.Mvc
Imports Microsoft.AspNetCore.Mvc.RazorPages
Imports Microsoft.EntityFrameworkCore
Imports QelwaApp.Data
Imports QelwaApp.Models

Namespace Pages

    <Microsoft.AspNetCore.Authorization.Authorize>
    Public Class TeamModel
        Inherits PageModel

        Private ReadOnly _db As AppDbContext

        Public Sub New(db As AppDbContext)
            _db = db
        End Sub

        Public Property Members As List(Of TeamMember) = New List(Of TeamMember)()
        Public Property Committees As List(Of Committee) = New List(Of Committee)()

        Public Sub OnGet()
            Members = _db.TeamMembers.OrderBy(Function(m) m.Role).ThenBy(Function(m) m.FullName).ToList()
            Committees = _db.Committees.ToList()
        End Sub

    End Class

End Namespace
