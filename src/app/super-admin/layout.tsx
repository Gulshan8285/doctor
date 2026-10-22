import React from 'react';
import { redirect } from 'next/navigation';
import { getAdminSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Sidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';
import { ToastProvider } from '@/components/ui/toast';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function SuperAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getAdminSession();

  if (!user) {
    redirect('/login');
  }

  if (user.role !== 'SUPER_ADMIN') {
    redirect('/doctor');
  }

  const notifications = await prisma.notification.findMany({
    where: { userId: user.userId },
    orderBy: { createdAt: 'desc' },
    take: 5,
  });

  return (
    <ToastProvider>
      <div className="min-h-screen bg-slate-50 flex">
        <Sidebar
          userRole="SUPER_ADMIN"
          userName={user.fullName}
          organizationName="Platform Governance (Multi-Tenant)"
        />
        <div className="flex-1 flex flex-col min-w-0">
          <Header
            userName={user.fullName}
            userEmail={user.email}
            userRole="SUPER_ADMIN"
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
