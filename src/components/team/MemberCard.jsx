import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Phone, Mail, Building2, Edit, Trash2, User } from "lucide-react";

const roleLabels = {
  governor: "المشرف العام",
  coordinator: "منسق المدينة الصحية",
  committee_head: "رئيس لجنة",
  committee_coordinator: "منسق لجنة",
  committee_supervisor: "مشرف لجنة",
  committee_member: "عضو لجنة",
  member: "عضو",
  volunteer: "متطوع",
  budget_manager: "مدير الميزانية",
  accountant: "محاسب",
  financial_officer: "موظف مالي"
};

const roleColors = {
  governor: "bg-purple-100 text-purple-800 border-purple-200",
  coordinator: "bg-blue-100 text-blue-800 border-blue-200",
  committee_head: "bg-green-100 text-green-800 border-green-200",
  committee_coordinator: "bg-sky-100 text-sky-800 border-sky-200",
  committee_supervisor: "bg-indigo-100 text-indigo-800 border-indigo-200",
  committee_member: "bg-lime-100 text-lime-800 border-lime-200",
  member: "bg-orange-100 text-orange-800 border-orange-200",
  volunteer: "bg-gray-100 text-gray-800 border-gray-200",
  budget_manager: "bg-emerald-100 text-emerald-800 border-emerald-200",
  accountant: "bg-cyan-100 text-cyan-800 border-cyan-200",
  financial_officer: "bg-teal-100 text-teal-800 border-teal-200"
};

export default function MemberCard({ member, onEdit, onDelete, canEdit }) {
  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-green-500 flex items-center justify-center text-white font-bold text-lg">
              {member.full_name?.charAt(0)}
            </div>
            <div>
              <h3 className="font-semibold text-lg">{member.full_name}</h3>
              <Badge className={`${roleColors[member.role]} border mt-1`}>
                {roleLabels[member.role]}
              </Badge>
            </div>
          </div>
          {canEdit && (
            <div className="flex gap-1">
              <Button variant="ghost" size="icon" onClick={() => onEdit(member)}>
                <Edit className="w-4 h-4 text-blue-600" />
              </Button>
              <Button variant="ghost" size="icon" onClick={() => onDelete(member)}>
                <Trash2 className="w-4 h-4 text-red-600" />
              </Button>
            </div>
          )}
        </div>
        
        <div className="space-y-2 text-sm text-gray-600">
          {member.specialization && (
            <div className="flex items-center gap-2">
              <User className="w-4 h-4" />
              <span>{member.specialization}</span>
            </div>
          )}
          {member.committee_name && (
            <div className="flex items-center gap-2 text-blue-600">
              <Building2 className="w-4 h-4" />
              <span>{member.committee_name}</span>
            </div>
          )}
          {member.department && (
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4" />
              <span>{member.department}</span>
            </div>
          )}
          <div className="flex items-center gap-2">
            <Phone className="w-4 h-4" />
            <span dir="ltr">{member.phone}</span>
          </div>
          {member.email && (
            <div className="flex items-center gap-2">
              <Mail className="w-4 h-4" />
              <span className="text-xs">{member.email}</span>
            </div>
          )}
        </div>
        
        <div className="mt-3 pt-3 border-t flex justify-between items-center">
          <Badge variant={member.status === 'active' ? 'default' : 'secondary'}>
            {member.status === 'active' ? 'نشط' : 'غير نشط'}
          </Badge>
          {member.join_date && (
            <span className="text-xs text-gray-500">
              انضم: {new Date(member.join_date).toLocaleDateString('ar-SA')}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}