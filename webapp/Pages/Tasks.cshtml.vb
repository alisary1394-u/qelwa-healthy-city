Imports Microsoft.AspNetCore.Authorization
Imports Microsoft.AspNetCore.Mvc
Imports Microsoft.AspNetCore.Mvc.RazorPages
Imports Microsoft.EntityFrameworkCore
Imports QelwaApp.Data
Imports QelwaApp.Models
Imports System.Linq

Namespace Pages

    <Authorize>
    Public Class TasksModel
        Inherits PageModel

        Private ReadOnly _db As AppDbContext
        Public Property Tasks As List(Of AppTask) = New List(Of AppTask)()
        Public Property Users As List(Of User) = New List(Of User)()
        Public Property StandardsList As List(Of Standard) = New List(Of Standard)()
        Public Property ActiveFilter As String = "all"
        Public Property SearchQuery As String = ""
        Public Property PriorityFilter As String = ""
        Private _allTasks As List(Of AppTask)

        Public Sub New(db As AppDbContext)
            _db = db
        End Sub

        Public Sub OnGet(Optional filter As String = "all", Optional q As String = "", Optional priority As String = "")
            ActiveFilter = filter
            SearchQuery = q
            PriorityFilter = priority
            LoadData(filter, q, priority)
        End Sub

        Private Sub LoadData(filter As String, q As String, priority As String)
            _allTasks = _db.Tasks.Include(Function(t) t.AssignedUser).Include(Function(t) t.Standard).ToList()
            Users = _db.Users.Where(Function(u) u.IsActive).ToList()
            StandardsList = _db.Standards.OrderBy(Function(s) s.AxisOrder).ThenBy(Function(s) s.GlobalNum).ToList()

            Dim query = _allTasks.AsQueryable()

            Select Case filter
                Case "pending" : query = query.Where(Function(t) t.Status = "pending")
                Case "in_progress" : query = query.Where(Function(t) t.Status = "in_progress")
                Case "completed" : query = query.Where(Function(t) t.Status = "completed")
                Case "overdue" : query = query.Where(Function(t) t.IsOverdue)
            End Select

            If Not String.IsNullOrEmpty(q) Then
                query = query.Where(Function(t) t.Title.Contains(q) OrElse (t.Description IsNot Nothing AndAlso t.Description.Contains(q)))
            End If
            If Not String.IsNullOrEmpty(priority) Then
                query = query.Where(Function(t) t.Priority = priority)
            End If

            Tasks = query.OrderBy(Function(t) If(t.IsOverdue, 0, 1)).ThenBy(Function(t) t.DueDate).ToList()
        End Sub

        Public Function GetCount(filter As String) As Integer
            Dim all = _db.Tasks.ToList()
            Select Case filter
                Case "all" : Return all.Count
                Case "pending" : Return all.Count(Function(t) t.Status = "pending")
                Case "in_progress" : Return all.Count(Function(t) t.Status = "in_progress")
                Case "completed" : Return all.Count(Function(t) t.Status = "completed")
                Case "overdue" : Return all.Count(Function(t) t.DueDate.HasValue AndAlso t.DueDate.Value < DateTime.UtcNow AndAlso t.Status <> "completed")
                Case Else : Return 0
            End Select
        End Function

        Public Function OnPostSave(
            id As Integer, title As String, description As String,
            priority As String, status As String, dueDate As DateTime?,
            assignedToId As Integer?, standardId As Integer?, notes As String,
            filter As String) As IActionResult

            If String.IsNullOrEmpty(title) Then
                TempData("Error") = "عنوان المهمة مطلوب."
                Return RedirectToPage(New With {.filter = filter})
            End If

            If id = 0 Then
                _db.Tasks.Add(New AppTask With {
                    .Title = title.Trim(),
                    .Description = If(description, ""),
                    .Priority = priority,
                    .Status = status,
                    .DueDate = dueDate,
                    .AssignedToId = assignedToId,
                    .StandardId = standardId,
                    .Notes = If(notes, ""),
                    .CreatedAt = DateTime.UtcNow,
                    .UpdatedAt = DateTime.UtcNow
                })
                TempData("Success") = "تمت إضافة المهمة."
            Else
                Dim task = _db.Tasks.Find(id)
                If task IsNot Nothing Then
                    task.Title = title.Trim()
                    task.Description = If(description, "")
                    task.Priority = priority
                    task.Status = status
                    task.DueDate = dueDate
                    task.AssignedToId = assignedToId
                    task.StandardId = standardId
                    task.Notes = If(notes, "")
                    task.UpdatedAt = DateTime.UtcNow
                    If status = "completed" AndAlso Not task.CompletedAt.HasValue Then
                        task.CompletedAt = DateTime.UtcNow
                    End If
                    TempData("Success") = "تم تحديث المهمة."
                End If
            End If

            _db.SaveChanges()
            Return RedirectToPage(New With {.filter = filter})
        End Function

        Public Function OnPostComplete(id As Integer, filter As String) As IActionResult
            Dim task = _db.Tasks.Find(id)
            If task IsNot Nothing Then
                task.Status = "completed"
                task.CompletedAt = DateTime.UtcNow
                task.UpdatedAt = DateTime.UtcNow
                _db.SaveChanges()
                TempData("Success") = "تم إتمام المهمة."
            End If
            Return RedirectToPage(New With {.filter = filter})
        End Function

        Public Function OnPostDelete(id As Integer, filter As String) As IActionResult
            Dim task = _db.Tasks.Find(id)
            If task IsNot Nothing Then
                _db.Tasks.Remove(task)
                _db.SaveChanges()
                TempData("Success") = "تم حذف المهمة."
            End If
            Return RedirectToPage(New With {.filter = filter})
        End Function
    End Class

End Namespace
