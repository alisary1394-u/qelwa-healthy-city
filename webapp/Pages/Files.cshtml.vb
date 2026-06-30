Imports Microsoft.AspNetCore.Mvc
Imports Microsoft.AspNetCore.Mvc.RazorPages
Imports QelwaApp.Data
Imports QelwaApp.Models

Namespace Pages

    <Microsoft.AspNetCore.Authorization.Authorize>
    Public Class FilesModel
        Inherits PageModel

        Private ReadOnly _db As AppDbContext

        Public Sub New(db As AppDbContext)
            _db = db
        End Sub

        Public Property Documents As List(Of Document) = New List(Of Document)()
        Public Property Standards As List(Of Standard) = New List(Of Standard)()

        Public Sub OnGet()
            Documents = _db.Documents.OrderByDescending(Function(d) d.CreatedAt).ToList()
            Standards = _db.Standards.ToList()
        End Sub

    End Class

End Namespace
