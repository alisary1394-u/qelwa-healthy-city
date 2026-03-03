import React, { useEffect, useState, useCallback } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { api } from '@/api/apiClient';
import { useQuery } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { 
  LogOut, User, Menu, Settings as SettingsIcon, AlertTriangle, 
  Moon, Sun, Monitor, Check, ChevronRight, PanelLeftClose, PanelLeft, X,
  Clock, ShieldAlert
} from "lucide-react";
import NotificationBell from "@/components/notifications/NotificationBell";
import { isBackendConfigured, appParams } from '@/lib/app-params';
import { usePermissions } from '@/hooks/usePermissions';
import { useAuth } from '@/lib/AuthContext';
import { useTheme } from 'next-themes';
import { useIdleTimeout } from '@/hooks/useIdleTimeout';

const SIDEBAR_COLLAPSED_KEY = 'sidebar_collapsed';

export default function Layout({ children }) {
  const location = useLocation();
  const currentPath = location.pathname;
  const { navItems, permissions } = usePermissions();
  const { logout } = useAuth();
  const { theme, setTheme, systemTheme } = useTheme();

  // جلسة الخمول: تسجيل خروج تلقائي بعد 20 دقيقة من عدم النشاط
  const handleIdleLogout = useCallback(() => {
    try { localStorage.setItem('idle_logout_signal', 'true'); } catch {}
    setTimeout(() => { try { localStorage.removeItem('idle_logout_signal'); } catch {} }, 1000);
    logout(true);
  }, [logout]);
  const { showWarning: showIdleWarning, remainingSeconds, dismissWarning } = useIdleTimeout(
    handleIdleLogout,
    20 * 60 * 1000, // 20 دقيقة
    2 * 60 * 1000   // تحذير قبل دقيقتين
  );
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    try { return localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === '1'; } catch { return false; }
  });
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const effectiveTheme = theme === 'system' ? systemTheme : theme;
  const isActive = (pageName) => currentPath === createPageUrl(pageName);

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => api.auth.me()
  });

  const { data: settings = [] } = useQuery({
    queryKey: ['settings'],
    queryFn: () => api.entities.Settings.list()
  });

  const currentSetting = settings[0] || {};

  const toggleSidebar = () => {
    const next = !sidebarCollapsed;
    setSidebarCollapsed(next);
    try { localStorage.setItem(SIDEBAR_COLLAPSED_KEY, next ? '1' : '0'); } catch {}
  };

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.ctrlKey && event.shiftKey && event.key === 'D') {
        event.preventDefault();
        setTheme(theme === 'dark' ? 'light' : 'dark');
      }
      if ((event.ctrlKey || event.metaKey) && event.key === 'b') {
        event.preventDefault();
        toggleSidebar();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [theme, setTheme, sidebarCollapsed]);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  const backendReady = appParams.useLocalBackend || appParams.apiUrl || appParams.useSupabaseBackend || isBackendConfigured();

  const sidebarWidth = sidebarCollapsed ? 'w-[68px]' : 'w-64';

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      {!backendReady && (
        <div className="bg-amber-500 text-white px-4 py-3 flex items-center justify-center gap-3 flex-wrap text-center z-[60] relative">
          <AlertTriangle className="w-5 h-5 flex-shrink-0" />
          <span>
            إعداد النظام مطلوب: افتح ملف <strong>.env.local</strong> وضع فيه <strong>VITE_BASE44_APP_ID</strong> و <strong>VITE_BASE44_APP_BASE_URL</strong> من لوحة الإدارة.
          </span>
        </div>
      )}

      {/* ===== Mobile Top Bar ===== */}
      <header className="md:hidden fixed top-0 left-0 right-0 z-50 bg-card border-b shadow-sm">
        <div className="flex items-center justify-between h-14 px-4">
          <button 
            onClick={() => setMobileMenuOpen(true)}
            className="p-2 rounded-lg hover:bg-muted"
            aria-label="فتح القائمة"
          >
            <Menu className="w-5 h-5" />
          </button>
          <Link to={createPageUrl('Home')} className="flex items-center gap-2">
            {currentSetting.logo_url ? (
              <img src={currentSetting.logo_url} alt="شعار" className="w-8 h-8 rounded-lg object-cover" />
            ) : (
              <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center">
                <span className="text-white font-bold text-sm">{currentSetting.logo_text || 'ق'}</span>
              </div>
            )}
            <span className="font-bold text-sm text-foreground">{currentSetting.city_name || 'المدينة الصحية'}</span>
          </Link>
          <div className="flex items-center gap-1">
            {currentUser && <NotificationBell userEmail={currentUser.email} />}
          </div>
        </div>
      </header>
      {/* Spacer to push content below the fixed mobile header */}
      <div className="md:hidden h-14" />

      {/* ===== Mobile Overlay Menu ===== */}
      {mobileMenuOpen && (
        <>
          <div className="fixed inset-0 bg-black/40 z-[70] md:hidden backdrop-blur-sm" onClick={() => setMobileMenuOpen(false)} />
          <aside className="fixed top-0 right-0 bottom-0 w-72 bg-sidebar z-[80] md:hidden shadow-2xl animate-slide-in-right">
            <div className="flex items-center justify-between p-4 border-b border-sidebar-border">
              <div className="flex items-center gap-3">
                {currentSetting.logo_url ? (
                  <img src={currentSetting.logo_url} alt="شعار" className="w-10 h-10 rounded-xl object-cover" />
                ) : (
                  <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center">
                    <span className="text-white font-bold">{currentSetting.logo_text || 'ق'}</span>
                  </div>
                )}
                <div>
                  <p className="font-bold text-sidebar-foreground text-sm">{currentSetting.city_name || 'المدينة الصحية'}</p>
                  <p className="text-xs text-sidebar-foreground/60">{currentSetting.city_location || 'محافظة قلوة'}</p>
                </div>
              </div>
              <button onClick={() => setMobileMenuOpen(false)} className="p-1.5 rounded-lg hover:bg-sidebar-accent text-sidebar-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>
            <nav className="p-3 space-y-1 overflow-y-auto max-h-[calc(100vh-180px)]">
              {navItems.map(item => {
                const active = isActive(item.name);
                return (
                  <Link key={item.name} to={createPageUrl(item.name)}>
                    <div className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                      active 
                        ? 'bg-sidebar-primary text-sidebar-primary-foreground shadow-md' 
                        : 'text-sidebar-foreground hover:bg-sidebar-accent'
                    }`}>
                      <item.icon className="w-5 h-5 flex-shrink-0" />
                      <span>{item.label}</span>
                      {active && <ChevronRight className="w-4 h-4 mr-auto" />}
                    </div>
                  </Link>
                );
              })}
            </nav>
            {/* Mobile user footer */}
            {currentUser && (
              <div className="absolute bottom-0 left-0 right-0 p-3 border-t border-sidebar-border">
                <div className="flex items-center gap-3 p-2">
                  <div className="w-9 h-9 rounded-full gradient-primary flex items-center justify-center text-white font-semibold text-sm">
                    {currentUser.full_name?.charAt(0) || 'م'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-sidebar-foreground truncate">{currentUser.full_name}</p>
                    <p className="text-xs text-sidebar-foreground/50 truncate">{currentUser.email}</p>
                  </div>
                  <button onClick={() => logout(true)} className="p-1.5 rounded-lg hover:bg-red-500/20 text-red-400" title="تسجيل الخروج">
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </aside>
        </>
      )}

      <div className="flex">
        {/* ===== Desktop Sidebar ===== */}
        <aside className={`hidden md:flex flex-col fixed top-0 right-0 bottom-0 ${sidebarWidth} bg-sidebar border-l border-sidebar-border z-40 transition-all duration-300`}>
          {/* Logo */}
          <div className={`flex items-center ${sidebarCollapsed ? 'justify-center' : 'justify-between'} h-16 px-4 border-b border-sidebar-border`}>
            <Link to={createPageUrl('Home')} className={`flex items-center ${sidebarCollapsed ? '' : 'gap-3'}`}>
              {currentSetting.logo_url ? (
                <img src={currentSetting.logo_url} alt="شعار" className="w-9 h-9 rounded-xl object-cover flex-shrink-0" />
              ) : (
                <div className="w-9 h-9 rounded-xl gradient-primary flex items-center justify-center flex-shrink-0">
                  <span className="text-white font-bold text-sm">{currentSetting.logo_text || 'ق'}</span>
                </div>
              )}
              {!sidebarCollapsed && (
                <div className="min-w-0">
                  <p className="font-bold text-sidebar-foreground text-sm truncate">{currentSetting.city_name || 'المدينة الصحية'}</p>
                  <p className="text-[10px] text-sidebar-foreground/50 truncate">{currentSetting.city_location || 'محافظة قلوة'}</p>
                </div>
              )}
            </Link>
            {!sidebarCollapsed && (
              <button onClick={toggleSidebar} className="p-1.5 rounded-lg hover:bg-sidebar-accent text-sidebar-foreground/50 hover:text-sidebar-foreground" title="طي القائمة (Ctrl+B)">
                <PanelLeftClose className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
            {sidebarCollapsed && (
              <TooltipProvider delayDuration={0}>
                <div className="flex justify-center mb-3">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button onClick={toggleSidebar} className="p-2 rounded-lg hover:bg-sidebar-accent text-sidebar-foreground/50 hover:text-sidebar-foreground">
                        <PanelLeft className="w-4 h-4" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="left"><p>فتح القائمة (Ctrl+B)</p></TooltipContent>
                  </Tooltip>
                </div>
                {navItems.map(item => {
                  const active = isActive(item.name);
                  return (
                    <Tooltip key={item.name}>
                      <TooltipTrigger asChild>
                        <Link to={createPageUrl(item.name)}>
                          <div className={`flex items-center justify-center p-2.5 rounded-xl mb-1 transition-colors ${
                            active 
                              ? 'bg-sidebar-primary text-sidebar-primary-foreground shadow-md' 
                              : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground'
                          }`}>
                            <item.icon className="w-5 h-5" />
                          </div>
                        </Link>
                      </TooltipTrigger>
                      <TooltipContent side="left"><p>{item.label}</p></TooltipContent>
                    </Tooltip>
                  );
                })}
              </TooltipProvider>
            )}
            {!sidebarCollapsed && navItems.map(item => {
              const active = isActive(item.name);
              return (
                <Link key={item.name} to={createPageUrl(item.name)}>
                  <div className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                    active 
                      ? 'bg-sidebar-primary text-sidebar-primary-foreground shadow-md' 
                      : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground'
                  }`}>
                    <item.icon className="w-5 h-5 flex-shrink-0" />
                    <span>{item.label}</span>
                    {active && <ChevronRight className="w-4 h-4 mr-auto opacity-60" />}
                  </div>
                </Link>
              );
            })}
          </nav>

          {/* Sidebar Footer — User */}
          <div className="border-t border-sidebar-border p-3">
            {/* Theme Toggle */}
            <div className={`flex ${sidebarCollapsed ? 'justify-center' : 'items-center gap-1 px-1'} mb-2`}>
              {sidebarCollapsed ? (
                <TooltipProvider delayDuration={0}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        onClick={() => setTheme(effectiveTheme === 'dark' ? 'light' : 'dark')}
                        className="p-2 rounded-lg hover:bg-sidebar-accent text-sidebar-foreground/50 hover:text-sidebar-foreground"
                      >
                        {effectiveTheme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="left"><p>تغيير الثيم</p></TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              ) : (
                <div className="flex items-center rounded-lg bg-sidebar-accent p-1 w-full">
                  <button
                    onClick={() => setTheme('light')}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-xs font-medium transition-colors ${
                      theme === 'light' ? 'bg-sidebar-primary text-sidebar-primary-foreground shadow-sm' : 'text-sidebar-foreground/60 hover:text-sidebar-foreground'
                    }`}
                  >
                    <Sun className="w-3.5 h-3.5" />
                    <span>فاتح</span>
                  </button>
                  <button
                    onClick={() => setTheme('dark')}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-xs font-medium transition-colors ${
                      theme === 'dark' ? 'bg-sidebar-primary text-sidebar-primary-foreground shadow-sm' : 'text-sidebar-foreground/60 hover:text-sidebar-foreground'
                    }`}
                  >
                    <Moon className="w-3.5 h-3.5" />
                    <span>داكن</span>
                  </button>
                  <button
                    onClick={() => setTheme('system')}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-xs font-medium transition-colors ${
                      theme === 'system' ? 'bg-sidebar-primary text-sidebar-primary-foreground shadow-sm' : 'text-sidebar-foreground/60 hover:text-sidebar-foreground'
                    }`}
                  >
                    <Monitor className="w-3.5 h-3.5" />
                    <span>تلقائي</span>
                  </button>
                </div>
              )}
            </div>

            {/* User */}
            {currentUser && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className={`w-full flex items-center ${sidebarCollapsed ? 'justify-center p-2' : 'gap-3 px-2 py-2'} rounded-xl hover:bg-sidebar-accent transition-colors`}>
                    <div className="w-9 h-9 rounded-full gradient-primary flex items-center justify-center text-white font-semibold text-sm flex-shrink-0">
                      {currentUser.full_name?.charAt(0) || 'م'}
                    </div>
                    {!sidebarCollapsed && (
                      <div className="flex-1 min-w-0 text-right">
                        <p className="text-sm font-medium text-sidebar-foreground truncate">{currentUser.full_name}</p>
                        <p className="text-[11px] text-sidebar-foreground/50 truncate">{currentUser.email}</p>
                      </div>
                    )}
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" side="top" className="w-52" dir="rtl">
                  <DropdownMenuItem asChild>
                    <Link to={createPageUrl('UserSettings')} className="flex items-center gap-2">
                      <User className="w-4 h-4" />
                      <span>الإعدادات الشخصية</span>
                    </Link>
                  </DropdownMenuItem>
                  {permissions.canSeeSettings && (
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
                    className="flex items-center gap-2 text-destructive focus:text-destructive"
                    onClick={() => logout(true)}
                  >
                    <LogOut className="w-4 h-4" />
                    <span>تسجيل الخروج</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </aside>

        {/* ===== Main Content ===== */}
        <main className={`flex-1 min-h-[calc(100vh-3.5rem)] md:min-h-screen transition-all duration-300 ${sidebarCollapsed ? 'md:mr-[68px]' : 'md:mr-64'}`}>
          {/* Top bar for desktop — breadcrumb + notifications */}
          <header className="hidden md:flex sticky top-0 z-30 h-14 items-center justify-between px-6 bg-background/80 backdrop-blur-md border-b">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Link to={createPageUrl('Dashboard')} className="hover:text-foreground transition-colors">الرئيسية</Link>
              {currentPath !== '/' && currentPath !== '/Dashboard' && (
                <>
                  <ChevronRight className="w-3.5 h-3.5 rotate-180" />
                  <span className="text-foreground font-medium">
                    {navItems.find(n => isActive(n.name))?.label || ''}
                  </span>
                </>
              )}
            </div>
            <div className="flex items-center gap-2">
              {currentUser && <NotificationBell userEmail={currentUser.email} />}
            </div>
          </header>

          {children}
        </main>
      </div>

      {/* ===== تحذير انتهاء الجلسة ===== */}
      {showIdleWarning && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm" dir="rtl">
          <div className="bg-card border shadow-2xl rounded-2xl p-8 max-w-md w-full mx-4 text-center animate-in fade-in zoom-in-95 duration-200">
            <div className="w-16 h-16 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center mx-auto mb-4">
              <ShieldAlert className="w-8 h-8 text-amber-600 dark:text-amber-400" />
            </div>
            <h3 className="text-xl font-bold text-foreground mb-2">تحذير: انتهاء الجلسة قريباً</h3>
            <p className="text-muted-foreground mb-4">
              سيتم تسجيل خروجك تلقائياً بعد
            </p>
            <div className="flex items-center justify-center gap-2 mb-6">
              <Clock className="w-5 h-5 text-destructive" />
              <span className="text-3xl font-bold text-destructive tabular-nums">
                {Math.floor(remainingSeconds / 60)}:{String(remainingSeconds % 60).padStart(2, '0')}
              </span>
            </div>
            <p className="text-sm text-muted-foreground mb-6">
              بسبب عدم النشاط لفترة طويلة، اضغط آلمتابعة» للبقاء في النظام.
            </p>
            <div className="flex gap-3 justify-center">
              <Button
                onClick={dismissWarning}
                className="flex-1 h-11 text-base font-semibold"
              >
                متابعة العمل
              </Button>
              <Button
                variant="outline"
                onClick={() => logout(true)}
                className="h-11 text-destructive border-destructive/30 hover:bg-destructive/5"
              >
                <LogOut className="w-4 h-4 ml-1" />
                خروج
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}