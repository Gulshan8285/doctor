import React from 'react';
import { getAdminSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { ShieldCheck, Database, HardDrive, KeyRound, Lock } from 'lucide-react';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function SuperAdminSettingsPage() {
  const user = await getAdminSession();
  if (!user || user.role !== 'SUPER_ADMIN') {
    redirect('/login');
  }

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
          Platform Security & Storage Retention Configuration
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Review global encryption parameters, private object storage drivers, and DPDP Act compliance rules.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Storage & Encryption Configuration</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-xs">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-start gap-3">
              <HardDrive className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-slate-800 block">Object Storage Vault Driver</span>
                <span className="text-[11px] text-slate-600">
                  Local Encrypted Storage (Configured with S3-compatible backend adapter)
                </span>
                <span className="text-[10px] text-slate-400 block font-mono mt-0.5">
                  Path: ./storage/prescriptions/ (Non-public)
                </span>
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-start gap-3">
              <Lock className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-slate-800 block">Cryptographic Hash Algorithm</span>
                <span className="text-[11px] text-slate-600">
                  SHA-256 integrity digest computed per upload and verified before serving.
                </span>
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-start gap-3">
              <KeyRound className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-slate-800 block">Session Management</span>
                <span className="text-[11px] text-slate-600">
                  HMAC-SHA256 JWT in HttpOnly secure cookies with 12-hour sliding expiry.
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>DPDPA 2023 Compliance & Retention Rules</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-xs">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-start gap-3">
              <ShieldCheck className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-slate-800 block">Prescription Immutability Invariant</span>
                <span className="text-[11px] text-slate-600">
                  Enforces that finalized documents cannot be modified in-place or silently overwritten.
                </span>
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-start gap-3">
              <Database className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-slate-800 block">Data Retention Policy</span>
                <span className="text-[11px] text-slate-600">
                  Prescription records retained for 7 years per Indian Medical Council & National Medical Commission regulations.
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
