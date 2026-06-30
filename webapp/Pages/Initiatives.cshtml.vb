Imports Microsoft.AspNetCore.Mvc
Imports Microsoft.AspNetCore.Mvc.RazorPages
Imports QelwaApp.Data
Imports QelwaApp.Models

Namespace Pages

    <Microsoft.AspNetCore.Authorization.Authorize>
    Public Class InitiativesModel
        Inherits PageModel

        Private ReadOnly _db As AppDbContext

        Public Sub New(db As AppDbContext)
            _db = db
        End Sub

        Public Property Initiatives As List(Of Initiative) = New List(Of Initiative)()
        Public Property Standards As List(Of Standard) = New List(Of Standard)()

        Public Sub OnGet()
            Initiatives = _db.Initiatives.OrderByDescending(Function(i) i.CreatedAt).ToList()
            Standards = _db.Standards.ToList()
        End Sub

    End Class

End Namespace
