import React from 'react';
import { redirect } from 'next/navigation';
import { getDoctorSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Sidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';
import { ToastProvider } from '@/components/ui/toast';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function StaffLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Strict isolation: staff shares DOCTOR_COOKIE, never use admin cookie
  const user = await getDoctorSession();

  if (!user) {
    redirect('/login');
  }

  if (user.role !== 'DELEGATED_STAFF') {
    redirect('/doctor');
  }

  const org = user.organizationId
    ? await prisma.organization.findUnique({
        where: { id: user.organizationId },
        select: { name: true },
      })
    : null;

  return (
    <ToastProvider>
      <div className="min-h-screen bg-slate-50 flex">
        <Sidebar
          userRole="DELEGATED_STAFF"
          userName={user.fullName}
          organizationName={org?.name || 'Assigned Practice'}
        />
        <div className="flex-1 flex flex-col min-w-0">
          <Header
            userName={user.fullName}
            userEmail={user.email}
            userRole="DELEGATED_STAFF"
          />
          <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
            {children}
          </main>
        </div>
      </div>
    </ToastProvider>
  );
}
