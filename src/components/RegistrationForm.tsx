/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { UserPlus, Sparkles, Loader2, AlertTriangle, ShieldCheck, HeartPulse } from 'lucide-react';
import { Patient, QueueEntry } from '../types.js';

interface RegistrationFormProps {
  onSubmit: (data: {
    name: string;
    age?: number;
    gender?: string;
    phone?: string;
    symptoms?: string;
  }) => Promise<{ patient: Patient; queueEntry: QueueEntry }>;
}

export default function RegistrationForm({ onSubmit }: RegistrationFormProps) {
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('Other');
  const [phone, setPhone] = useState('');
  const [symptoms, setSymptoms] = useState('');

  const [loading, setLoading] = useState(false);
  const [triageResult, setTriageResult] = useState<{
    patient: Patient;
    queueEntry: QueueEntry;
  } | null>(null);

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setLoading(true);
    try {
      const res = await onSubmit({
        name: name.trim(),
        age: age ? Number(age) : undefined,
        gender,
        phone: phone.trim() || undefined,
        symptoms: symptoms.trim() || undefined,
      });
      setTriageResult(res);
      // Reset inputs
      setName('');
      setAge('');
      setGender('Other');
      setPhone('');
      setSymptoms('');
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white border border-[#E0DBCF] rounded-[32px] p-8 shadow-sm">
      <h3 className="text-xl font-serif font-bold text-[#4A4A35] flex items-center gap-2.5 mb-5">
        <UserPlus className="w-5 h-5 text-[#5A634D]" />
        New Patient Check-In
      </h3>

      {/* Success Modal / Banner */}
      {triageResult && (
        <div className="mb-8 p-6 rounded-[24px] bg-[#E8EDE7] text-[#3D3D3D] border border-[#CBD2C6] shadow-md relative overflow-hidden animate-in fade-in zoom-in-95 duration-200">
          <div className="absolute top-0 right-0 w-32 h-32 bg-[#5A634D]/5 rounded-full blur-2xl pointer-events-none" />
          
          <div className="flex items-start justify-between mb-4">
            <span className="flex items-center gap-1.5 text-[11px] font-bold tracking-widest uppercase bg-[#5A634D]/15 text-[#5A634D] px-2.5 py-1 rounded-full border border-[#5A634D]/20">
              <Sparkles className="w-3.5 h-3.5 text-[#5A634D]" />
              AI Triage Record Generated
            </span>
            <button
              onClick={() => setTriageResult(null)}
              className="text-[#9A9A8A] hover:text-[#3D3D3D] font-mono text-xs font-bold bg-white/40 px-2 py-0.5 rounded"
              id="btn-triage-close"
            >
              Close
            </button>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-3 mb-5 pb-4 border-b border-[#CBD2C6]/50">
            <div>
              <p className="text-[10px] tracking-widest uppercase font-bold text-[#7A7A6A] mb-1">Your Assigned Token</p>
              <h4 className="text-4xl font-serif font-bold text-[#5A634D]">
                {triageResult.queueEntry.token_number}
              </h4>
            </div>
            <div>
              <p className="text-[10px] tracking-widest uppercase font-bold text-[#7A7A6A] mb-1">Est. Wait Time</p>
              <p className="text-2xl font-serif text-[#D67D5B] font-bold">
                ~{triageResult.queueEntry.estimated_wait} mins
              </p>
            </div>
          </div>

          <div className="space-y-3 text-sm font-sans">
            <div className="flex items-center justify-between">
              <span className="text-[#7A7A6A] font-semibold">Patient Name:</span>
              <span className="text-[#3D3D3D] font-bold text-right">{triageResult.patient.name}</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-[#7A7A6A] font-semibold">AI Triage Classification:</span>
              <span className="font-serif bg-[#5A634D] text-[#F2F0EB] px-3 py-1 rounded-full text-xs font-bold">
                Priority: Level {triageResult.patient.triage_score || 4} / 5
              </span>
            </div>

            {triageResult.patient.is_priority && (
              <div className="p-3.5 rounded-xl bg-[#FFF5F2] border border-[#F2D7D0] text-[#D67D5B] text-xs flex gap-2.5">
                <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5 text-[#D67D5B]" />
                <div>
                  <span className="font-bold uppercase tracking-wider block text-[10px] mb-0.5">Clinical Line Bypass Triggered</span>
                  <span className="font-medium">{triageResult.patient.priority_reason}</span>
                </div>
              </div>
            )}

            <div className="p-4 bg-white border border-[#E0DBCF] rounded-xl text-[#3D3D3D] shadow-inner mt-4">
              <span className="text-[10px] uppercase tracking-widest font-bold text-[#9A9A8A] block mb-2">Automated Screen Summary</span>
              <p className="leading-relaxed text-xs font-medium italic">"{triageResult.patient.triage_notes || 'Patient checked in successfully.'}"</p>
            </div>
          </div>
        </div>
      )}

      <form onSubmit={handleFormSubmit} className="space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label className="block text-xs font-serif font-bold uppercase tracking-widest text-[#7A7A6A] mb-2">
              Full Name *
            </label>
            <input
              type="text"
              required
              disabled={loading}
              placeholder="e.g. Liam Thompson"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-[#F9F8F6] border border-[#E0DBCF] text-[#3D3D3D] text-sm rounded-xl px-4 py-3 placeholder-[#9A9A8A] focus:bg-white focus:outline-none focus:border-[#5A634D] focus:ring-1 focus:ring-[#5A634D] transition-colors"
              id="input-name"
            />
          </div>

          <div>
            <label className="block text-xs font-serif font-bold uppercase tracking-widest text-[#7A7A6A] mb-2">
              Phone Number
            </label>
            <input
              type="tel"
              disabled={loading}
              placeholder="e.g. 555-0125"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full bg-[#F9F8F6] border border-[#E0DBCF] text-[#3D3D3D] text-sm rounded-xl px-4 py-3 placeholder-[#9A9A8A] focus:bg-white focus:outline-none focus:border-[#5A634D] focus:ring-1 focus:ring-[#5A634D] transition-colors"
              id="input-phone"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-5">
          <div>
            <label className="block text-xs font-serif font-bold uppercase tracking-widest text-[#7A7A6A] mb-2">
              Age
            </label>
            <input
              type="number"
              disabled={loading}
              placeholder="e.g. 32"
              value={age}
              onChange={(e) => setAge(e.target.value)}
              className="w-full bg-[#F9F8F6] border border-[#E0DBCF] text-[#3D3D3D] text-sm rounded-xl px-4 py-3 placeholder-[#9A9A8A] focus:bg-white focus:outline-none focus:border-[#5A634D] focus:ring-1 focus:ring-[#5A634D] transition-colors"
              id="input-age"
            />
          </div>

          <div>
            <label className="block text-xs font-serif font-bold uppercase tracking-widest text-[#7A7A6A] mb-2">
              Gender Identity
            </label>
            <select
              disabled={loading}
              value={gender}
              onChange={(e) => setGender(e.target.value)}
              className="w-full bg-[#F9F8F6] border border-[#E0DBCF] text-[#3D3D3D] text-sm rounded-xl px-4 py-3.5 focus:bg-white focus:outline-none focus:border-[#5A634D] focus:ring-1 focus:ring-[#5A634D] transition-all cursor-pointer"
              id="select-gender"
            >
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Other">Other / Non-binary</option>
            </select>
          </div>
        </div>

        <div>
          <div className="flex justify-between items-center mb-2">
            <label className="text-xs font-serif font-bold uppercase tracking-widest text-[#7A7A6A]">
              Symptom Description *
            </label>
            <span className="text-[10px] text-[#5A634D] font-serif font-semibold flex items-center gap-1 bg-[#E8EDE7] px-2.5 py-1 rounded-full border border-[#CBD2C6]">
              <Sparkles className="w-3 h-3 text-[#5A634D]" />
              AI Pre-Screen Trigger
            </span>
          </div>
          <textarea
            required
            disabled={loading}
            rows={3}
            placeholder="Please detail physical concerns (e.g., severe migraines with chest flutters, cough and low-grade throat scratchiness with high fever for 3 days)..."
            value={symptoms}
            onChange={(e) => setSymptoms(e.target.value)}
            className="w-full bg-[#F9F8F6] border border-[#E0DBCF] text-[#3D3D3D] text-sm rounded-xl p-4 placeholder-[#9A9A8A] focus:bg-white focus:outline-none focus:border-[#5A634D] focus:ring-1 focus:ring-[#5A634D] transition-colors"
            id="input-symptoms"
          />
          <p className="text-[10px] text-[#9A9A8A] font-sans mt-2">
            * Symptoms will be securely validated in real-time by clinical AI analysis to prioritize line order.
          </p>
        </div>

        <button
          type="submit"
          disabled={loading || !name.trim()}
          className="w-full bg-[#5A634D] text-[#F2F0EB] hover:bg-[#4A513E] disabled:bg-[#E0DBCF] disabled:text-[#9A9A8A] font-serif font-bold text-sm py-4 px-6 rounded-full shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2.5 cursor-pointer uppercase tracking-wider"
          id="btn-register"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin text-white" />
              <span>Analyzing Clinic Pre-screen & Issuing Token...</span>
            </>
          ) : (
            <>
              <HeartPulse className="w-4 h-4" />
              <span>Register & Check-In Patient</span>
            </>
          )}
        </button>
      </form>
    </div>
  );
}
