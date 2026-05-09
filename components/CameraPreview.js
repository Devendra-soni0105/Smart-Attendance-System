'use client';

import React, { useState, useEffect, useRef, useImperativeHandle, forwardRef, useCallback } from 'react';
import { Camera, RefreshCw, Loader2 } from './Icons';
import { cn } from '@/lib/utils';

const CameraPreview = forwardRef(({ 
  className,
  onDetectorResults,
  onStreamStarted,
  onStreamStopped,
  showControls = true,
  showDeviceSelector = false,
  aspectRatio = "video",
  useWifi = false,
  wifiUrl = ""
}, ref) => {
  const [cameraActive, setCameraActive] = useState(false);
  const [devices, setDevices] = useState([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState('');
  const [loading, setLoading] = useState(false);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const overlayRef = useRef(null);
  const streamRef = useRef(null);
  const detectorRef = useRef(null);
  const requestRef = useRef(null);
  const imgRef = useRef(null);

  // ─── Refs to hold latest prop/state values (avoids stale closures) ───
  const useWifiRef = useRef(useWifi);
  const cameraActiveRef = useRef(cameraActive);
  const onDetectorResultsRef = useRef(onDetectorResults);

  // Keep refs in sync with latest values on every render
  useEffect(() => { useWifiRef.current = useWifi; }, [useWifi]);
  useEffect(() => { cameraActiveRef.current = cameraActive; }, [cameraActive]);
  useEffect(() => { onDetectorResultsRef.current = onDetectorResults; }, [onDetectorResults]);

  useImperativeHandle(ref, () => ({
    start: startCamera,
    stop: stopCamera,
    capture: captureFrame,
    video: videoRef.current,
    canvas: canvasRef.current,
    overlay: overlayRef.current,
    detector: detectorRef.current,
    isActive: cameraActive
  }));

  useEffect(() => {
    fetchDevices();
    initDetector();
    return () => {
      stopCamera();
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, []);

  const fetchDevices = async () => {
    try {
      const devs = await navigator.mediaDevices.enumerateDevices();
      const videoDevs = devs.filter(d => d.kind === 'videoinput');
      setDevices(videoDevs);
      if (videoDevs.length > 0 && !selectedDeviceId) {
        setSelectedDeviceId(videoDevs[0].deviceId);
      }
    } catch (err) {
      console.error("Error fetching devices:", err);
    }
  };

  const initDetector = async () => {
    try {
      const { FaceDetection } = await import('@mediapipe/face_detection');
      const detector = new FaceDetection({
        locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_detection/${file}`
      });

      detector.setOptions({
        model: 'short',
        minDetectionConfidence: 0.5
      });

      detector.onResults((results) => {
        drawResults(results);
        if (onDetectorResultsRef.current) onDetectorResultsRef.current(results);
      });

      detectorRef.current = detector;
    } catch (err) {
      console.error("Detector init error:", err);
    }
  };

  // ─── Draw bounding boxes — always reads from refs ───
  const drawResults = (results) => {
    const isWifi = useWifiRef.current;
    const source = isWifi ? imgRef.current : videoRef.current;
    if (!overlayRef.current || !source) return;
    const canvas = overlayRef.current;
    const ctx = canvas.getContext('2d');
    
    const isReady = isWifi ? source.naturalWidth > 0 : source.readyState === 4;
    if (!isReady) return;

    canvas.width = isWifi ? source.naturalWidth : source.videoWidth;
    canvas.height = isWifi ? source.naturalHeight : source.videoHeight;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (results.detections && results.detections.length > 0) {
      results.detections.forEach(det => {
        let x, y, w, h;
        
        if (det.boundingBox) {
          const box = det.boundingBox;
          w = box.width * canvas.width;
          h = box.height * canvas.height;
          x = (box.xCenter * canvas.width) - (w / 2);
          y = (box.yCenter * canvas.height) - (h / 2);
        } else if (det.locationData && det.locationData.relativeBoundingBox) {
          const box = det.locationData.relativeBoundingBox;
          x = box.xmin * canvas.width;
          y = box.ymin * canvas.height;
          w = box.width * canvas.width;
          h = box.height * canvas.height;
        }

        if (x !== undefined) {
          ctx.strokeStyle = '#38bdf8';
          ctx.lineWidth = 4;
          ctx.strokeRect(x, y, w, h);
          
          ctx.shadowBlur = 10;
          ctx.shadowColor = '#38bdf8';
          ctx.strokeRect(x, y, w, h);
          ctx.shadowBlur = 0;
        }
      });
    }
  };

  // ─── Process frame loop — always reads from refs ───
  const processFrame = useCallback(async () => {
    const isWifi = useWifiRef.current;
    const active = cameraActiveRef.current;
    const source = isWifi ? imgRef.current : videoRef.current;

    if (active && source && detectorRef.current) {
      const isReady = isWifi ? source.naturalWidth > 0 : source.readyState === 4;
      
      if (isReady) {
        try {
          const canvas = canvasRef.current;
          canvas.width = isWifi ? source.naturalWidth : source.videoWidth;
          canvas.height = isWifi ? source.naturalHeight : source.videoHeight;
          const ctx = canvas.getContext('2d', { willReadFrequently: true });
          ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
          
          await detectorRef.current.send({ image: canvas });
        } catch (e) {
          // Silently handle CORS errors for WiFi, log others
          if (!isWifi) {
            console.error("Detector send error:", e);
          }
        }
      }
    }
    requestRef.current = requestAnimationFrame(processFrame);
  }, []); // Empty deps — reads everything from refs

  useEffect(() => {
    if (cameraActive) {
      requestRef.current = requestAnimationFrame(processFrame);
    } else {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    }
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [cameraActive, processFrame]);

  const startCamera = async () => {
    try {
      setLoading(true);
      if (useWifi) {
        if (!wifiUrl) {
          console.error("WiFi URL not provided");
          return;
        }
        setCameraActive(true);
        if (onStreamStarted) onStreamStarted(null);
      } else {
        const constraints = {
          video: selectedDeviceId ? { deviceId: { exact: selectedDeviceId } } : true
        };
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          streamRef.current = stream;
          setCameraActive(true);
          if (onStreamStarted) onStreamStarted(stream);
        }
      }
    } catch (err) {
      console.error("Camera error:", err);
    } finally {
      setLoading(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
    if (onStreamStopped) onStreamStopped();
  };

  const captureFrame = () => {
    const isWifi = useWifiRef.current;
    const source = isWifi ? imgRef.current : videoRef.current;
    if (!source || !canvasRef.current) return null;
    
    const isReady = isWifi ? source.naturalWidth > 0 : source.readyState === 4;
    if (!isReady) return null;

    try {
      const canvas = canvasRef.current;
      canvas.width = isWifi ? source.naturalWidth : source.videoWidth;
      canvas.height = isWifi ? source.naturalHeight : source.videoHeight;
      canvas.getContext('2d').drawImage(source, 0, 0, canvas.width, canvas.height);
      return canvas.toDataURL('image/jpeg');
    } catch (e) {
      console.error("Capture frame error (likely CORS):", e);
      return null;
    }
  };

  return (
    <div className={cn("flex flex-col gap-4", className)}>
      {showDeviceSelector && (
        <div>
          <label className="block text-[10px] font-bold text-slate-500 mb-2 uppercase tracking-widest">Select Camera Source</label>
          <div className="relative">
            <select 
              value={selectedDeviceId}
              onChange={e => {
                setSelectedDeviceId(e.target.value);
                if (cameraActive) stopCamera();
              }}
              className="w-full bg-[#111827] border border-[#1e293b] rounded-2xl px-5 py-3 text-sm text-white outline-none focus:border-[#38bdf8] appearance-none cursor-pointer"
            >
              {devices.map(dev => (
                <option key={dev.deviceId} value={dev.deviceId}>{dev.label || `Camera ${dev.deviceId.slice(0, 5)}`}</option>
              ))}
            </select>
            <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">
              <RefreshCw size={14} />
            </div>
          </div>
        </div>
      )}

      <div className={cn(
        "relative overflow-hidden border border-[#1e293b] bg-slate-900 group shadow-2xl",
        aspectRatio === "square" ? "aspect-square rounded-[2rem]" : "aspect-video rounded-3xl"
      )}>
        <video 
          ref={videoRef} 
          autoPlay 
          muted 
          playsInline 
          className={cn("absolute inset-0 w-full h-full object-cover z-10", (!cameraActive || useWifi) && "hidden")} 
        />
        {useWifi && cameraActive && (
          <img 
            ref={imgRef}
            src={`/api/proxy-stream?url=${encodeURIComponent(wifiUrl)}`}
            crossOrigin="anonymous"
            alt="WiFi Stream"
            className="absolute inset-0 w-full h-full object-cover z-10"
            onError={() => {
              try {
                console.warn("WiFi stream failed to load. Check camera connection.");
                stopCamera();
              } catch (e) {
                console.error("Error during stopCamera on WiFi failure:", e);
              }
            }}
          />
        )}
        <canvas 
          ref={overlayRef} 
          className={cn("absolute inset-0 w-full h-full object-cover z-20 pointer-events-none", !cameraActive && "hidden")} 
        />

        {!cameraActive && !loading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-700 gap-3">
            <Camera size={48} strokeWidth={1} />
            <p className="text-xs font-medium uppercase tracking-widest opacity-50">Camera Standby</p>
          </div>
        )}

        <canvas ref={canvasRef} className="hidden" />
        
        {loading && (
          <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-30">
            <Loader2 className="animate-spin text-[#38bdf8]" size={32} />
          </div>
        )}
      </div>
    </div>
  );
});

CameraPreview.displayName = 'CameraPreview';

export default CameraPreview;
