import React from 'react';
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Sidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';
import { ToastProvider } from '@/components/ui/toast';

export const dynamic = 'force-dynamic';

export default async function DoctorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const headerList = await headers();
  const pathname = headerList.get('x-pathname') || '';
  if (pathname.startsWith('/doctor/login')) {
    return <>{children}</>;
  }

  const user = await getCurrentUser();

  if (!user) {
    redirect('/login');
  }

  if (user.role !== 'DOCTOR' && user.role !== 'DELEGATED_STAFF') {
    if (user.role === 'ADMIN') redirect('/admin');
    if (user.role === 'SUPER_ADMIN') redirect('/super-admin');
    redirect('/login');
  }

  // Fetch organization and notifications
  const [org, notifications] = await Promise.all([
    user.organizationId
      ? prisma.organization.findUnique({
          where: { id: user.organizationId },
          select: { name: true },
        })
      : null,
    prisma.notification.findMany({
      where: { userId: user.userId },
      orderBy: { createdAt: 'desc' },
      take: 5,
    }),
  ]);

  return (
    <ToastProvider>
      <div className="min-h-screen bg-slate-50 flex">
        <Sidebar
          userRole={user.role}
          userName={user.fullName}
          organizationName={org?.name}
        />
        <div className="flex-1 flex flex-col min-w-0">
          <Header
            userName={user.fullName}
            userEmail={user.email}
            userRole={user.role}
            notifications={notifications.map((n) => ({
              id: n.id,
              title: n.title,
              message: n.message,
              type: n.type,
              isRead: n.isRead,
              createdAt: n.createdAt.toISOString(),
            }))}
          />
          <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
            {children}
          </main>
        </div>
      </div>
    </ToastProvider>
  );
}
