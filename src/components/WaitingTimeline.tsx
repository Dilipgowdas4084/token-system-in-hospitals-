/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  Users, Eye, EyeOff, AlertTriangle, CheckCircle2, Clock 
} from 'lucide-react';
import { QueueEntry, QueueUpdate, QueueStatus } from '../types.js';

interface WaitingTimelineProps {
  queueUpdate: QueueUpdate | null;
}

export default function WaitingTimeline({ queueUpdate }: WaitingTimelineProps) {
  const [privacyMask, setPrivacyMask] = useState(false);

  const getTriageLabel = (score?: number) => {
    switch (score) {
      case 1: return { text: 'Level 1: Severe Urgent', bg: 'bg-[#FFF5F2] text-[#D67D5B] border-[#F2D7D0]' };
      case 2: return { text: 'Level 2: Emergent', bg: 'bg-[#FFF5F2] text-[#D67D5B] border-[#F2D7D0]' };
      case 3: return { text: 'Level 3: Urgent', bg: 'bg-[#FFF5F2] text-[#D67D5B] border-[#CBD2C6]' };
      case 4: return { text: 'Level 4: Routine Wait', bg: 'bg-[#E8EDE7] text-[#5A634D] border-[#CBD2C6]' };
      default: return { text: 'Level 5: Non-Urgent', bg: 'bg-[#F9F8F6] text-[#9A9A8A] border-[#E0DBCF]' };
    }
  };

  const getStatusBadge = (status: QueueStatus) => {
    switch (status) {
      case 'in_consultation':
        return 'bg-[#5A634D] text-white text-[10px] uppercase font-bold tracking-widest px-3 py-1 rounded-full border border-[#5A634D]/25';
      case 'called':
        return 'bg-[#D67D5B] text-white text-[10px] uppercase font-bold tracking-widest px-3 py-1 rounded-full border border-[#D67D5B]/25';
      case 'completed':
        return 'bg-[#E0DBCF] text-[#7A7A6A] text-[10px] uppercase font-semibold px-3 py-1 rounded-full';
      default:
        return 'bg-white text-[#5A634D] border border-[#CBD2C6] text-[10px] uppercase font-bold tracking-wider px-3 py-1 rounded-full shadow-xs';
    }
  };

  const formatPatientName = (name?: string) => {
    if (!name) return 'Unknown Patient';
    if (!privacyMask) return name;
    
    // Privacy masking: " Liam Thompson" -> "Liam T."
    const parts = name.trim().split(' ');
    if (parts.length > 1) {
      return `${parts[0]} ${parts[1][0]}.`;
    }
    return `${name[0]}***`;
  };

  // Compute clock timetables cumulatively based on positions
  const getEstimatedClockTime = (index: number) => {
    // Current base time
    const now = new Date();
    const clinicAvgConsultMins = 12; // Static helper divisor
    
    // Add cumulative wait chunks
    now.setMinutes(now.getMinutes() + (index * clinicAvgConsultMins));
    
    const hours = now.getHours();
    const minutes = now.getMinutes().toString().padStart(2, '0');
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHour = hours > 12 ? hours - 12 : hours === 0 ? 12 : hours;
    
    return `${displayHour}:${minutes} ${period}`;
  };

  const entries = queueUpdate?.entries || [];
  const waitingEntries = entries.filter(e => e.status !== 'completed');

  return (
    <div className="bg-white border border-[#E0DBCF] rounded-[32px] p-8 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-[#F2F0EB]">
        <h3 className="text-xl font-serif font-bold text-[#4A4A35] flex items-center gap-2.5">
          <Users className="w-5 h-5 text-[#5A634D]" />
          Live Clinic Patient Flow Schedule
          <span className="text-sm font-sans font-normal text-[#9A9A8A] ml-1.5">({waitingEntries.length} Patients)</span>
        </h3>

        {/* HIPAA Compliance Switch */}
        <button
          onClick={() => setPrivacyMask(!privacyMask)}
          className="text-xs text-[#5A634D] hover:bg-[#F2F0EB] hover:text-[#4A4A35] flex items-center gap-1.5 px-4 py-2 rounded-full border border-[#E0DBCF] bg-white transition-all font-bold cursor-pointer"
          id="btn-hipaa-toggle"
        >
          {privacyMask ? (
            <>
              <Eye className="w-3.5 h-3.5" />
              <span>Show Full Names</span>
            </>
          ) : (
            <>
              <EyeOff className="w-3.5 h-3.5" />
              <span>Mask Surnames (HIPAA)</span>
            </>
          )}
        </button>
      </div>

      {waitingEntries.length === 0 ? (
        <div className="text-center py-14 text-[#9A9A8A] font-sans border-2 border-dashed border-[#E0DBCF] rounded-2xl bg-[#F9F8F6]">
          <CheckCircle2 className="w-10 h-10 text-[#5A634D]/40 mx-auto mb-3" />
          <p className="font-serif font-bold text-md text-[#4A4A35]">Waiting room clinic cleared!</p>
          <p className="text-xs text-[#9A9A8A] mt-1.5 max-w-sm mx-auto">
            Excellent. All registered patient tokens have finished active treatment.
          </p>
        </div>
      ) : (
        <div className="relative border-l-2 border-[#E0DBCF] ml-5 pl-7 space-y-6">
          {waitingEntries.map((entry, idx) => {
            const triage = getTriageLabel(entry.patient?.triage_score);
            const isConsulting = entry.status === 'in_consultation';
            const isEmergency = entry.patient?.is_emergency;

            return (
              <div key={entry.id} className="relative group animate-in fade-in slide-in-from-left-4 duration-200">
                
                {/* Timeline Dot Indicator */}
                <span className={`absolute -left-[37px] top-4.5 w-4.5 h-4.5 rounded-full border-2 flex items-center justify-center transition-all ${
                  isConsulting 
                    ? 'bg-[#5A634D] border-white ring-4 ring-[#E8EDE7]' 
                    : isEmergency
                      ? 'bg-[#D67D5B] border-white ring-4 ring-[#FFF5F2]'
                      : 'bg-white border-[#E0DBCF] group-hover:border-[#5A634D]'
                }`}>
                  {isConsulting && (
                    <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                  )}
                </span>

                <div className={`p-5 rounded-2xl border transition-all ${
                  isConsulting 
                    ? 'bg-[#E8EDE7] border-[#CBD2C6] shadow-sm' 
                    : isEmergency
                      ? 'bg-[#FFF5F2] border-[#F2D7D0] shadow-sm'
                      : 'bg-[#F9F8F6] border-[#E0DBCF]/80 hover:bg-white hover:-translate-y-0.5 hover:shadow-xs'
                }`}>
                  
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                    <div className="flex items-center gap-2.5">
                      <span className="font-serif text-sm font-bold bg-[#4A4A35] text-white px-3 py-1 rounded-xl shadow-xs">
                        {entry.token_number}
                      </span>
                      <span className="font-serif font-bold text-[#3D3D3D] text-md">
                        {formatPatientName(entry.patient?.name)}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`px-3 py-1 rounded-full text-[10px] font-bold font-serif border ${triage.bg}`}>
                        {triage.text}
                      </span>
                      <span className={`leading-none ${getStatusBadge(entry.status)}`}>
                        {isConsulting ? 'In Consultation' : 'Waiting'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-xs text-[#7A7A6A] font-sans pt-1 leading-none">
                    <span className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-[#9A9A8A]" />
                      Slot Entry: <span className="font-serif font-bold text-[#4A4A35]">{getEstimatedClockTime(idx)}</span>
                    </span>
                    <span className="text-[#E0DBCF]">•</span>
                    <span>
                      Triage score: <span className="font-semibold text-[#3D3D3D]">{entry.patient?.triage_score || 4}/5</span>
                    </span>
                  </div>

                  {isEmergency && (
                    <div className="mt-3 p-3 rounded-lg bg-[#FFF5F2] border border-[#F2D7D0] text-[#D67D5B] text-xs flex gap-2 items-center font-sans">
                      <AlertTriangle className="w-4 h-4 flex-shrink-0 text-[#D67D5B]" />
                      <span className="font-bold font-serif uppercase tracking-wider text-[10px]">Critical Bypass Warning:</span>
                      <span className="font-medium text-[#3D3D3D]">Advanced emergency priority routing authorized by clinic Physician staff.</span>
                    </div>
                  )}
                </div>

              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
