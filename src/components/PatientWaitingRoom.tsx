/**
 * PatientWaitingRoom — Full-screen TV display for the patient waiting area.
 * Shows: current token being served, tokens ahead, live countdown, queue list.
 */

import React, { useEffect, useState } from 'react';
import { Clock, Users, Radio, CheckCircle2, AlertTriangle, ChevronRight } from 'lucide-react';
import { QueueEntry, QueueUpdate } from '../types.js';

interface PatientWaitingRoomProps {
  queueUpdate: QueueUpdate | null;
  currentCall: any | null;
  avgConsultTime: number;
  clinicName: string;
}

export default function PatientWaitingRoom({
  queueUpdate,
  currentCall,
  avgConsultTime,
  clinicName,
}: PatientWaitingRoomProps) {
  const [myToken, setMyToken] = useState('');
  const [tokenInput, setTokenInput] = useState('');
  const [countdown, setCountdown] = useState<number | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Live clock
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Live countdown — ticks down every second from estimated wait
  useEffect(() => {
    if (countdown === null || countdown <= 0) return;
    const t = setInterval(() => setCountdown((c) => (c !== null && c > 0 ? c - 1 : 0)), 1000);
    return () => clearInterval(t);
  }, [countdown]);

  const waitingEntries = queueUpdate?.entries.filter((e) => e.status === 'waiting') || [];
  const inConsultation = queueUpdate?.entries.find((e) => e.status === 'in_consultation');

  const myEntry = myToken
    ? queueUpdate?.entries.find(
        (e) => e.token_number.toUpperCase() === myToken.toUpperCase() && e.status === 'waiting'
      )
    : null;

  const myPosition = myEntry
    ? waitingEntries.findIndex((e) => e.id === myEntry.id) + 1
    : null;

  const myEstimatedWait = myPosition !== null ? myPosition * avgConsultTime : null;

  // Reset countdown when estimated wait changes
  useEffect(() => {
    if (myEstimatedWait !== null) {
      setCountdown(myEstimatedWait * 60); // in seconds
    }
  }, [myEstimatedWait]);

  const handleTokenSearch = () => {
    setMyToken(tokenInput.trim().toUpperCase());
  };

  const formatCountdown = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const timeStr = currentTime.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });

  const isSoonNext = myPosition === 1;

  return (
    <div className="min-h-screen bg-[#1A1F16] text-white flex flex-col relative overflow-hidden">
      {/* Ambient background blobs */}
      <div className="absolute top-0 left-0 w-96 h-96 bg-[#5A634D]/20 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2 pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-[#70939B]/10 rounded-full blur-3xl translate-x-1/3 translate-y-1/3 pointer-events-none" />

      {/* Header */}
      <header className="flex items-center justify-between px-10 py-6 border-b border-white/10">
        <div>
          <p className="text-[10px] uppercase tracking-widest text-white/40 font-bold">Patient Waiting Room</p>
          <h1 className="text-lg font-serif font-bold text-white/90 mt-0.5">{clinicName}</h1>
        </div>
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-2 text-white/50 text-sm font-mono">
            <Radio className="w-4 h-4 text-[#5A634D] animate-pulse" />
            Live Queue
          </span>
          <span className="text-2xl font-mono font-bold text-white/80">{timeStr}</span>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-8 p-8 lg:p-12 items-start">

        {/* LEFT — Now Serving */}
        <div className="space-y-6">
          {/* Now serving giant token */}
          <div className="bg-white/5 border border-white/10 rounded-[32px] p-10 text-center relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-[#5A634D]/10 to-transparent pointer-events-none rounded-[32px]" />
            <p className="text-[11px] uppercase tracking-widest text-white/40 font-bold mb-4">
              Now Serving
            </p>

            {inConsultation ? (
              <>
                <div className="inline-block bg-[#5A634D] text-white font-serif text-7xl md:text-8xl font-bold px-10 py-6 rounded-2xl shadow-2xl border border-[#5A634D]/50 tracking-tight mb-6">
                  {inConsultation.token_number}
                </div>
                <p className="text-xl font-serif font-bold text-white/80 mt-2">
                  {inConsultation.patient?.name}
                </p>
                <p className="text-xs text-white/40 mt-2 font-sans">
                  Please proceed to the consulting room
                </p>
                <div className="mt-6 flex items-center justify-center gap-2 text-[#5A634D]">
                  <span className="w-2.5 h-2.5 bg-[#5A634D] rounded-full animate-ping inline-block" />
                  <span className="text-sm font-bold font-serif text-white/60">In Consultation</span>
                </div>
              </>
            ) : currentCall ? (
              <>
                <div className="inline-block bg-[#D67D5B] text-white font-serif text-7xl md:text-8xl font-bold px-10 py-6 rounded-2xl shadow-2xl border border-[#D67D5B]/50 tracking-tight mb-6">
                  {currentCall.token}
                </div>
                <p className="text-xl font-serif font-bold text-white/80">{currentCall.patientName}</p>
                <p className="text-xs text-[#D67D5B]/80 mt-2 font-sans animate-pulse font-bold uppercase tracking-widest">
                  Called — Please proceed now
                </p>
              </>
            ) : (
              <>
                <div className="inline-flex items-center justify-center w-32 h-32 rounded-full bg-white/5 border border-white/10 mb-6">
                  <Radio className="w-12 h-12 text-white/20 animate-pulse" />
                </div>
                <p className="text-white/40 font-serif font-bold">Waiting for doctor to call</p>
              </>
            )}
          </div>

          {/* Queue health summary */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-white/5 border border-white/10 rounded-2xl p-5 text-center">
              <p className="text-[9px] uppercase tracking-widest text-white/30 font-bold mb-1">Waiting</p>
              <p className="text-3xl font-serif font-bold text-white">{waitingEntries.length}</p>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-2xl p-5 text-center">
              <p className="text-[9px] uppercase tracking-widest text-white/30 font-bold mb-1">Avg Wait</p>
              <p className="text-3xl font-serif font-bold text-[#5A634D]">{avgConsultTime}m</p>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-2xl p-5 text-center">
              <p className="text-[9px] uppercase tracking-widest text-white/30 font-bold mb-1">Total Est.</p>
              <p className="text-3xl font-serif font-bold text-white/70">
                {waitingEntries.length * avgConsultTime}m
              </p>
            </div>
          </div>
        </div>

        {/* RIGHT — My Token Tracker + Queue List */}
        <div className="space-y-6">

          {/* Token position tracker */}
          <div className="bg-white/5 border border-white/10 rounded-[32px] p-8">
            <h2 className="text-sm font-serif font-bold text-white/70 mb-5 flex items-center gap-2">
              <Clock className="w-4 h-4 text-[#70939B]" />
              Track Your Token
            </h2>

            <div className="flex gap-2 mb-6">
              <input
                type="text"
                placeholder="Enter token (e.g. T-003)"
                value={tokenInput}
                onChange={(e) => setTokenInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleTokenSearch()}
                className="flex-1 bg-white/10 border border-white/20 text-white placeholder-white/30 rounded-xl px-4 py-3 text-sm font-mono focus:outline-none focus:border-[#5A634D] transition-colors"
                id="input-my-token"
              />
              <button
                onClick={handleTokenSearch}
                className="bg-[#5A634D] hover:bg-[#4A513E] text-white px-5 py-3 rounded-xl text-sm font-serif font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
                id="btn-track-token"
              >
                <ChevronRight className="w-4 h-4" />
                Track
              </button>
            </div>

            {myToken && myEntry && myPosition !== null && (
              <div className={`rounded-2xl p-6 border transition-all ${
                isSoonNext
                  ? 'bg-[#D67D5B]/20 border-[#D67D5B]/40'
                  : 'bg-[#5A634D]/20 border-[#5A634D]/30'
              }`}>
                {isSoonNext && (
                  <div className="flex items-center gap-2 mb-3 text-[#D67D5B] font-bold text-xs uppercase tracking-widest animate-pulse">
                    <AlertTriangle className="w-4 h-4" />
                    You're Next — Please Be Ready!
                  </div>
                )}
                <p className="text-[10px] uppercase tracking-widest text-white/40 font-bold mb-1">Your Token</p>
                <div className="flex items-baseline gap-4 mb-4">
                  <span className="text-4xl font-serif font-bold text-white">{myToken}</span>
                  <span className="text-white/50 font-sans text-sm">#{myPosition} in line</span>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-[9px] uppercase tracking-widest text-white/30 font-bold mb-1">Est. Wait</p>
                    <p className="text-xl font-serif font-bold text-[#5A634D]">{myEstimatedWait} min</p>
                  </div>
                  {countdown !== null && countdown > 0 && (
                    <div>
                      <p className="text-[9px] uppercase tracking-widest text-white/30 font-bold mb-1">Countdown</p>
                      <p className="text-xl font-serif font-bold text-[#70939B] font-mono">{formatCountdown(countdown)}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {myToken && !myEntry && (
              <div className="rounded-2xl p-5 bg-white/5 border border-white/10 text-center">
                <CheckCircle2 className="w-8 h-8 text-[#5A634D] mx-auto mb-2" />
                <p className="text-white/60 font-serif font-bold text-sm">
                  Token <span className="text-white">{myToken}</span> has already been served or not found.
                </p>
              </div>
            )}
          </div>

          {/* Live queue list */}
          <div className="bg-white/5 border border-white/10 rounded-[32px] p-8">
            <h2 className="text-sm font-serif font-bold text-white/70 mb-5 flex items-center gap-2">
              <Users className="w-4 h-4 text-[#70939B]" />
              Live Queue ({waitingEntries.length} waiting)
            </h2>

            {waitingEntries.length === 0 ? (
              <div className="text-center py-10">
                <CheckCircle2 className="w-10 h-10 text-[#5A634D]/40 mx-auto mb-3" />
                <p className="text-white/30 font-serif font-bold">Waiting room is clear!</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {waitingEntries.map((entry, idx) => {
                  const isMe = myToken && entry.token_number.toUpperCase() === myToken.toUpperCase();
                  const waitMins = (idx + 1) * avgConsultTime;
                  return (
                    <div
                      key={entry.id}
                      className={`flex items-center justify-between p-3.5 rounded-xl border transition-all ${
                        isMe
                          ? 'bg-[#5A634D]/30 border-[#5A634D]/50'
                          : entry.patient?.is_priority
                          ? 'bg-[#D67D5B]/10 border-[#D67D5B]/20'
                          : 'bg-white/5 border-white/10'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-[10px] text-white/30 font-mono font-bold w-5 text-center">
                          {idx + 1}
                        </span>
                        <span className={`font-serif font-bold text-sm px-3 py-1 rounded-lg ${
                          isMe ? 'bg-[#5A634D] text-white' : 'bg-white/10 text-white/80'
                        }`}>
                          {entry.token_number}
                        </span>
                        {entry.patient?.is_priority && (
                          <span className="text-[9px] uppercase tracking-widest text-[#D67D5B] font-bold">Priority</span>
                        )}
                        {isMe && (
                          <span className="text-[9px] uppercase tracking-widest text-[#5A634D] font-bold">← You</span>
                        )}
                      </div>
                      <span className="text-xs font-mono text-white/30">~{waitMins}m</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Footer ticker */}
      <footer className="border-t border-white/10 px-10 py-4 flex items-center justify-between text-[10px] text-white/20 font-mono uppercase tracking-widest">
        <span>Queue Cure Token System • Live Display</span>
        <span className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 bg-[#5A634D] rounded-full animate-pulse" />
          Real-time sync active
        </span>
      </footer>
    </div>
  );
}
