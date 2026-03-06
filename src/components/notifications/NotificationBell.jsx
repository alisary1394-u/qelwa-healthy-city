import React from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '@/api/apiClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Bell, Check, Trash2, Clock, AlertCircle, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { requireSecureDeleteConfirmation } from '@/lib/secure-delete';
import T from "@/components/T";

export default function NotificationBell({ userEmail }) {
  const { i18n } = useTranslation();
  const rtl = i18n.language === 'ar';
  const queryClient = useQueryClient();

  const handleDeleteNotification = async (notification) => {
    if (!notification?.id) return;
    const confirmed = await requireSecureDeleteConfirmation(`الإشعار "${notification.title || 'غير معنون'}"`);
    if (!confirmed) return;
    deleteMutation.mutate(notification.id);
  };

  const { data: notifications = [] } = useQuery({
    queryKey: ['notifications', userEmail],
    queryFn: () => api.entities.Notification.filter({ user_email: userEmail }, '-created_date', 50),
    enabled: !!userEmail,
    refetchInterval: 30000 // Refresh every 30 seconds
  });

  const markAsReadMutation = useMutation({
    mutationFn: (id) => api.entities.Notification.update(id, { is_read: true }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications', userEmail] })
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.entities.Notification.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications', userEmail] })
  });

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const getIcon = (type) => {
    switch (type) {
      case 'task_assigned': return <Clock className="w-4 h-4 text-blue-600" />;
      case 'task_due': return <AlertCircle className="w-4 h-4 text-yellow-600" />;
      case 'task_overdue': return <AlertCircle className="w-4 h-4 text-red-600" />;
      case 'warning': return <AlertCircle className="w-4 h-4 text-orange-600" />;
      default: return <Info className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getTimeAgo = (date) => {
    const now = new Date();
    const created = new Date(date);
    const diffMs = now - created;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (rtl) {
      if (diffMins < 60) return `منذ ${diffMins} دقيقة`;
      if (diffHours < 24) return `منذ ${diffHours} ساعة`;
      return `منذ ${diffDays} يوم`;
    } else {
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      return `${diffDays}d ago`;
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 bg-destructive text-xs">
              {unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-80 max-h-96 overflow-y-auto" dir={rtl ? 'rtl' : 'ltr'}>
        <div className="p-3 border-b">
          <h3 className="font-semibold"><T>الإشعارات</T></h3>
          {unreadCount > 0 && (
            <p className="text-xs text-muted-foreground">{unreadCount} <T>إشعار غير مقروء</T></p>
          )}
        </div>
        
        {notifications.length === 0 ? (
          <div className="p-6 text-center text-muted-foreground">
            <Bell className="w-12 h-12 mx-auto mb-2 text-muted-foreground/50" />
            <p className="text-sm"><T>لا توجد إشعارات</T></p>
          </div>
        ) : (
          <div className="divide-y">
            {notifications.map(notification => (
              <div
                key={notification.id}
                className={cn(
                  "p-3 hover:bg-muted/50 transition-colors",
                  !notification.is_read && "bg-blue-50"
                )}
              >
                <div className="flex gap-3">
                  <div className="mt-1">{getIcon(notification.type)}</div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm"><T>{notification.title}</T></p>
                    <p className="text-xs text-muted-foreground mt-1"><T>{notification.message}</T></p>
                    <p className="text-xs text-muted-foreground mt-1">{getTimeAgo(notification.created_date)}</p>
                  </div>
                  <div className="flex gap-1">
                    {!notification.is_read && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => markAsReadMutation.mutate(notification.id)}
                      >
                        <Check className="w-4 h-4" />
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDeleteNotification(notification)}
                    >
                      <Trash2 className="w-4 h-4 text-red-600" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}