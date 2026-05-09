'use client';

import React, { useState, useEffect } from 'react';
import { Plus, Trash2, BookOpen, Loader2, Check } from '@/components/Icons';

export default function SubjectsPage() {
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    type: 'TR',
    faculty: '',
    dept: ''
  });

  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    fetchSubjects();
  }, []);

  const fetchSubjects = async () => {
    try {
      const res = await fetch('/api/subjects');
      const data = await res.json();
      setSubjects(data.subjects || []);
    } catch (err) {
      console.error("Failed to fetch subjects", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const res = await fetch('/api/subjects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      const data = await res.json();
      
      if (data.ok) {
        setSuccessMsg(data.message);
        setFormData({ name: '', code: '', type: 'TR', faculty: '', dept: '' });
        fetchSubjects();
      } else {
        setErrorMsg(data.message || 'Failed to add subject');
      }
    } catch (err) {
      setErrorMsg(err.message || 'Network error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this subject?")) return;
    try {
      const res = await fetch(`/api/subjects?id=${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.ok) {
        fetchSubjects();
      } else {
        alert("Failed to delete subject");
      }
    } catch (err) {
      alert("Network error while deleting");
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-[#38bdf8] mb-2">Subject Management</h2>
        <p className="text-slate-400 text-xs">Add and manage subjects for attendance tracking</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Panel 1: Add Subject Form */}
        <div className="bg-[#111827] border border-[#1e293b] rounded-[2.5rem] p-8 w-full lg:w-[45%] flex flex-col shadow-xl h-fit">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-2xl bg-[#38bdf8]/10 flex items-center justify-center text-[#38bdf8]">
              <Plus size={20} />
            </div>
            <h4 className="text-xl font-bold text-white">Add New Subject</h4>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 mb-2 uppercase tracking-widest">Subject Name</label>
              <input 
                type="text" 
                value={formData.name}
                onChange={e => setFormData({...formData, name: e.target.value})}
                placeholder="e.g. Database Management Systems"
                required
                className="w-full bg-[#0b1220] border border-[#1e293b] rounded-2xl px-5 py-4 text-sm text-white outline-none focus:border-[#38bdf8] transition-all placeholder:text-slate-700"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-2 uppercase tracking-widest">Subject Code</label>
                <input 
                  type="text" 
                  value={formData.code}
                  onChange={e => setFormData({...formData, code: e.target.value})}
                  placeholder="e.g. CS302"
                  required
                  className="w-full bg-[#0b1220] border border-[#1e293b] rounded-2xl px-5 py-4 text-sm text-white outline-none focus:border-[#38bdf8] transition-all placeholder:text-slate-700 uppercase"
                />
              </div>
              
              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-2 uppercase tracking-widest">Subject Type</label>
                <select 
                  value={formData.type}
                  onChange={e => setFormData({...formData, type: e.target.value})}
                  className="w-full bg-[#0b1220] border border-[#1e293b] rounded-2xl px-5 py-4 text-sm text-white outline-none focus:border-[#38bdf8] transition-all appearance-none"
                >
                  <option value="TR">Theory (TR)</option>
                  <option value="PR">Practical (PR)</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 mb-2 uppercase tracking-widest">Professor / Faculty Name</label>
              <input 
                type="text" 
                value={formData.faculty}
                onChange={e => setFormData({...formData, faculty: e.target.value})}
                placeholder="e.g. Dr. Alan Turing"
                className="w-full bg-[#0b1220] border border-[#1e293b] rounded-2xl px-5 py-4 text-sm text-white outline-none focus:border-[#38bdf8] transition-all placeholder:text-slate-700"
              />
            </div>
            
            <div>
              <label className="block text-[10px] font-bold text-slate-500 mb-2 uppercase tracking-widest">Department</label>
              <input 
                type="text" 
                value={formData.dept}
                onChange={e => setFormData({...formData, dept: e.target.value})}
                placeholder="e.g. Computer Science"
                className="w-full bg-[#0b1220] border border-[#1e293b] rounded-2xl px-5 py-4 text-sm text-white outline-none focus:border-[#38bdf8] transition-all placeholder:text-slate-700"
              />
            </div>

            <button 
              type="submit"
              disabled={submitting}
              className="w-full bg-[#38bdf8] text-white py-4 rounded-2xl text-sm font-bold hover:opacity-90 transition-all flex items-center justify-center gap-2 shadow-lg shadow-[#38bdf8]/20 disabled:opacity-50"
            >
              {submitting ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} />} 
              {submitting ? 'Adding...' : 'Add Subject'}
            </button>
            
            {errorMsg && (
              <div className="mt-3 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs">
                {errorMsg}
              </div>
            )}
            
            {successMsg && (
              <div className="mt-3 p-3 bg-[rgba(56,189,248,0.05)] border border-[#38bdf8]/30 rounded-xl flex items-center gap-3 transition-all duration-300">
                <div className="bg-[#38bdf8]/10 p-2 rounded-full">
                  <Check size={16} className="text-[#38bdf8]" />
                </div>
                <div>
                  <p className="text-[#38bdf8] text-sm font-semibold">Success</p>
                  <p className="text-slate-400 text-[11px] mt-0.5">{successMsg}</p>
                </div>
              </div>
            )}
          </form>
        </div>

        {/* Panel 2: Subjects List */}
        <div className="bg-[#111827] border border-[#1e293b] rounded-2xl p-5 w-full lg:w-[55%] flex flex-col h-[600px]">
          <div className="mb-6 flex justify-between items-center">
            <h4 className="text-base font-semibold text-white">Existing Subjects</h4>
            <span className="bg-[#1e293b] text-slate-300 text-[10px] font-bold px-2 py-1 rounded-lg">
              Total: {subjects.length}
            </span>
          </div>

          {loading ? (
            <div className="flex-1 flex items-center justify-center">
              <Loader2 className="animate-spin text-slate-500" size={24} />
            </div>
          ) : subjects.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center opacity-50">
              <BookOpen size={48} className="text-slate-500 mb-4" strokeWidth={1} />
              <p className="text-slate-300 text-sm mb-1">No subjects found</p>
              <p className="text-slate-500 text-[11px]">Add a subject using the form</p>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
              {subjects.map(subject => (
                <div key={subject._id} className="bg-[#0b1220] border border-[#1e293b] rounded-xl p-4 flex gap-4 items-center group hover:border-[#38bdf8]/30 transition-colors">
                  <div className="w-12 h-12 rounded-2xl bg-slate-800 flex items-center justify-center flex-shrink-0 text-slate-400">
                    <BookOpen size={20} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h5 className="text-white font-bold text-sm truncate">{subject.name}</h5>
                      <span className="bg-[#1e293b] text-[#38bdf8] text-[9px] font-bold px-1.5 py-0.5 rounded uppercase">
                        {subject.type}
                      </span>
                    </div>
                    <p className="text-slate-400 text-[11px] mb-0.5">Code: <span className="text-slate-300">{subject.code}</span></p>
                    {subject.faculty && (
                      <p className="text-slate-500 text-[10px] truncate">Prof: {subject.faculty}</p>
                    )}
                  </div>
                  
                  <button 
                    onClick={() => handleDelete(subject._id)}
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 hover:bg-red-500/10 hover:text-red-400 transition-colors"
                    title="Delete Subject"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
