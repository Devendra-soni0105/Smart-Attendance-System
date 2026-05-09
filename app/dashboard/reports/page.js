'use client';

import React, { useState, useEffect } from 'react';

export default function ReportsPage() {
  const [report, setReport] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [totalLectures, setTotalLectures] = useState(0);
  const [enrolledStudents, setEnrolledStudents] = useState(0);
  const [selectedSubject, setSelectedSubject] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => { fetchReports(); }, []);

  const fetchReports = async (subjectId = '') => {
    setLoading(true);
    setError('');
    try {
      const qs = subjectId ? `?subject=${subjectId}` : '';
      const res = await fetch(`/api/reports${qs}`);
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setReport(data.report || []);
      setTotalLectures(data.totalLectures || 0);
      setEnrolledStudents(data.enrolledStudents || 0);
      if (data.subjects) setSubjects(data.subjects);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubjectChange = (e) => {
    const val = e.target.value;
    setSelectedSubject(val);
    fetchReports(val);
  };

  const exportToCSV = () => {
    if (!report || report.length === 0) {
      alert("No data to export");
      return;
    }
    
    const headers = ['Enroll No', 'Student Name', 'Department', 'Attended', 'Total', 'Percentage'];
    
    const csvRows = [
      headers.join(','),
      ...report.map(r => [
        `"${(r.enrollno || '').toString().replace(/"/g, '""')}"`,
        `"${(r.fullname || '').toString().replace(/"/g, '""')}"`,
        `"${(r.dept || '').toString().replace(/"/g, '""')}"`,
        r.attended || 0,
        r.total || 0,
        `"${r.percentage}%"`
      ].join(','))
    ];

    const csvContent = "data:text/csv;charset=utf-8," + csvRows.join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    
    let filename = "Attendance_Report";
    if (selectedSubject) {
      const subj = subjects.find(s => s._id === selectedSubject);
      if (subj) filename += `_${subj.code}`;
    }
    filename += ".csv";
    
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };


  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap mb-6">
        <div>
          <h2 className="text-2xl font-bold text-[#38bdf8]">Attendance Reports</h2>
          <p className="text-slate-400 mt-1 text-xs">View overall or subject-specific attendance percentages.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={exportToCSV} className="px-4 py-2 rounded-lg border border-[#1e293b] bg-transparent text-gray-200 text-xs hover:border-[#38bdf8] transition-colors">Export CSV</button>
          <button onClick={() => fetchReports(selectedSubject)} className="px-4 py-2 rounded-lg bg-[#38bdf8] text-[#fff] font-medium text-xs hover:opacity-90 transition-opacity">Refresh</button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-[#111827] border border-[#1e293b] rounded-2xl p-4 mb-4">
        <div className="flex flex-wrap gap-3 items-center">
          <div className="min-w-[200px]">
            <label className="block text-slate-400 text-[11px] mb-1">Subject</label>
            <select value={selectedSubject} onChange={handleSubjectChange}
              className="w-full px-4 py-2 rounded-lg bg-[#0b1220] border border-[#1e293b] text-white outline-none focus:border-[#38bdf8] text-sm transition-colors">
              <option value="">Overall (All Subjects)</option>
              {subjects.map(s => <option key={s._id} value={s._id}>{s.name} ({s.code})</option>)}
            </select>
          </div>
          <div className="flex-1"></div>
          <div className="flex gap-4">
            <div className="bg-[#0b1220] border border-[#1e293b] px-4 py-2 rounded-xl flex flex-col justify-center">
              <span className="text-[10px] text-slate-400 uppercase tracking-widest">Total Lectures Held</span>
              <span className="text-lg font-semibold text-[#38bdf8]">{totalLectures}</span>
            </div>
            <div className="bg-[#0b1220] border border-[#1e293b] px-4 py-2 rounded-xl hidden md:flex flex-col justify-center">
              <span className="text-[10px] text-slate-400 uppercase tracking-widest">Enrolled Students</span>
              <span className="text-lg font-semibold text-gray-200">{enrolledStudents}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-[#111827] border border-[#1e293b] rounded-2xl overflow-hidden">
        <div className="p-4 border-b border-[#1e293b] flex items-center justify-between">
          <h3 className="text-sm font-semibold text-white">{selectedSubject ? 'Subject Attendance' : 'Overall Attendance'}</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-[#0b1220]">
              <tr className="text-slate-400 text-[11px] uppercase tracking-wider">
                <th className="px-4 py-3 font-medium">Enroll No</th>
                <th className="px-4 py-3 font-medium">Student Name</th>
                <th className="px-4 py-3 font-medium">Department</th>
                <th className="px-4 py-3 font-medium text-center">Attended</th>
                <th className="px-4 py-3 font-medium text-center">Total</th>
                <th className="px-4 py-3 font-medium text-right">Percentage</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1e293b]">
              {loading ? (
                <tr><td colSpan="6" className="px-4 py-8 text-center text-slate-400 text-sm">Loading reports…</td></tr>
              ) : error ? (
                <tr><td colSpan="6" className="px-4 py-8 text-center text-red-400 text-sm">{error}</td></tr>
              ) : report.length === 0 ? (
                <tr><td colSpan="6" className="px-4 py-8 text-center text-slate-500 text-sm">No data available</td></tr>
              ) : (
                report.map((r, i) => (
                  <tr key={i} className="hover:bg-[#0b1220]/50 transition-colors text-sm text-slate-300">
                    <td className="px-4 py-3 text-xs">{r.enrollno}</td>
                    <td className="px-4 py-3">{r.fullname}</td>
                    <td className="px-4 py-3 text-xs">{r.dept}</td>
                    <td className="px-4 py-3 text-center">{r.attended}</td>
                    <td className="px-4 py-3 text-center">{r.total}</td>
                    <td className="px-4 py-3 text-right">
                      <span className={`font-semibold ${r.percentage >= 75 ? 'text-green-400' : r.percentage >= 50 ? 'text-yellow-400' : 'text-red-400'}`}>
                        {r.percentage}%
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
