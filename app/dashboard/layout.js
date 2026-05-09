import React from 'react';
import Sidebar from '@/components/Sidebar';

export const metadata = {
  title: 'Dashboard - SmartLog',
  description: 'SmartLog Attendance System Dashboard',
};

export default function DashboardLayout({ children }) {
  return (
    <div className="flex min-h-screen bg-[#0a0f1a] text-[#cbd5e1] font-sans">
      <Sidebar />
      <main className="flex-1 flex flex-col min-h-screen relative">
        <div className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 pt-20 lg:pt-8">
          <div className="max-w-[1400px] mx-auto w-full">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
