Imports Microsoft.AspNetCore.Mvc
Imports Microsoft.AspNetCore.Mvc.RazorPages
Imports QelwaApp.Data
Imports QelwaApp.Models

Namespace Pages

    <Microsoft.AspNetCore.Authorization.Authorize>
    Public Class VolunteeringModel
        Inherits PageModel

        Private ReadOnly _db As AppDbContext

        Public Sub New(db As AppDbContext)
            _db = db
        End Sub

        Public Property Opportunities As List(Of VolunteerOpportunity) = New List(Of VolunteerOpportunity)()

        Public Sub OnGet()
            Opportunities = _db.VolunteerOpportunities.OrderByDescending(Function(o) o.CreatedAt).ToList()
        End Sub

    End Class

End Namespace
