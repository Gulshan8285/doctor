'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Activity,
  Users,
  FileText,
  Search,
  BarChart3,
  Building2,
  UserCheck,
  ShieldAlert,
  Settings,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
  Stethoscope,
  Pill,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '../ui/badge';

interface SidebarProps {
  userRole: 'SUPER_ADMIN' | 'ADMIN' | 'DOCTOR' | 'DELEGATED_STAFF';
  userName: string;
  organizationName?: string;
}

export function Sidebar({ userRole, userName, organizationName }: SidebarProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const doctorNav = [
    { label: 'Dashboard', href: '/doctor', icon: Activity },
    { label: 'My Patients', href: '/doctor/patients', icon: Users },
    { label: 'Prescriptions', href: '/doctor/prescriptions', icon: FileText },
    { label: 'Advanced Search', href: '/doctor/search', icon: Search },
    { label: 'Reports & Analytics', href: '/doctor/reports', icon: BarChart3 },
    { label: 'Pharmacy Preference', href: '/doctor/pharmacy', icon: Pill },
    { label: 'Staff & Team Access', href: '/doctor/team', icon: Users },
  ];

  const staffNav = [
    { label: 'Staff Workspace', href: '/staff', icon: Activity },
    { label: 'Doctor Patients', href: '/doctor/patients', icon: Users },
    { label: 'Upload & Records', href: '/doctor/prescriptions', icon: FileText },
    { label: 'Patient Search', href: '/doctor/search', icon: Search },
    { label: 'Reports', href: '/doctor/reports', icon: BarChart3 },
  ];

  const adminNav = [
    { label: 'Admin Dashboard', href: '/admin', icon: Activity },
    { label: 'Doctors & Staff', href: '/admin/doctors', icon: Stethoscope },
    { label: 'Clinic Patients', href: '/admin/patients', icon: Users },
    { label: 'Prescription Files', href: '/admin/prescriptions', icon: FileText },
    { label: 'Reports & Exports', href: '/admin/reports', icon: BarChart3 },
    { label: 'Pharmacy Catalog', href: '/admin/pharmacy', icon: Pill },
    { label: 'Clinic Audit Trail', href: '/admin/audit', icon: ShieldAlert },
    { label: 'Clinic Settings', href: '/admin/settings', icon: Settings },
  ];

  const superAdminNav = [
    { label: 'Super Admin Console', href: '/super-admin', icon: Activity },
    { label: 'Organizations & Clinics', href: '/super-admin/organizations', icon: Building2 },
    { label: 'User Directory', href: '/super-admin/users', icon: Users },
    { label: 'Pharmacy Catalog', href: '/super-admin/pharmacy', icon: Pill },
    { label: 'Platform Security & Logs', href: '/super-admin/audit', icon: ShieldAlert },
    { label: 'System Retention Config', href: '/super-admin/settings', icon: Settings },
  ];

  let currentNav = doctorNav;
  if (userRole === 'DELEGATED_STAFF') currentNav = staffNav;
  if (userRole === 'ADMIN') currentNav = adminNav;
  if (userRole === 'SUPER_ADMIN') currentNav = superAdminNav;

  const roleLabels: Record<string, { label: string; badge: 'teal' | 'blue' | 'purple' | 'slate' }> = {
    DOCTOR: { label: 'Physician', badge: 'teal' },
    DELEGATED_STAFF: { label: 'Delegated Staff', badge: 'blue' },
    ADMIN: { label: 'Clinic Admin', badge: 'purple' },
    SUPER_ADMIN: { label: 'Super Admin (MFA)', badge: 'slate' },
  };

  return (
    <>
      {/* Mobile Toggle Button */}
      <div className="lg:hidden fixed top-3 left-4 z-40">
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="p-2 bg-white rounded-lg border border-slate-200 shadow-sm text-slate-600 hover:text-slate-900"
          aria-label="Toggle navigation menu"
        >
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-slate-900/40 z-30 backdrop-blur-[2px]"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar container */}
      <aside
        className={cn(
          'fixed lg:sticky top-0 left-0 z-40 h-screen bg-white border-r border-slate-200/90 flex flex-col transition-all duration-300 select-none shadow-[1px_0_4px_rgba(0,0,0,0.02)]',
          collapsed ? 'w-20' : 'w-64',
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        {/* Brand / Logo */}
        <div className="h-16 px-4 border-b border-slate-100 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 overflow-hidden">
            <div className="w-9 h-9 rounded-xl bg-teal-600 flex items-center justify-center text-white font-bold shadow-sm shrink-0">
              <Stethoscope className="w-5 h-5" />
            </div>
            {!collapsed && (
              <div className="flex flex-col">
                <span className="text-sm font-bold tracking-tight text-slate-900 leading-none">
                  DoctorCare
                </span>
                <span className="text-[10px] font-medium text-teal-600 uppercase tracking-wider mt-0.5">
                  Clinical SaaS
                </span>
              </div>
            )}
          </Link>

          {/* Desktop collapse toggle */}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="hidden lg:flex p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        {/* User Scope Info */}
        {!collapsed && (
          <div className="px-4 py-3 bg-slate-50/70 border-b border-slate-100">
            <p className="text-xs font-semibold text-slate-800 truncate">{userName}</p>
            <div className="flex items-center gap-1.5 mt-1">
              <Badge variant={roleLabels[userRole]?.badge || 'slate'}>
                {roleLabels[userRole]?.label || userRole}
              </Badge>
            </div>
            {organizationName && (
              <p className="text-[11px] text-slate-500 mt-1 truncate">
                {organizationName}
              </p>
            )}
          </div>
        )}

        {/* Navigation items */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          {currentNav.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || (item.href !== '/doctor' && item.href !== '/admin' && item.href !== '/super-admin' && pathname.startsWith(item.href));

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors group',
                  isActive
                    ? 'bg-teal-50 text-teal-800 font-semibold shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                )}
                title={collapsed ? item.label : undefined}
              >
                <Icon
                  className={cn(
                    'w-5 h-5 shrink-0 transition-colors',
                    isActive ? 'text-teal-600' : 'text-slate-400 group-hover:text-slate-600'
                  )}
                />
                {!collapsed && <span className="truncate">{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* Footer info */}
        <div className="p-3 border-t border-slate-100 text-center">
          {!collapsed ? (
            <div className="text-[11px] text-slate-400 leading-snug">
              DoctorCare Pro &bull; DPDP 2023 Ready
            </div>
          ) : (
            <span className="text-[10px] text-teal-600 font-bold">DC</span>
          )}
        </div>
      </aside>
    </>
  );
}
