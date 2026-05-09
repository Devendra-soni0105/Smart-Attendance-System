'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  LayoutDashboard, 
  UserPlus, 
  Scan, 
  Edit, 
  FileText, 
  BarChart, 
  Settings, 
  Users,
  LogOut,
  Activity,
  User,
  BookOpen,
  Menu,
  X
} from '@/components/Icons';
import { cn } from '@/lib/utils';

const menuItems = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, href: '/dashboard' },
  { id: 'students', label: 'Students', icon: Users, href: '/dashboard/students' },
  { id: 'subjects', label: 'Subjects', icon: BookOpen, href: '/dashboard/subjects' },
  { id: 'enroll', label: 'Enroll Student', icon: UserPlus, href: '/dashboard/enroll' },
  { id: 'attendance', label: 'Attendance', icon: Scan, href: '/dashboard/attendance' },
  { id: 'manual', label: 'Manual Override', icon: Edit, href: '/dashboard/manual' },
  { id: 'logs', label: 'Logs', icon: FileText, href: '/dashboard/logs' },
  { id: 'reports', label: 'Reports', icon: BarChart, href: '/dashboard/reports' },
  { id: 'metrics', label: 'Metrics', icon: Activity, href: '/dashboard/metrics' },
  { id: 'settings', label: 'Settings', icon: Settings, href: '/dashboard/settings' },
];

export default function Sidebar() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  // Close sidebar on route change (mobile)
  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  const handleLogout = async () => {
    try {
      const res = await fetch('/api/auth/logout', { method: 'POST' });
      if (res.ok) {
        window.location.href = '/login';
      }
    } catch (err) {
      console.error('Logout failed', err);
    }
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Brand */}
      <div className="p-6 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#38bdf8] to-[#6366f1] flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <Scan className="text-white" size={24} />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white tracking-tight leading-none">SmartLog</h1>
            <p className="text-[10px] text-slate-500 mt-1 uppercase tracking-wider font-semibold">Attendance System</p>
          </div>
        </div>
        <button 
          onClick={() => setIsOpen(false)}
          className="lg:hidden p-2 text-slate-400 hover:text-white transition-colors"
        >
          <X size={20} />
        </button>
      </div>

      {/* Menu */}
      <nav className="flex-1 px-4 space-y-1 mt-4 overflow-y-auto custom-scrollbar">
        {menuItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;

          return (
            <Link 
              key={item.id} 
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all group relative overflow-hidden",
                isActive 
                  ? "bg-[#38bdf8]/10 text-[#38bdf8]" 
                  : "text-slate-500 hover:text-[#38bdf8] hover:bg-white/5"
              )}
            >
              <Icon size={18} className={cn("z-10 transition-transform group-hover:scale-110", isActive ? "text-[#38bdf8]" : "text-slate-600 group-hover:text-[#38bdf8]")} />
              <span className="z-10">{item.label}</span>
              {isActive && (
                <motion.div 
                  layoutId="active-pill"
                  className="ml-auto w-1 h-1 rounded-full bg-[#38bdf8] z-10"
                />
              )}
              {isActive && (
                <motion.div 
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="absolute left-0 top-0 bottom-0 w-1 bg-[#38bdf8] rounded-r-full"
                />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer / Logout */}
      <div className="p-4 border-t border-white/5 space-y-4">
        <div className="flex items-center gap-3 px-4 py-3 bg-white/5 rounded-2xl">
          <div className="w-8 h-8 rounded-full bg-[#38bdf8]/20 flex items-center justify-center">
            <User className="text-[#38bdf8]" size={16} />
          </div>
          <div className="overflow-hidden">
            <p className="text-xs font-bold text-white truncate">Faculty Admin</p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[10px] text-emerald-500 font-bold uppercase tracking-wider">Online</span>
            </div>
          </div>
        </div>

        <button 
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-slate-500 hover:text-red-400 hover:bg-red-400/5 transition-all"
        >
          <LogOut size={18} />
          Logout
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile Trigger */}
      <div className="lg:hidden fixed top-4 left-4 z-50">
        <button 
          onClick={() => setIsOpen(true)}
          className="p-3 rounded-xl bg-[#111827] border border-white/5 text-white shadow-xl backdrop-blur-sm transition-transform active:scale-95"
        >
          <Menu size={24} />
        </button>
      </div>

      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex w-64 bg-[#0a0f1a] border-r border-white/5 flex-col h-screen sticky top-0 shrink-0">
        <SidebarContent />
      </aside>

      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] lg:hidden"
            />
            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 left-0 w-72 bg-[#0a0f1a] border-r border-white/5 z-[70] lg:hidden shadow-2xl"
            >
              <SidebarContent />
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
