Imports System.Security.Cryptography
Imports System.Text
Imports QelwaApp.Models

Namespace Data

    Public Module DbInitializer

        Public Sub Initialize(db As AppDbContext)
            ' تحقق من صحة البيانات: المحاور يجب أن تكون بالأسماء الجديدة
            Dim firstAxis = db.Axes.OrderBy(Function(a) a.AxisOrder).FirstOrDefault()
            Dim dataIsCorrect = firstAxis IsNot Nothing AndAlso
                                firstAxis.Name = "التعاون، والشراكة والدعوة بين القطاعات" AndAlso
                                db.Standards.Count() >= 80
            If dataIsCorrect Then Return
            ' إعادة البذر: حذف البيانات القديمة
            If db.Axes.Any() Then
                db.Tasks.RemoveRange(db.Tasks)
                db.Standards.RemoveRange(db.Standards)
                db.Axes.RemoveRange(db.Axes)
                db.Users.RemoveRange(db.Users)
                db.SaveChanges()
            End If

            ' ===== المحاور الـ 9 الصحيحة =====
            Dim axes = New List(Of Axis) From {
                New Axis With {.AxisOrder=1, .Name="التعاون، والشراكة والدعوة بين القطاعات",      .ShortName="الشراكات",   .Color="#3B82F6", .Icon="bi-people-fill",    .Description="(أ) التعاون والشراكة والدعوة بين القطاعات (معايير 1–7)"},
                New Axis With {.AxisOrder=2, .Name="تنظيم المجتمع وتعبئته من أجل الصحة والتنمية", .ShortName="تنظيم المجتمع",.Color="#10B981",.Icon="bi-diagram-3-fill", .Description="(ب) تنظيم المجتمع وتعبئته من أجل الصحة والتنمية (معايير 8–14)"},
                New Axis With {.AxisOrder=3, .Name="مركز المعلومات المجتمعي",                     .ShortName="المعلومات",  .Color="#F59E0B", .Icon="bi-info-circle-fill",.Description="(ج) مركز المعلومات المجتمعي (معايير 15–19)"},
                New Axis With {.AxisOrder=4, .Name="المياه والصرف الصحي وسلامة الغذاء وتلوث الهواء",.ShortName="المياه والبيئة",.Color="#06B6D4",.Icon="bi-droplet-fill",.Description="(د) المياه والصرف الصحي وسلامة الغذاء وتلوث الهواء (معايير 20–30)"},
                New Axis With {.AxisOrder=5, .Name="التنمية الصحية",                               .ShortName="التنمية الصحية",.Color="#8B5CF6",.Icon="bi-heart-pulse-fill",.Description="(هـ) التنمية الصحية (معايير 31–56)"},
                New Axis With {.AxisOrder=6, .Name="الاستعداد للطوارئ والاستجابة لها",             .ShortName="الطوارئ",    .Color="#EF4444", .Icon="bi-shield-plus-fill",.Description="(و) الاستعداد للطوارئ والاستجابة لها (معايير 57–62)"},
                New Axis With {.AxisOrder=7, .Name="التعليم ومحو الأمية",                          .ShortName="التعليم",    .Color="#EC4899", .Icon="bi-book-fill",      .Description="(ز) التعليم ومحو الأمية (معايير 63–67)"},
                New Axis With {.AxisOrder=8, .Name="تنمية المهارات والتدريب المهني وبناء القدرات", .ShortName="المهارات",   .Color="#84CC16", .Icon="bi-tools",          .Description="(ح) تنمية المهارات والتدريب المهني وبناء القدرات (معايير 68–73)"},
                New Axis With {.AxisOrder=9, .Name="أنشطة القروض الصغيرة",                        .ShortName="القروض",     .Color="#F97316", .Icon="bi-cash-coin",      .Description="(ط) أنشطة القروض الصغيرة (معايير 74–80)"}
            }
            db.Axes.AddRange(axes)
            db.SaveChanges()

            ' ===== مستخدم المشرف =====
            db.Users.Add(New User With {
                .Email = "admin@qelwa.gov.sa",
                .FullName = "مدير النظام",
                .PasswordHash = HashPassword("Admin@2024"),
                .Role = "admin",
                .Department = "الإدارة العامة",
                .IsActive = True
            })
            db.SaveChanges()

            ' ===== المعايير الـ 80 الصحيحة =====
            Dim savedAxes = db.Axes.OrderBy(Function(a) a.AxisOrder).ToList()
            Dim standards = New List(Of Standard)()
            Dim g = 1

            Dim allTitles = GetAllStandardTitles()
            Dim counts = {7, 7, 5, 11, 26, 6, 5, 6, 7}

            Dim titleIdx = 0
            For axisIdx = 0 To 8
                Dim ax = savedAxes(axisIdx)
                Dim count = counts(axisIdx)
                For i = 1 To count
                    Dim title = allTitles(titleIdx)
                    Dim pct = If(i = 1, 100, If(i = 2, 50, 0))
                    standards.Add(New Standard With {
                        .Code = $"م{ax.AxisOrder}-{i}",
                        .Title = title,
                        .Description = title,
                        .AxisId = ax.Id,
                        .AxisOrder = ax.AxisOrder,
                        .GlobalNum = g,
                        .Status = If(pct = 100, "completed", If(pct = 50, "in_progress", "not_started")),
                        .CompletionPercentage = pct,
                        .Priority = If(i Mod 3 = 1, "عالية", If(i Mod 3 = 2, "متوسطة", "منخفضة")),
                        .LastUpdated = DateTime.UtcNow
                    })
                    g += 1
                    titleIdx += 1
                Next
            Next
            db.Standards.AddRange(standards)
            db.SaveChanges()

            ' ===== مهام تجريبية =====
            Dim user = db.Users.First()
            Dim std1 = db.Standards.First()
            db.Tasks.AddRange(New List(Of AppTask) From {
                New AppTask With {.Title="مراجعة معايير الشراكات والتعاون",      .Status="in_progress",.Priority="عالية",  .AssignedToId=user.Id,.DueDate=DateTime.UtcNow.AddDays(7)},
                New AppTask With {.Title="إعداد تقرير ربع سنوي",                 .Status="pending",    .Priority="متوسطة", .AssignedToId=user.Id,.DueDate=DateTime.UtcNow.AddDays(14)},
                New AppTask With {.Title="تحديث بيانات مؤشرات الأداء",           .Status="pending",    .Priority="عالية",  .AssignedToId=user.Id,.DueDate=DateTime.UtcNow.AddDays(-2)},
                New AppTask With {.Title="اجتماع لجنة جودة المدينة الصحية",      .Status="completed",  .Priority="منخفضة", .CompletedAt=DateTime.UtcNow.AddDays(-3)},
                New AppTask With {.Title="رفع وثائق التحقق للمعيار الأول",       .Status="in_progress",.Priority="عالية",  .StandardId=std1.Id,.DueDate=DateTime.UtcNow.AddDays(3)}
            })
            db.SaveChanges()

            ' ===== إعدادات المدينة =====
            If Not db.CitySettings.Any() Then
                db.CitySettings.Add(New CitySettings With {
                    .CityName = "محافظة قلوة",
                    .ProgramName = "برنامج المدينة الصحية",
                    .Region = "منطقة عسير",
                    .GovernorName = "صاحب السمو الأمير ...",
                    .CoordinatorName = "مدير النظام",
                    .Population = 45000,
                    .EstablishedYear = 2024,
                    .LogoText = "ق"
                })
                db.SaveChanges()
            End If

            ' ===== اللجان =====
            If Not db.Committees.Any() Then
                Dim axes9 = db.Axes.OrderBy(Function(a) a.AxisOrder).ToList()
                Dim committees = New List(Of Committee) From {
                    New Committee With {.Name="لجنة الشراكات والتعاون بين القطاعات", .Description="تنسيق الشراكات مع القطاعين العام والخاص", .AxisId=axes9(0).Id, .MembersCount=8, .Status="active", .CreatedAt=DateTime.UtcNow.AddMonths(-6)},
                    New Committee With {.Name="لجنة تنظيم المجتمع",                 .Description="تعبئة المجتمع وتنظيمه للتنمية",              .AxisId=axes9(1).Id, .MembersCount=7, .Status="active", .CreatedAt=DateTime.UtcNow.AddMonths(-5)},
                    New Committee With {.Name="لجنة المعلومات المجتمعية",           .Description="إدارة مركز المعلومات المجتمعي",               .AxisId=axes9(2).Id, .MembersCount=5, .Status="active", .CreatedAt=DateTime.UtcNow.AddMonths(-5)},
                    New Committee With {.Name="لجنة البيئة والمياه وسلامة الغذاء",  .Description="الإشراف على جودة البيئة والمياه والغذاء",     .AxisId=axes9(3).Id, .MembersCount=9, .Status="active", .CreatedAt=DateTime.UtcNow.AddMonths(-4)},
                    New Committee With {.Name="لجنة التنمية الصحية",                .Description="متابعة خدمات الرعاية الصحية",                 .AxisId=axes9(4).Id, .MembersCount=12,.Status="active", .CreatedAt=DateTime.UtcNow.AddMonths(-4)},
                    New Committee With {.Name="لجنة الطوارئ والأزمات",             .Description="الاستعداد للطوارئ والاستجابة لها",             .AxisId=axes9(5).Id, .MembersCount=6, .Status="active", .CreatedAt=DateTime.UtcNow.AddMonths(-3)},
                    New Committee With {.Name="لجنة التعليم ومحو الأمية",           .Description="متابعة المدارس ومبادرات محو الأمية",          .AxisId=axes9(6).Id, .MembersCount=7, .Status="active", .CreatedAt=DateTime.UtcNow.AddMonths(-3)},
                    New Committee With {.Name="لجنة تنمية المهارات والتدريب",       .Description="الإشراف على مراكز التدريب المهني",            .AxisId=axes9(7).Id, .MembersCount=6, .Status="active", .CreatedAt=DateTime.UtcNow.AddMonths(-2)},
                    New Committee With {.Name="لجنة القروض الصغيرة والتمويل",      .Description="إدارة برامج الإقراض وأنشطة كسب الرزق",       .AxisId=axes9(8).Id, .MembersCount=7, .Status="active", .CreatedAt=DateTime.UtcNow.AddMonths(-2)}
                }
                db.Committees.AddRange(committees)
                db.SaveChanges()

                ' ===== أعضاء الفريق =====
                Dim comms = db.Committees.OrderBy(Function(c) c.Id).ToList()
                Dim members = New List(Of TeamMember) From {
                    New TeamMember With {.FullName="محمد بن سعد العمري",     .Email="governor@qelwa.gov.sa",   .Role="governor",              .Department="مكتب المحافظ",       .IsActive=True, .JoinDate=DateTime.UtcNow.AddMonths(-12)},
                    New TeamMember With {.FullName="أحمد بن فهد القحطاني",   .Email="coordinator@qelwa.gov.sa",.Role="coordinator",            .Department="منسقية البرنامج",    .IsActive=True, .JoinDate=DateTime.UtcNow.AddMonths(-10)},
                    New TeamMember With {.FullName="فهد بن خالد الشهري",     .Email="f.shahri@qelwa.gov.sa",   .Role="committee_head",         .CommitteeId=comms(0).Id, .Department="الشؤون الاجتماعية",.IsActive=True,.JoinDate=DateTime.UtcNow.AddMonths(-8)},
                    New TeamMember With {.FullName="سعد بن علي الغامدي",     .Email="s.ghamdi@qelwa.gov.sa",   .Role="committee_head",         .CommitteeId=comms(1).Id, .Department="شؤون المجتمع",    .IsActive=True,.JoinDate=DateTime.UtcNow.AddMonths(-7)},
                    New TeamMember With {.FullName="نورة بنت عبدالله السهلي",.Email="n.sahli@qelwa.gov.sa",    .Role="committee_head",         .CommitteeId=comms(4).Id, .Department="الصحة",           .IsActive=True,.JoinDate=DateTime.UtcNow.AddMonths(-6)},
                    New TeamMember With {.FullName="خالد بن محمد الزهراني",  .Email="k.zahrani@qelwa.gov.sa",  .Role="committee_head",         .CommitteeId=comms(5).Id, .Department="الدفاع المدني",   .IsActive=True,.JoinDate=DateTime.UtcNow.AddMonths(-6)},
                    New TeamMember With {.FullName="عبدالرحمن بن سالم العسيري",.Email="a.asiri@qelwa.gov.sa", .Role="committee_head",         .CommitteeId=comms(6).Id, .Department="التعليم",         .IsActive=True,.JoinDate=DateTime.UtcNow.AddMonths(-5)},
                    New TeamMember With {.FullName="ريم بنت ناصر البقمي",    .Email="r.baqami@qelwa.gov.sa",   .Role="budget_manager",         .Department="الشؤون المالية",    .IsActive=True,.JoinDate=DateTime.UtcNow.AddMonths(-9)},
                    New TeamMember With {.FullName="يوسف بن إبراهيم المالكي",.Email="y.malki@qelwa.gov.sa",    .Role="accountant",             .Department="الشؤون المالية",    .IsActive=True,.JoinDate=DateTime.UtcNow.AddMonths(-9)},
                    New TeamMember With {.FullName="منيرة بنت صالح الدوسري",.Email="m.dosari@qelwa.gov.sa",    .Role="committee_coordinator",  .CommitteeId=comms(2).Id, .Department="تقنية المعلومات",.IsActive=True,.JoinDate=DateTime.UtcNow.AddMonths(-4)},
                    New TeamMember With {.FullName="عمر بن حسن القرني",      .Email="o.qarani@qelwa.gov.sa",    .Role="committee_member",       .CommitteeId=comms(3).Id, .Department="البيئة",         .IsActive=True,.JoinDate=DateTime.UtcNow.AddMonths(-3)},
                    New TeamMember With {.FullName="هند بنت راشد الشنقيطي", .Email="h.shinqiti@qelwa.gov.sa",  .Role="committee_member",       .CommitteeId=comms(7).Id, .Department="التدريب المهني", .IsActive=True,.JoinDate=DateTime.UtcNow.AddMonths(-3)},
                    New TeamMember With {.FullName="طارق بن وليد العتيبي",   .Email="t.otaibi@qelwa.gov.sa",    .Role="committee_member",       .CommitteeId=comms(8).Id, .Department="التمويل الأصغر",.IsActive=True,.JoinDate=DateTime.UtcNow.AddMonths(-2)},
                    New TeamMember With {.FullName="لطيفة بنت يحيى المعمري",.Email="l.mamari@qelwa.gov.sa",    .Role="committee_supervisor",   .CommitteeId=comms(1).Id, .Department="شؤون المجتمع",  .IsActive=True,.JoinDate=DateTime.UtcNow.AddMonths(-4)},
                    New TeamMember With {.FullName="بدر بن عوض المحيا",     .Email="b.mohaya@qelwa.gov.sa",     .Role="volunteer",              .Department="التطوع",            .IsActive=True,.JoinDate=DateTime.UtcNow.AddMonths(-1)},
                    New TeamMember With {.FullName="سلمى بنت جابر الحارثي", .Email="s.harithi@qelwa.gov.sa",   .Role="volunteer",              .Department="التطوع",            .IsActive=True,.JoinDate=DateTime.UtcNow.AddMonths(-1)},
                    New TeamMember With {.FullName="زيد بن عثمان السلمي",    .Email="z.sulami@qelwa.gov.sa",    .Role="member",                 .CommitteeId=comms(0).Id, .Department="الشراكات",       .IsActive=True,.JoinDate=DateTime.UtcNow.AddMonths(-6)},
                    New TeamMember With {.FullName="وفاء بنت حمد البريكي",  .Email="w.braiki@qelwa.gov.sa",    .Role="committee_member",       .CommitteeId=comms(4).Id, .Department="الصحة العامة",  .IsActive=False,.JoinDate=DateTime.UtcNow.AddMonths(-8)}
                }
                db.TeamMembers.AddRange(members)
                db.SaveChanges()
            End If

            ' ===== المبادرات =====
            If Not db.Initiatives.Any() Then
                Dim stds = db.Standards.OrderBy(Function(s) s.GlobalNum).ToList()
                Dim initiatives = New List(Of Initiative) From {
                    New Initiative With {.Title="مشروع مياه الشرب النظيفة",          .Description="توصيل مياه الشرب النظيفة لجميع أحياء المحافظة وضمان جودتها المستمرة",               .Status="completed",  .Priority="urgent", .Budget=850000,  .StandardId=stds(22).Id, .StartDate=DateTime.UtcNow.AddMonths(-8),.EndDate=DateTime.UtcNow.AddMonths(-2),.CreatedAt=DateTime.UtcNow.AddMonths(-10)},
                    New Initiative With {.Title="حملة التطعيم الشامل للأطفال",       .Description="توفير اللقاحات الأساسية لجميع أطفال المحافظة دون الخامسة",                          .Status="in_progress",.Priority="urgent", .Budget=320000,  .StandardId=stds(39).Id, .StartDate=DateTime.UtcNow.AddMonths(-3),.EndDate=DateTime.UtcNow.AddMonths(3),.CreatedAt=DateTime.UtcNow.AddMonths(-4)},
                    New Initiative With {.Title="مركز المعلومات المجتمعي",            .Description="إنشاء وتشغيل مركز معلومات مجتمعي متكامل يخدم سكان المحافظة",                      .Status="in_progress",.Priority="high",   .Budget=540000,  .StandardId=stds(14).Id, .StartDate=DateTime.UtcNow.AddMonths(-4),.EndDate=DateTime.UtcNow.AddMonths(2),.CreatedAt=DateTime.UtcNow.AddMonths(-5)},
                    New Initiative With {.Title="برنامج محو الأمية للكبار",           .Description="تعليم القراءة والكتابة للبالغين الذين لم يتلقوا تعليماً رسمياً",                    .Status="approved",   .Priority="high",   .Budget=180000,  .StandardId=stds(63).Id, .StartDate=DateTime.UtcNow.AddMonths(1), .EndDate=DateTime.UtcNow.AddMonths(7), .CreatedAt=DateTime.UtcNow.AddMonths(-2)},
                    New Initiative With {.Title="مشروع إدارة النفايات الصلبة",        .Description="إنشاء نظام متكامل لجمع ومعالجة النفايات الصلبة في المحافظة",                       .Status="planning",   .Priority="high",   .Budget=1200000, .StandardId=stds(20).Id, .StartDate=Nothing,                      .EndDate=Nothing,                      .CreatedAt=DateTime.UtcNow.AddMonths(-1)},
                    New Initiative With {.Title="مراكز التدريب المهني للشباب",        .Description="إنشاء مراكز تدريب مهني تتوافق مع متطلبات سوق العمل المحلي",                       .Status="approved",   .Priority="medium", .Budget=650000,  .StandardId=stds(68).Id, .StartDate=DateTime.UtcNow.AddMonths(2), .EndDate=DateTime.UtcNow.AddMonths(14),.CreatedAt=DateTime.UtcNow.AddMonths(-2)},
                    New Initiative With {.Title="شبكة الإسعاف والطوارئ",              .Description="تطوير شبكة استجابة للطوارئ تشمل تدريب المتطوعين وتوفير المعدات",                   .Status="in_progress",.Priority="urgent", .Budget=420000,  .StandardId=stds(56).Id, .StartDate=DateTime.UtcNow.AddMonths(-2),.EndDate=DateTime.UtcNow.AddMonths(4), .CreatedAt=DateTime.UtcNow.AddMonths(-3)},
                    New Initiative With {.Title="مشروع الإقراض الأصغر للمرأة",       .Description="برنامج قروض صغيرة لدعم المشاريع النسائية وتمكين المرأة اقتصادياً",                  .Status="in_progress",.Priority="high",   .Budget=290000,  .StandardId=stds(73).Id, .StartDate=DateTime.UtcNow.AddMonths(-3),.EndDate=DateTime.UtcNow.AddMonths(9), .CreatedAt=DateTime.UtcNow.AddMonths(-4)},
                    New Initiative With {.Title="حدائق ومساحات خضراء",               .Description="تطوير وإنشاء حدائق عامة ومساحات خضراء في أحياء المحافظة",                         .Status="planning",   .Priority="medium", .Budget=380000,  .StandardId=stds(19).Id, .StartDate=Nothing,                      .EndDate=Nothing,                      .CreatedAt=DateTime.UtcNow},
                    New Initiative With {.Title="برنامج الصحة المدرسية",              .Description="تعزيز الصحة في المدارس من خلال الفحوصات الدورية والتوعية الصحية",                  .Status="completed",  .Priority="high",   .Budget=160000,  .StandardId=stds(53).Id, .StartDate=DateTime.UtcNow.AddMonths(-10),.EndDate=DateTime.UtcNow.AddMonths(-4),.CreatedAt=DateTime.UtcNow.AddMonths(-11)},
                    New Initiative With {.Title="تحسين جودة هواء المدينة",            .Description="رصد جودة الهواء واتخاذ إجراءات للحد من التلوث",                                    .Status="planning",   .Priority="medium", .Budget=220000,  .StandardId=stds(27).Id, .StartDate=Nothing,                      .EndDate=Nothing,                      .CreatedAt=DateTime.UtcNow.AddDays(-15)},
                    New Initiative With {.Title="توعية بالأمراض المزمنة",             .Description="حملات توعوية بالسكري وضغط الدم وأمراض القلب وطرق الوقاية",                        .Status="approved",   .Priority="high",   .Budget=95000,   .StandardId=stds(47).Id, .StartDate=DateTime.UtcNow.AddMonths(1), .EndDate=DateTime.UtcNow.AddMonths(6), .CreatedAt=DateTime.UtcNow.AddDays(-30)}
                }
                db.Initiatives.AddRange(initiatives)
                db.SaveChanges()
            End If

            ' ===== معاملات الميزانية =====
            If Not db.BudgetTransactions.Any() Then
                Dim txns = New List(Of BudgetTransaction) From {
                    New BudgetTransaction With {.Title="دعم حكومي للبرنامج السنوي",           .Type="income",  .Category="دعم حكومي",      .Amount=2000000,.VatRate=0,.VatAmount=0,.TotalAmount=2000000, .Status="approved",.PaymentMethod="تحويل بنكي",  .TransactionDate=DateTime.UtcNow.AddMonths(-6)},
                    New BudgetTransaction With {.Title="رواتب فريق العمل – الربع الأول",       .Type="expense", .Category="رواتب",           .Amount=180000, .VatRate=0,.VatAmount=0,.TotalAmount=180000,  .Status="approved",.PaymentMethod="تحويل بنكي",  .TransactionDate=DateTime.UtcNow.AddMonths(-5)},
                    New BudgetTransaction With {.Title="شراء معدات طبية للطوارئ",              .Type="expense", .Category="معدات",           .Amount=95000,  .VatRate=15,.VatAmount=14250,.TotalAmount=109250,.Status="approved",.PaymentMethod="شيك",         .TransactionDate=DateTime.UtcNow.AddMonths(-4)},
                    New BudgetTransaction With {.Title="تجهيز مركز المعلومات المجتمعي",       .Type="expense", .Category="تجهيزات",         .Amount=75000,  .VatRate=15,.VatAmount=11250,.TotalAmount=86250, .Status="approved",.PaymentMethod="شيك",         .TransactionDate=DateTime.UtcNow.AddMonths(-4)},
                    New BudgetTransaction With {.Title="تبرع من القطاع الخاص",                 .Type="income",  .Category="تبرعات",          .Amount=150000, .VatRate=0,.VatAmount=0,.TotalAmount=150000,  .Status="approved",.PaymentMethod="تحويل بنكي",  .TransactionDate=DateTime.UtcNow.AddMonths(-3)},
                    New BudgetTransaction With {.Title="حملة التطعيم – لقاحات وادوية",        .Type="expense", .Category="الصحة",           .Amount=120000, .VatRate=0,.VatAmount=0,.TotalAmount=120000,  .Status="approved",.PaymentMethod="تحويل بنكي",  .TransactionDate=DateTime.UtcNow.AddMonths(-3)},
                    New BudgetTransaction With {.Title="رواتب فريق العمل – الربع الثاني",      .Type="expense", .Category="رواتب",           .Amount=180000, .VatRate=0,.VatAmount=0,.TotalAmount=180000,  .Status="approved",.PaymentMethod="تحويل بنكي",  .TransactionDate=DateTime.UtcNow.AddMonths(-2)},
                    New BudgetTransaction With {.Title="ورشة تدريبية لأعضاء الفريق",          .Type="expense", .Category="تدريب",           .Amount=28000,  .VatRate=15,.VatAmount=4200,.TotalAmount=32200, .Status="approved",.PaymentMethod="نقد",          .TransactionDate=DateTime.UtcNow.AddMonths(-2)},
                    New BudgetTransaction With {.Title="مطبوعات ومواد توعوية",                 .Type="expense", .Category="مطبوعات",         .Amount=15000,  .VatRate=15,.VatAmount=2250,.TotalAmount=17250, .Status="approved",.PaymentMethod="نقد",          .TransactionDate=DateTime.UtcNow.AddMonths(-2)},
                    New BudgetTransaction With {.Title="رسوم خدمات مجتمعية",                   .Type="income",  .Category="رسوم",            .Amount=35000,  .VatRate=0,.VatAmount=0,.TotalAmount=35000,   .Status="approved",.PaymentMethod="نقد",          .TransactionDate=DateTime.UtcNow.AddMonths(-1)},
                    New BudgetTransaction With {.Title="صيانة مركز المعلومات",                 .Type="expense", .Category="صيانة",           .Amount=8500,   .VatRate=15,.VatAmount=1275,.TotalAmount=9775,  .Status="approved",.PaymentMethod="نقد",          .TransactionDate=DateTime.UtcNow.AddMonths(-1)},
                    New BudgetTransaction With {.Title="رواتب فريق العمل – الربع الثالث",      .Type="expense", .Category="رواتب",           .Amount=180000, .VatRate=0,.VatAmount=0,.TotalAmount=180000,  .Status="approved",.PaymentMethod="تحويل بنكي",  .TransactionDate=DateTime.UtcNow.AddDays(-30)},
                    New BudgetTransaction With {.Title="إيجار مقر البرنامج",                   .Type="expense", .Category="إيجار",           .Amount=45000,  .VatRate=15,.VatAmount=6750,.TotalAmount=51750, .Status="approved",.PaymentMethod="شيك",         .TransactionDate=DateTime.UtcNow.AddDays(-15)},
                    New BudgetTransaction With {.Title="عقد شركة نظافة البيئة",                .Type="expense", .Category="عقود",            .Amount=60000,  .VatRate=15,.VatAmount=9000,.TotalAmount=69000, .Status="pending", .PaymentMethod="تحويل بنكي",  .TransactionDate=DateTime.UtcNow.AddDays(-7)},
                    New BudgetTransaction With {.Title="دعم من مجلس المنطقة",                  .Type="income",  .Category="دعم حكومي",      .Amount=500000, .VatRate=0,.VatAmount=0,.TotalAmount=500000,  .Status="pending", .PaymentMethod="تحويل بنكي",  .TransactionDate=DateTime.UtcNow.AddDays(-5)}
                }
                db.BudgetTransactions.AddRange(txns)
                db.SaveChanges()
            End If

            ' ===== فرص التطوع =====
            If Not db.VolunteerOpportunities.Any() Then
                Dim opps = New List(Of VolunteerOpportunity) From {
                    New VolunteerOpportunity With {.Title="متطوعون للتوعية الصحية",          .Description="نشر التوعية الصحية في الأحياء والمدارس",             .Category="صحة",           .Location="أحياء المحافظة",         .RequiredCount=20,.RegisteredCount=15,.Status="open",      .StartDate=DateTime.UtcNow.AddDays(7),  .EndDate=DateTime.UtcNow.AddDays(37)},
                    New VolunteerOpportunity With {.Title="دعم حملة التطعيم",                .Description="المساعدة في تنظيم حملة التطعيم الشامل للأطفال",       .Category="صحة",           .Location="المرافق الصحية",          .RequiredCount=10,.RegisteredCount=10,.Status="closed",    .StartDate=DateTime.UtcNow.AddDays(-14),.EndDate=DateTime.UtcNow.AddDays(-1)},
                    New VolunteerOpportunity With {.Title="مساعدون في مركز المعلومات",       .Description="توفير المعلومات وتوجيه المجتمع في مركز المعلومات",   .Category="إدارة",         .Location="مركز المعلومات المجتمعي",.RequiredCount=5, .RegisteredCount=3, .Status="open",      .StartDate=DateTime.UtcNow.AddDays(3),  .EndDate=DateTime.UtcNow.AddDays(33)},
                    New VolunteerOpportunity With {.Title="تنظيف أحياء المحافظة",            .Description="حملة نظافة شاملة لجميع أحياء المحافظة",               .Category="بيئة",          .Location="جميع الأحياء",            .RequiredCount=50,.RegisteredCount=42,.Status="open",      .StartDate=DateTime.UtcNow.AddDays(14), .EndDate=DateTime.UtcNow.AddDays(14)},
                    New VolunteerOpportunity With {.Title="تعليم محو الأمية",                .Description="تعليم القراءة والكتابة للبالغين في المساجد",          .Category="تعليم",         .Location="مساجد المحافظة",          .RequiredCount=15,.RegisteredCount=8, .Status="open",      .StartDate=DateTime.UtcNow.AddDays(21), .EndDate=DateTime.UtcNow.AddDays(111)},
                    New VolunteerOpportunity With {.Title="إرشاد التدريب المهني",            .Description="إرشاد الشباب في مراكز التدريب المهني",                .Category="تدريب",         .Location="مراكز التدريب",           .RequiredCount=8, .RegisteredCount=5, .Status="open",      .StartDate=DateTime.UtcNow.AddDays(7),  .EndDate=DateTime.UtcNow.AddDays(97)},
                    New VolunteerOpportunity With {.Title="الاستجابة لحوادث الطوارئ",        .Description="تدريب وانتشار فرق الاستجابة الطارئة",                 .Category="طوارئ",         .Location="مراكز الطوارئ",           .RequiredCount=25,.RegisteredCount=20,.Status="open",      .StartDate=DateTime.UtcNow.AddDays(1),  .EndDate=DateTime.UtcNow.AddDays(31)},
                    New VolunteerOpportunity With {.Title="دعم برامج المرأة",                .Description="دعم أنشطة المجموعات النسائية وتعزيز قدراتهن",         .Category="مجتمع",         .Location="مراكز المرأة",            .RequiredCount=12,.RegisteredCount=12,.Status="completed",  .StartDate=DateTime.UtcNow.AddMonths(-3),.EndDate=DateTime.UtcNow.AddMonths(-1)},
                    New VolunteerOpportunity With {.Title="رقابة أسواق الغذاء",              .Description="مراقبة جودة وسلامة الغذاء في الأسواق المحلية",        .Category="سلامة غذاء",    .Location="الأسواق المحلية",         .RequiredCount=6, .RegisteredCount=4, .Status="open",      .StartDate=DateTime.UtcNow.AddDays(10), .EndDate=DateTime.UtcNow.AddDays(40)},
                    New VolunteerOpportunity With {.Title="صديق المسن",                       .Description="دعم كبار السن وتقديم المساعدة لهم في أعمالهم اليومية",.Category="رعاية اجتماعية",.Location="المنازل والمراكز",       .RequiredCount=20,.RegisteredCount=7, .Status="open",      .StartDate=DateTime.UtcNow.AddDays(5),  .EndDate=DateTime.UtcNow.AddDays(95)}
                }
                db.VolunteerOpportunities.AddRange(opps)
                db.SaveChanges()
            End If

            ' ===== وثائق تجريبية =====
            If Not db.Documents.Any() Then
                Dim stds2 = db.Standards.OrderBy(Function(s) s.GlobalNum).Take(20).ToList()
                Dim docs = New List(Of Document)()
                For Each std In stds2
                    docs.Add(New Document With {
                        .Name = $"وثيقة تحقق المعيار {std.Code}",
                        .StandardId = std.Id,
                        .DocumentType = If(std.GlobalNum Mod 3 = 0, "report", "required"),
                        .Status = If(std.Status = "completed", "approved", If(std.Status = "in_progress", "pending", "pending")),
                        .CreatedAt = DateTime.UtcNow.AddDays(-std.GlobalNum)
                    })
                Next
                db.Documents.AddRange(docs)
                db.SaveChanges()
            End If

        End Sub

        Private Function GetAllStandardTitles() As String()
            Return {
                "تم ترشيح وتعيين أعضاء لجنة تنسيق أعمال المدينة الصحية بصورة رسمية من قبل مختلف القطاعات.",
                "تم تشكيل لجنة تنسيق أعمال المدينة الصحية تحت رئاسة العمدة أو المحافظ، واستقطبت أعضاءها من ممثلين من كافة القطاعات ذات الصلة، وسجلت جميع وقائع الاجتماعات والتبليغ بها.",
                "تم تعيين منسق رسمي لبرنامج المدينة الصحية، مع توفير العدد الكافي من العاملين معه علاوة على مساحة معقولة للعمل من خلالها وتزويدها بالمعدات والتسهيلات.",
                "يجتمع أعضاء الفريق المشترك بين القطاعات مع لجنة تنسيق أعمال المدينة الصحية ويقدمون المشورة الفنية والدعم للمجتمع.",
                "تم التعرف على الشركاء المحتملين والاتصال بهم وجاري تنفيذ مشروع واحد مشترك على الأقل في المكان الذي اختير ليكون مدينة صحية.",
                "تسجيل القضايا المالية المتعلقة بالأنشطة المشتركة، ويتم تسجيلها والتبليغ بها، ويشارك المجتمع فيها من أجل تحقيق الشفافية.",
                "يتم توثيق قصص النجاح، وتنشر وتستخدم في الدعوة، ووضع استراتيجية شاملة وآليات الدعوة مع مراعاة الثقافة المحلية.",
                "اختيرت ودربت المجموعات المكونة من الممثلين والمتطوعين على تقييم الاحتياجات، وترتيب الأولويات، وتحليل المعطيات، وإعداد المشروع، والرصد وآليات التسجيل وآليات الإبلاغ.",
                "تم تشكيل لجنة تنسيق أعمال المدينة الصحية، وسجلت من قبل السلطات المحلية، باعتبارها إحدى المنظمات المجتمعية أو المنظمات غير الحكومية.",
                "المجموعات المكونة للممثلين والمتطوعين أصبحت شركاء نشيطين في التخطيط الصحي والاجتماعي المحلي والإجراءات.",
                "تقوم لجنة تنسيق أعمال المدينة الصحية بمراقبة المشاريع الاجتماعية والاقتصادية والإشراف عليها، وتسجل ما تم من إنجازات، وعراقيل وتحدد الحلول المحلية للمشكلات المحلية.",
                "تبحث لجنة تنسيق أعمال المدينة الصحية عن الموارد، وتقوم بتكوين العلاقات مع الشركاء المحتملين من أجل مزيد من التنمية في الأماكن المحلية.",
                "تم تأسيس أو تم التخطيط لإنشاء مركز اجتماعي من أجل الاستخدامات المختلفة وفقا لاحتياجات المجتمع.",
                "تم تأسيس المجموعات النسائية والشبابية وتم تسجيلها وتسهم في التدخلات التنموية المحلية.",
                "تم تأسيس مركز معلومات مجتمعي، ودرب ممثلون ومتطوعون من المجموعات المكونة على جمع المعلومات الأساسية وتحليلها واستخدامها في التخطيط التنموي المحلي.",
                "تعرض المعلومات الأساسية في مركز المعلومات المجتمعي أو مكتب برنامج المدينة الصحية المحلي، ويشاركها المجتمع مع جميع الشركاء والقطاعات ذات الصلة.",
                "تستخدم المعلومات الأساسية لأغراض الدعوة والرصد من قبل لجنة تنمية المجتمع المحلي والجهات المعنية الأخرى.",
                "توثيق جيد لنماذج المسح الأساسي ونتائجه، وتحديث المعلومات المتعلقة بالمشاريع القائمة، وإتاحتها من قبل لجنة تنمية المجتمع المحلي ومنسق المدينة الصحية.",
                "إكمال تصميم ملف المدينة، وتحديثه بانتظام وبشكل منهجي، واستخدامه في عمليات التخطيط والرصد.",
                "موقع تنفيذ البرنامج نظيف وبه مساحات خضراء كافية.",
                "الانتهاء من إنشاء نظام مجتمعي فعّال لمعالجة النفايات الصلبة في موقع تنفيذ البرنامج.",
                "تم عمل مخطط المصادر المياه وحمايتها بصورة واضحة عن طريق الخرائط.",
                "وصول جميع العائلات إلى مياه شرب آمنة ومرافق صرف صحي أساسية، ورفع الوعي بمخاطر المياه غير الآمنة.",
                "تدريب الممثلين والمتطوعين من المجموعات المختلفة على الحفاظ على البيئات والمواقع الصحية.",
                "مشاركة المجتمع في سلامة الغذاء ومراقبة جميع الأسواق المحلية من قبل إدارات سلامة الغذاء الوطنية.",
                "تحسين إمكانية الوصول إلى الأسواق التي تبيع الأغذية الصحية والمنتجات الأساسية.",
                "حظر التدخين في الأماكن المغلقة والأماكن العامة، وإعداد خطة لتحويل المدينة إلى مدينة خالية من التدخين.",
                "إنشاء مركز مجتمعي لجودة الهواء في إطار برنامج المدينة الصحية لضمان المراقبة المنتظمة لتلوث الهواء.",
                "قيام مخططي المدينة بتنفيذ التدخلات التي تحد من تلوث الهواء.",
                "يجب إجراء تقييم التأثير تلوث الهواء قبل الموافقة على المناهج والخطط الخاصة بتحديد الأماكن الحضرية والسكانية.",
                "تم تدريب ممثلي المجموعات المكونة والمتطوعين الصحيين على القضايا الصحية والبرامج ذات العلاقة بالصحة.",
                "يقوم ممثلو المجموعات والمتطوعين الصحيين بتسجيل وتبليغ حالات الولادة والوفيات وغيرها من الإحصاءات الحيوية.",
                "انتهاء لجنة تنسيق أعمال المدينة الصحية بالتعاون مع مقدمي الرعاية الصحية من إنشاء نظم إحالة مستدامة.",
                "الانتهاء من تدريب وإشراك المجتمع بصورة فعالة في المشاريع القائمة على بحوث المشاركة المجتمعية.",
                "تشكيل لجنة فرعية تابعة للجنة تنسيق أعمال المدينة الصحية من أجل إدارة خدمات الرعاية الصحية المحلية.",
                "توفر الأدوية الأساسية واللقاحات والأدوات الطبية في المرافق الصحية الحضرية.",
                "إجراء تقييمات جودة لخدمات الرعاية الصحية، وتقييم رضا المستفيدين، ومستوى تدريب العاملين الصحيين.",
                "حصول جميع الحوامل على رعاية ما قبل الولادة في الوقت المناسب وتوفير أماكن ولادة آمنة.",
                "حصول جميع الأمهات على رعاية ما بعد الولادة لمدة 40 يوماً على الأقل.",
                "تطعيم جميع الأطفال ضد الأمراض التي يمكن الوقاية منها باللقاحات قبل بلوغهم السنة الأولى من العمر.",
                "تسجيل جميع المواليد من قبل ممثلي المجتمع والمتطوعين الصحيين، وتطعيمهم وفق الجدول الوطني للتحصين.",
                "مشاركة لجنة تنسيق أعمال المدينة الصحية بفعالية في حملات استئصال شلل الأطفال.",
                "إتاحة خدمات الرعاية الصحية للأطفال دون الخامسة واستفادتهم منها بانتظام مع وجود نظام متابعة فعّال.",
                "تحديد الأطفال والأمهات المصابين بسوء التغذية أو نقص فيتامين أ أو فقر الدم، وضمان حصولهم على العلاج.",
                "تنفيذ استراتيجية DOTS لعلاج السل تحت الإشراف المباشر، بمشاركة ممثلي المجتمع أو المتطوعين المدربين.",
                "تنفيذ برنامج لمكافحة الملاريا (إن لزم)، بمشاركة فعالة من ممثلي المجتمع أو المتطوعين.",
                "قيام ممثلي المجتمع والمتطوعين الصحيين بالإبلاغ عن الحالات المشتبه فيها إلى أقرب مرفق صحي.",
                "تثقيف المجتمع حول طرق عدوى فيروس نقص المناعة (الإيدز) وطرق الوقاية.",
                "تحديد جميع مرضى الأمراض المزمنة ورسم خريطة تفصيلية ووضع خطة متابعة منتظمة.",
                "تحديد جميع الحالات المصابة باضطرابات نفسية والمتعاطين للمخدرات وتلقيهم دعم المجتمع المحلي.",
                "تحديد جميع من يعانون من عجز بدني وضمان تلقيهم الدعم المجتمعي لتأمين قدراتهم على كسب الرزق.",
                "يتم التعرف على الأماكن التي تتسم بالخطورة واتخاذ التدابير المناسبة لخفض معدلات الوفيات والإصابات.",
                "تحقق خلو منطقة تنفيذ البرنامج من الجريمة، والعنف، والتمييز ضد النساء والرجال والتمييز العرقي.",
                "دعم المجتمع وتبنيه لبرامج الطفولة المبكرة وتعزيزها واعتماده للمجتمعات الصديقة للطفل.",
                "جميع المبادرات الخاصة بالصحة المدرسية تنفذ في جميع المدارس الواقعة في نطاق تنفيذ البرنامج.",
                "إجراءات الصحة والسلامة المهنية متوافرة في جميع أماكن العمل مع توفر الإسعافات الأولية.",
                "تم تحديد حالات الطوارئ التي حدثت خلال العشرين عاماً السابقة وتوثيق عدد الضحايا والبنية التحتية المتضررة.",
                "إنشاء لجنة فرعية للاستعداد للطوارئ والاستجابة لها، وتم توجيهها وتوزيع المهام الخاصة بها على الأعضاء.",
                "انتهاء إعداد مخطط للمدينة وحفظ صورة منه خارج المنطقة التي يتم فيها تنفيذ البرنامج.",
                "تم تدريب ممثلي المجموعات والمتطوعين على خطط الاستعداد للطوارئ وكيفية التعامل مع الحالات الحرجة.",
                "تم إعداد خطة احتياطية للطوارئ وإعلام السلطات المختصة بها من أجل تعبئة الموارد واتخاذ الإجراءات اللازمة.",
                "تحديد المجموعات السكانية المستضعفة باستخدام الخرائط وهذه المعلومات معروفة للسلطات المعنية مسبقاً.",
                "التحاق جميع الأطفال في سن الدراسة (البنين والبنات) بالمدارس ولم يتسرب تلميذ واحد من التعليم.",
                "يعقد مديرو المدارس اجتماعات دورية مع اللجان المحلية للتنمية المجتمعية لتقييم جودة التعليم والبيئة المدرسية.",
                "توجد معايير جودة التعليم في أماكنها بالمدارس الواقعة في نطاق تنفيذ البرنامج.",
                "تم تشكيل لجنة فرعية للتعليم تابعة للجنة التنمية المجتمعية ويتم رصد ومراقبة المدارس بصورة دورية منتظمة.",
                "تم تشجيع مجموعات الشباب والمجموعات النسائية على العمل كأعضاء نشيطين في حملات محو الأمية على أساس تطوعي.",
                "انتهت إجراءات تقييم وتعزيز المهارات المحلية والاهتمامات والتقنيات المناسبة.",
                "أنشئت مراكز التدريب على المهارات التي ترتبط بالأسواق المحلية للذكور والإناث.",
                "تعطي لجنة تنسيق أعمال المدينة الصحية الأولوية لتوفير القروض لطلبة مراكز التدريب المهني.",
                "أصبحت مراكز التدريب المهني ذاتية التمويل، وذاتية الإدارة من قبل المجتمع أو المنظمات المحلية.",
                "أنشئت مراكز التدريب على الحاسوب، وفصول تعليم اللغات، ومرافق الرياضة وهي الآن ذاتية الإدارة.",
                "يتم تحديد المبدعين والمبتكرين ودعمهم وتعزيزهم.",
                "يتم تحديد الفقراء والمحتاجين من أفراد المجتمع وإعطاء الأولوية لهم في توفير الأنشطة المدرة للدخل والقروض.",
                "التربيط بين المهارات المحلية ومراكز التدريب المهني وأنشطة الإقراض مع التأكد من الاتجاه نحو الاكتفاء الذاتي.",
                "تسجيل جميع القضايا المالية، ومتابعتها من قبل المسؤول المالي في لجنة التنسيق الخاصة بالمدينة الصحية.",
                "تسديد القروض على أساس نظامي وآلية متابعة تم وضعها من قبل لجنة تنسيق المدينة الصحية.",
                "تم فتح حساب مصرفي للجنة تنسيق المدينة الصحية وجميع التعاملات المالية المتصلة بالقروض تتم من خلال البنك.",
                "يتم أخذ نسبة من 5 إلى 10% نظير خدمات كل قرض من القروض المدرة للدخل وتجمع في حساب منفصل.",
                "ممثلو المجموعات المكونة يضمنون سداد الودائع في الوقت المناسب من خلال أقساط شهرية والحفاظ على الصندوق الدائر."
            }
        End Function

        Public Function HashPassword(password As String) As String
            Using sha = SHA256.Create()
                Dim bytes = sha.ComputeHash(Encoding.UTF8.GetBytes(password))
                Return BitConverter.ToString(bytes).Replace("-", "").ToLower()
            End Using
        End Function

    End Module

End Namespace
