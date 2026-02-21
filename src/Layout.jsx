import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import { LogOut, User, Menu, Settings as SettingsIcon, AlertTriangle } from "lucide-react";
import NotificationBell from "@/components/notifications/NotificationBell";
import { isBase44Configured, appParams } from '@/lib/app-params';
import { usePermissions } from '@/hooks/usePermissions';

export default function Layout({ children }) {
  const location = useLocation();
  const currentPath = location.pathname;
  const { navItems, isGovernor } = usePermissions();

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me()
  });

  const { data: settings = [] } = useQuery({
    queryKey: ['settings'],
    queryFn: () => base44.entities.Settings.list()
  });

  const currentSetting = settings[0] || {};

  const isActive = (pageName) => currentPath === createPageUrl(pageName);

  const base44Ready = appParams.useLocalBackend || appParams.apiUrl || appParams.useSupabaseBackend || isBase44Configured();

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      {!base44Ready && (
        <div className="bg-amber-500 text-white px-4 py-3 flex items-center justify-center gap-3 flex-wrap text-center">
          <AlertTriangle className="w-5 h-5 flex-shrink-0" />
          <span>
            إعداد Base44 مطلوب: افتح ملف <strong>.env.local</strong> وضع فيه <strong>VITE_BASE44_APP_ID</strong> و <strong>VITE_BASE44_APP_BASE_URL</strong> من لوحة Base44، ثم نفّذ <strong>npx base44 entities push</strong> وأعد تشغيل التطبيق.
          </span>
        </div>
      )}
      {/* Top Navigation */}
      <nav className="bg-white border-b shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link to={createPageUrl('Home')} className="flex items-center gap-3">
              {currentSetting.logo_url ? (
                <img 
                  src={currentSetting.logo_url} 
                  alt="شعار المدينة" 
                  className="w-10 h-10 rounded-lg object-cover"
                />
              ) : (
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-600 to-green-600 flex items-center justify-center">
                  <span className="text-white font-bold text-lg">{currentSetting.logo_text || 'ق'}</span>
                </div>
              )}
              <div className="hidden sm:block">
                <p className="font-bold text-gray-800">{currentSetting.city_name || 'المدينة الصحية'}</p>
                <p className="text-xs text-gray-500">{currentSetting.city_location || 'محافظة قلوة'}</p>
              </div>
            </Link>

            {/* Desktop Nav */}
            <div className="hidden md:flex items-center gap-1">
              {navItems.map(item => (
                <Link key={item.name} to={createPageUrl(item.name)}>
                  <Button 
                    variant={isActive(item.name) ? "default" : "ghost"}
                    className={isActive(item.name) ? "bg-blue-600" : ""}
                  >
                    <item.icon className="w-4 h-4 ml-2" />
                    {item.label}
                  </Button>
                </Link>
              ))}
            </div>

            {/* User Menu */}
            <div className="flex items-center gap-2">
              {currentUser && <NotificationBell userEmail={currentUser.email} />}
              {currentUser && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-green-500 flex items-center justify-center text-white font-semibold">
                        {currentUser.full_name?.charAt(0) || 'م'}
                      </div>
                      <span className="hidden sm:inline">{currentUser.full_name}</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-48" dir="rtl">
                    <DropdownMenuItem asChild>
                      <Link to={createPageUrl('UserSettings')} className="flex items-center gap-2">
                        <User className="w-4 h-4" />
                        <span>الإعدادات الشخصية</span>
                      </Link>
                    </DropdownMenuItem>
                    {isGovernor && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem asChild>
                          <Link to={createPageUrl('Settings')} className="flex items-center gap-2">
                            <SettingsIcon className="w-4 h-4" />
                            <span>إعدادات المدينة</span>
                          </Link>
                        </DropdownMenuItem>
                      </>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem 
                      className="flex items-center gap-2 text-red-600"
                      onClick={() => base44.auth.logout()}
                    >
                      <LogOut className="w-4 h-4" />
                      <span>تسجيل الخروج</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}

              {/* Mobile Menu */}
              <div className="md:hidden">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <Menu className="w-5 h-5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-48" dir="rtl">
                    {navItems.map(item => (
                      <DropdownMenuItem key={item.name} asChild>
                        <Link to={createPageUrl(item.name)} className="flex items-center gap-2">
                          <item.icon className="w-4 h-4" />
                          <span>{item.label}</span>
                        </Link>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main>
        {children}
      </main>
    </div>
  );
}