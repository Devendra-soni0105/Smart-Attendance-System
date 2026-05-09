'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { 
  Scan, 
  User, 
  Lock, 
  LogIn, 
  ArrowLeft,
  AlertCircle
} from '@/components/Icons';

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      if (res.ok) {
        router.push('/dashboard');
      } else {
        setError(data.error || 'Invalid credentials');
        setLoading(false);
      }
    } catch (err) {
      console.error('Login error:', err);
      setError('Connection failed. Please check your network.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0f1a] flex items-center justify-center p-6 relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-[#38bdf8]/10 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-[#6366f1]/10 blur-[120px] rounded-full" />
        <div className="absolute inset-0 hero-grid-overlay opacity-40" />
      </div>

      <Link 
        href="/" 
        className="absolute top-8 left-8 flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-sm font-medium group"
      >
        <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
        Back to Home
      </Link>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md relative z-10"
      >
        <div className="bg-white/[0.03] border border-white/10 backdrop-blur-xl rounded-[2.5rem] p-8 sm:p-12 shadow-2xl">
          {/* Logo */}
          <div className="text-center mb-10">
            <div className="w-16 h-16 bg-gradient-to-br from-[#38bdf8] to-[#6366f1] rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-[#38bdf8]/20">
              <Scan className="text-white" size={32} />
            </div>
            <h1 className="text-3xl font-bold text-white mb-2 tracking-tight">SmartLog</h1>
            <p className="text-slate-500 font-medium">Faculty Login</p>
          </div>

          {error && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4 mb-6 flex items-center gap-3 text-red-400 text-sm"
            >
              <AlertCircle size={18} />
              {error}
            </motion.div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Username</label>
              <div className="relative group">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-[#38bdf8] transition-colors">
                  <User size={18} />
                </div>
                <input 
                  type="text" 
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full bg-white/[0.04] border border-white/10 rounded-2xl pl-12 pr-4 py-4 text-white outline-none focus:border-[#38bdf8]/50 focus:bg-white/[0.06] transition-all"
                  placeholder="Enter your username"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Password</label>
              <div className="relative group">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-[#38bdf8] transition-colors">
                  <Lock size={18} />
                </div>
                <input 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-white/[0.04] border border-white/10 rounded-2xl pl-12 pr-4 py-4 text-white outline-none focus:border-[#38bdf8]/50 focus:bg-white/[0.06] transition-all"
                  placeholder="Enter your password"
                  required
                />
              </div>
            </div>

            <button 
              type="submit" 
              disabled={loading}
              className="w-full bg-gradient-to-r from-[#38bdf8] to-[#6366f1] text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 hover:shadow-[0_10px_30px_rgba(56,189,248,0.4)] transition-all hover:-translate-y-1 active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
            >
              {loading ? (
                <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  Sign In <LogIn size={20} />
                </>
              )}
            </button>
          </form>
        </div>
        
        <p className="text-center text-slate-600 text-xs mt-8">
          © 2026 SmartLog Attendance System. All rights reserved.
        </p>
      </motion.div>
    </div>
  );
}
