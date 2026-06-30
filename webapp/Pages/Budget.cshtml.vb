Imports Microsoft.AspNetCore.Mvc
Imports Microsoft.AspNetCore.Mvc.RazorPages
Imports QelwaApp.Data
Imports QelwaApp.Models

Namespace Pages

    <Microsoft.AspNetCore.Authorization.Authorize>
    Public Class BudgetModel
        Inherits PageModel

        Private ReadOnly _db As AppDbContext

        Public Sub New(db As AppDbContext)
            _db = db
        End Sub

        Public Property Transactions As List(Of BudgetTransaction) = New List(Of BudgetTransaction)()

        Public Sub OnGet()
            Transactions = _db.BudgetTransactions.OrderByDescending(Function(t) t.TransactionDate).ToList()
        End Sub

    End Class

End Namespace
