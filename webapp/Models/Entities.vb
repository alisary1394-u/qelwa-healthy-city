Imports System.ComponentModel.DataAnnotations
Imports System.ComponentModel.DataAnnotations.Schema

Namespace Models

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
        Public Property Status As String = "planning"
        Public Property Priority As String = "medium"
        Public Property Impact As String = "medium"
        Public Property Budget As Decimal = 0
        Public Property StandardId As Integer?
        Public Property StartDate As DateTime?
        Public Property EndDate As DateTime?
        Public Property CreatedAt As DateTime = DateTime.UtcNow
        Public Overridable Property Standard As Standard

        <NotMapped>
        Public ReadOnly Property StatusLabel As String
            Get
                Select Case Status
                    Case "planning" : Return "تخطيط"
                    Case "approved" : Return "معتمدة"
                    Case "in_progress" : Return "قيد التنفيذ"
                    Case "completed" : Return "مكتملة"
                    Case "on_hold" : Return "معلقة"
                    Case "cancelled" : Return "ملغاة"
                    Case Else : Return Status
                End Select
            End Get
        End Property

        <NotMapped>
        Public ReadOnly Property StatusBadge As String
            Get
                Select Case Status
                    Case "planning" : Return "secondary"
                    Case "approved" : Return "primary"
                    Case "in_progress" : Return "warning"
                    Case "completed" : Return "success"
                    Case "on_hold" : Return "info"
                    Case "cancelled" : Return "danger"
                    Case Else : Return "secondary"
                End Select
            End Get
        End Property

        <NotMapped>
        Public ReadOnly Property PriorityLabel As String
            Get
                Select Case Priority
                    Case "low" : Return "منخفضة"
                    Case "medium" : Return "متوسطة"
                    Case "high" : Return "عالية"
                    Case "urgent" : Return "عاجلة"
                    Case Else : Return Priority
                End Select
            End Get
        End Property
    End Class

    Public Class TeamMember
        <Key> Public Property Id As Integer
        <Required> Public Property FullName As String = ""
        Public Property Email As String = ""
        Public Property Phone As String = ""
        Public Property Role As String = "member"
        Public Property Department As String = ""
        Public Property CommitteeId As Integer?
        Public Property NationalId As String = ""
        Public Property IsActive As Boolean = True
        Public Property JoinDate As DateTime = DateTime.UtcNow
        Public Overridable Property Committee As Committee

        <NotMapped>
        Public ReadOnly Property RoleLabel As String
            Get
                Select Case Role
                    Case "governor" : Return "المشرف العام (المحافظ)"
                    Case "coordinator" : Return "منسق المدينة الصحية"
                    Case "committee_head" : Return "رئيس لجنة"
                    Case "committee_coordinator" : Return "منسق لجنة"
                    Case "committee_supervisor" : Return "مشرف لجنة"
                    Case "committee_member" : Return "عضو لجنة"
                    Case "budget_manager" : Return "مدير الميزانية"
                    Case "accountant" : Return "المحاسب"
                    Case "member" : Return "عضو"
                    Case "volunteer" : Return "متطوع"
                    Case Else : Return Role
                End Select
            End Get
        End Property

        <NotMapped>
        Public ReadOnly Property RoleBadge As String
            Get
                Select Case Role
                    Case "governor" : Return "danger"
                    Case "coordinator" : Return "primary"
                    Case "committee_head" : Return "warning"
                    Case "committee_coordinator", "committee_supervisor" : Return "info"
                    Case "budget_manager", "accountant" : Return "success"
                    Case "volunteer" : Return "secondary"
                    Case Else : Return "secondary"
                End Select
            End Get
        End Property
    End Class

    Public Class Committee
        <Key> Public Property Id As Integer
        <Required> Public Property Name As String = ""
        Public Property Description As String = ""
        Public Property AxisId As Integer?
        Public Property HeadId As Integer?
        Public Property MembersCount As Integer = 0
        Public Property Status As String = "active"
        Public Property CreatedAt As DateTime = DateTime.UtcNow
        Public Overridable Property Axis As Axis
        Public Overridable Property Members As ICollection(Of TeamMember) = New List(Of TeamMember)()
    End Class

    Public Class BudgetTransaction
        <Key> Public Property Id As Integer
        <Required> Public Property Title As String = ""
        Public Property Description As String = ""
        Public Property Type As String = "expense"
        Public Property Category As String = ""
        Public Property Amount As Decimal = 0
        Public Property VatRate As Decimal = 0
        Public Property VatAmount As Decimal = 0
        Public Property TotalAmount As Decimal = 0
        Public Property Status As String = "pending"
        Public Property PaymentMethod As String = ""
        Public Property TransactionDate As DateTime = DateTime.UtcNow
        Public Property CreatedAt As DateTime = DateTime.UtcNow

        <NotMapped>
        Public ReadOnly Property TypeLabel As String
            Get
                Return If(Type = "income", "إيراد", "مصروف")
            End Get
        End Property

        <NotMapped>
        Public ReadOnly Property StatusLabel As String
            Get
                Select Case Status
                    Case "approved" : Return "معتمدة"
                    Case "rejected" : Return "مرفوضة"
                    Case Else : Return "في الانتظار"
                End Select
            End Get
        End Property
    End Class

    Public Class VolunteerOpportunity
        <Key> Public Property Id As Integer
        <Required> Public Property Title As String = ""
        Public Property Description As String = ""
        Public Property Category As String = ""
        Public Property Location As String = ""
        Public Property RequiredCount As Integer = 1
        Public Property RegisteredCount As Integer = 0
        Public Property StartDate As DateTime?
        Public Property EndDate As DateTime?
        Public Property Status As String = "open"
        Public Property CreatedAt As DateTime = DateTime.UtcNow

        <NotMapped>
        Public ReadOnly Property StatusLabel As String
            Get
                Select Case Status
                    Case "open" : Return "مفتوح"
                    Case "closed" : Return "مغلق"
                    Case "completed" : Return "منتهي"
                    Case Else : Return Status
                End Select
            End Get
        End Property
    End Class

    Public Class CitySettings
        <Key> Public Property Id As Integer
        Public Property CityName As String = "محافظة قلوة"
        Public Property ProgramName As String = "نظام المدينة الصحية"
        Public Property CoordinatorName As String = ""
        Public Property GovernorName As String = ""
        Public Property Region As String = "منطقة عسير"
        Public Property Population As Integer = 0
        Public Property EstablishedYear As Integer = 2024
        Public Property LogoText As String = "ق"
        Public Property UpdatedAt As DateTime = DateTime.UtcNow
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
