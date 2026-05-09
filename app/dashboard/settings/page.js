'use client';

import React, { useState } from 'react';

export default function SettingsPage() {
  const [cameraSource, setCameraSource] = useState('webcam');
  const [wifiUrl, setWifiUrl] = useState('');
  const [savedSetting, setSavedSetting] = useState('Not set');
  const [resettingAction, setResettingAction] = useState(null);

  // Load settings on mount
  React.useEffect(() => {
    const savedSource = localStorage.getItem('faceguard_camera_source');
    const savedUrl = localStorage.getItem('faceguard_wifi_url');
    
    if (savedSource) setCameraSource(savedSource);
    if (savedUrl) setWifiUrl(savedUrl);
    
    if (savedSource === 'wifi') {
      setSavedSetting(`WiFi: ${savedUrl || 'Not set'}`);
    } else if (savedSource === 'webcam') {
      setSavedSetting('WebRTC (Camo/Local USB)');
    }
  }, []);

  const handleSave = () => {
    let finalUrl = wifiUrl.trim();
    
    // Auto-fix DroidCam URL: if it's just IP:Port, append /video
    if (finalUrl && !finalUrl.includes('/') && finalUrl.includes(':')) {
      finalUrl = `${finalUrl}/video`;
    } else if (finalUrl && finalUrl.startsWith('http') && !finalUrl.split('/').slice(3).join('/')) {
       // if it's http://192.168.1.1:4747 without path
       finalUrl = finalUrl.endsWith('/') ? `${finalUrl}video` : `${finalUrl}/video`;
    }

    setWifiUrl(finalUrl);
    localStorage.setItem('faceguard_camera_source', cameraSource);
    localStorage.setItem('faceguard_wifi_url', finalUrl);

    if (cameraSource === 'wifi') {
      setSavedSetting(`WiFi: ${finalUrl || 'Not set'}`);
    } else {
      setSavedSetting('WebRTC (Camo/Local USB)');
    }
    alert('Settings saved successfully!');
  };

  const handleClear = () => {
    localStorage.removeItem('faceguard_camera_source');
    localStorage.removeItem('faceguard_wifi_url');
    setCameraSource('webcam');
    setWifiUrl('');
    setSavedSetting('Not set');
  };

  const handleReset = async (action) => {
    const isFactory = action === 'factoryReset';
    const message = isFactory 
      ? 'WARNING: This will delete ALL attendance records and ALL logs. Students and Subjects will remain safe. Proceed?' 
      : 'WARNING: This will permanently delete ALL enrolled students and their face data. Proceed?';
      
    if (!window.confirm(message)) return;

    setResettingAction(action);
    try {
      const res = await fetch('/api/settings/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action })
      });
      const data = await res.json();
      if (data.ok) {
        alert(`Success: ${data.message}`);
      } else {
        alert(`Error: ${data.message}`);
      }
    } catch (err) {
      alert(`Request failed: ${err.message}`);
    } finally {
      setResettingAction(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold text-[#38bdf8] tracking-tight">Settings</h2>
          <p className="text-slate-400 mt-1 text-sm">Configure app settings and Droidcam</p>
        </div>
        <div className="flex gap-3 flex-wrap">
          <button 
            onClick={() => handleReset('removeAllStudents')}
            disabled={resettingAction !== null}
            className="px-4 py-2 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 font-semibold border border-red-500/30 transition-colors text-sm disabled:opacity-50"
            title="Permanently delete all enrolled students and their face data"
          >
            {resettingAction === 'removeAllStudents' ? 'Processing...' : 'Remove All Students'}
          </button>
          <button 
            onClick={() => handleReset('factoryReset')}
            disabled={resettingAction !== null}
            className="px-4 py-2 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 font-semibold border border-red-500/30 transition-colors text-sm disabled:opacity-50"
            title="Clear all Attendance and Log entries"
          >
            {resettingAction === 'factoryReset' ? 'Processing...' : 'Factory Reset Data'}
          </button>
        </div>
      </div>

      {/* Camera Setup Card */}
      <div className="bg-[#111827] border border-[#1e293b] rounded-xl p-6">
        <h3 className="text-white font-bold text-lg">Camera Connection Setup</h3>
        <p className="text-slate-400 text-sm mt-1 mb-6">
          Select your preferred camera source for attendance and enrollment.
        </p>

        <div className="space-y-3">
          <label className="flex items-center gap-3 cursor-pointer p-2 rounded-lg hover:bg-white/5 transition-colors">
            <input 
              type="radio" 
              name="cameraSource" 
              value="wifi" 
              checked={cameraSource === 'wifi'}
              onChange={() => setCameraSource('wifi')}
              className="w-4 h-4 text-[#38bdf8] bg-[#0b1220] border-[#1e293b] focus:ring-[#38bdf8]"
            />
            <span className="text-slate-300 text-sm">Using WiFi (IP Camera/DroidCam)</span>
          </label>

          {/* WiFi URL Input */}
          {cameraSource === 'wifi' && (
            <div className="ml-9 mr-2 mb-4">
              <input 
                type="text" 
                placeholder="http://192.168.x.x:4747/video"
                value={wifiUrl}
                onChange={(e) => setWifiUrl(e.target.value)}
                className="w-full max-w-md px-4 py-2 rounded-lg bg-[#0b1220] border border-[#1e293b] text-white outline-none focus:border-[#38bdf8] text-sm transition-colors"
              />
              <p className="text-[10px] text-slate-500 mt-2 italic">
                Note: DroidCam usually requires <b>/video</b> at the end of the URL.
              </p>
            </div>
          )}

          <label className="flex items-center gap-3 cursor-pointer p-2 rounded-lg hover:bg-white/5 transition-colors">
            <input 
              type="radio" 
              name="cameraSource" 
              value="webcam" 
              checked={cameraSource === 'webcam'}
              onChange={() => setCameraSource('webcam')}
              className="w-4 h-4 text-[#c084fc] bg-[#0b1220] border-[#1e293b] focus:ring-[#c084fc]"
            />
            <span className="text-slate-300 text-sm">Using Device Cam (Webcam/Camo)</span>
          </label>
        </div>

        {/* Action Buttons */}
        <div className="mt-8 flex gap-3 flex-wrap items-center">
          <button 
            onClick={handleSave}
            className="px-5 py-2 rounded-lg bg-[#38bdf8]/10 text-[#38bdf8] hover:bg-[#38bdf8]/20 border border-[#38bdf8]/30 font-bold text-sm transition-colors"
          >
            Save Selection
          </button>

          <button 
            onClick={handleClear}
            className="px-5 py-2 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/30 font-bold text-sm transition-colors"
          >
            Clear Saved
          </button>
        </div>

        <div className="mt-6 pt-4 border-t border-[#1e293b]">
          <p className="text-slate-400 text-sm">
            Saved Setting: 
            <span className="text-[#38bdf8] font-semibold ml-2">{savedSetting}</span>
          </p>
        </div>

        {/* Pro Tip */}
        <div className="mt-6 p-4 bg-amber-500/5 border border-amber-500/20 rounded-xl">
          <div className="flex gap-3">
            <div className="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-500 flex-shrink-0">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
            </div>
            <div>
              <h4 className="text-amber-500 font-bold text-sm">Pro Tip: Use DroidCam Windows Client</h4>
              <p className="text-slate-400 text-xs mt-1 leading-relaxed">
                For the best experience (including blue face-tracking boxes), use the <b>DroidCam Windows Client</b>. 
                It creates a "Virtual Webcam" that you can select under <b>Device Cam</b>. 
                The WiFi URL method may have browser security (CORS) limits that hide the tracking boxes.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
