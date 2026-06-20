/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  Play, CheckCircle2, Sparkles, Loader2, 
  Sliders, Clock, Users, Activity, FileText, BadgeAlert 
} from 'lucide-react';
import { Clinic, QueueUpdate } from '../types.js';

interface DrDashboardProps {
  clinic: Clinic | null;
  queueUpdate: QueueUpdate | null;
  onCallNext: () => Promise<void>;
  onCompletePatient: (queueId: string, duration: number, notes: string) => Promise<void>;
  onEmergencyOverride: (patientId: string, reason: string) => Promise<void>;
  onUpdateAvgTime: (avgTime: number) => Promise<void>;
}

export default function DrDashboard({
  clinic,
  queueUpdate,
  onCallNext,
  onCompletePatient,
  onEmergencyOverride,
  onUpdateAvgTime,
}: DrDashboardProps) {
  const [avgTimeVal, setAvgTimeVal] = useState(clinic?.avg_consultation_time || 12);
  const [consultDuration, setConsultDuration] = useState('10');
  const [rawNotes, setRawNotes] = useState('');
  
  const [enriching, setEnriching] = useState(false);
  const [calling, setCalling] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [overriding, setOverriding] = useState(false);
  const [overrideReason, setOverrideReason] = useState('Acute Symptoms Override');

  // Find if anyone is currently in consultation
  const activeConsultation = queueUpdate?.entries.find(e => e.status === 'in_consultation');
  
  // Find who is currently waiting (and can be overridden to Emergency)
  const waitingEntries = queueUpdate?.entries.filter(e => e.status === 'waiting') || [];

  // Call API to enrich doctor scribbles into high-fidelity structured notes
  const handleEnrichNotes = async () => {
    if (!rawNotes.trim()) return;
    setEnriching(true);
    try {
      const resp = await fetch('/api/consultation/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symptoms: activeConsultation?.patient?.triage_notes || '',
          triageNotes: activeConsultation?.patient?.triage_notes || '',
          rawDoctorNotes: rawNotes,
        })
      });
      const data = await resp.json();
      if (data.notes) {
        setRawNotes(data.notes);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setEnriching(false);
    }
  };

  const handleCallNext = async () => {
    setCalling(true);
    try {
      await onCallNext();
    } catch (err) {
      console.error(err);
    } finally {
      setCalling(false);
    }
  };

  const handleComplete = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeConsultation) return;
    setCompleting(true);
    try {
      await onCompletePatient(activeConsultation.id, Number(consultDuration), rawNotes);
      setRawNotes('');
      setConsultDuration('10');
    } catch (err) {
      console.error(err);
    } finally {
      setCompleting(false);
    }
  };

  const handleTriggerOverride = async (patientId: string) => {
    setOverriding(true);
    try {
      await onEmergencyOverride(patientId, overrideReason);
    } catch (err) {
       console.error(err);
    } finally {
       setOverriding(false);
    }
  };

  const getTriageBadge = (score: number) => {
    switch (score) {
      case 1: return 'bg-[#FFF5F2] text-[#D67D5B] border-[#F2D7D0]';
      case 2: return 'bg-[#FFF5F2] text-[#D67D5B] border-[#F2D7D0]';
      case 3: return 'bg-[#FFF5F2] text-[#D67D5B] border-[#CBD2C6]';
      case 4: return 'bg-[#E8EDE7] text-[#5A634D] border-[#CBD2C6]';
      default: return 'bg-[#F9F8F6] text-[#9A9A8A] border-[#E0DBCF]';
    }
  };

  const getHealthLabel = (status: 'green' | 'yellow' | 'red') => {
    switch (status) {
      case 'red': return 'Overcrowded (High Delay)';
      case 'yellow': return 'Moderate Queue Load';
      default: return 'Optimal Throughput';
    }
  };

  return (
    <div className="space-y-6">
      {/* Clinic Analytics Summary Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-5">
        <div className="bg-white p-5 border border-[#E0DBCF] rounded-[24px] shadow-xs flex items-center gap-4">
          <div className="p-3 rounded-xl bg-[#F2F0EB] text-[#5A634D]">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] font-serif uppercase tracking-widest text-[#9A9A8A] font-bold">In Active Line</p>
            <p className="text-2xl font-serif font-bold text-[#4A4A35]">
              {queueUpdate?.health.total || 0} patients
            </p>
          </div>
        </div>

        <div className="bg-white p-5 border border-[#E0DBCF] rounded-[24px] shadow-xs flex items-center gap-4">
          <div className="p-3 rounded-xl bg-[#E8EDE7] text-[#5A634D]">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] font-serif uppercase tracking-widest text-[#5A634D] font-bold">Today Treated</p>
            <p className="text-2xl font-serif font-bold text-[#4A4A35]">
              {queueUpdate?.health.completed || 0} complete
            </p>
          </div>
        </div>

        <div className="bg-white p-5 border border-[#E0DBCF] rounded-[24px] shadow-xs flex items-center gap-4">
          <div className="p-3 rounded-xl bg-[#FFF5F2] text-[#D67D5B]">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] font-serif uppercase tracking-widest text-[#9A9A8A] font-bold">Line Flow Health</p>
            <div className="flex items-center gap-2 mt-1">
              <span className={`w-2 h-2 rounded-full inline-block ${queueUpdate?.health.status === 'red' ? 'bg-[#D67D5B] animate-pulse' : queueUpdate?.health.status === 'yellow' ? 'bg-amber-655' : 'bg-[#5A634D]'}`} />
              <span className="text-xs font-bold text-[#3D3D3D]">
                {queueUpdate ? getHealthLabel(queueUpdate.health.status) : 'Checking...'}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white p-5 border border-[#E0DBCF] rounded-[24px] shadow-xs flex items-center gap-4">
          <div className="p-3 rounded-xl bg-[#F9F8F6] text-[#70939B]">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] font-serif uppercase tracking-widest text-[#9A9A8A] font-bold">Clinic Pace</p>
            <p className="text-sm font-bold text-[#3D3D3D] mt-1">{clinic?.avg_consultation_time}m / patient</p>
          </div>
        </div>
      </div>

      {/* Main Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Active Consultation Deck (Left Column) */}
        <div className="lg:col-span-8 space-y-6">
          <div className="bg-white border border-[#E0DBCF] rounded-[32px] p-8 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 pb-4 border-b border-[#F2F0EB]">
              <h3 className="text-lg font-serif font-bold text-[#4A4A35] flex items-center gap-2.5">
                <FileText className="w-5 h-5 text-[#5A634D]" />
                Active Consultation Worksheet
              </h3>
              {activeConsultation ? (
                <span className="bg-[#E8EDE7] text-[#5A634D] text-xs px-4 py-1.5 rounded-full font-serif font-bold flex items-center gap-2 border border-[#CBD2C6]">
                  <span className="w-2.5 h-2.5 bg-[#5A634D] rounded-full animate-pulse inline-block" />
                  Currently Consulting
                </span>
              ) : (
                <span className="bg-[#F9F8F6] text-[#9A9A8A] text-xs px-3 py-1.5 rounded-full font-mono font-semibold uppercase tracking-wider border border-[#E0DBCF]/60">
                  Standard Idle State
                </span>
              )}
            </div>

            {activeConsultation ? (
              <form onSubmit={handleComplete} className="space-y-5">
                <div className="p-5 bg-[#F9F8F6] border border-[#E0DBCF] rounded-2xl">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <p className="text-[10px] font-serif uppercase tracking-widest text-[#9A9A8A] font-bold">Patient Identifier</p>
                      <h4 className="text-xl font-serif font-bold text-[#4A4A35] mt-1">
                        {activeConsultation.patient?.name}
                      </h4>
                      <p className="text-xs text-[#7A7A6A] font-sans mt-0.5 font-medium">
                        Age: {activeConsultation.patient?.age || 'Unspecified'} | Gender: {activeConsultation.patient?.gender}
                      </p>
                    </div>
                    <div>
                      <span className="font-serif text-sm bg-[#5A634D] text-white px-4 py-1.5 rounded-xl font-bold shadow-xs inline-block">
                        {activeConsultation.token_number}
                      </span>
                    </div>
                  </div>

                  <div className="mt-4 border-t border-[#E0DBCF] pt-4">
                    <p className="text-[10px] font-serif uppercase tracking-widest text-[#9A9A8A] font-bold mb-2">Pre-Screening Complaint & Symptoms Notes</p>
                    <div className="p-4 bg-white rounded-xl border border-[#E0DBCF] text-xs text-[#3D3D3D] leading-relaxed">
                      <span className="font-serif font-bold block mb-1 text-[#4A4A35]">
                        Triage Rank Level {activeConsultation.patient?.triage_score} out of 5:
                      </span>
                      <p className="italic">"{activeConsultation.patient?.triage_notes}"</p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-xs font-serif font-bold uppercase tracking-widest text-[#7A7A6A] mb-2">
                      Actual Consultation Length (Minutes)
                    </label>
                    <input
                      type="number"
                      required
                      min={1}
                      value={consultDuration}
                      onChange={(e) => setConsultDuration(e.target.value)}
                      className="w-full bg-[#F9F8F6] border border-[#E0DBCF] text-[#3D3D3D] text-sm rounded-xl px-4 py-3 focus:bg-white focus:outline-none focus:border-[#5A634D]"
                      id="input-consultation-length"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-xs font-serif font-bold uppercase tracking-widest text-[#7A7A6A]">
                      Physician Diagnosis & Clinical Chart Notes
                    </label>
                    <button
                      type="button"
                      disabled={enriching || !rawNotes.trim()}
                      onClick={handleEnrichNotes}
                      className="text-[10.5px] text-[#5A634D] font-serif font-bold flex items-center gap-1.5 bg-[#E8EDE7] px-3.5 py-1.5 rounded-full border border-[#CBD2C6] hover:bg-[#D9DED6] disabled:opacity-50 transition-colors cursor-pointer uppercase tracking-wider"
                      id="btn-enrich-doctor-notes"
                    >
                      {enriching ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-[#5A634D]" />
                          <span>Gemini Processing EHR Chart...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>Enrich via Gemini</span>
                        </>
                      )}
                    </button>
                  </div>
                  <textarea
                    rows={4}
                    placeholder="Scribble raw medical observations, dosage details, checks... Tip: Write simple quick words, then hit 'Enrich' above! Gemini AI automatically structures into high-fidelity formatted digital care charts!"
                    value={rawNotes}
                    onChange={(e) => setRawNotes(e.target.value)}
                    className="w-full bg-[#F9F8F6] border border-[#E0DBCF] text-[#3D3D3D] text-sm rounded-xl p-4 font-mono focus:bg-white focus:outline-none focus:border-[#5A634D]"
                    id="textarea-doctor-notes"
                  />
                </div>

                <div className="flex justify-end pt-4 border-t border-[#F2F0EB]">
                  <button
                    type="submit"
                    disabled={completing}
                    className="w-full sm:w-auto bg-[#5A634D] hover:bg-[#4E5642] text-white font-serif font-bold text-xs uppercase tracking-widest py-3.5 px-8 rounded-full shadow-md flex items-center justify-center gap-2.5 transition-all cursor-pointer"
                    id="btn-complete-consultation"
                  >
                    {completing ? (
                      <Loader2 className="w-4 h-4 animate-spin text-white" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4 text-[#E8EDE7]" />
                    )}
                    <span>Complete Session & Archive Records</span>
                  </button>
                </div>
              </form>
            ) : (
              <div className="text-center py-14 text-slate-500 font-sans border-2 border-dashed border-[#E0DBCF] rounded-2xl bg-[#F9F8F6] p-6">
                <p className="font-serif font-bold text-[#4A4A35]">No patient session is currently active.</p>
                <p className="text-xs text-[#9A9A8A] mt-1.5 max-w-sm mx-auto mb-5">
                  Check waiting list positions below and summon the next available priority ticket.
                </p>
                <button
                  onClick={handleCallNext}
                  disabled={calling || waitingEntries.length === 0}
                  className="bg-[#5A634D] hover:bg-[#4A513E] text-white font-serif font-bold text-xs px-5 py-3 rounded-full flex items-center justify-center gap-2.5 mx-auto disabled:bg-[#E0DBCF] disabled:text-[#9A9A8A] uppercase tracking-widest shadow-md transition-all cursor-pointer"
                  id="btn-call-next"
                >
                  {calling ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
                  ) : (
                    <Play className="w-3.5 h-3.5 fill-white text-white border-none" />
                  )}
                  <span>Summon Next Patient</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Dynamic Sliders & Triage Override (Right Column) */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* Clinic Parameters Sliders */}
          <div className="bg-white border border-[#E0DBCF] rounded-[32px] p-8 shadow-sm">
            <h3 className="text-sm font-serif font-bold text-[#4A4A35] flex items-center gap-2.5 mb-5 pb-3 border-b border-[#F2F0EB]">
              <Sliders className="w-4 h-4 text-[#70939B]" />
              Tune Clinic Consultation Speed
            </h3>
            <div className="space-y-5">
              <div>
                <div className="flex justify-between items-center mb-2 text-xs text-[#3D3D3D]">
                  <span className="font-semibold text-[#7A7A6A]">Service pace parameter</span>
                  <span className="font-mono font-bold text-[#5A634D]">{avgTimeVal}m / visit</span>
                </div>
                <input
                  type="range"
                  min="5"
                  max="30"
                  step="1"
                  value={avgTimeVal}
                  onChange={(e) => setAvgTimeVal(Number(e.target.value))}
                  className="w-full accent-[#5A634D] cursor-pointer h-1.5 bg-[#F2F0EB] rounded-lg"
                  id="range-input-avg-time"
                />
              </div>

              <button
                type="button"
                onClick={() => onUpdateAvgTime(avgTimeVal)}
                className="w-full bg-[#F2F0EB] hover:bg-[#E0DBCF] text-[#4A4A35] text-xs font-serif font-bold py-3 px-4 rounded-full border border-[#E0DBCF] transition-all uppercase tracking-wider cursor-pointer"
                id="btn-apply-settings"
              >
                Apply Parameters
              </button>
            </div>
          </div>

          {/* Emergency Bypass Controls */}
          <div className="bg-white border border-[#E0DBCF] rounded-[32px] p-8 shadow-sm">
            <h4 className="text-sm font-serif font-bold text-[#4A4A35] flex items-center gap-2.5 mb-5 pb-3 border-b border-[#F2F0EB]">
              <BadgeAlert className="w-4.5 h-4.5 text-[#D67D5B]" />
              Physician Bypass Override
            </h4>
            
            {waitingEntries.length === 0 ? (
              <p className="text-center py-6 text-xs text-[#9A9A8A] font-medium leading-relaxed font-sans">
                No registered patient is currently waiting on line.
              </p>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-serif font-bold uppercase tracking-widest text-[#7A7A6A] mb-2">
                    Emergency Bypass Reason
                  </label>
                  <input
                    type="text"
                    value={overrideReason}
                    onChange={(e) => setOverrideReason(e.target.value)}
                    className="w-full bg-[#F9F8F6] border border-[#E0DBCF] text-xs font-sans rounded-xl px-3 py-2 text-[#3D3D3D] focus:outline-none focus:border-[#D67D5B]"
                    id="input-emergency-reason"
                  />
                </div>

                <div className="max-h-60 overflow-y-auto space-y-2.5 pr-1.5">
                  {waitingEntries.map((entry) => (
                    <div
                      key={entry.id}
                      className="p-3 rounded-xl border border-[#E0DBCF] bg-[#F9F8F6] hover:bg-white flex items-center justify-between transition-all"
                    >
                      <div>
                        <span className="font-serif text-xs font-bold bg-[#CBD2C6]/50 rounded-lg px-2 py-0.5 text-[#4A4A35] mr-2">
                          {entry.token_number}
                        </span>
                        <span className="font-serif font-bold text-[#3D3D3D] text-[11px] block sm:inline-block">
                          {entry.patient?.name}
                        </span>
                      </div>
                      <button
                        onClick={() => handleTriggerOverride(entry.patient_id)}
                        disabled={overriding || entry.patient?.is_emergency}
                        className="bg-[#FFF5F2] hover:bg-red-50 text-[#D67D5B] border border-[#F2D7D0] hover:border-[#D67D5B]/30 font-bold px-3 py-1.5 rounded-full text-[9px] uppercase tracking-wider transition-all disabled:opacity-50 cursor-pointer"
                        id={`btn-bypass-${entry.patient_id}`}
                      >
                        {entry.patient?.is_emergency ? 'Emergency Line' : 'Bypass'}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

        </div>

      </div>
    </div>
  );
}
