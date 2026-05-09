'use client';

import React, { useState, useEffect, useRef } from 'react';
import { X, Camera, Check } from './Icons';
import CameraPreview from './CameraPreview';

export default function CameraModal({ 
  isOpen, 
  onClose, 
  onCapture, 
  title = "Capture Photo", 
  subtitle = "Select your camera and take a high-quality photo" 
}) {
  const [cameraActive, setCameraActive] = useState(false);
  const [capturedImage, setCapturedImage] = useState(null);
  const [cameraSettings, setCameraSettings] = useState({ source: 'webcam', url: '' });
  const cameraRef = useRef(null);

  useEffect(() => {
    const source = localStorage.getItem('faceguard_camera_source') || 'webcam';
    const url = localStorage.getItem('faceguard_wifi_url') || '';
    setCameraSettings({ source, url });
  }, []);

  const handleCapture = () => {
    if (cameraRef.current) {
      const img = cameraRef.current.capture();
      if (img) {
        setCapturedImage(img);
        cameraRef.current.stop();
      }
    }
  };

  const handleUsePhoto = () => {
    onCapture(capturedImage);
    onClose();
    setCapturedImage(null);
  };

  const handleRetake = () => {
    setCapturedImage(null);
    if (cameraRef.current) cameraRef.current.start();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div 
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative bg-[#0b1220] border border-[#1e293b] rounded-[2.5rem] w-full max-w-xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
        <div className="p-8">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="text-xl font-bold text-white">{title}</h3>
              <p className="text-slate-500 text-xs mt-1">{subtitle}</p>
            </div>
            <button 
              onClick={onClose}
              className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          <div className="relative">
            <CameraPreview 
              ref={cameraRef}
              aspectRatio="square"
              onStreamStarted={() => setCameraActive(true)}
              onStreamStopped={() => setCameraActive(false)}
              showDeviceSelector={false}
              useWifi={cameraSettings.source === 'wifi'}
              wifiUrl={cameraSettings.url}
            />

            {/* Overlay for captured image */}
            {capturedImage && (
              <div className="absolute inset-0 z-50 bg-[#0b1220]/95 backdrop-blur-sm rounded-[2rem] flex flex-col items-center justify-center p-6 animate-in fade-in zoom-in-95 duration-300">
                <div className="relative w-32 h-32 md:w-40 md:h-40 rounded-[2rem] overflow-hidden border-4 border-[#38bdf8] shadow-2xl shadow-[#38bdf8]/20 mb-6">
                  <img src={capturedImage} className="w-full h-full object-cover" alt="Captured" />
                </div>
                <div className="flex gap-3 w-full max-w-[320px]">
                  <button 
                    onClick={handleUsePhoto}
                    className="flex-1 bg-emerald-500 text-white py-3 md:py-4 rounded-2xl text-sm font-bold flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 hover:opacity-90 transition-all"
                  >
                    <Check size={18} /> Use Photo
                  </button>
                  <button 
                    onClick={handleRetake}
                    className="flex-1 bg-slate-800 text-slate-400 py-3 md:py-4 rounded-2xl text-sm font-bold flex items-center justify-center gap-2 hover:bg-slate-700 transition-all"
                  >
                    Retake
                  </button>
                </div>
              </div>
            )}

            {/* Controls */}
            <div className="mt-6">
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
                    <div className="flex gap-3 animate-in slide-in-from-bottom-2 duration-300">
                      <button 
                        onClick={handleCapture}
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
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
