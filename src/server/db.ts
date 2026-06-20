/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import fs from 'fs/promises';
import path from 'path';
import { Clinic, Patient, QueueEntry, Consultation, Analytics, QueueStatus } from '../types.js';

const DB_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DB_DIR, 'queuecure_db.json');

interface Schema {
  clinics: Clinic[];
  patients: Patient[];
  queue_entries: QueueEntry[];
  consultations: Consultation[];
  analytics: Analytics[];
}

export class DatabaseService {
  private data: Schema = {
    clinics: [],
    patients: [],
    queue_entries: [],
    consultations: [],
    analytics: [],
  };

  private isInitialized = false;

  async initialize() {
    if (this.isInitialized) return;

    try {
      // Ensure directory exists
      await fs.mkdir(DB_DIR, { recursive: true });

      try {
        const fileContent = await fs.readFile(DB_FILE, 'utf-8');
        this.data = JSON.parse(fileContent);
        console.log('✅ Local Database loaded successfully with:', {
          clinics: this.data.clinics.length,
          patients: this.data.patients.length,
          queueEntries: this.data.queue_entries.length,
          consultations: this.data.consultations.length,
        });
      } catch (err) {
        console.log('⚠️ Database file not found or corrupted, seeding default values...');
        await this.seedDefaults();
      }

      this.isInitialized = true;
    } catch (error) {
      console.error('❌ Failed to initialize database service:', error);
      throw error;
    }
  }

  private async seedDefaults() {
    const defaultClinicId = 'clinic-1';

    const clinics: Clinic[] = [
      {
        id: defaultClinicId,
        name: 'Central Care Clinic',
        address: '123 Health Ave, Medical District',
        avg_consultation_time: 12,
        created_at: new Date().toISOString(),
      },
      {
        id: 'clinic-2',
        name: 'Pediatrics Specialists',
        address: '456 Wellness Blvd, Ste 200',
        avg_consultation_time: 15,
        created_at: new Date().toISOString(),
      }
    ];

    const patients: Patient[] = [
      {
        id: 'pat-1',
        clinic_id: defaultClinicId,
        name: 'Sarah Jenkins',
        age: 34,
        gender: 'Female',
        phone: '123-456-7890',
        is_priority: false,
        is_emergency: false,
        triage_score: 4,
        triage_notes: 'Mild persistent cough, normal vitals.',
        created_at: new Date(Date.now() - 3600000 * 2.5).toISOString(),
        updated_at: new Date(Date.now() - 3600000 * 2.5).toISOString(),
      },
      {
        id: 'pat-2',
        clinic_id: defaultClinicId,
        name: 'George Miller',
        age: 72,
        gender: 'Male',
        phone: '987-654-3210',
        is_priority: true,
        priority_reason: 'Elderly / Chest Discomfort',
        is_emergency: false,
        triage_score: 2,
        triage_notes: 'Hypertension history, slight tightness. Prioritized.',
        created_at: new Date(Date.now() - 3600000 * 2.1).toISOString(),
        updated_at: new Date(Date.now() - 3600000 * 2.1).toISOString(),
      },
      {
        id: 'pat-3',
        clinic_id: defaultClinicId,
        name: 'David Kim',
        age: 12,
        gender: 'Male',
        phone: '555-019-2834',
        is_priority: false,
        is_emergency: false,
        triage_score: 5,
        triage_notes: 'Routine school checkup immunization.',
        created_at: new Date(Date.now() - 3600000 * 1.5).toISOString(),
        updated_at: new Date(Date.now() - 3600000 * 1.5).toISOString(),
      },
      {
        id: 'pat-4',
        clinic_id: defaultClinicId,
        name: 'Amanda Ross',
        age: 28,
        gender: 'Female',
        phone: '555-443-1289',
        is_priority: false,
        is_emergency: false,
        triage_score: 3,
        triage_notes: 'Moderate ankle swelling after hiking. Cold compress supplied.',
        created_at: new Date(Date.now() - 3600000 * 0.8).toISOString(),
        updated_at: new Date(Date.now() - 3600000 * 0.8).toISOString(),
      }
    ];

    const queue_entries: QueueEntry[] = [
      {
        id: 'qe-1',
        clinic_id: defaultClinicId,
        patient_id: 'pat-1',
        token_number: 'T-001',
        status: 'completed',
        position: 1,
        estimated_wait: 12,
        actual_wait: 10,
        called_at: new Date(Date.now() - 3600000 * 2.0).toISOString(),
        started_at: new Date(Date.now() - 3600000 * 2.0).toISOString(),
        completed_at: new Date(Date.now() - 3600000 * 1.8).toISOString(),
        created_at: new Date(Date.now() - 3600000 * 2.5).toISOString(),
        updated_at: new Date(Date.now() - 3600000 * 1.8).toISOString(),
      },
      {
        id: 'qe-2',
        clinic_id: defaultClinicId,
        patient_id: 'pat-2',
        token_number: 'T-002',
        status: 'in_consultation',
        position: 1,
        estimated_wait: 15,
        actual_wait: 22,
        called_at: new Date(Date.now() - 3600000 * 0.3).toISOString(),
        started_at: new Date(Date.now() - 3600000 * 0.3).toISOString(),
        created_at: new Date(Date.now() - 3600000 * 2.1).toISOString(),
        updated_at: new Date(Date.now() - 3600000 * 0.3).toISOString(),
      },
      {
        id: 'qe-3',
        clinic_id: defaultClinicId,
        patient_id: 'pat-3',
        token_number: 'T-003',
        status: 'waiting',
        position: 2,
        estimated_wait: 24,
        created_at: new Date(Date.now() - 3600000 * 1.5).toISOString(),
        updated_at: new Date(Date.now() - 3600000 * 1.5).toISOString(),
      },
      {
        id: 'qe-4',
        clinic_id: defaultClinicId,
        patient_id: 'pat-4',
        token_number: 'T-004',
        status: 'waiting',
        position: 3,
        estimated_wait: 36,
        created_at: new Date(Date.now() - 3600000 * 0.8).toISOString(),
        updated_at: new Date(Date.now() - 3600000 * 0.8).toISOString(),
      }
    ];

    const consultations: Consultation[] = [
      {
        id: 'c-1',
        clinic_id: defaultClinicId,
        patient_id: 'pat-1',
        queue_entry_id: 'qe-1',
        actual_duration: 10,
        doctor_notes: 'Bronchial irritation. Prescribed inhaler and hydration.',
        created_at: new Date(Date.now() - 3600000 * 1.8).toISOString(),
      }
    ];

    const analytics: Analytics[] = [
      {
        id: 'an-1',
        clinic_id: defaultClinicId,
        date: new Date().toISOString().split('T')[0],
        total_patients: 15,
        avg_wait_time: 14,
        avg_consultation_time: 11,
        peak_hour: 10, // 10:00 AM
        created_at: new Date().toISOString(),
      }
    ];

    this.data = { clinics, patients, queue_entries, consultations, analytics };
    await this.saveData();
  }

  private async saveData() {
    try {
      await fs.writeFile(DB_FILE, JSON.stringify(this.data, null, 2), 'utf-8');
    } catch (error) {
      console.error('❌ Failed to save database changes:', error);
    }
  }

  // Clinic methods
  async getClinic(id: string): Promise<Clinic | undefined> {
    await this.initialize();
    return this.data.clinics.find((c) => c.id === id);
  }

  async getAllClinics(): Promise<Clinic[]> {
    await this.initialize();
    return this.data.clinics;
  }

  async updateClinicAvgTime(id: string, avgTime: number) {
    await this.initialize();
    const clinic = this.data.clinics.find((c) => c.id === id);
    if (clinic) {
      clinic.avg_consultation_time = avgTime;
      await this.saveData();
    }
    return clinic;
  }

  // Patient methods
  async createPatient(data: Partial<Patient> & { clinicId: string; name: string }): Promise<Patient> {
    await this.initialize();
    const patient: Patient = {
      id: data.id || `pat-${Date.now()}`,
      clinic_id: data.clinicId,
      name: data.name,
      age: data.age,
      gender: data.gender,
      phone: data.phone,
      is_priority: data.is_priority || false,
      priority_reason: data.priority_reason,
      is_emergency: data.is_emergency || false,
      triage_score: data.triage_score,
      triage_notes: data.triage_notes,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    this.data.patients.push(patient);
    await this.saveData();
    return patient;
  }

  async findPatientByName(clinicId: string, name: string): Promise<Patient | undefined> {
    await this.initialize();
    const cleanName = name.toLowerCase().trim();
    return this.data.patients.find(
      (p) => p.clinic_id === clinicId && p.name.toLowerCase().includes(cleanName)
    );
  }

  async markPatientAsPriority(patientId: string, reason: string) {
    await this.initialize();
    const patient = this.data.patients.find((p) => p.id === patientId);
    if (patient) {
      const isEmergency = reason.toLowerCase() === 'emergency' || reason.toLowerCase().includes('critical');
      patient.is_priority = true;
      patient.is_emergency = isEmergency;
      patient.priority_reason = reason;
      patient.updated_at = new Date().toISOString();

      // Find active queue entries for this patient and make emergency/priority
      const activeEntry = this.data.queue_entries.find(
        (qe) => qe.patient_id === patientId && (qe.status === 'waiting' || qe.status === 'called')
      );
      if (activeEntry) {
         // This will trigger reordering downstream
         activeEntry.updated_at = new Date().toISOString();
      }

      await this.saveData();
    }
    return patient;
  }

  // Queue Entry methods
  async createQueueEntry(data: Partial<QueueEntry> & { patientId: string; clinic_id: string; token_number: string; position: number }): Promise<QueueEntry> {
    await this.initialize();
    const entry: QueueEntry = {
      id: data.id || `qe-${Date.now()}`,
      clinic_id: data.clinic_id,
      patient_id: data.patientId,
      token_number: data.token_number,
      status: (data.status as QueueStatus) || 'waiting',
      position: data.position,
      estimated_wait: data.estimated_wait || 0,
      actual_wait: data.actual_wait,
      called_at: data.called_at,
      started_at: data.started_at,
      completed_at: data.completed_at,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    this.data.queue_entries.push(entry);
    await this.saveData();
    return entry;
  }

  async getQueueEntry(id: string): Promise<QueueEntry | undefined> {
    await this.initialize();
    return this.data.queue_entries.find((qe) => qe.id === id);
  }

  async getActiveQueueEntries(clinicId: string): Promise<QueueEntry[]> {
    await this.initialize();
    // Return waiting, called, and in_consultation entries, sorted by position
    const entries = this.data.queue_entries.filter(
      (qe) => qe.clinic_id === clinicId && ['waiting', 'called', 'in_consultation'].includes(qe.status)
    );

    // Join patient node
    const result: QueueEntry[] = [];
    for (const qe of entries) {
      const patient = this.data.patients.find((p) => p.id === qe.patient_id);
      result.push({
        ...qe,
        patient,
      });
    }

    // Sort: live active positions
    return result.sort((a, b) => a.position - b.position);
  }

  async getNextInQueue(clinicId: string): Promise<QueueEntry | undefined> {
    await this.initialize();
    const waitingEntries = this.data.queue_entries.filter(
      (qe) => qe.clinic_id === clinicId && qe.status === 'waiting'
    );

    if (waitingEntries.length === 0) return undefined;

    // Join Patient to determine priorities
    const waitingWithPatients = waitingEntries.map((qe) => {
      const patient = this.data.patients.find((p) => p.id === qe.patient_id);
      return { ...qe, patient };
    });

    // Sort: Emergency > priority > position
    waitingWithPatients.sort((a, b) => {
      const aEmerg = a.patient?.is_emergency ? 1 : 0;
      const bEmerg = b.patient?.is_emergency ? 1 : 0;
      if (aEmerg !== bEmerg) return bEmerg - aEmerg;

      const aPrio = a.patient?.is_priority ? 1 : 0;
      const bPrio = b.patient?.is_priority ? 1 : 0;
      if (aPrio !== bPrio) return bPrio - aPrio;

      return a.position - b.position;
    });

    return waitingWithPatients[0];
  }

  async getActiveQueueCount(clinicId: string): Promise<number> {
    await this.initialize();
    return this.data.queue_entries.filter(
      (qe) => qe.clinic_id === clinicId && ['waiting', 'called', 'in_consultation'].includes(qe.status)
    ).length;
  }

  async getPriorityCount(clinicId: string): Promise<number> {
    await this.initialize();
    const waitingEntries = this.data.queue_entries.filter(
      (qe) => qe.clinic_id === clinicId && qe.status === 'waiting'
    );

    let count = 0;
    for (const qe of waitingEntries) {
      const patient = this.data.patients.find((p) => p.id === qe.patient_id);
      if (patient?.is_priority && !patient?.is_emergency) count++;
    }
    return count;
  }

  async getEmergencyCount(clinicId: string): Promise<number> {
    await this.initialize();
    const waitingEntries = this.data.queue_entries.filter(
      (qe) => qe.clinic_id === clinicId && qe.status === 'waiting'
    );

    let count = 0;
    for (const qe of waitingEntries) {
      const patient = this.data.patients.find((p) => p.id === qe.patient_id);
      if (patient?.is_emergency) count++;
    }
    return count;
  }

  async getClinicIdFromQueue(queueId: string): Promise<string | undefined> {
    await this.initialize();
    return this.data.queue_entries.find((qe) => qe.id === queueId)?.clinic_id;
  }

  async updateQueueStatus(queueId: string, status: QueueStatus) {
    await this.initialize();
    const entry = this.data.queue_entries.find((qe) => qe.id === queueId);
    if (entry) {
      entry.status = status;
      entry.updated_at = new Date().toISOString();
      await this.saveData();
    }
    return entry;
  }

  async updateQueuePosition(queueId: string, position: number) {
    await this.initialize();
    const entry = this.data.queue_entries.find((qe) => qe.id === queueId);
    if (entry) {
      entry.position = position;
      entry.updated_at = new Date().toISOString();
      await this.saveData();
    }
    return entry;
  }

  async updateCalledAt(queueId: string) {
    await this.initialize();
    const entry = this.data.queue_entries.find((qe) => qe.id === queueId);
    if (entry) {
      entry.called_at = new Date().toISOString();
      entry.started_at = new Date().toISOString();
      entry.updated_at = new Date().toISOString();
      await this.saveData();
    }
    return entry;
  }

  async updateCompletedAt(queueId: string) {
    await this.initialize();
    const entry = this.data.queue_entries.find((qe) => qe.id === queueId);
    if (entry) {
      entry.completed_at = new Date().toISOString();
      entry.updated_at = new Date().toISOString();
      await this.saveData();
    }
    return entry;
  }

  async updateActualWait(queueId: string, waitTime: number) {
    await this.initialize();
    const entry = this.data.queue_entries.find((qe) => qe.id === queueId);
    if (entry) {
      entry.actual_wait = waitTime;
      entry.updated_at = new Date().toISOString();
      await this.saveData();
    }
    return entry;
  }

  // Consultation methods
  async createConsultation(data: { clinicId: string; patientId: string; queueEntryId: string; actualDuration?: number; doctorNotes?: string }): Promise<Consultation> {
    await this.initialize();
    const consult: Consultation = {
      id: `c-${Date.now()}`,
      clinic_id: data.clinicId,
      patient_id: data.patientId,
      queue_entry_id: data.queueEntryId,
      actual_duration: data.actualDuration,
      doctor_notes: data.doctorNotes,
      created_at: new Date().toISOString(),
    };
    this.data.consultations.push(consult);
    await this.saveData();
    return consult;
  }

  async getRecentConsultations(clinicId: string, limit: number): Promise<Consultation[]> {
    await this.initialize();
    return this.data.consultations
      .filter((c) => c.clinic_id === clinicId)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, limit);
  }

  // Analytics methods
  async getClinicAnalytics(clinicId: string): Promise<Analytics | undefined> {
    await this.initialize();
    const todayStr = new Date().toISOString().split('T')[0];
    let dailyAnalytics = this.data.analytics.find((a) => a.clinic_id === clinicId && a.date === todayStr);

    if (!dailyAnalytics) {
      dailyAnalytics = {
        id: `an-${Date.now()}`,
        clinic_id: clinicId,
        date: todayStr,
        total_patients: 0,
        avg_wait_time: 0,
        avg_consultation_time: 0,
        created_at: new Date().toISOString(),
      };
      this.data.analytics.push(dailyAnalytics);
      await this.saveData();
    }
    return dailyAnalytics;
  }

  async getWeeklyAnalytics(clinicId: string): Promise<Analytics[]> {
    await this.initialize();
    return this.data.analytics.filter((a) => a.clinic_id === clinicId);
  }

  async updateDailyAnalytics(clinicId: string, totalCount?: number, avgWait?: number, avgConsult?: number) {
    await this.initialize();
    const analytics = await this.getClinicAnalytics(clinicId);
    if (analytics) {
      if (totalCount !== undefined) analytics.total_patients = totalCount;
      if (avgWait !== undefined) analytics.avg_wait_time = avgWait;
      if (avgConsult !== undefined) analytics.avg_consultation_time = avgConsult;
      await this.saveData();
    }
    return analytics;
  }
}
