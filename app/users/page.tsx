'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function UsersPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to new admin dashboard
    router.push('/admin/dashboard');
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-gray-600">リダイレクト中...</div>
    </div>
  );
}
