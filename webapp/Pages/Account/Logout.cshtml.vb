Imports Microsoft.AspNetCore.Authentication
Imports Microsoft.AspNetCore.Authentication.Cookies
Imports Microsoft.AspNetCore.Mvc
Imports Microsoft.AspNetCore.Mvc.RazorPages

Namespace Pages.Account

    Public Class LogoutModel
        Inherits PageModel

        Public Async Function OnGetAsync() As Task(Of IActionResult)
            Await HttpContext.SignOutAsync(CookieAuthenticationDefaults.AuthenticationScheme)
            Return RedirectToPage("/Account/Login")
        End Function
    End Class

End Namespace
