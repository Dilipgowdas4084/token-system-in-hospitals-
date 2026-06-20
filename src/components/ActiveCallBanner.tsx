/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { Volume2, VolumeX, Radio, CheckCircle, ArrowRight } from 'lucide-react';

interface CalledToken {
  token: string;
  patientName: string;
  patientId: string;
  queueId: string;
}

interface ActiveCallBannerProps {
  currentCall: CalledToken | null;
}

export default function ActiveCallBanner({ currentCall }: ActiveCallBannerProps) {
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [playedToken, setPlayedToken] = useState<string | null>(null);

  // Text-To-Speech announcement when a new patient gets called
  useEffect(() => {
    if (currentCall && voiceEnabled && playedToken !== currentCall.queueId) {
      setPlayedToken(currentCall.queueId);
      triggerAnnouncement(currentCall.token, currentCall.patientName);
    }
  }, [currentCall, voiceEnabled]);

  const triggerAnnouncement = (token: string, name: string) => {
    if (!('speechSynthesis' in window)) return;
    
    // First let's cancel any running speech
    window.speechSynthesis.cancel();

    // Create prompt voice instruction
    const tokenSpaced = token.replace('-', ' ');
    const promptText = `Now serving, token number ${tokenSpaced}, ${name}. Please proceed to Consulting Room One.`;
    
    const utterance = new SpeechSynthesisUtterance(promptText);
    utterance.volume = 1.0;
    utterance.rate = 0.95;
    utterance.pitch = 1.0;

    // Use standard English english voice if available
    const voices = window.speechSynthesis.getVoices();
    const docVoice = voices.find(v => v.lang.startsWith('en') && v.name.includes('Natural')) || 
                      voices.find(v => v.lang.startsWith('en'));
    if (docVoice) utterance.voice = docVoice;

    window.speechSynthesis.speak(utterance);
  };

  if (!currentCall) {
    return (
      <div className="bg-[#F9F8F6] border border-[#E0DBCF] rounded-[32px] p-8 text-center text-[#3D3D3D] shadow-sm relative overflow-hidden transition-all duration-300">
        <div className="absolute top-4 right-4 flex items-center gap-1.5">
          <button
            onClick={() => setVoiceEnabled(!voiceEnabled)}
            title={voiceEnabled ? "Mute Voice Announcements" : "Enable Voice Announcements"}
            className="text-[#9A9A8A] hover:text-[#5A634D] transition-colors p-1.5 rounded-lg hover:bg-[#F2F0EB]"
            id="btn-voice-toggle-idle"
          >
            {voiceEnabled ? <Volume2 className="w-4 h-4 text-[#70939B]" /> : <VolumeX className="w-4 h-4 text-[#D67D5B]" />}
          </button>
        </div>
        <Radio className="w-8 h-8 text-[#70939B] mx-auto mb-3 animate-pulse" />
        <p className="text-sm font-serif font-bold text-[#4A4A35]">Waiting room clinic operations are active.</p>
        <p className="text-xs text-[#9A9A8A] mt-1.5 max-w-md mx-auto">Ready for the doctor to summon the first patient token. Audio announcements are enabled.</p>
      </div>
    );
  }

  return (
    <div className="bg-[#5A634D] text-[#F2F0EB] rounded-[32px] p-8 shadow-md border border-[#5A634D]/20 relative overflow-hidden transition-all duration-300">
      {/* Visual Accent Ambient elements */}
      <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/5 rounded-full pointer-events-none" />
      <div className="absolute -bottom-12 -left-12 w-48 h-48 bg-[#70939B]/10 rounded-full blur-xl pointer-events-none" />

      <div className="absolute top-6 right-6 flex items-center gap-3">
        <button
          onClick={() => setVoiceEnabled(!voiceEnabled)}
          title={voiceEnabled ? "Mute Voice Announcements" : "Enable Voice Announcements"}
          className="bg-white/10 hover:bg-white/20 text-white border border-white/10 px-3 py-1.5 rounded-full transition-all flex items-center gap-1.5 text-[11px] font-bold tracking-wider uppercase"
          id="btn-voice-toggle-active"
        >
          {voiceEnabled ? (
            <>
              <Volume2 className="w-3.5 h-3.5" />
              <span>Voice On</span>
            </>
          ) : (
            <>
              <VolumeX className="w-3.5 h-3.5" />
              <span>Muted</span>
            </>
          )}
        </button>

        <span className="flex h-2.5 w-2.5 relative">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-40" />
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#D67D5B]" />
        </span>
      </div>

      <div className="flex items-center gap-2 mb-3 text-white/80 font-serif text-xs tracking-widest uppercase font-semibold">
        <Radio className="w-4 h-4 text-[#70939B] animate-pulse" />
        Currently Serving / Now Consulting
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
        <div className="md:col-span-4 flex items-center">
          <div className="inline-block bg-[#F2F0EB] text-[#5A634D] font-serif text-4xl md:text-5xl font-bold px-6 py-4 rounded-2xl tracking-tight shadow-md border border-[#E0DBCF]">
            {currentCall.token}
          </div>
        </div>

        <div className="md:col-span-8 flex flex-col justify-center">
          <p className="text-[10px] uppercase font-mono tracking-widest text-white/60 mb-1">Patient Name</p>
          <h2 className="text-2xl md:text-3xl font-serif font-bold tracking-tight text-white whitespace-nowrap overflow-hidden text-ellipsis underline decoration-[#D67D5B]/50 decoration-2 underline-offset-4">
            {currentCall.patientName}
          </h2>
          <div className="flex flex-wrap items-center gap-3 mt-4 leading-none text-xs text-white/80">
            <CheckCircle className="w-4 h-4 text-[#70939B]" />
            <span className="font-sans font-semibold">Proceed to Consulting Room One</span>
            <ArrowRight className="w-3.5 h-3.5 text-white/40" />
            <button 
              onClick={() => triggerAnnouncement(currentCall.token, currentCall.patientName)}
              className="underline hover:text-white font-bold text-[#F2F0EB]/95 transition-all"
              id="btn-repeat-speech"
            >
              Repeat Announcement
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
