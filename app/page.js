'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion, useScroll, useTransform } from 'framer-motion';
import { 
  ArrowRight, 
  CheckCircle2, 
  TrendingUp, 
  Zap, 
  UserPlus, 
  Scan, 
  BarChart3, 
  Mail, 
  Github, 
  Users,
  Menu,
  X
} from '@/components/Icons';

export default function LandingPage() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="min-h-screen bg-[#0a0f1a] text-[#cbd5e1] selection:bg-[#38bdf8]/30">
      {/* Navbar */}
      <nav 
        className={`fixed top-0 left-0 w-full z-50 transition-all duration-300 ${
          isScrolled ? 'bg-[#0a0f1a]/80 backdrop-blur-md border-b border-white/5 py-4' : 'bg-transparent py-6'
        }`}
      >
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#38bdf8] to-[#6366f1] flex items-center justify-center transition-transform group-hover:scale-105">
              <Scan className="text-white" size={24} />
            </div>
            <span className="text-xl font-bold text-white tracking-tight">SmartLog</span>
          </Link>

          <div className="hidden md:flex items-center gap-8">
            <Link href="#home" className="text-sm font-medium hover:text-[#38bdf8] transition-colors">Home</Link>
            <Link href="#how-it-works" className="text-sm font-medium hover:text-[#38bdf8] transition-colors">How It Works</Link>
            <Link href="#about" className="text-sm font-medium hover:text-[#38bdf8] transition-colors">About Us</Link>
            <Link href="#contact" className="text-sm font-medium hover:text-[#38bdf8] transition-colors">Contact</Link>
            <Link 
              href="/login" 
              className="bg-gradient-to-r from-[#38bdf8] to-[#6366f1] text-white px-6 py-2 rounded-full text-sm font-semibold hover:shadow-[0_0_20px_rgba(56,189,248,0.4)] transition-all"
            >
              Login
            </Link>
          </div>

          <button 
            className="md:hidden text-white"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X size={28} /> : <Menu size={28} />}
          </button>
        </div>
      </nav>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="fixed inset-0 z-40 bg-[#0a0f1a] pt-24 px-6 flex flex-col gap-6"
        >
          <Link href="#home" onClick={() => setMobileMenuOpen(false)} className="text-xl font-medium">Home</Link>
          <Link href="#how-it-works" onClick={() => setMobileMenuOpen(false)} className="text-xl font-medium">How It Works</Link>
          <Link href="#about" onClick={() => setMobileMenuOpen(false)} className="text-xl font-medium">About Us</Link>
          <Link href="#contact" onClick={() => setMobileMenuOpen(false)} className="text-xl font-medium">Contact</Link>
          <Link 
            href="/login" 
            className="bg-gradient-to-r from-[#38bdf8] to-[#6366f1] text-white px-6 py-3 rounded-xl text-center font-bold"
          >
            Login
          </Link>
        </motion.div>
      )}

      {/* Hero Section */}
      <section id="home" className="relative min-h-screen flex items-center justify-center pt-20 px-6 overflow-hidden">
        <div className="absolute inset-0 hero-grid-overlay pointer-events-none" />
        
        {/* Glow Effects */}
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-[#38bdf8]/20 blur-[120px] rounded-full animate-float-glow" />
        <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-[#6366f1]/10 blur-[120px] rounded-full animate-float-glow-reverse" />

        <div className="relative z-10 max-w-4xl mx-auto text-center">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 bg-[#38bdf8]/10 border border-[#38bdf8]/20 rounded-full px-4 py-1.5 mb-8"
          >
            <div className="w-2 h-2 rounded-full bg-[#38bdf8] animate-pulse" />
            <span className="text-xs font-bold text-[#38bdf8] uppercase tracking-wider">AI-Powered Attendance</span>
          </motion.div>

          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-5xl md:text-7xl font-extrabold text-white mb-6 tracking-tight leading-tight"
          >
            Smart Attendance<br />
            with <span className="gradient-text">Face Recognition</span>
          </motion.h1>

          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-lg text-slate-400 mb-10 max-w-2xl mx-auto"
          >
            SmartLog uses advanced facial recognition to automate classroom attendance — accurate, fast, and effortless. Say goodbye to manual roll calls.
          </motion.p>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-16"
          >
            <Link 
              href="/login" 
              className="group flex items-center gap-2 bg-gradient-to-r from-[#38bdf8] to-[#6366f1] text-white px-8 py-4 rounded-2xl font-bold hover:shadow-[0_10px_30px_rgba(56,189,248,0.4)] transition-all hover:-translate-y-1"
            >
              Get Started <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link 
              href="#how-it-works" 
              className="px-8 py-4 rounded-2xl border border-white/10 hover:bg-white/5 transition-all text-white font-semibold"
            >
              Learn More
            </Link>
          </motion.div>

          {/* Stats */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="grid grid-cols-2 md:grid-cols-3 gap-8 md:divide-x divide-white/10"
          >
            <div className="px-4">
              <div className="text-3xl font-bold text-white mb-1">500+</div>
              <div className="text-xs uppercase tracking-widest text-slate-500">Students Enrolled</div>
            </div>
            <div className="px-4 border-l md:border-l-0 divide-white/10">
              <div className="text-3xl font-bold text-white mb-1">95%</div>
              <div className="text-xs uppercase tracking-widest text-slate-500">Accuracy Rate</div>
            </div>
            <div className="px-4 col-span-2 md:col-span-1 border-t md:border-t-0 md:border-l divide-white/10 pt-8 md:pt-0">
              <div className="text-3xl font-bold text-white mb-1">10x</div>
              <div className="text-xs uppercase tracking-widest text-slate-500">Faster Than Manual</div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-24 relative px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <span className="text-[#38bdf8] font-bold text-xs uppercase tracking-[0.2em] mb-4 block">Process</span>
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">Three Simple <span className="gradient-text">Steps</span></h2>
            <p className="text-slate-400 max-w-xl mx-auto">From enrollment to analytics, SmartLog makes attendance tracking effortless with AI.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              { 
                step: '01', 
                title: 'Enroll Students', 
                desc: 'Register students with a single face scan. Our AI generates secure 512-D embeddings instantly.',
                icon: <UserPlus className="text-[#38bdf8]" size={24} />
              },
              { 
                step: '02', 
                title: 'Recognize Faces', 
                desc: 'AI identifies students in real-time using ArcFace deep learning models with 95% accuracy.',
                icon: <Scan className="text-[#38bdf8]" size={24} />
              },
              { 
                step: '03', 
                title: 'View Reports', 
                desc: 'Access detailed analytics, subject-wise reports, and export attendance data effortlessly.',
                icon: <BarChart3 className="text-[#38bdf8]" size={24} />
              }
            ].map((item, idx) => (
              <motion.div 
                key={idx}
                whileHover={{ y: -10 }}
                className="bg-white/5 border border-white/10 p-8 rounded-[2rem] hover:border-[#38bdf8]/30 transition-all group"
              >
                <div className="flex items-center justify-between mb-6">
                  <div className="w-12 h-12 bg-[#38bdf8]/10 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                    {item.icon}
                  </div>
                  <span className="text-4xl font-black text-white/5 group-hover:text-[#38bdf8]/20 transition-colors">{item.step}</span>
                </div>
                <h3 className="text-xl font-bold text-white mb-4">{item.title}</h3>
                <p className="text-slate-500 leading-relaxed">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="py-24 relative px-6 bg-white/[0.02]">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <span className="text-[#38bdf8] font-bold text-xs uppercase tracking-[0.2em] mb-4 block">Team</span>
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">Meet the <span className="gradient-text">Developers</span></h2>
            <p className="text-slate-400 max-w-2xl mx-auto">We are a team of passionate developers building intelligent solutions for modern education. SmartLog was born from the desire to make classroom attendance effortless using AI.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              { name: 'Himanshu Soni', role: 'Integration & Full Stack', initial: 'HS', desc: 'Passionate about building scalable full-stack applications and seamless system integration.' },
              { name: 'Satwik Gajwa', role: 'Frontend Developer', initial: 'SG', desc: 'Crafting beautiful, responsive interfaces and delivering polished user experiences.' },
              { name: 'Devendra Soni', role: 'AI/ML & Model Developer', initial: 'DS', desc: 'AI/ML specialist focused on building and training intelligent face recognition models.' },
              { name: 'Danish Varola', role: 'Integration & Full Stack', initial: 'DV', desc: 'Passionate about building full stack applications and seamless system integration' }
            ].map((dev, idx) => (
              <div key={idx} className="relative group bg-white/5 border border-white/10 p-8 rounded-[2.5rem] text-center overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#38bdf8] to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="relative w-24 h-24 mx-auto mb-6">
                  <div className="absolute inset-0 bg-gradient-to-br from-[#38bdf8] to-[#6366f1] rounded-full blur-md opacity-20 group-hover:opacity-40 transition-opacity" />
                  <div className="relative w-24 h-24 bg-[#0a0f1a] border-2 border-[#38bdf8]/20 rounded-full flex items-center justify-center group-hover:border-[#38bdf8] transition-colors overflow-hidden">
                    <span className="text-2xl font-black gradient-text">{dev.initial}</span>
                  </div>
                </div>
                <h3 className="text-xl font-bold text-white mb-1">{dev.name}</h3>
                <p className="text-[#38bdf8] text-sm font-semibold mb-4">{dev.role}</p>
                <p className="text-slate-500 text-sm leading-relaxed">{dev.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="py-24 relative px-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-16">
            <div>
              <span className="text-[#38bdf8] font-bold text-xs uppercase tracking-[0.2em] mb-4 block">Connect</span>
              <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">Get in <span className="gradient-text">Touch</span></h2>
              <p className="text-slate-400 mb-10">Have questions or feedback? We&apos;d love to hear from you. Our team is always ready to help you implement SmartLog in your institution.</p>
              
              <div className="space-y-6">
                <div className="flex items-center gap-4 group">
                  <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center border border-white/10 group-hover:border-[#38bdf8]/50 transition-colors">
                    <Users className="text-[#38bdf8]" size={20} />
                  </div>
                  <div>
                    <h4 className="text-white font-bold">Development Team</h4>
                    <p className="text-slate-500 text-sm">Himanshu, Akshit, Satwik</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 group">
                  <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center border border-white/10 group-hover:border-[#38bdf8]/50 transition-colors">
                    <Mail className="text-[#38bdf8]" size={20} />
                  </div>
                  <div>
                    <h4 className="text-white font-bold">Email Us</h4>
                    <p className="text-slate-500 text-sm">smartlog.team@example.com</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 group">
                  <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center border border-white/10 group-hover:border-[#38bdf8]/50 transition-colors">
                    <Github className="text-[#38bdf8]" size={20} />
                  </div>
                  <div>
                    <h4 className="text-white font-bold">Open Source</h4>
                    <p className="text-slate-500 text-sm">github.com/smartlog-attendance</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white/5 border border-white/10 p-8 sm:p-12 rounded-[2.5rem]">
              <form className="space-y-6" onSubmit={(e) => e.preventDefault()}>
                <div className="grid sm:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Name</label>
                    <input type="text" className="w-full bg-[#0a0f1a] border border-white/10 rounded-xl px-4 py-3 text-white focus:border-[#38bdf8]/50 outline-none transition-all" placeholder="John Doe" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Email</label>
                    <input type="email" className="w-full bg-[#0a0f1a] border border-white/10 rounded-xl px-4 py-3 text-white focus:border-[#38bdf8]/50 outline-none transition-all" placeholder="john@example.com" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Message</label>
                  <textarea rows={4} className="w-full bg-[#0a0f1a] border border-white/10 rounded-xl px-4 py-3 text-white focus:border-[#38bdf8]/50 outline-none transition-all resize-none" placeholder="How can we help you?" />
                </div>
                <button className="w-full bg-gradient-to-r from-[#38bdf8] to-[#6366f1] text-white py-4 rounded-xl font-bold hover:shadow-[0_10px_30px_rgba(56,189,248,0.4)] transition-all">Send Message</button>
              </form>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-white/5 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2">
            <Scan className="text-[#38bdf8]" size={24} />
            <span className="text-white font-bold">SmartLog</span>
          </div>
          <p className="text-slate-500 text-sm">© 2026 SmartLog Attendance System. All rights reserved.</p>
          <div className="flex gap-6">
            <Link href="#" className="text-slate-500 hover:text-white transition-colors">Privacy Policy</Link>
            <Link href="#" className="text-slate-500 hover:text-white transition-colors">Terms of Service</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
