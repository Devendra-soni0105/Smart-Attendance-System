'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { UserPlus, CheckCircle2, ShieldCheck, Activity } from '@/components/Icons';

export default function DashboardPage() {
  const [stats, setStats] = useState({
    enrolledUsers: 0,
    todaysAttendance: 0,
    avgConfidence: "0.0%",
    systemStatus: "Loading...",
  });

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/dashboard/stats');
      const data = await res.json();
      setStats(data);
    } catch (err) {
      console.error("Failed to load dashboard stats:", err);
      setStats(prev => ({ ...prev, systemStatus: "Error" }));
    }
  };

  const cards = [
    { label: "Enrolled Users", value: stats.enrolledUsers, icon: UserPlus, color: "text-[#38bdf8]", border: "border-l-[#38bdf8]" },
    { label: "Today's Attendance", value: stats.todaysAttendance, icon: CheckCircle2, color: "text-[#818cf8]", border: "border-l-[#818cf8]" },
    { label: "Avg. Confidence", value: stats.avgConfidence, icon: ShieldCheck, color: "text-[#34d399]", border: "border-l-[#34d399]" },
    { label: "System Status", value: stats.systemStatus, icon: Activity, color: "text-[#f59e0b]", border: "border-l-[#f59e0b]", textClass: "text-white" },
  ];

  return (
    <section className="page active">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h2 className="text-2xl font-bold text-[#38bdf8]">Dashboard</h2>
          <p className="text-gray-400 mt-1 text-xs">Welcome to SmartLog Attendance System</p>
        </div>

        <div className="flex gap-2">
          <Link href="/dashboard/enroll" className="px-3 py-2 rounded-lg border border-[#1e293b] text-gray-200 text-xs hover:border-[#38bdf8] hover:text-[#38bdf8] transition-colors cursor-pointer inline-flex items-center">
            Enroll Student
          </Link>
          <Link href="/dashboard/attendance" className="px-3 py-2 rounded-lg bg-gradient-to-r from-[#38bdf8] to-[#6366f1] text-white font-medium text-xs cursor-pointer hover:shadow-[0_4px_15px_rgba(56,189,248,0.25)] transition-all inline-flex items-center">
            Start Capture
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        {cards.map((card, index) => (
          <div key={index} className={`bg-[#111827] border border-[#1e293b] rounded-2xl p-5 border-l-[3px] ${card.border}`}>
            <div className="flex items-center justify-between mb-2">
              <p className="text-gray-400 text-xs">{card.label}</p>
              <div className="opacity-60">
                <card.icon className={card.color} size={18} />
              </div>
            </div>
            <h3 className={`text-2xl mt-1 ${card.textClass || card.color}`}>
              {card.value}
            </h3>
          </div>
        ))}
      </div>

      {/* Quick Actions Panel */}
      <div className="grid grid-cols-1 gap-4">
        <div className="bg-[#111827] border border-[#1e293b] rounded-2xl p-5">
          <h4 className="text-base font-semibold mb-3 text-white">Quick Actions</h4>

          <Link href="/dashboard/enroll" className="block bg-[#0c1425] rounded-lg p-3 mb-3 cursor-pointer hover:border hover:border-[#38bdf8]/30 hover:bg-[rgba(56,189,248,0.04)] border border-transparent transition-all group">
            <strong className="text-sm text-white group-hover:text-[#38bdf8] transition-colors font-semibold">Enroll New User</strong>
            <p className="text-gray-400 text-xs mt-0.5">Add a new face to the system</p>
          </Link>

          <Link href="/dashboard/attendance" className="block bg-[#0c1425] rounded-lg p-3 mb-3 cursor-pointer hover:border hover:border-[#38bdf8]/30 hover:bg-[rgba(56,189,248,0.04)] border border-transparent transition-all group">
            <strong className="text-sm text-white group-hover:text-[#38bdf8] transition-colors font-semibold">Mark Attendance</strong>
            <p className="text-gray-400 text-xs mt-0.5">Start live face capture</p>
          </Link>

          <Link href="/dashboard/logs" className="block bg-[#0c1425] rounded-lg p-3 cursor-pointer hover:border hover:border-[#38bdf8]/30 hover:bg-[rgba(56,189,248,0.04)] border border-transparent transition-all group">
            <strong className="text-sm text-white group-hover:text-[#38bdf8] transition-colors font-semibold">View Logs</strong>
            <p className="text-gray-400 text-xs mt-0.5">Check attendance records</p>
          </Link>
        </div>
      </div>
    </section>
  );
}
