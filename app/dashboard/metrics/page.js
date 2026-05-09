'use client';

import React, { useState, useEffect } from 'react';

export default function MetricsPage() {
  const [metrics, setMetrics] = useState({ totals: 0, todayCount: 0, weekCount: 0, monthCount: 0, bySubject: [], byDept: [] });
  const [subjects, setSubjects] = useState([]);
  const [depts, setDepts] = useState([]);
  const [lectures, setLectures] = useState([]);
  const [filters, setFilters] = useState({ subject: '', dept: '', lecture: '' });
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchMetrics(); }, []);

  const fetchMetrics = async (params = {}) => {
    setLoading(true);
    try {
      const f = { ...filters, ...params };
      const qs = new URLSearchParams();
      Object.entries(f).forEach(([k, v]) => { if (v) qs.set(k, v); });
      const res = await fetch(`/api/metrics?${qs.toString()}`);
      const data = await res.json();
      setMetrics(data);
      if (data.subjects) setSubjects(data.subjects);
      if (data.depts) setDepts(data.depts);
      if (data.lectures) setLectures(data.lectures);
    } catch (err) {
      console.error("Failed to fetch metrics:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleApply = () => fetchMetrics();
  const handleReset = () => {
    const empty = { subject: '', dept: '', lecture: '' };
    setFilters(empty);
    fetchMetrics(empty);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap mb-6">
        <div>
          <h2 className="text-2xl font-bold text-[#38bdf8]">Metrics</h2>
          <p className="text-slate-400 mt-1 text-sm">Analytics based on attendance logs</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => fetchMetrics()} className="px-4 py-2 rounded-lg bg-[#38bdf8] text-[#fff] font-medium text-xs hover:opacity-90 transition-opacity">Refresh</button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-[#111827] border border-[#1e293b] rounded-2xl p-4 mb-5">
        <div className="flex gap-3 flex-wrap items-end">
          <div className="min-w-[140px]">
            <label className="block text-slate-400 text-[11px] mb-1">Subject</label>
            <select value={filters.subject} onChange={e => setFilters({...filters, subject: e.target.value})}
              className="w-full px-4 py-2 rounded-lg bg-[#0b1220] border border-[#1e293b] text-white outline-none focus:border-[#38bdf8] text-sm transition-colors">
              <option value="">All Subjects</option>
              {subjects.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="min-w-[140px]">
            <label className="block text-slate-400 text-[11px] mb-1">Department</label>
            <select value={filters.dept} onChange={e => setFilters({...filters, dept: e.target.value})}
              className="w-full px-4 py-2 rounded-lg bg-[#0b1220] border border-[#1e293b] text-white outline-none focus:border-[#38bdf8] text-sm transition-colors">
              <option value="">All Depts</option>
              {depts.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <div className="min-w-[140px]">
            <label className="block text-slate-400 text-[11px] mb-1">Lecture</label>
            <select value={filters.lecture} onChange={e => setFilters({...filters, lecture: e.target.value})}
              className="w-full px-4 py-2 rounded-lg bg-[#0b1220] border border-[#1e293b] text-white outline-none focus:border-[#38bdf8] text-sm transition-colors">
              <option value="">All Lectures</option>
              {lectures.map(l => <option key={l} value={l}>{l}</option>)}
            </select>
          </div>
          <button onClick={handleApply} className="px-4 py-2 rounded-lg bg-[#38bdf8]/10 text-[#38bdf8] border border-[#38bdf8]/20 text-xs hover:border-[#38bdf8] transition-colors">Apply</button>
          <button onClick={handleReset} className="px-4 py-2 rounded-lg border border-[#1e293b] text-gray-200 text-xs hover:border-[#38bdf8] transition-colors">Reset</button>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total Logs', value: metrics.totals },
          { label: 'Today', value: metrics.todayCount },
          { label: 'This Week', value: metrics.weekCount },
          { label: 'This Month', value: metrics.monthCount },
        ].map((card, i) => (
          <div key={i} className="bg-[#111827] border border-[#1e293b] rounded-2xl p-4">
            <p className="text-slate-400 text-xs">{card.label}</p>
            <h3 className="text-white text-2xl font-semibold mt-1">{loading ? '—' : card.value}</h3>
          </div>
        ))}
      </div>

      {/* Top Lists */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Top Subjects */}
        <div className="bg-[#111827] border border-[#1e293b] rounded-2xl overflow-hidden">
          <div className="p-4 border-b border-[#1e293b]">
            <h4 className="text-white font-semibold text-sm">Top Subjects</h4>
            <p className="text-slate-500 text-[11px] mt-1">Most activity by subject (top 10)</p>
          </div>
          <div className="p-4 space-y-3">
            {metrics.bySubject.length === 0 ? (
              <p className="text-slate-400 text-sm">No data yet.</p>
            ) : (
              metrics.bySubject.map((item, i) => (
                <div key={i} className="flex items-center justify-between">
                  <span className="text-slate-300 text-sm">{item._id}</span>
                  <span className="text-[#38bdf8] text-sm font-semibold">{item.count}</span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Top Departments */}
        <div className="bg-[#111827] border border-[#1e293b] rounded-2xl overflow-hidden">
          <div className="p-4 border-b border-[#1e293b]">
            <h4 className="text-white font-semibold text-sm">Top Departments</h4>
            <p className="text-slate-500 text-[11px] mt-1">Most activity by dept (top 10)</p>
          </div>
          <div className="p-4 space-y-3">
            {metrics.byDept.length === 0 ? (
              <p className="text-slate-400 text-sm">No data yet.</p>
            ) : (
              metrics.byDept.map((item, i) => (
                <div key={i} className="flex items-center justify-between">
                  <span className="text-slate-300 text-sm">{item._id}</span>
                  <span className="text-[#38bdf8] text-sm font-semibold">{item.count}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
