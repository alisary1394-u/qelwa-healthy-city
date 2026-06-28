Imports Microsoft.AspNetCore.Authorization
Imports Microsoft.AspNetCore.Mvc
Imports Microsoft.AspNetCore.Mvc.RazorPages

Namespace Pages

    <AllowAnonymous>
    Public Class IndexModel
        Inherits PageModel

        Public Function OnGet() As IActionResult
            If User.Identity?.IsAuthenticated = True Then
                Return RedirectToPage("/Dashboard")
            End If
            Return RedirectToPage("/Account/Login")
        End Function

    End Class

End Namespace
