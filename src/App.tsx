/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { 
  Building2, Monitor, Stethoscope, Sparkles, Clock, 
  ChevronRight, HeartPulse, ShieldAlert, Loader2, RefreshCw 
} from 'lucide-react';

import { Clinic, Patient, QueueEntry, QueueUpdate, QueueHealth } from './types.js';
import AIPredictorCard from './components/AIPredictorCard.js';
import ActiveCallBanner from './components/ActiveCallBanner.js';
import RegistrationForm from './components/RegistrationForm.js';
import DrDashboard from './components/DrDashboard.js';
import WaitingTimeline from './components/WaitingTimeline.js';

export default function App() {
  const [activeClinicId, setActiveClinicId] = useState('clinic-1');
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [currentClinic, setCurrentClinic] = useState<Clinic | null>(null);

  const [queueUpdate, setQueueUpdate] = useState<QueueUpdate | null>(null);
  const [prediction, setPrediction] = useState<any>(null);
  const [predictionLoading, setPredictionLoading] = useState(true);
  const [currentCall, setCurrentCall] = useState<any>(null);

  const [viewMode, setViewMode] = useState<'lobby' | 'doctor'>('lobby'); // lobby = Patient Facing, doctor = Staff Console
  const [loading, setLoading] = useState(true);

  const socketRef = useRef<Socket | null>(null);

  // 1. Fetch all seeded Clinics on load
  useEffect(() => {
    async function fetchClinics() {
      try {
        const res = await fetch('/api/clinics');
        const data = await res.json();
        setClinics(data);
        const active = data.find((c: Clinic) => c.id === activeClinicId);
        if (active) setCurrentClinic(active);
      } catch (err) {
        console.error('Error loading clinics:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchClinics();
  }, []);

  // 2. Establish bidirectional WebSocket channel on loaded Active Clinic
  useEffect(() => {
    setPredictionLoading(true);
    
    // Connect to same origin Express server
    const socket = io(window.location.origin, {
      reconnectionDelayMax: 10000,
    });
    socketRef.current = socket;

    // Join room instantly
    socket.emit('join:clinic', activeClinicId);

    // Stream Listeners
    socket.on('queue:update', (data: QueueUpdate) => {
      setQueueUpdate(data);
    });

    socket.on('waittime:update', (data: { waitTime: number; queueLength: number; prediction: any }) => {
      setPrediction(data.prediction);
      setPredictionLoading(false);
    });

    socket.on('token:called', (data: any) => {
      setCurrentCall(data);
    });

    return () => {
      socket.off('queue:update');
      socket.off('waittime:update');
      socket.off('token:called');
      socket.disconnect();
    };
  }, [activeClinicId]);

  // Sync select dropdown changes
  useEffect(() => {
    if (clinics.length > 0) {
      const active = clinics.find((c) => c.id === activeClinicId);
      if (active) setCurrentClinic(active);
    }
  }, [activeClinicId, clinics]);

  // ==================== LIFECYCLE EVENT WRAPPERS ====================

  const handlePatientAddSubmit = (patientData: {
    name: string;
    age?: number;
    gender?: string;
    phone?: string;
    symptoms?: string;
  }) => {
    return new Promise<{ patient: Patient; queueEntry: QueueEntry }>((resolve, reject) => {
      if (!socketRef.current) return reject(new Error('Socket disconnected'));

      socketRef.current.emit(
        'patient:add',
        { ...patientData, clinicId: activeClinicId },
        (resp: any) => {
          if (resp.success) {
            resolve(resp.data);
          } else {
            reject(new Error(resp.error || 'Check-in failed'));
          }
        }
      );
    });
  };

  const handleCallNextPatient = async () => {
    return new Promise<void>((resolve, reject) => {
      if (!socketRef.current) return reject(new Error('Socket disconnected'));
      socketRef.current.emit('token:call', { clinicId: activeClinicId }, (resp: any) => {
        if (resp.success) {
          resolve();
        } else {
          reject(new Error(resp.error || 'Failed to call patient'));
        }
      });
    });
  };

  const handleCompletePatient = async (queueId: string, duration: number, notes: string) => {
    return new Promise<void>((resolve, reject) => {
      if (!socketRef.current) return reject(new Error('Socket disconnected'));
      socketRef.current.emit(
        'patient:complete',
        { queueId, duration, notes },
        (resp: any) => {
          if (resp.success) {
            if (currentCall && currentCall.queueId === queueId) {
              setCurrentCall(null);
            }
            resolve();
          } else {
            reject(new Error(resp.error || 'Failed to complete treatment'));
          }
        }
      );
    });
  };

  const handleEmergencyOverride = async (patientId: string, reason: string) => {
    return new Promise<void>((resolve, reject) => {
      if (!socketRef.current) return reject(new Error('Socket disconnected'));
      socketRef.current.emit(
        'emergency:override',
        { patientId, clinicId: activeClinicId, reason },
        (resp: any) => {
          if (resp.success) {
            resolve();
          } else {
            reject(new Error(resp.error || 'Failed override trigger'));
          }
        }
      );
    });
  };

  const handleUpdateAvgTime = async (avgTime: number) => {
    return new Promise<void>((resolve, reject) => {
      if (!socketRef.current) return reject(new Error('Socket disconnected'));
      socketRef.current.emit(
        'doctor:update',
        { clinicId: activeClinicId, avgTime },
        (resp: any) => {
          if (resp.success) {
            if (currentClinic) {
              setCurrentClinic({
                ...currentClinic,
                avg_consultation_time: avgTime,
              });
            }
            resolve();
          } else {
            reject(new Error(resp.error || 'Failed settings update'));
          }
        }
      );
    });
  };

  const forceTriggerRefreshPredictions = () => {
    setPredictionLoading(true);
    socketRef.current?.emit('join:clinic', activeClinicId);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F2F0EB] flex flex-col items-center justify-center gap-3.5">
        <Loader2 className="w-8 h-8 text-[#5A634D] animate-spin" />
        <span className="text-sm font-serif font-bold text-[#4A4A35]">Booting Token System Workspace...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#F2F0EB] text-[#3D3D3D] antialiased font-sans">
      {/* Top Main Navigation Header */}
      <header className="sticky top-0 z-40 bg-white border-b border-[#E0DBCF] shadow-sm px-4 py-3 md:py-4">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          
          {/* Logo Brand Brand */}
          <div className="flex items-center gap-2.5">
            <div className="h-10 w-10 rounded-xl bg-[#5A634D] text-[#F2F0EB] flex items-center justify-center shadow-md shadow-[#5A634D]/25">
              <HeartPulse className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-serif font-bold tracking-tight text-[#4A4A35] leading-none">
                  Token <span className="text-[#70939B]">System</span>
                </h1>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-widest uppercase bg-[#E8EDE7] text-[#5A634D] border border-[#CBD2C6]">
                  <Sparkles className="w-2.5 h-2.5" />
                  Smart Flow
                </span>
              </div>
              <p className="text-[10px] uppercase tracking-widest text-[#9A9A8A] font-bold mt-1">Sridevi medical center . banglore</p>
            </div>
          </div>

          {/* Core Selectors and toggles */}
          <div className="flex flex-wrap items-center gap-3.5">
            
            {/* Clinic Dropdown */}
            <div className="flex items-center gap-2 bg-[#F9F8F6] border border-[#E0DBCF] rounded-full px-3.5 py-2 text-[#3D3D3D]">
              <Building2 className="w-4 h-4 text-[#70939B]" />
              <select
                value={activeClinicId}
                onChange={(e) => setActiveClinicId(e.target.value)}
                className="bg-transparent text-xs font-serif font-bold focus:outline-none pr-6 cursor-pointer"
                id="select-active-clinic"
              >
                {clinics.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Platform mode buttons */}
            <div className="bg-[#F9F8F6] border border-[#E0DBCF] rounded-full p-1 flex items-center gap-1.5">
              <button
                onClick={() => setViewMode('lobby')}
                className={`flex items-center gap-1.5 text-xs font-serif font-bold px-4 py-2 rounded-full transition-all cursor-pointer ${
                  viewMode === 'lobby'
                    ? 'bg-[#5A634D] text-white shadow-sm'
                    : 'text-[#9A9A8A] hover:text-[#5A634D]'
                }`}
                id="btn-nav-lobby"
              >
                <Monitor className="w-3.5 h-3.5" />
                <span>Patient Lobby</span>
              </button>

              <button
                onClick={() => setViewMode('doctor')}
                className={`flex items-center gap-1.5 text-xs font-serif font-bold px-4 py-2 rounded-full transition-all cursor-pointer ${
                  viewMode === 'doctor'
                    ? 'bg-[#5A634D] text-white shadow-sm'
                    : 'text-[#9A9A8A] hover:text-[#5A634D]'
                }`}
                id="btn-nav-doctor"
              >
                <Stethoscope className="w-3.5 h-3.5" />
                <span>Clinician Console</span>
              </button>
            </div>

          </div>

        </div>
      </header>

      {/* Primary Container Stage */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:py-8 space-y-6">
        
        {/* Dynamic Clinic Banner Summary */}
        <section className="bg-white border border-[#E0DBCF] rounded-[32px] p-8 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-5">
          <div className="space-y-1">
            <p className="text-[10px] font-serif uppercase text-[#5A634D] tracking-widest font-bold">Active Workspace</p>
            <h2 className="text-2xl font-serif font-bold text-[#4A4A35]">
              {currentClinic?.name}
            </h2>
            <p className="text-xs font-medium text-[#9A9A8A]">{currentClinic?.address}</p>
          </div>

          <div className="flex flex-wrap items-center gap-5 p-4 bg-[#F9F8F6] border border-[#E0DBCF] rounded-2xl text-xs font-sans">
            <div>
              <span className="text-[#9A9A8A] block text-[9px] font-serif font-bold uppercase tracking-widest mb-1">ESTIMATED DELAY</span>
              <span className="font-serif font-bold text-[#4A4A35]">
                {queueUpdate ? queueUpdate.entries.filter(e => e.status === 'waiting').length * (currentClinic?.avg_consultation_time || 12) : 0} mins total
              </span>
            </div>
            <div className="border-l border-[#E0DBCF] pl-5">
              <span className="text-[#9A9A8A] block text-[9px] font-serif font-bold uppercase tracking-widest mb-1">PEAK HOUR SUGGESTION</span>
              <span className="font-serif font-bold text-[#D67D5B]">
                {prediction ? prediction.bestTime : 'Calculating...'}
              </span>
            </div>
          </div>
        </section>

        {/* Global Live Call Banner */}
        <ActiveCallBanner currentCall={currentCall} />

        {/* Active Route Screen */}
        {viewMode === 'lobby' ? (
          /* ==================== PATIENT LOBBY VIEW ==================== */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            
            {/* Registrations & Timeline (Left side) */}
            <div className="lg:col-span-8 space-y-6">
              <RegistrationForm onSubmit={handlePatientAddSubmit} />
              
              <WaitingTimeline queueUpdate={queueUpdate} />
            </div>

            {/* AI Predictions & Lifestyle Advices (Right side) */}
            <div className="lg:col-span-4">
              <AIPredictorCard 
                prediction={prediction} 
                loading={predictionLoading} 
                onRefresh={forceTriggerRefreshPredictions}
              />
            </div>

          </div>
        ) : (
          /* ==================== PHYSICIAN WORKSTATION VIEW ==================== */
          <DrDashboard
            clinic={currentClinic}
            queueUpdate={queueUpdate}
            onCallNext={handleCallNextPatient}
            onCompletePatient={handleCompletePatient}
            onEmergencyOverride={handleEmergencyOverride}
            onUpdateAvgTime={handleUpdateAvgTime}
          />
        )}

      </main>

      {/* Tiny clean footer */}
      <footer className="bg-white border-t border-[#E0DBCF] py-4 mt-12 text-center text-[10px] font-serif text-[#9A9A8A] font-medium tracking-wide">
        Token System Inc. • Cloud Run Sandbox Container Service • Real-time HIPAA-Compliance Mockups Enabled
      </footer>
    </div>
  );
}
