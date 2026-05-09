'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Camera, X, Check, Loader2, UserPlus } from '@/components/Icons';
import { cn } from '@/lib/utils';
import CameraPreview from '@/components/CameraPreview';

export default function EnrollPage() {
  const router = useRouter();
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({ name: '', enrollno: '', dept: '' });
  
  // Camera State
  const [cameraActive, setCameraActive] = useState(false);
  const [capturedImage, setCapturedImage] = useState(null);
  const [enrolling, setEnrolling] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [cameraSettings, setCameraSettings] = useState({ source: 'webcam', url: '' });
  
  const cameraRef = useRef(null);
  
  useEffect(() => {
    fetchStudents();
    const source = localStorage.getItem('faceguard_camera_source') || 'webcam';
    const url = localStorage.getItem('faceguard_wifi_url') || '';
    setCameraSettings({ source, url });
  }, []);
  const fetchStudents = async () => {
    try {
      const res = await fetch('/api/students');
      const data = await res.json();
      setStudents(data.students || []);
    } catch (err) {
      console.error("Failed to fetch students:", err);
    } finally {
      setLoading(false);
    }
  };





  const handleEnroll = async () => {
    if (!formData.name || !formData.enrollno) {
      setErrorMsg("Name and Enroll No are required.");
      return;
    }
    if (!capturedImage) {
      setErrorMsg("Please capture a face image first.");
      return;
    }

    setEnrolling(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const res = await fetch('/api/python-proxy/enroll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullname: formData.name,
          enrollno: formData.enrollno,
          dept: formData.dept,
          image: capturedImage,
          isTraining: true, // Always compute embedding for KNN
          isSample: false, // Enroll page is now only for new students
        }),
      });

      const data = await res.json();

      if (data.ok) {
        setSuccessMsg(data.message || "Enrolled Successfully!");
        await fetchStudents();
        setFormData({ name: '', enrollno: '', dept: '' });
        setCapturedImage(null);
        // Keep the form filled if it's a sample session to allow multiple quick snaps
      } else {
        setErrorMsg(data.message || "Enrollment failed");
      }
    } catch (err) {
      setErrorMsg(err.message || "Network error during enrollment");
    } finally {
      setEnrolling(false);
    }
  };



  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-[#38bdf8] mb-2">Enroll Student</h2>
        <p className="text-slate-400 text-xs">Add a new user to the facial recognition system</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Panel 1: Enrollment Form & Camera */}
        <div className="bg-[#111827] border border-[#1e293b] rounded-[2.5rem] p-8 w-full lg:w-[60%] flex flex-col shadow-xl">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-2xl bg-[#38bdf8]/10 flex items-center justify-center text-[#38bdf8]">
              <UserPlus size={20} />
            </div>
            <h4 className="text-xl font-bold text-white">
              Student Information
            </h4>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div className="md:col-span-2">
              <label className="block text-[10px] font-bold text-slate-500 mb-2 uppercase tracking-widest">Full Name</label>
              <input 
                type="text" 
                value={formData.name}
                onChange={e => setFormData({...formData, name: e.target.value})}
                placeholder="Enter full name"
                className="w-full bg-[#0b1220] border border-[#1e293b] rounded-2xl px-5 py-4 text-sm text-white outline-none focus:border-[#38bdf8] transition-all placeholder:text-slate-700"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 mb-2 uppercase tracking-widest">Enrollment ID</label>
              <input 
                type="text" 
                value={formData.enrollno}
                onChange={e => setFormData({...formData, enrollno: e.target.value})}
                placeholder="e.g. 23ENG3CAI1045"
                className="w-full bg-[#0b1220] border border-[#1e293b] rounded-2xl px-5 py-4 text-sm text-white outline-none focus:border-[#38bdf8] transition-all placeholder:text-slate-700"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 mb-2 uppercase tracking-widest">Department / Class</label>
              <input 
                type="text" 
                value={formData.dept}
                onChange={e => setFormData({...formData, dept: e.target.value})}
                placeholder="e.g. B.Tech CSE"
                className="w-full bg-[#0b1220] border border-[#1e293b] rounded-2xl px-5 py-4 text-sm text-white outline-none focus:border-[#38bdf8] transition-all placeholder:text-slate-700"
              />
            </div>
          </div>

          <div className="flex items-center gap-3 mb-4">
            <div className="w-1.5 h-1.5 rounded-full bg-[#38bdf8]" />
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Face Capture</span>
          </div>

          {/* Camera Preview Section */}
          <div className="flex flex-col items-center">
            <div className="w-full max-w-md relative">
              <CameraPreview 
                ref={cameraRef}
                aspectRatio="video"
                onStreamStarted={() => setCameraActive(true)}
                onStreamStopped={() => setCameraActive(false)}
                showDeviceSelector={false}
                useWifi={cameraSettings.source === 'wifi'}
                wifiUrl={cameraSettings.url}
              />

              {/* Overlay for captured image */}
              {capturedImage && (
                <div className="absolute inset-0 z-50 bg-[#0b1220]/95 backdrop-blur-sm rounded-3xl flex flex-col items-center justify-center p-6 animate-in fade-in zoom-in-95 duration-300">
                  <div className="relative w-32 h-32 md:w-40 md:h-40 rounded-[2rem] overflow-hidden border-4 border-[#38bdf8] shadow-2xl shadow-[#38bdf8]/20 mb-6">
                    <img src={capturedImage} className="w-full h-full object-cover" alt="Captured" />
                  </div>
                  <div className="flex gap-3 w-full max-w-[280px]">
                    <button 
                      onClick={handleEnroll} 
                      disabled={enrolling}
                      className="flex-1 bg-emerald-500 text-white py-3 md:py-4 rounded-2xl text-sm font-bold flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 hover:opacity-90 transition-all"
                    >
                      {enrolling ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} />} Enroll
                    </button>
                    <button 
                      onClick={() => {
                        setCapturedImage(null);
                        cameraRef.current?.start();
                      }} 
                      disabled={enrolling}
                      className="flex-1 bg-slate-800 text-slate-400 py-3 md:py-4 rounded-2xl text-sm font-bold flex items-center justify-center gap-2 hover:bg-slate-700 transition-all"
                    >
                      Retake
                    </button>
                  </div>
                </div>
              )}

              {/* Action buttons below (only when NOT showing captured image) */}
              {!capturedImage && (
                <div className="mt-6">
                  {!cameraActive ? (
                    <button 
                      onClick={() => cameraRef.current?.start()}
                      className="w-full bg-[#38bdf8] text-white py-4 rounded-2xl text-sm font-bold hover:opacity-90 transition-all flex items-center justify-center gap-2 shadow-lg shadow-[#38bdf8]/20"
                    >
                      <Camera size={18} /> Open Camera
                    </button>
                  ) : (
                    <div className="flex gap-3 animate-in slide-in-from-bottom-2 duration-300">
                      <button 
                        onClick={() => {
                          const img = cameraRef.current?.capture();
                          if (img) {
                            setCapturedImage(img);
                            cameraRef.current?.stop();
                          }
                        }}
                        className="flex-[2] bg-gradient-to-r from-[#38bdf8] to-[#6366f1] text-white py-4 rounded-2xl text-sm font-bold flex items-center justify-center gap-3 shadow-lg shadow-blue-500/20"
                      >
                        <Camera size={18} /> Click (Capture Photo)
                      </button>
                      <button 
                        onClick={() => cameraRef.current?.stop()}
                        className="flex-1 bg-red-500/10 text-red-400 border border-red-500/20 py-4 rounded-2xl text-sm font-bold hover:bg-red-500/20 transition-all"
                      >
                        Close Cam
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

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
                <p className="text-[#38bdf8] text-sm font-semibold">Enrolled Successfully</p>
                <p className="text-slate-400 text-[11px] mt-0.5">{successMsg}</p>
              </div>
            </div>
          )}
        </div>

        {/* Panel 2: Enrolled Students List */}
        <div className="bg-[#111827] border border-[#1e293b] rounded-2xl p-5 w-full lg:w-[40%] flex flex-col h-[600px]">
          <div className="mb-6">
            <h4 className="text-base font-semibold text-white">Enrolled Students ({students.length})</h4>
          </div>

          {loading ? (
            <div className="flex-1 flex items-center justify-center">
              <Loader2 className="animate-spin text-slate-500" size={24} />
            </div>
          ) : students.length === 0 ? (
            <div className="flex-1">
              <p className="text-slate-300 text-sm mb-1">No users enrolled yet</p>
              <p className="text-slate-500 text-[11px]">Capture a face to enroll the first user</p>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
              {students.map(student => (
                <div key={student._id} className="bg-[#0b1220] border border-[#1e293b] rounded-xl p-3 flex gap-3 items-center group hover:border-[#38bdf8]/30 transition-colors">
                  <div className="w-10 h-10 rounded-full overflow-hidden border border-[#1e293b] bg-slate-800 flex-shrink-0">
                    {student.profilePic ? (
                      <img 
                        src={`${student.profilePic}${student.profilePic.includes('?') ? '&' : '?'}t=${student.updatedAt ? new Date(student.updatedAt).getTime() : Date.now()}`} 
                        alt={student.fullname} 
                        className="w-full h-full object-cover" 
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-500 text-xs uppercase font-bold">
                        {student.fullname.charAt(0)}
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h5 className="text-white font-bold text-sm mb-0.5 truncate">{student.fullname}</h5>
                    <p className="text-slate-500 text-[10px]">ID: {student.enrollno}</p>
                    <button 
                      onClick={() => router.push('/dashboard/students')}
                      className="mt-1 text-[9px] text-[#38bdf8] hover:underline font-bold uppercase tracking-tighter"
                    >
                      + Add Samples
                    </button>
                  </div>
                  <div className="text-right flex flex-col items-end">
                    <span className="text-[10px] text-slate-500 mb-0.5">Samples</span>
                    <span className="bg-[#38bdf8]/10 text-[#38bdf8] w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-bold">
                      {student.sampleCount || 0}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
