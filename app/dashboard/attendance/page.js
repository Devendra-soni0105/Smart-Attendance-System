'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Camera, StopCircle, UserCheck, Settings, ShieldCheck, Activity, User as UserIcon, Loader2 } from '@/components/Icons';
import { cn } from '@/lib/utils';
import CameraPreview from '@/components/CameraPreview';

export default function AttendancePage() {
  const [cameraActive, setCameraActive] = useState(false);
  const [autoMode, setAutoMode] = useState(false);
  const [subject, setSubject] = useState('');
  const [timeRange, setTimeRange] = useState('');
  const [status, setStatus] = useState('Waiting...');
  const [matchResult, setMatchResult] = useState(null);
  const [isRecognizing, setIsRecognizing] = useState(false);

  const cameraRef = useRef(null);
  const autoIntervalRef = useRef(null);
  const [subjects, setSubjects] = useState([]);
  const [markingManual, setMarkingManual] = useState(false);
  const [cameraSettings, setCameraSettings] = useState({ source: 'webcam', url: '' });

  useEffect(() => {
    fetchSubjects();
    const source = localStorage.getItem('faceguard_camera_source') || 'webcam';
    const url = localStorage.getItem('faceguard_wifi_url') || '';
    setCameraSettings({ source, url });
    
    return () => {
      if (autoIntervalRef.current) clearInterval(autoIntervalRef.current);
    };
  }, []);

  const fetchSubjects = async () => {
    try {
      const res = await fetch('/api/subjects');
      const data = await res.json();
      setSubjects(data.subjects || []);
    } catch (err) {
      console.error("Failed to fetch subjects:", err);
    }
  };

  const timeRanges = [
    { value: 'lec-1|9:15 AM - 11:15 AM', label: 'lec-1 → 9:15 AM - 11:15 AM' },
    { value: 'lec-2|11:30 AM - 1:30 PM', label: 'lec-2 → 11:30 AM - 1:30 PM' },
    { value: 'lec-3|2:10 PM - 4:45 PM', label: 'lec-3 → 2:10 PM - 4:45 PM' },
  ];

  const startCamera = () => cameraRef.current?.start();
  const stopCamera = () => {
    cameraRef.current?.stop();
    setAutoMode(false);
    if (autoIntervalRef.current) clearInterval(autoIntervalRef.current);
    setStatus('Camera stopped');
  };

  // Use refs to avoid stale closures in the auto-mode interval
  const autoModeRef = useRef(false);
  const subjectRef = useRef('');
  const timeRangeRef = useRef('');

  useEffect(() => {
    autoModeRef.current = autoMode;
    subjectRef.current = subject;
    timeRangeRef.current = timeRange;
  }, [autoMode, subject, timeRange]);

  const recognizeFace = async (isAutoOverride = null) => {
    if (!cameraActive) return;
    const frame = cameraRef.current?.capture();
    if (!frame) return;

    const currentAuto = isAutoOverride !== null ? isAutoOverride : autoModeRef.current;
    const currentSubject = subjectRef.current;
    const currentTimeRange = timeRangeRef.current;

    setIsRecognizing(true);
    setStatus('Recognizing...');

    try {
      // Pass subjectId if we are in autoMode to enable automatic marking in the proxy
      const res = await fetch('/api/python-proxy/recognize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          image: frame,
          subjectId: currentAuto ? currentSubject : "",
          lectureKey: currentTimeRange.split('|')[0] || ""
        }),
      });

      const data = await res.json();

      if (data.ok && data.recognized) {
        setMatchResult({
          matched: true,
          students: data.results, 
        });
        
        const names = data.results.map(s => s.fullname).join(', ');
        if (currentAuto && data.attendanceCount > 0) {
          setStatus(`✅ Marked Present: ${names}`);
        } else {
          setStatus(`Recognized: ${names}`);
        }
      } else {
        setMatchResult(null);
        setStatus(data.message || 'No match found');
      }
    } catch (err) {
      console.error('Recognition error:', err);
      setStatus('Connection error');
    } finally {
      setIsRecognizing(false);
    }
  };

  const toggleAutoMode = () => {
    if (!cameraActive) return;
    
    if (autoMode) {
      setAutoMode(false);
      autoModeRef.current = false;
      clearInterval(autoIntervalRef.current);
      setStatus('Auto mode OFF');
    } else {
      if (!subject || !timeRange) {
        setStatus('Select subject & time range first');
        return;
      }
      setAutoMode(true);
      autoModeRef.current = true;
      setStatus('Auto mode ON (Scanning...)');
      
      // Clear any existing interval
      if (autoIntervalRef.current) clearInterval(autoIntervalRef.current);
      
      autoIntervalRef.current = setInterval(() => {
        recognizeFace();
      }, 3000); 
    }
  };

  const markIndividual = async (student) => {
    if (!subject || !timeRange) {
      setStatus('⚠️ Select subject & time range first');
      return;
    }

    try {
      const res = await fetch('/api/attendance/mark', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: student._id,
          subjectId: subject,
          date: new Date().toISOString().slice(0, 10), // simplified date
          status: 'Present',
          lectureKey: timeRange.split('|')[0],
          mode: 'manual'
        }),
      });

      const data = await res.json();
      if (data.ok) {
        setStatus(`✅ Attendance marked for ${student.fullname}`);
        // Optionally remove from matchResult or mark as "Success"
      } else {
        setStatus(`❌ ${data.message}`);
      }
    } catch (err) {
      console.error('Individual mark error:', err);
      setStatus('❌ Failed to mark attendance');
    }
  };

  const markAttendance = async () => {
    if (!matchResult?.matched || !matchResult.students?.length || !subject || !timeRange) {
      setStatus('No recognized students to mark');
      return;
    }
    
    setMarkingManual(true);
    let successCount = 0;
    
    try {
      // Mark attendance for all recognized students in the list
      for (const student of matchResult.students) {
        const res = await fetch('/api/attendance/mark', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            studentId: student._id,
            subjectId: subject,
            lectureKey: timeRange.split('|')[0],
            confidence: student.confidence,
            faceBox: student.box
          })
        });
        const data = await res.json();
        if (data.ok) successCount++;
      }
      
      setStatus(`Attendance marked for ${successCount} student(s)`);
      setTimeout(() => {
        setMatchResult(null);
        setStatus(autoMode ? 'Auto mode ON (Scanning...)' : 'Waiting for next recognition');
      }, 3000);
      
    } catch (err) {
      setStatus("Error marking attendance");
    } finally {
      setMarkingManual(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="mb-6">
        <h2 className="text-3xl font-bold text-[#38bdf8] tracking-tight">Live Attendance</h2>
        <p className="text-slate-400 mt-1 text-sm">Mark attendance using facial recognition (Supports multiple faces)</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Camera Card */}
        <div className="bg-[#111827] border border-[#1e293b] rounded-3xl p-6 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">Live Camera</h3>
            <span className="text-xs text-slate-400">
              Subjects: <span className="text-[#38bdf8] font-bold">{subjects.length}</span>
            </span>
          </div>

          <CameraPreview 
            ref={cameraRef}
            onStreamStarted={() => { setCameraActive(true); setStatus('Camera active'); }}
            onStreamStopped={() => setCameraActive(false)}
            showControls={false}
            useWifi={cameraSettings.source === 'wifi'}
            wifiUrl={cameraSettings.url}
          />

          <div className="relative mt-4">
            <div className={cn("absolute left-4 -top-12 px-3 py-1 rounded-full text-xs font-semibold backdrop-blur-md z-20 border transition-colors", 
              cameraActive ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" : "bg-slate-800/80 text-slate-400 border-slate-700")}>
              Camera: {cameraActive ? 'ON' : 'OFF'}
            </div>
          </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-widest">Subject</label>
              <select 
                value={subject}
                onChange={e => setSubject(e.target.value)}
                className="w-full bg-[#0b1220] border border-[#1e293b] rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-[#38bdf8] transition-colors appearance-none cursor-pointer"
              >
                <option value="">Select subject</option>
                {subjects.map(sub => (
                  <option key={sub._id} value={sub._id}>{sub.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-widest">Time Range</label>
              <select 
                value={timeRange}
                onChange={e => setTimeRange(e.target.value)}
                className="w-full bg-[#0b1220] border border-[#1e293b] rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-[#38bdf8] transition-colors appearance-none cursor-pointer"
              >
                <option value="">Select time range</option>
                {timeRanges.map(tr => (
                  <option key={tr.value} value={tr.value}>{tr.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            {!cameraActive ? (
              <button onClick={startCamera} className="flex-1 min-w-[120px] bg-gradient-to-r from-[#38bdf8] to-[#6366f1] text-white py-3 rounded-xl text-sm font-bold flex justify-center items-center gap-2 hover:shadow-lg transition-all">
                <Camera size={16} /> Start Camera
              </button>
            ) : (
              <button onClick={stopCamera} className="flex-1 min-w-[120px] bg-white/5 text-slate-300 border border-white/10 py-3 rounded-xl text-sm font-bold flex justify-center items-center gap-2 hover:bg-white/10 transition-all">
                <StopCircle size={16} /> Stop
              </button>
            )}

            <button 
              onClick={recognizeFace}
              disabled={!cameraActive || autoMode || isRecognizing}
              className="flex-1 min-w-[120px] bg-[#0c1425] text-slate-300 border border-[#1e293b] py-3 rounded-xl text-sm font-bold hover:border-[#38bdf8]/50 disabled:opacity-50 transition-all"
            >
              {isRecognizing ? 'Scanning...' : 'Recognize'}
            </button>

            <button 
              onClick={toggleAutoMode}
              disabled={!cameraActive}
              className={cn("flex-1 min-w-[120px] py-3 rounded-xl text-sm font-bold border transition-all flex justify-center items-center gap-2 disabled:opacity-50",
                autoMode ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/50" : "bg-[#0c1425] text-slate-300 border-[#1e293b] hover:border-[#38bdf8]/50")}
            >
              <Settings size={16} className={cn(autoMode && "animate-spin")} />
              Auto: {autoMode ? 'ON' : 'OFF'}
            </button>
            
            <button 
              onClick={markAttendance}
              disabled={!matchResult?.matched || autoMode || markingManual}
              className="w-full bg-[#38bdf8]/10 text-[#38bdf8] border border-[#38bdf8]/30 py-3 rounded-xl text-sm font-bold flex justify-center items-center gap-2 hover:bg-[#38bdf8]/20 disabled:opacity-50 transition-all"
            >
              {markingManual ? <Loader2 size={16} className="animate-spin" /> : <UserCheck size={16} />}
              {markingManual ? 'Marking All...' : 'Mark All Recognized'}
            </button>
          </div>
        </div>

        {/* Result Card */}
        <div className="bg-[#111827] border border-[#1e293b] rounded-3xl p-6 flex flex-col h-[600px]">
          <h3 className="text-lg font-semibold text-white mb-4">Recognized Students</h3>
          
          <div className="flex-1 bg-[#0b1220] border border-[#1e293b] rounded-2xl p-4 flex flex-col overflow-y-auto custom-scrollbar">
            {!matchResult?.matched ? (
              <div className="flex-1 flex flex-col items-center justify-center opacity-30">
                <Activity size={48} className="text-slate-500 mb-4" />
                <p className="text-slate-400 text-sm">{status}</p>
              </div>
            ) : (
              <div className="space-y-4">
                {matchResult.students.map((std, idx) => (
                  <div key={idx} className="bg-[#111827] border border-[#1e293b] rounded-2xl p-4 flex items-center justify-between gap-4 animate-in slide-in-from-right-4 duration-300" style={{ animationDelay: `${idx * 100}ms` }}>
                    <div className="flex items-center gap-4">
                      {/* Face Image from Camera (Left) */}
                      <div className="relative">
                        <div className="w-16 h-16 rounded-xl overflow-hidden border-2 border-[#38bdf8]/30 bg-[#0b1220] flex-shrink-0">
                          <img 
                            src={std.faceImage || std.profilePic} 
                            alt={std.fullname} 
                            className="w-full h-full object-cover" 
                          />
                        </div>
                        {/* Smaller Profile Pic badge (Right Bottom) */}
                        <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full border border-[#1e293b] overflow-hidden bg-[#111827]">
                           <img src={std.profilePic} className="w-full h-full object-cover" />
                        </div>
                      </div>

                      <div className="flex-1 min-w-0">
                        <h4 className="text-white font-bold text-sm truncate">{std.fullname}</h4>
                        <p className="text-[10px] text-slate-500 font-mono uppercase truncate">{std.enrollno}</p>
                        <div className="mt-1 flex items-center gap-2">
                          <span className={cn("text-[9px] font-black uppercase px-2 py-0.5 rounded-md border", 
                            std.confidence >= 0.8 ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-amber-500/10 text-amber-400 border-amber-500/20")}>
                            {Math.round(std.confidence * 100)}% Match
                          </span>
                        </div>
                      </div>
                    </div>

                    <button 
                      onClick={() => markIndividual(std)}
                      disabled={autoMode}
                      className="bg-emerald-500/10 hover:bg-emerald-500 text-emerald-400 hover:text-white border border-emerald-500/30 p-2.5 rounded-xl transition-all group disabled:opacity-30"
                      title="Mark Present"
                    >
                      <UserCheck size={18} className="group-hover:scale-110 transition-transform" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-6 pt-6 border-t border-[#1e293b] flex items-center gap-3">
               <div className="flex -space-x-2 overflow-hidden">
                  {matchResult?.students?.slice(0, 5).map((s, i) => (
                    <div key={i} className="inline-block h-6 w-6 rounded-full ring-2 ring-[#0b1220] bg-slate-800 overflow-hidden">
                      {s.profilePic && <img src={s.profilePic} className="h-full w-full object-cover" />}
                    </div>
                  ))}
               </div>
               <p className="text-[10px] text-slate-500 italic">
                 {matchResult?.students?.length > 0 ? `Detected ${matchResult.students.length} face(s) in frame` : status}
               </p>
            </div>
          </div>

          <div className="mt-4 p-4 bg-[#38bdf8]/5 border border-[#38bdf8]/20 rounded-2xl">
             <div className="flex items-center gap-2 mb-2">
                <Activity size={14} className="text-[#38bdf8]" />
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">System Status</p>
             </div>
             <p className="text-xs text-white font-medium">{status}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
