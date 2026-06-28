Imports Microsoft.AspNetCore.Authentication
Imports Microsoft.AspNetCore.Authentication.Cookies
Imports Microsoft.AspNetCore.Mvc
Imports Microsoft.AspNetCore.Mvc.RazorPages
Imports System.ComponentModel.DataAnnotations
Imports System.Security.Claims
Imports QelwaApp.Data

Namespace QelwaApp.Pages.Account

    Public Class LoginModel
        Inherits PageModel

        Private ReadOnly _db As AppDbContext

        Public Sub New(db As AppDbContext)
            _db = db
        End Sub

        <BindProperty>
        <Required(ErrorMessage:="البريد الإلكتروني مطلوب")>
        <EmailAddress>
        Public Property Email As String = ""

        <BindProperty>
        <Required(ErrorMessage:="كلمة المرور مطلوبة")>
        Public Property Password As String = ""

        Public Property ErrorMessage As String = ""

        Public Function OnGet() As IActionResult
            If User.Identity?.IsAuthenticated = True Then
                Return RedirectToPage("/Dashboard")
            End If
            Return Page()
        End Function

        Public Async Function OnPostAsync() As Task(Of IActionResult)
            If Not ModelState.IsValid Then Return Page()

            Dim hashed = DbInitializer.HashPassword(Password)
            Dim user = _db.Users.FirstOrDefault(
                Function(u) u.Email.ToLower() = Email.Trim().ToLower() AndAlso
                            u.PasswordHash = hashed AndAlso u.IsActive)

            If user Is Nothing Then
                ErrorMessage = "البريد الإلكتروني أو كلمة المرور غير صحيحة."
                Return Page()
            End If

            ' تحديث آخر دخول
            user.LastSignInAt = DateTime.UtcNow
            Await _db.SaveChangesAsync()

            ' إنشاء Claims
            Dim claims = New List(Of Claim) From {
                New Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
                New Claim(ClaimTypes.Name, user.FullName),
                New Claim(ClaimTypes.Email, user.Email),
                New Claim(ClaimTypes.Role, user.Role)
            }

            Dim identity = New ClaimsIdentity(claims, CookieAuthenticationDefaults.AuthenticationScheme)
            Dim principal = New ClaimsPrincipal(identity)

            Await HttpContext.SignInAsync(
                CookieAuthenticationDefaults.AuthenticationScheme,
                principal,
                New AuthenticationProperties With {.IsPersistent = True, .ExpiresUtc = DateTimeOffset.UtcNow.AddHours(8)})

            ' حماية Open Redirect
            Dim returnUrl = Request.Query("ReturnUrl").ToString()
            If Not String.IsNullOrEmpty(returnUrl) AndAlso Url.IsLocalUrl(returnUrl) Then
                Return Redirect(returnUrl)
            End If
            Return RedirectToPage("/Dashboard")
        End Function
    End Class

End Namespace
