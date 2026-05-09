'use client';

import React, { useState, useEffect } from 'react';
import { Trash2, Loader2, RefreshCw, ChevronDown, ChevronRight, Calendar } from '@/components/Icons';

export default function LogsPage() {
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState(null);
  const [expandedDates, setExpandedDates] = useState({});
  const [subjects, setSubjects] = useState([]);
  const [depts, setDepts] = useState([]);
  const [lectures, setLectures] = useState([]);
  const [filters, setFilters] = useState({
    q: '', subject: '', dept: '', from: '', to: '', lecture: '', status: ''
  });

  useEffect(() => { fetchLogs(); }, []);

  const fetchLogs = async (params = {}) => {
    setLoading(true);
    try {
      const f = { ...filters, ...params };
      const qs = new URLSearchParams();
      Object.entries(f).forEach(([k, v]) => { if (v) qs.set(k, v); });
      const res = await fetch(`/api/logs?${qs.toString()}`);
      const data = await res.json();
      setLogs(data.logs || []);
      setTotal(data.total || 0);
      if (data.subjects) setSubjects(data.subjects);
      if (data.depts) setDepts(data.depts);
      if (data.lectures) setLectures(data.lectures);
      
      // Auto-expand the first date if available
      if (data.logs && data.logs.length > 0) {
        const firstDate = data.logs[0].date;
        setExpandedDates({ [firstDate]: true });
      }
    } catch (err) {
      console.error("Failed to fetch logs:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (e, id) => {
    e.stopPropagation(); // Prevent toggling the accordion
    if (!confirm("Are you sure you want to delete this attendance record? This will also remove it from reports.")) return;
    
    setDeletingId(id);
    try {
      const res = await fetch(`/api/logs/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.ok) {
        setLogs(prev => prev.filter(log => log._id !== id));
        setTotal(prev => prev - 1);
      } else {
        alert(data.message || "Failed to delete record");
      }
    } catch (err) {
      console.error("Delete error:", err);
      alert("An error occurred while deleting");
    } finally {
      setDeletingId(null);
    }
  };

  const toggleDate = (date) => {
    setExpandedDates(prev => ({ ...prev, [date]: !prev[date] }));
  };

  const handleChange = (e) => {
    setFilters({ ...filters, [e.target.name]: e.target.value });
  };

  const handleApply = () => fetchLogs();
  const handleReset = () => {
    const empty = { q: '', subject: '', dept: '', from: '', to: '', lecture: '', status: '' };
    setFilters(empty);
    fetchLogs(empty);
  };

  const formatDate = (log) => {
    if (log.createdAt) {
      const d = new Date(log.createdAt);
      return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    }
    return '—';
  };

  const exportDayCSV = (e, date) => {
    e.stopPropagation();
    const dayLogs = groupedLogs[date];
    if (!dayLogs || dayLogs.length === 0) return;

    const headers = ['Time', 'Student', 'Enroll No', 'Subject', 'Lecture', 'Confidence', 'Type', 'Status'];
    
    const csvRows = [
      headers.join(','),
      ...dayLogs.map(log => [
        `"${formatDate(log)}"`,
        `"${(log.fullname || '').toString().replace(/"/g, '""')}"`,
        `"${(log.enrollno || '').toString().replace(/"/g, '""')}"`,
        `"${(log.subjectName || '').toString().replace(/"/g, '""')}"`,
        `"${(log.lectureKey || '').toString().replace(/"/g, '""')}"`,
        `"${log.confidence ? (log.confidence * 100).toFixed(1) + '%' : ''}"`,
        `"${log.mode === 'auto' ? 'Face' : (log.mode || '')}"`,
        `"${log.status || ''}"`
      ].join(','))
    ];

    const csvContent = "data:text/csv;charset=utf-8," + csvRows.join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    
    const safeDate = date.replace(/[^a-zA-Z0-9]/g, '_');
    link.setAttribute("download", `Logs_${safeDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Group logs by date
  const groupedLogs = logs.reduce((acc, log) => {
    const d = log.date || 'Unknown Date';
    if (!acc[d]) acc[d] = [];
    acc[d].push(log);
    return acc;
  }, {});

  const sortedDates = Object.keys(groupedLogs).sort((a, b) => new Date(b) - new Date(a));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap mb-6">
        <div>
          <h2 className="text-2xl font-bold text-[#38bdf8]">Logs</h2>
          <p className="text-slate-400 mt-1 text-xs">View attendance activity grouped by date</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => fetchLogs()} className="px-4 py-2 rounded-lg bg-[#38bdf8] text-[#fff] font-medium text-xs hover:opacity-90 transition-opacity flex items-center gap-2">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>
      </div>

      {/* Filters Form */}
      <div className="bg-[#111827] border border-[#1e293b] rounded-2xl p-4 mb-4">
        <div className="flex flex-wrap gap-3 items-center">
          <div className="flex-1 min-w-[220px]">
            <label className="block text-slate-400 text-[11px] mb-1">Search</label>
            <input type="text" name="q" value={filters.q} onChange={handleChange} placeholder="Name / Enroll No / Subject..."
              className="w-full px-4 py-2 rounded-lg bg-[#0b1220] border border-[#1e293b] text-white outline-none focus:border-[#38bdf8] text-sm transition-colors" />
          </div>
          <div className="min-w-[140px]">
            <label className="block text-slate-400 text-[11px] mb-1">Subject</label>
            <select name="subject" value={filters.subject} onChange={handleChange}
              className="w-full px-4 py-2 rounded-lg bg-[#0b1220] border border-[#1e293b] text-white outline-none focus:border-[#38bdf8] text-sm transition-colors">
              <option value="">All Subjects</option>
              {subjects.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="min-w-[140px]">
            <label className="block text-slate-400 text-[11px] mb-1">Department</label>
            <select name="dept" value={filters.dept} onChange={handleChange}
              className="w-full px-4 py-2 rounded-lg bg-[#0b1220] border border-[#1e293b] text-white outline-none focus:border-[#38bdf8] text-sm transition-colors">
              <option value="">All Depts</option>
              {depts.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <div className="min-w-[140px]">
            <label className="block text-slate-400 text-[11px] mb-1">From</label>
            <input type="date" name="from" value={filters.from} onChange={handleChange}
              className="w-full px-4 py-2 rounded-lg bg-[#0b1220] border border-[#1e293b] text-white outline-none focus:border-[#38bdf8] text-sm transition-colors [color-scheme:dark]" />
          </div>
          <div className="min-w-[140px]">
            <label className="block text-slate-400 text-[11px] mb-1">To</label>
            <input type="date" name="to" value={filters.to} onChange={handleChange}
              className="w-full px-4 py-2 rounded-lg bg-[#0b1220] border border-[#1e293b] text-white outline-none focus:border-[#38bdf8] text-sm transition-colors [color-scheme:dark]" />
          </div>
          <div className="flex gap-2 items-end">
            <button onClick={handleApply} className="px-4 py-2 rounded-lg bg-[#38bdf8]/10 text-[#38bdf8] border border-[#38bdf8]/20 text-xs hover:border-[#38bdf8] transition-colors">Apply Filters</button>
            <button onClick={handleReset} className="px-4 py-2 rounded-lg border border-[#1e293b] text-gray-200 text-xs hover:border-[#38bdf8] transition-colors">Reset</button>
          </div>
        </div>
        <div className="mt-3 text-[11px] text-slate-500">Total records: <span>{total}</span></div>
      </div>

      {/* Grouped Logs List */}
      <div className="space-y-4">
        {loading ? (
          <div className="bg-[#111827] border border-[#1e293b] rounded-2xl p-12 text-center">
            <Loader2 className="animate-spin mx-auto text-[#38bdf8] mb-4" size={32} />
            <p className="text-slate-400 text-sm font-medium">Fetching logs from database...</p>
          </div>
        ) : sortedDates.length === 0 ? (
          <div className="bg-[#111827] border border-[#1e293b] rounded-2xl p-12 text-center">
            <p className="text-slate-400 text-sm font-medium">No logs found for the selected filters.</p>
          </div>
        ) : (
          sortedDates.map(date => (
            <div key={date} className="bg-[#111827] border border-[#1e293b] rounded-2xl overflow-hidden transition-all duration-300">
              {/* Date Header / Trigger */}
              <div 
                onClick={() => toggleDate(date)}
                className={`p-4 flex items-center justify-between cursor-pointer hover:bg-[#1e293b]/50 transition-colors ${expandedDates[date] ? 'bg-[#1e293b]/30' : ''}`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#38bdf8]/10 flex items-center justify-center text-[#38bdf8]">
                    <Calendar size={20} />
                  </div>
                  <div>
                    <h3 className="text-white font-bold text-sm">{date}</h3>
                    <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest">{groupedLogs[date].length} Records Found</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="hidden sm:flex gap-2">
                    <button 
                      onClick={(e) => exportDayCSV(e, date)}
                      className="px-2 py-0.5 rounded-md bg-[#38bdf8]/10 text-[#38bdf8] text-[10px] font-bold border border-[#38bdf8]/20 hover:bg-[#38bdf8]/20 transition-colors"
                    >
                      Export CSV
                    </button>
                    <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 text-[10px] font-bold border border-emerald-500/20">
                      {groupedLogs[date].filter(l => l.status === 'Present').length} Present
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-red-500/10 text-red-400 text-[10px] font-bold border border-red-500/20">
                      {groupedLogs[date].filter(l => l.status === 'Absent').length} Absent
                    </span>
                  </div>
                  <div className="text-slate-500">
                    {expandedDates[date] ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                  </div>
                </div>
              </div>

              {/* Collapsible Content */}
              {expandedDates[date] && (
                <div className="border-t border-[#1e293b] overflow-x-auto animate-in slide-in-from-top-2 duration-300">
                  <table className="w-full text-left">
                    <thead className="bg-[#0b1220]">
                      <tr className="text-slate-400 text-[10px] uppercase font-black tracking-widest">
                        <th className="px-4 py-3">Time</th>
                        <th className="px-4 py-3">Student</th>
                        <th className="px-4 py-3">Enroll No</th>
                        <th className="px-4 py-3">Subject</th>
                        <th className="px-4 py-3">Lecture</th>
                        <th className="px-4 py-3">Confidence</th>
                        <th className="px-4 py-3">Type</th>
                        <th className="px-4 py-3">Status</th>
                        <th className="px-4 py-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#1e293b]">
                      {groupedLogs[date].map((log, i) => (
                        <tr key={log._id || i} className="hover:bg-[#0b1220]/50 transition-colors text-sm text-slate-300">
                          <td className="px-4 py-3 text-xs font-mono text-slate-500">{formatDate(log)}</td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 rounded-full overflow-hidden border border-[#1e293b] bg-[#0b1220] flex-shrink-0">
                                {log.profilePic ? (
                                  <img src={log.profilePic} alt={log.fullname} className="w-full h-full object-cover" />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center text-[8px] font-bold text-slate-500 uppercase">
                                    {log.fullname?.charAt(0) || '?'}
                                  </div>
                                )}
                              </div>
                              <span className="truncate max-w-[140px] font-medium">{log.fullname}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-xs text-slate-400">{log.enrollno}</td>
                          <td className="px-4 py-3 text-xs">{log.subjectName}</td>
                          <td className="px-4 py-3 text-xs font-bold text-[#38bdf8]">{log.lectureKey || '—'}</td>
                          <td className="px-4 py-3 text-xs">{log.confidence ? (log.confidence * 100).toFixed(1) + '%' : '—'}</td>
                          <td className="px-4 py-3 text-xs capitalize text-slate-500">{log.mode === 'auto' ? 'Face' : (log.mode || '—')}</td>
                          <td className="px-4 py-3">
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${log.status === 'Present' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
                              {log.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <button 
                              onClick={(e) => handleDelete(e, log._id)}
                              disabled={deletingId === log._id}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-400/10 transition-all disabled:opacity-50"
                            >
                              {deletingId === log._id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
