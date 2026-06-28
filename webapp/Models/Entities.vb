Imports System.ComponentModel.DataAnnotations
Imports System.ComponentModel.DataAnnotations.Schema

Namespace QelwaApp.Models

    Public Class Axis
        <Key> Public Property Id As Integer
        <Required> Public Property Name As String = ""
        Public Property ShortName As String = ""
        Public Property AxisOrder As Integer
        Public Property Color As String = "#3B82F6"
        Public Property Icon As String = "bi-heart"
        Public Property Description As String = ""
        Public Property CreatedAt As DateTime = DateTime.UtcNow
        Public Overridable Property Standards As ICollection(Of Standard) = New List(Of Standard)()

        <NotMapped>
        Public ReadOnly Property CompletionPercentage As Double
            Get
                If Standards Is Nothing OrElse Standards.Count = 0 Then Return 0
                Return Standards.Average(Function(s) CDbl(s.CompletionPercentage))
            End Get
        End Property
    End Class

    Public Class Standard
        <Key> Public Property Id As Integer
        <Required> Public Property Code As String = ""
        <Required> Public Property Title As String = ""
        Public Property Description As String = ""
        Public Property AxisId As Integer
        Public Property AxisOrder As Integer
        Public Property GlobalNum As Integer
        Public Property Category As String = "معيار صحة مجتمعية"
        Public Property Priority As String = "متوسطة"
        Public Property Status As String = "not_started"
        Public Property CompletionPercentage As Integer = 0
        Public Property EstimatedTime As String = ""
        Public Property DueDate As DateTime?
        Public Property LastUpdated As DateTime = DateTime.UtcNow
        Public Property CreatedAt As DateTime = DateTime.UtcNow
        Public Overridable Property Axis As Axis
        Public Overridable Property KPIs As ICollection(Of KPI) = New List(Of KPI)()
        Public Overridable Property Documents As ICollection(Of Document) = New List(Of Document)()

        <NotMapped>
        Public ReadOnly Property StatusLabel As String
            Get
                Select Case Status
                    Case "completed" : Return "مكتمل"
                    Case "in_progress" : Return "قيد التنفيذ"
                    Case Else : Return "لم يبدأ"
                End Select
            End Get
        End Property

        <NotMapped>
        Public ReadOnly Property StatusBadge As String
            Get
                Select Case Status
                    Case "completed" : Return "success"
                    Case "in_progress" : Return "primary"
                    Case Else : Return "secondary"
                End Select
            End Get
        End Property

        <NotMapped>
        Public ReadOnly Property PriorityBadge As String
            Get
                Select Case Priority
                    Case "عالية" : Return "danger"
                    Case "منخفضة" : Return "secondary"
                    Case Else : Return "warning"
                End Select
            End Get
        End Property
    End Class

    Public Class AppTask
        <Key> Public Property Id As Integer
        <Required> Public Property Title As String = ""
        Public Property Description As String = ""
        Public Property StandardId As Integer?
        Public Property AssignedToId As Integer?
        Public Property CreatedById As Integer?
        Public Property Priority As String = "متوسطة"
        Public Property Status As String = "pending"
        Public Property DueDate As DateTime?
        Public Property CompletedAt As DateTime?
        Public Property Notes As String = ""
        Public Property CreatedAt As DateTime = DateTime.UtcNow
        Public Property UpdatedAt As DateTime = DateTime.UtcNow
        Public Overridable Property AssignedUser As User
        Public Overridable Property Standard As Standard

        <NotMapped>
        Public ReadOnly Property IsOverdue As Boolean
            Get
                Return DueDate.HasValue AndAlso DueDate.Value < DateTime.UtcNow AndAlso Status <> "completed"
            End Get
        End Property

        <NotMapped>
        Public ReadOnly Property StatusLabel As String
            Get
                Select Case Status
                    Case "completed" : Return "مكتمل"
                    Case "in_progress" : Return "قيد التنفيذ"
                    Case Else : Return "في الانتظار"
                End Select
            End Get
        End Property

        <NotMapped>
        Public ReadOnly Property StatusBadge As String
            Get
                If IsOverdue Then Return "danger"
                Select Case Status
                    Case "completed" : Return "success"
                    Case "in_progress" : Return "primary"
                    Case Else : Return "warning"
                End Select
            End Get
        End Property
    End Class

    Public Class User
        <Key> Public Property Id As Integer
        <Required> Public Property Email As String = ""
        <Required> Public Property FullName As String = ""
        <Required> Public Property PasswordHash As String = ""
        Public Property Role As String = "user"
        Public Property Department As String = ""
        Public Property IsActive As Boolean = True
        Public Property LastSignInAt As DateTime?
        Public Property CreatedAt As DateTime = DateTime.UtcNow

        <NotMapped>
        Public ReadOnly Property RoleLabel As String
            Get
                Select Case Role
                    Case "admin" : Return "مشرف"
                    Case "manager" : Return "مدير"
                    Case Else : Return "مستخدم"
                End Select
            End Get
        End Property
    End Class

    Public Class KPI
        <Key> Public Property Id As Integer
        Public Property StandardId As Integer
        <Required> Public Property Name As String = ""
        Public Property Target As String = ""
        Public Property Unit As String = ""
        Public Property Weight As Decimal = 1.0D
        Public Property LatestValue As String = ""
        Public Property LatestScore As Decimal = 0
        Public Overridable Property Standard As Standard
    End Class

    Public Class Document
        <Key> Public Property Id As Integer
        Public Property StandardId As Integer
        <Required> Public Property Name As String = ""
        Public Property DocumentType As String = ""
        Public Property Status As String = "pending"
        Public Property FilePath As String = ""
        Public Property CreatedAt As DateTime = DateTime.UtcNow
        Public Overridable Property Standard As Standard
    End Class

    Public Class PerformanceReport
        <Key> Public Property Id As Integer
        Public Property StandardId As Integer?
        Public Property AxisOrder As Integer
        Public Property ReportType As String = ""
        Public Property OverallScore As Decimal = 0
        Public Property Status As String = ""
        Public Property GeneratedAt As DateTime = DateTime.UtcNow
        Public Property GeneratedById As Integer?
        Public Overridable Property GeneratedBy As User
    End Class

    Public Class Initiative
        <Key> Public Property Id As Integer
        <Required> Public Property Title As String = ""
        Public Property Description As String = ""
        Public Property Status As String = "مقترحة"
        Public Property Priority As String = "متوسطة"
        Public Property StandardId As Integer?
        Public Property CreatedAt As DateTime = DateTime.UtcNow
    End Class

    ' ViewModels
    Public Class DashboardStats
        Public Property TotalStandards As Integer
        Public Property CompletedStandards As Integer
        Public Property InProgressStandards As Integer
        Public Property NotStartedStandards As Integer
        Public Property AvgCompletion As Double
        Public Property OpenTasks As Integer
        Public Property CompletedTasks As Integer
        Public Property OverdueTasks As Integer
        Public Property ActiveUsers As Integer
        Public Property TotalAxes As Integer
    End Class

End Namespace
