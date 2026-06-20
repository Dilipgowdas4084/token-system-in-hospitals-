/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Clinic {
  id: string;
  name: string;
  address?: string;
  avg_consultation_time: number; // in minutes
  created_at: string;
}

export interface Patient {
  id: string;
  clinic_id: string;
  name: string;
  age?: number;
  gender?: string;
  phone?: string;
  is_priority: boolean;
  priority_reason?: string;
  is_emergency: boolean;
  triage_score?: number; // AI-assigned triage score 1-5 (1=critical, 5=non-urgent)
  triage_notes?: string; // AI generated triage details
  created_at: string;
  updated_at: string;
}

export type QueueStatus = 'waiting' | 'called' | 'in_consultation' | 'completed' | 'skipped';

export interface QueueEntry {
  id: string;
  clinic_id: string;
  patient_id: string;
  token_number: string;
  status: QueueStatus;
  position: number;
  estimated_wait: number; // in minutes
  actual_wait?: number; // in minutes
  called_at?: string;
  started_at?: string;
  completed_at?: string;
  created_at: string;
  updated_at: string;
  patient?: Patient; // Joined in query representation
}

export interface Consultation {
  id: string;
  clinic_id: string;
  patient_id: string;
  queue_entry_id: string;
  actual_duration?: number; // in minutes
  doctor_notes?: string;
  created_at: string;
}

export interface Analytics {
  id: string;
  clinic_id: string;
  date: string; // YYYY-MM-DD
  total_patients: number;
  avg_wait_time: number; // in minutes
  avg_consultation_time: number; // in minutes
  peak_hour?: number; // Hour of the day (0-23)
  created_at: string;
}

export interface QueueHealth {
  total: number;
  waiting: number;
  inConsultation: number;
  completed: number;
  status: 'green' | 'yellow' | 'red';
}

export interface QueueUpdate {
  entries: QueueEntry[];
  health: QueueHealth;
  total: number;
}
