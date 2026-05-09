'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  Users, Search, Edit, Loader2, X, Check, Camera, 
  StopCircle, ArrowLeft, UserPlus, RefreshCw,
  MoreVertical, Edit2, Trash2, Shield, User, Mail, BookOpen, Zap
} from '@/components/Icons';
import { cn } from '@/lib/utils';
import CameraModal from '@/components/CameraModal';
import CameraPreview from '@/components/CameraPreview';


export default function StudentsManagementPage() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('')
  
  // Modal states
  const [editingStudent, setEditingStudent] = useState(null);
  const [managingSamples, setManagingSamples] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [showCameraModal, setShowCameraModal] = useState(false);
  const [capturedImage, setCapturedImage] = useState(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraSettings, setCameraSettings] = useState({ source: 'webcam', url: '' });
  const cameraRef = useRef(null);

  useEffect(() => {
    fetchStudents();
    // Load saved camera settings (same as Enroll page)
    const source = localStorage.getItem('faceguard_camera_source') || 'webcam';
    const url = localStorage.getItem('faceguard_wifi_url') || '';
    setCameraSettings({ source, url });
  }, []);



  const [training, setTraining] = useState(false);

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

  const trainDataset = async () => {
    setTraining(true);
    try {
      const res = await fetch('/api/python-proxy/train', { method: 'POST' });
      const data = await res.json();
      if (data.ok) {
        alert("Model training completed successfully! AI is now up to date.");
      } else {
        alert("Training failed: " + data.message);
      }
    } catch (err) {
      console.error("Train error:", err);
      alert("Network error during training.");
    } finally {
      setTraining(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Are you sure you want to delete this student? All their face samples will be removed.")) return;
    
    setActionLoading(true);
    try {
      const res = await fetch(`/api/students/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setStudents(students.filter(s => s._id !== id));
      }
    } catch (err) {
      console.error("Delete error:", err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      let currentProfilePic = editingStudent.profilePic;

      // 1. If new image captured, update profile pic first
      if (capturedImage) {
        const enrollRes = await fetch('/api/python-proxy/enroll', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fullname: editingStudent.fullname,
            enrollno: editingStudent.enrollno,
            dept: editingStudent.dept,
            image: capturedImage,
            isSample: false // Force profile pic update
          }),
        });
        const enrollData = await enrollRes.json();
        if (enrollData.ok) {
          currentProfilePic = enrollData.profilePic || enrollData.imagePath;
        }
      }

      // 2. Update text details
      const res = await fetch(`/api/students/${editingStudent._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullname: editingStudent.fullname,
          enrollno: editingStudent.enrollno,
          dept: editingStudent.dept,
          profilePic: currentProfilePic
        }),
      });
      
      if (res.ok) {
        setEditingStudent(null);
        setCapturedImage(null);
        fetchStudents(); // Refresh in background
      } else {
        const errorData = await res.json();
        alert(`Update failed: ${errorData.message || "Unknown error"}`);
      }
    } catch (err) {
      console.error("Update error:", err);
      alert(`Network error: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };



  const [isAutoCollecting, setIsAutoCollecting] = useState(false);
  const isAutoCollectingRef = useRef(false);
  const [collectedCount, setCollectedCount] = useState(0);
  const TARGET_SAMPLES = 150;

  const startAutoCollection = async () => {
    if (!cameraActive) {
      alert("Please open camera first");
      return;
    }
    
    setIsAutoCollecting(true);
    isAutoCollectingRef.current = true;
    setCollectedCount(0);
    
    let currentCount = 0;
    const CONCURRENCY = 2;
    const tasks = [];

    // Recursive function to process tasks
    const worker = async () => {
      while (currentCount < TARGET_SAMPLES && isAutoCollectingRef.current) {
        const img = cameraRef.current?.capture();
        if (!img) {
          await new Promise(r => setTimeout(r, 200));
          continue;
        }

        try {
          const res = await fetch('/api/python-proxy/enroll', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              fullname: managingSamples.fullname,
              enrollno: managingSamples.enrollno,
              dept: managingSamples.dept,
              image: img,
              isSample: true,
              isTraining: true
            }),
          });
          
          const data = await res.json();
          if (data.ok) {
            currentCount++;
            setCollectedCount(currentCount);
          }
        } catch (err) {
          console.error("Auto collect error:", err);
        }
      }
    };

    // Start parallel workers
    const workers = Array(CONCURRENCY).fill(null).map(() => worker());
    await Promise.all(workers);
    
    setIsAutoCollecting(false);
    isAutoCollectingRef.current = false;

    // Removed cleanup of sample images as per user request to keep them
    // fetchStudents();

    fetchStudents();
  };

  const stopAutoCollection = () => {
    setIsAutoCollecting(false);
    isAutoCollectingRef.current = false;
  };

  const [selectedSamples, setSelectedSamples] = useState([]);

  const syncStudentEmbeddings = async (id, name) => {
    if (!confirm(`Reprocess all samples for ${name} into embeddings?`)) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/students/${id}/sync-embeddings`, { method: 'POST' });
      const data = await res.json();
      if (data.ok) {
        alert(data.message);
        fetchStudents();
      } else {
        alert("Sync failed: " + data.message);
      }
    } catch (err) {
      console.error("Sync error:", err);
    } finally {
      setLoading(false);
    }
  };

  const bulkDeleteSamples = async (deleteAll = false) => {
    if (deleteAll && !confirm("DELETE ALL samples for this student? This cannot be undone.")) return;
    if (!deleteAll && selectedSamples.length === 0) return;
    if (!deleteAll && !confirm(`Delete ${selectedSamples.length} selected samples?`)) return;

    setActionLoading(true);
    try {
      const res = await fetch(`/api/students/${managingSamples._id}/samples/bulk-delete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sampleIds: selectedSamples, deleteAll })
      });
      
      if (res.ok) {
        setSelectedSamples([]);
        fetchStudents();
        // Update local modal state
        const updated = await (await fetch('/api/students')).json();
        const found = updated.students.find(s => s._id === managingSamples._id);
        if (found) setManagingSamples(found);
      }
    } catch (err) {
      console.error("Bulk delete error:", err);
    } finally {
      setActionLoading(false);
    }
  };

  const toggleSampleSelection = (id) => {
    setSelectedSamples(prev => 
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    );
  };

  const submitSample = async () => {
    if (!capturedImage || !managingSamples) return;
    setActionLoading(true);
    try {
      const res = await fetch('/api/python-proxy/enroll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullname: managingSamples.fullname,
          enrollno: managingSamples.enrollno,
          dept: managingSamples.dept,
          image: capturedImage,
          isSample: true,
          isTraining: true
        }),
      });
      
      const data = await res.json();
      if (data.ok) {
        // Show the cropped image immediately in the UI
        if (data.face_image) {
          setCapturedImage(data.face_image);
        } else {
          setCapturedImage(null);
        }
        
        // Refresh student list to see new sample count
        await fetchStudents();
        
        // Also update local managingSamples if modal is still open
        const updated = await (await fetch('/api/students')).json();
        const found = updated.students.find(s => s._id === managingSamples._id);
        if (found) setManagingSamples(found);
      } else {
        alert(data.message || "Failed to add sample");
      }
    } catch (err) {
      console.error("Sample addition error:", err);
    } finally {
      setActionLoading(false);
    }
  };

  const filteredStudents = students.filter(s => 
    s.fullname.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.enrollno.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (s.dept || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  const rebuildDataset = async () => {
    if (!confirm("This will re-process ALL samples from disk and rebuild students_embedding.csv. Continue?")) return;
    setLoading(true);
    try {
      const res = await fetch('/api/dataset/rebuild', { method: 'POST' });
      const data = await res.json();
      if (data.ok) {
        alert(data.message);
      } else {
        alert("Rebuild failed: " + data.message);
      }
    } catch (err) {
      console.error("Rebuild error:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h2 className="text-3xl font-bold text-[#38bdf8] tracking-tight">Student Management</h2>
          <p className="text-slate-400 mt-1 text-sm">Update details, manage face samples, or remove records</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={trainDataset}
            disabled={training}
            className="px-4 py-2 bg-gradient-to-r from-indigo-500/20 to-purple-500/20 border border-indigo-500/30 text-indigo-300 rounded-xl text-xs font-bold flex items-center gap-2 hover:from-indigo-500/30 hover:to-purple-500/30 transition-all disabled:opacity-50"
          >
            <Zap size={14} className={training ? "animate-pulse" : ""} />
            {training ? 'Training...' : 'Train AI Model'}
          </button>
          <button 
            onClick={rebuildDataset}
            className="px-4 py-2 bg-[#0b1220] border border-[#1e293b] text-slate-300 rounded-xl text-xs font-bold flex items-center gap-2 hover:bg-[#1e293b] transition-all"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            Rebuild Global Dataset
          </button>
        </div>
        <div className="text-right">
          <p className="text-xs text-slate-500 uppercase font-bold tracking-widest mb-1">Total Enrolled</p>
          <p className="text-2xl font-bold text-white">{students.length}</p>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
        <input 
          type="text" 
          placeholder="Search by name, enrollment number or department..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="w-full bg-[#111827] border border-[#1e293b] rounded-2xl pl-12 pr-4 py-4 text-white outline-none focus:border-[#38bdf8] transition-all"
        />
      </div>

      {/* Students Grid/Table */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          <div className="col-span-full flex justify-center py-20">
            <Loader2 className="animate-spin text-[#38bdf8]" size={40} />
          </div>
        ) : filteredStudents.length === 0 ? (
          <div className="col-span-full text-center py-20 bg-[#111827] rounded-3xl border border-[#1e293b] border-dashed">
            <Users className="mx-auto text-slate-700 mb-4" size={48} />
            <p className="text-slate-400">No students found matching your search</p>
          </div>
        ) : (
          filteredStudents.map(student => (
            <div key={student._id} className="bg-[#111827] border border-[#1e293b] rounded-3xl p-5 hover:border-[#38bdf8]/30 transition-all group">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-14 h-14 rounded-2xl overflow-hidden border border-[#1e293b] bg-slate-800 flex-shrink-0">
                  {student.profilePic ? (
                    <img 
                      src={`${student.profilePic}${student.profilePic.includes('?') ? '&' : '?'}t=${student.updatedAt ? new Date(student.updatedAt).getTime() : Date.now()}`} 
                      alt="" 
                      className="w-full h-full object-cover" 
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-500 text-lg font-bold">
                      {student.fullname.charAt(0)}
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-white font-bold truncate group-hover:text-[#38bdf8] transition-colors">{student.fullname}</h4>
                  <p className="text-slate-500 text-xs truncate">ID: {student.enrollno}</p>
                </div>
              </div>

              <div className="space-y-2 mb-6">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500">Department</span>
                  <span className="text-slate-300 truncate max-w-[120px]">{student.dept || '—'}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500">Samples</span>
                  <span className="text-[#38bdf8] font-bold bg-[#38bdf8]/10 px-2 py-0.5 rounded-full">
                    {student.sampleCount || 0}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <button 
                  onClick={() => setEditingStudent({...student})}
                  className="flex flex-col items-center justify-center gap-1 bg-[#0b1220] border border-[#1e293b] text-slate-300 py-2 rounded-xl text-[10px] font-bold hover:border-[#38bdf8]/50 hover:text-white transition-all"
                >
                  <Edit size={14} /> Edit
                </button>
                <button 
                  onClick={() => setManagingSamples(student)}
                  className="flex flex-col items-center justify-center gap-1 bg-[#0b1220] border border-[#1e293b] text-slate-300 py-2 rounded-xl text-[10px] font-bold hover:border-[#38bdf8]/50 hover:text-white transition-all"
                >
                  <Camera size={14} /> Samples
                </button>
                <button 
                  onClick={async () => {
                    if (!confirm(`Delete ALL samples for ${student.fullname} and re-collect?`)) return;
                    try {
                      await fetch(`/api/students/${student._id}/samples/bulk-delete`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ deleteAll: true })
                      });
                      await fetchStudents();
                      setManagingSamples(student);
                    } catch (err) {
                      console.error("Retake error:", err);
                    }
                  }}
                  className="flex flex-col items-center justify-center gap-1 bg-amber-500/5 border border-amber-500/20 text-amber-400 py-2 rounded-xl text-[10px] font-bold hover:border-amber-500/50 hover:text-amber-300 transition-all"
                >
                  <RefreshCw size={14} /> Retake
                </button>
                <button 
                  onClick={() => handleDelete(student._id)}
                  className="col-span-3 mt-1 flex items-center justify-center gap-2 bg-red-500/5 border border-red-500/20 text-red-400 py-2 rounded-xl text-[10px] font-bold hover:bg-red-500/10 hover:border-red-500 transition-all"
                >
                  Delete Student
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Edit Modal */}
      {editingStudent && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-[#111827] border border-[#1e293b] rounded-3xl w-full max-w-md p-6 animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-white">Edit Student</h3>
              <button onClick={() => setEditingStudent(null)} className="text-slate-500 hover:text-white"><X size={20} /></button>
            </div>
            
            <form onSubmit={handleUpdate} className="space-y-4">
              <div className="flex flex-col items-center mb-6">
                <div className="relative w-32 h-32 rounded-3xl overflow-hidden border-2 border-[#38bdf8]/50 bg-slate-800 mb-3 shadow-xl group">
                  {capturedImage ? (
                    <img src={capturedImage} className="w-full h-full object-cover transition-transform group-hover:scale-110" />
                  ) : (
                    <img 
                      src={`${editingStudent.profilePic}${editingStudent.profilePic?.includes('?') ? '&' : '?'}t=${Date.now()}`} 
                      alt="" 
                      className="w-full h-full object-cover transition-transform group-hover:scale-110" 
                    />
                  )}
                  <div 
                    onClick={() => setShowCameraModal(true)}
                    className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                  >
                    <Camera size={24} className="text-white" />
                  </div>
                </div>
                
                <button 
                  type="button"
                  onClick={() => setShowCameraModal(true)}
                  className="text-[11px] font-bold text-[#38bdf8] uppercase tracking-widest hover:text-[#38bdf8]/80 transition-colors flex items-center gap-2"
                >
                  <Edit size={12} /> {capturedImage ? 'Change Captured Photo' : 'Update Profile Photo'}
                </button>
              </div>

              <div>
                <label className="block text-slate-400 text-xs font-bold mb-1.5 uppercase tracking-widest">Full Name</label>
                <input 
                  type="text" 
                  value={editingStudent.fullname}
                  onChange={e => setEditingStudent({...editingStudent, fullname: e.target.value})}
                  className="w-full bg-[#0b1220] border border-[#1e293b] rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-[#38bdf8]"
                />
              </div>
              <div>
                <label className="block text-slate-400 text-xs font-bold mb-1.5 uppercase tracking-widest">Enrollment No</label>
                <input 
                  type="text" 
                  value={editingStudent.enrollno}
                  onChange={e => setEditingStudent({...editingStudent, enrollno: e.target.value})}
                  className="w-full bg-[#0b1220] border border-[#1e293b] rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-[#38bdf8]"
                />
              </div>
              <div>
                <label className="block text-slate-400 text-xs font-bold mb-1.5 uppercase tracking-widest">Department</label>
                <input 
                  type="text" 
                  value={editingStudent.dept}
                  onChange={e => setEditingStudent({...editingStudent, dept: e.target.value})}
                  className="w-full bg-[#0b1220] border border-[#1e293b] rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-[#38bdf8]"
                />
              </div>
              
              <div className="flex gap-3 pt-4">
                <button 
                  type="button" 
                  onClick={() => { setEditingStudent(null); setCapturedImage(null); }}
                  className="flex-1 bg-transparent border border-[#1e293b] text-slate-400 py-3 rounded-xl text-sm font-bold"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={actionLoading}
                  className="flex-1 bg-gradient-to-r from-[#38bdf8] to-[#6366f1] text-white py-3 rounded-xl text-sm font-bold flex justify-center items-center gap-2 shadow-lg shadow-blue-500/20 active:scale-[0.98] transition-all"
                >
                  {actionLoading ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />} Save & Update
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Samples Modal */}
      {managingSamples && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-[#111827] border border-[#1e293b] rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-[#1e293b] flex justify-between items-center">
              <div>
                <h3 className="text-xl font-bold text-white">Face Samples</h3>
                <p className="text-xs text-slate-500 mt-0.5">{managingSamples.fullname} ({managingSamples.enrollno})</p>
              </div>
              <button onClick={() => { setManagingSamples(null); setCapturedImage(null); }} className="text-slate-500 hover:text-white"><X size={20} /></button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6">
              {/* Camera Section for New Sample */}
              <div className="mb-8">
                <h4 className="text-sm font-bold text-[#38bdf8] uppercase tracking-widest mb-4 flex items-center gap-2">
                  <UserPlus size={16} /> Add New Sample
                </h4>
                
                <div className="bg-[#0b1220] border border-[#1e293b] rounded-2xl p-8 flex flex-col items-center">
                  <div className="w-full max-w-sm relative">
                    <CameraPreview 
                      ref={cameraRef}
                      aspectRatio="video"
                      onStreamStarted={() => setCameraActive(true)}
                      onStreamStopped={() => setCameraActive(false)}
                      showDeviceSelector={false}
                      useWifi={cameraSettings.source === 'wifi'}
                      wifiUrl={cameraSettings.url}
                    />
                  
                    {/* Overlay for captured sample */}
                    {capturedImage && (
                      <div className="absolute inset-0 z-50 bg-[#0b1220]/95 backdrop-blur-sm rounded-3xl flex flex-col items-center justify-center p-6 animate-in fade-in zoom-in-95 duration-300">
                        <div className="relative w-32 h-32 rounded-[2rem] overflow-hidden border-4 border-[#38bdf8] shadow-2xl shadow-[#38bdf8]/20 mb-6">
                          <img src={capturedImage} className="w-full h-full object-cover" alt="Captured Sample" />
                        </div>
                        <div className="flex gap-3 w-full max-w-[280px]">
                          <button 
                            onClick={submitSample}
                            disabled={actionLoading}
                            className="flex-1 bg-emerald-500 text-white py-3 rounded-2xl text-sm font-bold flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 hover:opacity-90 transition-all"
                          >
                            {actionLoading ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} />} Save
                          </button>
                          <button 
                            onClick={() => {
                              setCapturedImage(null);
                              cameraRef.current?.start();
                            }}
                            disabled={actionLoading}
                            className="flex-1 bg-slate-800 text-slate-400 py-3 rounded-2xl text-sm font-bold flex items-center justify-center gap-2 hover:bg-slate-700 transition-colors"
                          >
                            Retake
                          </button>
                        </div>
                      </div>
                    )}

                    <div className="w-full mt-6">
                      {!capturedImage && (
                        <>
                          {!cameraActive ? (
                            <button 
                              onClick={() => cameraRef.current?.start()}
                              className="w-full bg-[#38bdf8] text-white py-4 rounded-2xl text-sm font-bold hover:opacity-90 transition-all flex items-center justify-center gap-3 shadow-lg shadow-[#38bdf8]/20"
                            >
                              <Camera size={18} /> Open Camera
                            </button>
                          ) : (
                            <div className="flex gap-3 w-full animate-in slide-in-from-bottom-2 duration-300">
                              <button 
                                onClick={() => {
                                  const img = cameraRef.current?.capture();
                                  if (img) {
                                    setCapturedImage(img);
                                    cameraRef.current?.stop();
                                  }
                                }}
                                className="flex-[2] bg-gradient-to-r from-[#38bdf8] to-[#6366f1] text-white py-4 rounded-2xl text-sm font-bold flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20"
                              >
                                <Camera size={18} /> Click (Capture Sample)
                              </button>
                              <button 
                                onClick={() => cameraRef.current?.stop()}
                                className="flex-1 bg-red-500/10 text-red-400 border border-red-500/20 py-4 rounded-2xl text-sm font-bold hover:bg-red-500/20 transition-all"
                              >
                                Close Cam
                              </button>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Auto Collect Section */}
                <div className="mt-8 w-full max-w-sm">
                  {isAutoCollecting ? (
                    <div className="bg-[#0b1220] border border-[#38bdf8]/30 rounded-3xl p-6 animate-in zoom-in-95 duration-300">
                      <div className="flex justify-between items-center mb-4">
                        <span className="text-[#38bdf8] text-sm font-bold animate-pulse">Collecting Samples...</span>
                        <span className="text-white text-lg font-black">{collectedCount}/{TARGET_SAMPLES}</span>
                      </div>
                      <div className="w-full h-3 bg-slate-800 rounded-full overflow-hidden mb-6">
                        <div 
                          className="h-full bg-gradient-to-r from-[#38bdf8] to-[#6366f1] transition-all duration-300"
                          style={{ width: `${(collectedCount / TARGET_SAMPLES) * 100}%` }}
                        />
                      </div>
                      <button 
                        onClick={() => setIsAutoCollecting(false)}
                        className="w-full bg-red-500/20 text-red-400 py-3 rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-red-500/30 transition-all"
                      >
                        Stop Collection
                      </button>
                    </div>
                  ) : (
                    <div className="p-1 bg-gradient-to-r from-[#38bdf8] to-[#6366f1] rounded-2xl">
                      <button 
                        onClick={startAutoCollection}
                        disabled={!cameraActive || capturedImage}
                        className="w-full bg-[#0b1220] text-white py-4 rounded-[calc(1rem-1px)] text-sm font-bold flex items-center justify-center gap-3 hover:bg-transparent transition-all disabled:opacity-50"
                      >
                        <RefreshCw size={20} className={isAutoCollecting ? "animate-spin" : ""} />
                        Start Auto Collect (150 Samples)
                      </button>
                    </div>
                  )}
                  <p className="text-center text-slate-500 text-[10px] mt-4 uppercase tracking-[0.2em]">
                    Slowly move your head from left to right for better accuracy
                  </p>
                </div>
              </div>

              {/* Samples are now stored exclusively in the global dataset CSV. */}
            </div>
            
            <div className="p-4 border-t border-[#1e293b] bg-[#0b1220]/50">
              <button 
                onClick={() => { setManagingSamples(null); setCapturedImage(null); }}
                className="w-full bg-[#1e293b] text-white py-3 rounded-xl text-sm font-bold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
      <CameraModal 
        isOpen={showCameraModal}
        onClose={() => setShowCameraModal(false)}
        onCapture={(img) => setCapturedImage(img)}
        title="Capture Student Photo"
      />
    </div>
  );
}
