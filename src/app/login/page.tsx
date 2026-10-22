'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Stethoscope,
  Building2,
  Lock,
  Mail,
  ShieldCheck,
  AlertCircle,
  KeyRound,
  ArrowRight,
  UserCheck,
  Sparkles,
  Users,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [totpCode, setTotpCode] = useState('');
  const [showMfaInput, setShowMfaInput] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successNotice, setSuccessNotice] = useState('');

  // 1-Click Fast Instant Login for Demo
  const handleQuickLogin = async (targetEmail: string, mfa = '') => {
    setEmail(targetEmail);
    setPassword('Healthcare@2026');
    setIsLoading(true);
    setErrorMessage('');
    setSuccessNotice('Logging into workspace...');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: targetEmail,
          password: 'Healthcare@2026',
          totpCode: mfa || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMessage(data.error || 'Authentication failed.');
        setIsLoading(false);
        return;
      }

      if (data.requiresMfa) {
        setShowMfaInput(true);
        setSuccessNotice('MFA Code required (Demo code: 123456).');
        setIsLoading(false);
        return;
      }

      if (data.success && data.redirectTo) {
        setSuccessNotice('Verified. Opening workspace...');
        router.push(data.redirectTo);
        router.refresh();
      }
    } catch {
      setErrorMessage('Connection error. Please try again.');
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage('');
    setSuccessNotice('');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          password,
          totpCode: showMfaInput ? totpCode.trim() : undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMessage(data.error || 'Authentication failed. Please verify credentials.');
        setIsLoading(false);
        return;
      }

      if (data.requiresMfa) {
        setShowMfaInput(true);
        setSuccessNotice('MFA required. Enter your 6-digit authenticator code (Demo code: 123456).');
        setIsLoading(false);
        return;
      }

      if (data.success && data.redirectTo) {
        setSuccessNotice('Authentication verified. Redirecting...');
        router.push(data.redirectTo);
        router.refresh();
      }
    } catch {
      setErrorMessage('Network connection error. Please try again.');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-10 px-4 sm:px-6 lg:px-8 selection:bg-teal-500 selection:text-white">
      <div className="sm:mx-auto sm:w-full sm:max-w-xl">
        {/* Brand header */}
        <div className="flex justify-center">
          <div className="w-14 h-14 rounded-2xl bg-teal-600 flex items-center justify-center text-white shadow-lg shadow-teal-600/20">
            <Stethoscope className="w-8 h-8" />
          </div>
        </div>
        <h2 className="mt-4 text-center text-3xl font-extrabold tracking-tight text-slate-900">
          DoctorCare Platform
        </h2>
        <p className="mt-1 text-center text-sm text-slate-600 max-w-md mx-auto">
          Doctor Prescriptions & Patient Management System
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-xl">
        {/* Status notices */}
        {errorMessage && (
          <div className="mb-4 p-4 rounded-xl bg-rose-50 border border-rose-200 flex items-start gap-2.5 text-xs text-rose-700">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        {successNotice && (
          <div className="mb-4 p-4 rounded-xl bg-teal-50 border border-teal-200 flex items-start gap-2.5 text-xs text-teal-800">
            <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5 text-teal-600" />
            <span>{successNotice}</span>
          </div>
        )}

        {/* 1-CLICK DEMO LOGIN CARDS (ADMIN VS DOCTOR) */}
        <div className="mb-6 bg-white p-6 rounded-2xl shadow-sm border border-slate-200/90">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="w-4 h-4 text-amber-500" />
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Instant 1-Click Demo Login (Select Role)
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* 1. Main Company Admin Card */}
            <button
              type="button"
              disabled={isLoading}
              onClick={() => handleQuickLogin('admin@apollo.org')}
              className="text-left p-4 rounded-xl border-2 border-indigo-200 hover:border-indigo-500 bg-gradient-to-br from-indigo-50/60 to-white hover:shadow-md transition-all group flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <span className="px-2 py-0.5 bg-indigo-100 text-indigo-800 text-[10px] font-bold rounded-full uppercase tracking-wider">
                    Main Portal
                  </span>
                </div>
                <h4 className="text-base font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                  Company Admin
                </h4>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  The primary hospital/company portal. Add & update doctors, toggle access, and view all reports.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-indigo-100/80 flex items-center justify-between text-xs font-semibold text-indigo-700">
                <span>Enter as Admin</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </button>

            {/* 2. Doctor Portal Card */}
            <button
              type="button"
              disabled={isLoading}
              onClick={() => handleQuickLogin('dr.sharma@apollo.org')}
              className="text-left p-4 rounded-xl border-2 border-teal-200 hover:border-teal-500 bg-gradient-to-br from-teal-50/60 to-white hover:shadow-md transition-all group flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="w-10 h-10 rounded-xl bg-teal-600 text-white flex items-center justify-center shadow-xs">
                    <Stethoscope className="w-5 h-5" />
                  </div>
                  <span className="px-2 py-0.5 bg-teal-100 text-teal-800 text-[10px] font-bold rounded-full uppercase tracking-wider">
                    Doctor
                  </span>
                </div>
                <h4 className="text-base font-bold text-slate-900 group-hover:text-teal-600 transition-colors">
                  Doctor Portal
                </h4>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  Doctor workspace. Upload prescriptions, manage patients, and grant staff access from the top corner menu.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-teal-100/80 flex items-center justify-between text-xs font-semibold text-teal-700">
                <span>Enter as Doctor</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </button>
          </div>

          {/* Secondary Quick Login: Staff / Assistant */}
          <div className="mt-4 pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs text-slate-500">Need to test subordinate staff?</span>
            <button
              type="button"
              disabled={isLoading}
              onClick={() => handleQuickLogin('staff.priya@apollo.org')}
              className="px-3 py-1.5 rounded-lg border border-slate-200 hover:border-purple-300 hover:bg-purple-50 text-xs font-semibold text-purple-700 transition-colors inline-flex items-center gap-1.5"
            >
              <Users className="w-3.5 h-3.5" />
              <span>Login as Clinical Assistant (Priya Nair)</span>
            </button>
          </div>
        </div>

        {/* MANUAL EMAIL / PASSWORD FORM */}
        <div className="bg-white py-6 px-6 sm:px-8 shadow-sm rounded-2xl border border-slate-200/90">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4 text-center">
            Or Sign In With Custom Email & Password
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="email"
                className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5"
              >
                Work Email Address
              </label>
              <div className="relative rounded-lg shadow-2xs">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <Mail className="h-4 w-4 text-slate-400" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="doctor@hospital.org"
                  className="block w-full rounded-lg border border-slate-300 pl-10 pr-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5"
              >
                Account Password
              </label>
              <div className="relative rounded-lg shadow-2xs">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <Lock className="h-4 w-4 text-slate-400" />
                </div>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="block w-full rounded-lg border border-slate-300 pl-10 pr-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
                />
              </div>
            </div>

            {/* MFA field if triggered */}
            {showMfaInput && (
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                <label
                  htmlFor="totpCode"
                  className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5"
                >
                  MFA Verification Code (Demo code: 123456)
                </label>
                <div className="relative rounded-lg shadow-2xs">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                    <KeyRound className="h-4 w-4 text-teal-600" />
                  </div>
                  <input
                    id="totpCode"
                    name="totpCode"
                    type="text"
                    maxLength={6}
                    value={totpCode}
                    onChange={(e) => setTotpCode(e.target.value)}
                    placeholder="123456"
                    className="block w-full rounded-lg border border-slate-300 pl-10 pr-3 py-2 text-sm font-mono tracking-widest text-slate-900 placeholder:text-slate-400 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
                  />
                </div>
              </div>
            )}

            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="w-full mt-2"
              isLoading={isLoading}
              rightIcon={<ArrowRight className="w-4 h-4" />}
            >
              Sign In with Credentials
            </Button>
          </form>
        </div>

        {/* Security badge footer */}
        <div className="mt-6 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
          <ShieldCheck className="w-4 h-4 text-teal-600" />
          <span>Encrypted Sessions &bull; SHA-256 Prescription Hash Verification</span>
        </div>
      </div>
    </div>
  );
}
