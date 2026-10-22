import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'DoctorCare Pro • Doctor Prescription & Patient Management Platform',
  description:
    'Production-ready, multi-tenant clinical prescription and patient management SaaS with cryptographic integrity hashing, role-based access control, and team delegation.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-slate-50 text-slate-900 font-sans">
        {children}
      </body>
    </html>
  );
}
