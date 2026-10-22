'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Bell,
  LogOut,
  User,
  ShieldCheck,
  Menu,
  Users,
  Building2,
  Stethoscope,
  Sparkles,
  ArrowRight,
  PlusCircle,
  FileUp,
} from 'lucide-react';
import { Button } from '../ui/button';

interface HeaderProps {
  userName: string;
  userEmail: string;
  userRole: string;
  notifications?: Array<{
    id: string;
    title: string;
    message: string;
    type: string;
    isRead: boolean;
    createdAt: string;
  }>;
}

export function Header({ userName, userEmail, userRole, notifications = [] }: HeaderProps) {
  const router = useRouter();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showCornerMenu, setShowCornerMenu] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isSwitching, setIsSwitching] = useState(false);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      const target = userRole === 'ADMIN' || userRole === 'SUPER_ADMIN' ? '/admin/login' : userRole === 'DELEGATED_STAFF' ? '/login' : '/doctor/login';
      // Hard redirect so cookie is fully cleared before next auth check
      window.location.href = target;
    } catch {
      const target = userRole === 'ADMIN' || userRole === 'SUPER_ADMIN' ? '/admin/login' : '/doctor/login';
      window.location.href = target;
    }
  };

  const handleQuickSwitch = async (role: 'ADMIN' | 'DOCTOR' | 'STAFF') => {
    setIsSwitching(true);
    const email =
      role === 'ADMIN'
        ? 'admin@apollo.org'
        : role === 'DOCTOR'
        ? 'dr.sharma@apollo.org'
        : 'staff.priya@apollo.org';

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: 'Healthcare@2026' }),
      });
      const data = await res.json();
      if (data.redirectTo) {
        window.location.href = data.redirectTo;
      }
    } catch {
      router.push('/login');
    } finally {
      setIsSwitching(false);
    }
  };

  return (
    <header className="h-16 bg-white/95 backdrop-blur-xs border-b border-slate-200/90 px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30">
      {/* Left side: Context badge & Quick Demo Switcher */}
      <div className="flex items-center gap-3">
        <div className="hidden lg:flex items-center gap-1.5 bg-slate-100/90 px-2.5 py-1 rounded-full text-[11px] font-medium text-slate-600 border border-slate-200">
          <Sparkles className="w-3.5 h-3.5 text-amber-500" />
          <span>Demo Switch:</span>
          {userRole !== 'ADMIN' && (
            <button
              onClick={() => handleQuickSwitch('ADMIN')}
              disabled={isSwitching}
              className="text-indigo-600 hover:text-indigo-800 font-bold ml-1 hover:underline"
            >
              🏢 Admin
            </button>
          )}
          {userRole !== 'DOCTOR' && (
            <button
              onClick={() => handleQuickSwitch('DOCTOR')}
              disabled={isSwitching}
              className="text-teal-600 hover:text-teal-800 font-bold ml-1.5 hover:underline"
            >
              🩺 Doctor
            </button>
          )}
          {userRole !== 'DELEGATED_STAFF' && (
            <button
              onClick={() => handleQuickSwitch('STAFF')}
              disabled={isSwitching}
              className="text-purple-600 hover:text-purple-800 font-bold ml-1.5 hover:underline"
            >
              👥 Staff
            </button>
          )}
        </div>
      </div>

      {/* Right side: 3-line Corner Menu, Notifications, Profile, Sign Out */}
      <div className="flex items-center gap-2.5 sm:gap-3">
        {/* DOCTOR SPECIFIC: 3-LINE CORNER MENU TO GIVE ACCESS TO STAFF */}
        {userRole === 'DOCTOR' && (
          <div className="relative">
            <button
              onClick={() => setShowCornerMenu(!showCornerMenu)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white shadow-xs transition-all text-xs font-semibold"
              title="Click 3-lines menu to give access to staff or assistant"
            >
              <Menu className="w-4 h-4 text-white" />
              <span className="hidden sm:inline">Give Staff Access</span>
            </button>

            {/* Corner Dropdown Menu */}
            {showCornerMenu && (
              <div className="absolute right-0 mt-2 w-72 bg-white rounded-2xl shadow-xl border border-slate-200 p-2 z-50 animate-in fade-in slide-in-from-top-2">
                <div className="px-3 py-2 border-b border-slate-100">
                  <p className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Staff & Quick Actions
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Give access to assistants or upload
                  </p>
                </div>

                <div className="py-1 space-y-1">
                  <button
                    onClick={() => {
                      setShowCornerMenu(false);
                      router.push('/doctor/team');
                    }}
                    className="w-full text-left p-2.5 rounded-xl hover:bg-teal-50 flex items-center gap-3 transition-colors text-xs font-semibold text-slate-800 group"
                  >
                    <div className="w-8 h-8 rounded-lg bg-teal-100 text-teal-700 flex items-center justify-center shrink-0">
                      <Users className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-teal-900 group-hover:text-teal-700 font-bold">
                        👥 Give Access to Staff / Team
                      </div>
                      <div className="text-[10px] text-slate-400 font-normal">
                        Invite assistant (Max 3) & set permissions
                      </div>
                    </div>
                  </button>

                  <button
                    onClick={() => {
                      setShowCornerMenu(false);
                      router.push('/doctor/prescriptions');
                    }}
                    className="w-full text-left p-2.5 rounded-xl hover:bg-slate-50 flex items-center gap-3 transition-colors text-xs font-semibold text-slate-800 group"
                  >
                    <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
                      <FileUp className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-slate-800 font-bold">📄 Upload Prescription</div>
                      <div className="text-[10px] text-slate-400 font-normal">
                        Upload & hash prescription file
                      </div>
                    </div>
                  </button>

                  <button
                    onClick={() => {
                      setShowCornerMenu(false);
                      router.push('/doctor/patients');
                    }}
                    className="w-full text-left p-2.5 rounded-xl hover:bg-slate-50 flex items-center gap-3 transition-colors text-xs font-semibold text-slate-800 group"
                  >
                    <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
                      <PlusCircle className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-slate-800 font-bold">👤 Add New Patient</div>
                      <div className="text-[10px] text-slate-400 font-normal">
                        Register a new patient profile
                      </div>
                    </div>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Notification Bell */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="p-2 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors relative"
            aria-label="Notifications"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-white" />
            )}
          </button>

          {/* Notifications Dropdown */}
          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-xl border border-slate-200/90 py-2 z-50 animate-in fade-in slide-in-from-top-2">
              <div className="px-4 py-2 border-b border-slate-100 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Notifications ({unreadCount})
                </span>
                <span className="text-[11px] text-teal-600 font-medium">All caught up</span>
              </div>
              <div className="max-h-72 overflow-y-auto divide-y divide-slate-50">
                {notifications.length === 0 ? (
                  <p className="p-4 text-xs text-slate-400 text-center">No notifications</p>
                ) : (
                  notifications.map((n) => (
                    <div
                      key={n.id}
                      className="p-3.5 hover:bg-slate-50 transition-colors cursor-pointer"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-xs font-semibold text-slate-800 leading-snug">
                          {n.title}
                        </p>
                        {!n.isRead && (
                          <span className="w-1.5 h-1.5 rounded-full bg-teal-500 shrink-0 mt-1" />
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                        {n.message}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* User Identity Pill */}
        <div className="flex items-center gap-2 pl-2 sm:pl-3 border-l border-slate-200">
          <div className="w-8 h-8 rounded-full bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-700 font-bold text-xs">
            {userName.charAt(0)}
          </div>
          <div className="hidden md:flex flex-col text-left">
            <span className="text-xs font-bold text-slate-800 leading-tight truncate max-w-[140px]">
              {userName}
            </span>
            <span className="text-[10px] text-slate-400 leading-tight capitalize">
              {userRole.replace('_', ' ').toLowerCase()}
            </span>
          </div>
        </div>

        {/* Logout Button */}
        <Button
          variant="outline"
          size="sm"
          onClick={handleLogout}
          isLoading={isLoggingOut}
          leftIcon={<LogOut className="w-3.5 h-3.5 text-slate-500" />}
          className="text-xs"
        >
          <span className="hidden sm:inline">Sign Out</span>
        </Button>
      </div>
    </header>
  );
}
