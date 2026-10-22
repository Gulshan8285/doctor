import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/login');
  }

  if (user.role === 'SUPER_ADMIN') {
    redirect('/super-admin');
  }

  if (user.role === 'ADMIN') {
    redirect('/admin');
  }

  // Doctor or Delegated Staff
  redirect('/doctor');
}
