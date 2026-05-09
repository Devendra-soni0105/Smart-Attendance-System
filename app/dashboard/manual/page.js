'use client';

import React, { useState, useEffect } from 'react';
import { Search, User as UserIcon, Loader2, Check, X } from '@/components/Icons';

export default function ManualOverridePage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [students, setStudents] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10));
  const [lectureKey, setLectureKey] = useState('');
  const [loading, setLoading] = useState(true);
  const [fetchingAtt, setFetchingAtt] = useState(false);
  const [message, setMessage] = useState('');
  const [markingAbsent, setMarkingAbsent] = useState(false);

  const handleMarkRemaining = async () => {
    if (!selectedSubject) return;
    if (!confirm("This will mark all students in this department as 'Absent' if they don't already have an attendance record for this slot. Continue?")) return;

    setMarkingAbsent(true);
    try {
      const res = await fetch('/api/attendance/mark-remaining-absent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          subjectId: selectedSubject, 
          date: selectedDate, 
          lectureKey 
        }),
      });
      const data = await res.json();
      if (data.ok) {
        setMessage(`✅ ${data.message}`);
        fetchPreviousAttendance(); // Refresh the list
      } else {
        setMessage(`❌ ${data.message}`);
      }
    } catch (err) {
      setMessage(`❌ ${err.message}`);
    } finally {
      setMarkingAbsent(false);
    }
  };

  const timeRanges = [
    { value: 'lec-1', label: 'lec-1 → 9:15 AM - 11:15 AM' },
    { value: 'lec-2', label: 'lec-2 → 11:30 AM - 1:30 PM' },
    { value: 'lec-3', label: 'lec-3 → 2:10 PM - 4:45 PM' },
  ];

  useEffect(() => {
    fetchStudents();
    fetchSubjects();
  }, []);

  useEffect(() => {
    if (selectedSubject) {
      fetchPreviousAttendance();
    }
  }, [selectedSubject, selectedDate, lectureKey]);

  const fetchStudents = async () => {
    try {
      const res = await fetch('/api/students');
      const data = await res.json();
      setStudents((data.students || []).map(s => ({ ...s, markedStatus: null })));
    } catch (err) {
      console.error("Failed to fetch students:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchSubjects = async () => {
    try {
      const res = await fetch('/api/subjects');
      const data = await res.json();
      setSubjects(data.subjects || []);
    } catch (err) {
      console.error("Failed to fetch subjects:", err);
    }
  };

  const fetchPreviousAttendance = async () => {
    setFetchingAtt(true);
    try {
      const res = await fetch(`/api/manual-override?subjectId=${selectedSubject}&date=${selectedDate}&lectureKey=${lectureKey}`);
      const data = await res.json();
      if (data.ok) {
        // Map attendance records back to students list
        setStudents(prev => prev.map(student => {
          const record = data.records.find(r => r.studentId === student._id);
          return { ...student, markedStatus: record ? record.status : null };
        }));
      }
    } catch (err) {
      console.error("Fetch previous attendance error:", err);
    } finally {
      setFetchingAtt(false);
    }
  };

  const markAttendance = async (enrollno, status) => {
    if (!selectedSubject) {
      setMessage('⚠️ Please select a subject first.');
      return;
    }
    setMessage('');
    try {
      const res = await fetch('/api/manual-override', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          enrollno, 
          subjectId: selectedSubject, 
          status, 
          lectureKey,
          date: selectedDate
        }),
      });
      const data = await res.json();
      if (data.ok) {
        setMessage(`✅ ${data.message}`);
        setStudents(prev => prev.map(s => s.enrollno === enrollno ? { ...s, markedStatus: status } : s));
      } else {
        setMessage(`❌ ${data.message}`);
      }
    } catch (err) {
      setMessage(`❌ ${err.message}`);
    }
  };

  const filtered = students.filter(s => {
    if (!searchTerm) return true;
    const q = searchTerm.toLowerCase();
    return s.fullname?.toLowerCase().includes(q) || s.enrollno?.toLowerCase().includes(q);
  });

  return (
    <div className="space-y-6">
      <div className="mb-6 flex justify-between items-end">
        <div>
          <h2 className="text-2xl font-bold text-[#38bdf8]">Manual Override</h2>
          <p className="text-slate-400 mt-1 text-sm">Manually adjust attendance records if needed</p>
        </div>
        <div className="bg-[#111827] border border-[#1e293b] rounded-xl px-4 py-2 flex items-center gap-3">
          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Attendance Date</label>
          <input 
            type="date" 
            value={selectedDate} 
            onChange={e => setSelectedDate(e.target.value)}
            className="bg-transparent text-sm text-white outline-none border-none [color-scheme:dark]"
          />
        </div>
      </div>

      <div className="bg-[#111827] border border-[#1e293b] rounded-2xl p-6">
        {/* Subject & Lecture Selection */}
        <div className="flex flex-wrap gap-4 mb-6">
          <div className="min-w-[200px]">
            <label className="block text-slate-400 text-[11px] mb-1 font-bold uppercase tracking-widest">Subject *</label>
            <select value={selectedSubject} onChange={e => setSelectedSubject(e.target.value)}
              className="w-full bg-[#0b1220] border border-[#1e293b] rounded-lg px-4 py-2 text-sm text-white outline-none focus:border-[#38bdf8] transition-colors">
              <option value="">Select Subject</option>
              {subjects.map(s => <option key={s._id} value={s._id}>{s.name} ({s.code})</option>)}
            </select>
          </div>
          <div className="min-w-[220px]">
            <label className="block text-slate-400 text-[11px] mb-1 font-bold uppercase tracking-widest">Lecture / Time Slot</label>
            <select value={lectureKey} onChange={e => setLectureKey(e.target.value)}
              className="w-full bg-[#0b1220] border border-[#1e293b] rounded-lg px-4 py-2 text-sm text-white outline-none focus:border-[#38bdf8] transition-colors">
              <option value="">Any Time (Global)</option>
              {timeRanges.map(tr => <option key={tr.value} value={tr.value}>{tr.label}</option>)}
            </select>
          </div>
          <div className="relative flex-1 min-w-[220px]">
            <label className="block text-slate-400 text-[11px] mb-1 font-bold uppercase tracking-widest">Search Student</label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                <input type="text" placeholder="Name / Enroll No..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-[#0b1220] border border-[#1e293b] rounded-lg pl-10 pr-4 py-2 text-sm text-white outline-none focus:border-[#38bdf8] transition-colors" />
              </div>
              <button 
                onClick={handleMarkRemaining}
                disabled={!selectedSubject || markingAbsent}
                className="px-4 py-2 bg-[#38bdf8]/10 text-[#38bdf8] border border-[#38bdf8]/20 rounded-lg text-xs font-bold hover:bg-[#38bdf8] hover:text-white transition-all disabled:opacity-50 disabled:hover:bg-[#38bdf8]/10 disabled:hover:text-[#38bdf8]"
              >
                {markingAbsent ? <Loader2 className="animate-spin" size={14} /> : 'Mark Remaining Absent'}
              </button>
            </div>
          </div>
        </div>

        {fetchingAtt && (
          <div className="flex items-center gap-2 text-xs text-[#38bdf8] mb-4 animate-pulse">
            <Loader2 className="animate-spin" size={14} /> Synchronizing previous records...
          </div>
        )}

        {message && (
          <div className="mb-4 p-3 rounded-lg bg-[#0b1220] border border-[#1e293b] text-sm text-slate-300 animate-in fade-in slide-in-from-top-1 duration-300">{message}</div>
        )}

        {/* Student List */}
        <div className="space-y-3">
          {loading ? (
            <p className="text-slate-400 text-sm py-6 text-center">Loading students…</p>
          ) : filtered.length === 0 ? (
            <p className="text-slate-400 text-sm py-6 text-center">No students found.</p>
          ) : (
            filtered.map(student => (
              <div key={student._id} className="bg-[#0b1220] border border-[#1e293b] rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 group hover:border-[#38bdf8]/30 transition-all">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-[#111827] border border-[#1e293b] flex items-center justify-center overflow-hidden">
                    {student.profilePic ? (
                      <img src={student.profilePic} className="w-full h-full object-cover" alt="" />
                    ) : (
                      <UserIcon className="text-slate-700" size={24} />
                    )}
                  </div>
                  <div>
                    <h4 className="text-white font-bold text-sm">{student.fullname}</h4>
                    <p className="text-xs text-slate-500">{student.enrollno} · {student.dept}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  {student.markedStatus && (
                    <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full border ${student.markedStatus === 'Present' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : 'bg-red-500/10 text-red-400 border-red-500/30'}`}>
                      {student.markedStatus}
                    </span>
                  )}
                  
                  <div className="flex bg-[#111827] border border-[#1e293b] rounded-lg p-1">
                    <button onClick={() => markAttendance(student.enrollno, 'Present')}
                      className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${student.markedStatus === 'Present' ? 'text-white bg-emerald-500 shadow-lg shadow-emerald-500/20' : 'text-slate-400 hover:text-white hover:bg-emerald-500/20'}`}>
                      Present
                    </button>
                    <button onClick={() => markAttendance(student.enrollno, 'Absent')}
                      className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${student.markedStatus === 'Absent' ? 'text-white bg-red-500 shadow-lg shadow-red-500/20' : 'text-slate-400 hover:text-white hover:bg-red-500/20'}`}>
                      Absent
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
