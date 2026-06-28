Imports Microsoft.EntityFrameworkCore
Imports QelwaApp.Models

Namespace Data

    Public Class AppDbContext
        Inherits DbContext

        Public Sub New(options As DbContextOptions(Of AppDbContext))
            MyBase.New(options)
        End Sub

        Public Property Axes As DbSet(Of Axis)
        Public Property Standards As DbSet(Of Standard)
        Public Property Tasks As DbSet(Of AppTask)
        Public Property Users As DbSet(Of User)
        Public Property KPIs As DbSet(Of KPI)
        Public Property Documents As DbSet(Of Document)
        Public Property PerformanceReports As DbSet(Of PerformanceReport)
        Public Property Initiatives As DbSet(Of Initiative)

        Protected Overrides Sub OnModelCreating(modelBuilder As ModelBuilder)
            modelBuilder.Entity(Of Axis)(Sub(e)
                e.HasIndex(Function(a) a.AxisOrder).IsUnique()
            End Sub)
            modelBuilder.Entity(Of Standard)(Sub(e)
                e.HasIndex(Function(s) s.Code).IsUnique()
                e.HasOne(Function(s) s.Axis).WithMany(Function(a) a.Standards) _
                 .HasForeignKey(Function(s) s.AxisId).OnDelete(DeleteBehavior.Cascade)
            End Sub)
            modelBuilder.Entity(Of AppTask)(Sub(e)
                e.HasOne(Function(t) t.AssignedUser).WithMany() _
                 .HasForeignKey(Function(t) t.AssignedToId).OnDelete(DeleteBehavior.SetNull)
            End Sub)
            modelBuilder.Entity(Of KPI)(Sub(e)
                e.HasOne(Function(k) k.Standard).WithMany(Function(s) s.KPIs) _
                 .HasForeignKey(Function(k) k.StandardId).OnDelete(DeleteBehavior.Cascade)
            End Sub)
        End Sub
    End Class

End Namespace
