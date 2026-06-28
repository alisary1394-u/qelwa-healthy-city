Imports Microsoft.AspNetCore.Authorization
Imports Microsoft.AspNetCore.Mvc
Imports Microsoft.AspNetCore.Mvc.RazorPages
Imports Microsoft.EntityFrameworkCore
Imports QelwaApp.Data
Imports QelwaApp.Models

Namespace QelwaApp.Pages

    <Authorize>
    Public Class StandardsModel
        Inherits PageModel

        Private ReadOnly _db As AppDbContext

        Public Property Standards As List(Of Standard) = New List(Of Standard)()
        Public Property AxesList As List(Of Axis) = New List(Of Axis)()
        Public Property SearchQuery As String = ""
        Public Property AxisFilter As String = ""
        Public Property StatusFilter As String = ""

        Public Sub New(db As AppDbContext)
            _db = db
        End Sub

        Public Sub OnGet(Optional q As String = "", Optional axis As String = "", Optional status As String = "")
            SearchQuery = q
            AxisFilter = axis
            StatusFilter = status
            AxesList = _db.Axes.OrderBy(Function(a) a.AxisOrder).ToList()

            Dim query = _db.Standards.Include(Function(s) s.Axis).Include(Function(s) s.KPIs).Include(Function(s) s.Documents).AsQueryable()

            If Not String.IsNullOrEmpty(q) Then
                query = query.Where(Function(s) s.Title.Contains(q) OrElse s.Code.Contains(q))
            End If
            If Not String.IsNullOrEmpty(axis) AndAlso Integer.TryParse(axis, Nothing) Then
                Dim axisNum = CInt(axis)
                query = query.Where(Function(s) s.AxisOrder = axisNum)
            End If
            If Not String.IsNullOrEmpty(status) Then
                query = query.Where(Function(s) s.Status = status)
            End If

            Standards = query.OrderBy(Function(s) s.AxisOrder).ThenBy(Function(s) s.GlobalNum).ToList()
        End Sub

        Public IActionResult Function OnPostSave(
            id As Integer, code As String, title As String, description As String,
            axisOrder As Integer, priority As String, status As String,
            completionPercentage As Integer, dueDate As DateTime?) As IActionResult

            If String.IsNullOrEmpty(title) OrElse axisOrder = 0 Then
                TempData("Error") = "العنوان والمحور مطلوبان."
                Return RedirectToPage()
            End If

            Dim ax = _db.Axes.FirstOrDefault(Function(a) a.AxisOrder = axisOrder)
            If ax Is Nothing Then
                TempData("Error") = "المحور غير موجود."
                Return RedirectToPage()
            End If

            If id = 0 Then
                ' إضافة جديد
                Dim maxGlobal = If(_db.Standards.Any(), _db.Standards.Max(Function(s) s.GlobalNum) + 1, 1)
                Dim std = New Standard With {
                    .Code = code.Trim(),
                    .Title = title.Trim(),
                    .Description = If(description, ""),
                    .AxisId = ax.Id,
                    .AxisOrder = axisOrder,
                    .GlobalNum = maxGlobal,
                    .Priority = priority,
                    .Status = status,
                    .CompletionPercentage = completionPercentage,
                    .DueDate = dueDate,
                    .LastUpdated = DateTime.UtcNow
                }
                _db.Standards.Add(std)
                TempData("Success") = "تم إضافة المعيار بنجاح."
            Else
                Dim std = _db.Standards.Find(id)
                If std IsNot Nothing Then
                    std.Code = code.Trim()
                    std.Title = title.Trim()
                    std.Description = If(description, "")
                    std.AxisId = ax.Id
                    std.AxisOrder = axisOrder
                    std.Priority = priority
                    std.Status = status
                    std.CompletionPercentage = completionPercentage
                    std.DueDate = dueDate
                    std.LastUpdated = DateTime.UtcNow
                    TempData("Success") = "تم تحديث المعيار بنجاح."
                End If
            End If

            _db.SaveChanges()
            Return RedirectToPage()
        End Function

        Public IActionResult Function OnPostDelete(id As Integer) As IActionResult
            Dim std = _db.Standards.Find(id)
            If std IsNot Nothing Then
                _db.Standards.Remove(std)
                _db.SaveChanges()
                TempData("Success") = "تم حذف المعيار."
            End If
            Return RedirectToPage()
        End Function
    End Class

End Namespace
