/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Server } from 'socket.io';
import { DatabaseService } from './db.js';
import { AIService } from './ai.js';
import { QueueEntry, QueueHealth, QueueUpdate } from '../types.js';

export class WaitTimeService {
  constructor(private db: DatabaseService, private ai: AIService) {}

  /**
   * Calculates estimated wait-time dynamically in minutes for a clinic.
   */
  async calculateWaitTime(clinicId: string): Promise<number> {
    try {
      // Get base consultation time
      const clinic = await this.db.getClinic(clinicId);
      const baseTime = clinic?.avg_consultation_time || 12;

      // Get recent consultations (last 5)
      const recentConsults = await this.db.getRecentConsultations(clinicId, 5);
      const avgRecent = this.calculateAverage(recentConsults, baseTime);

      // Doctor speed multiplier (recent speed vs base)
      const speedFactor = avgRecent / baseTime;

      // Current active queue elements
      const activeQueue = await this.db.getActiveQueueEntries(clinicId);
      const waitingCount = activeQueue.filter((qe) => qe.status === 'waiting').length;

      // Priority loads
      const priorityCount = await this.db.getPriorityCount(clinicId);
      const emergencyCount = await this.db.getEmergencyCount(clinicId);

      // Smart wait time calculation
      // base consult time modified by doctor's real-time speed, multiplied by line size, with priority multipliers
      let calculatedMins = avgRecent * (waitingCount + (priorityCount * 0.4) + (emergencyCount * 1.5));

      // If clinical consultations have an ongoing patient, add remaining portion
      const inConsult = activeQueue.filter((qe) => qe.status === 'in_consultation');
      if (inConsult.length > 0) {
        calculatedMins += (avgRecent * 0.5); // Add a 50% average consulting buffer
      }

      // Add emergency buffers
      calculatedMins += emergencyCount * 8;

      // Bound minimum
      calculatedMins = Math.max(calculatedMins, waitingCount > 0 ? 5 : 0);

      const finalWaitMinutes = Math.round(calculatedMins);
      console.log(`⏱️ Computed Wait Time for ${clinicId}: ${finalWaitMinutes} mins (Active Queue: ${activeQueue.length})`);
      return finalWaitMinutes;
    } catch (error) {
      console.error('Error calculating wait time:', error);
      return 15; // Safe default
    }
  }

  private calculateAverage(consultations: any[], defaultVal: number): number {
    if (!consultations || consultations.length === 0) return defaultVal;
    const items = consultations.filter((c) => c.actual_duration !== undefined);
    if (items.length === 0) return defaultVal;

    const sum = items.reduce((acc, curr) => acc + (curr.actual_duration || defaultVal), 0);
    return sum / items.length;
  }

  /**
   * Static prediction generator based on logs.
   */
  async getPredictedPeakTime(clinicId: string): Promise<string> {
    try {
      const analytics = await this.db.getWeeklyAnalytics(clinicId);
      if (!analytics || analytics.length === 0) {
        return '11:00 AM'; // Default safe suggestion
      }

      const hourCounts: Record<number, number> = {};
      analytics.forEach((day) => {
        if (day.peak_hour !== undefined && day.peak_hour !== null) {
          hourCounts[day.peak_hour] = (hourCounts[day.peak_hour] || 0) + 1;
        }
      });

      let maxHour = 10; // Default peak start
      let maxCount = 0;
      Object.entries(hourCounts).forEach(([hour, count]) => {
        if (count > maxCount) {
          maxCount = count;
          maxHour = parseInt(hour, 10);
        }
      });

      const period = maxHour >= 12 ? 'PM' : 'AM';
      const displayHour = maxHour > 12 ? maxHour - 12 : maxHour === 0 ? 12 : maxHour;
      return `${displayHour}:30 ${period}`;
    } catch (error) {
      return '11:00 AM';
    }
  }

  /**
   * Orchestrates high-fidelity AI recommendations combined with database telemetry
   */
  async getQueuePrediction(clinicId: string) {
    const clinic = await this.db.getClinic(clinicId);
    const clinicName = clinic?.name || 'Central Clinic';
    const baseTime = clinic?.avg_consultation_time || 12;

    const activeList = await this.db.getActiveQueueEntries(clinicId);
    const waitingCount = activeList.filter(e => e.status === 'waiting').length;

    // Get treated patients counts
    const todayAnalytics = await this.db.getClinicAnalytics(clinicId);
    const totalTreated = todayAnalytics?.total_patients || 0;

    // Ask Gemini AI for predictive advice
    const aiPrediction = await this.ai.predictOptimalTime(
      clinicName,
      waitingCount,
      baseTime,
      totalTreated
    );

    // Fetch wait times
    const waitTime = await this.calculateWaitTime(clinicId);

    return {
      bestTime: aiPrediction.bestTime,
      suggestion: aiPrediction.suggestion,
      recommendations: aiPrediction.recommendations,
      confidence: waitingCount > 5 ? 'High' : 'Medium',
      averageWait: waitTime,
      totalPatients: totalTreated + activeList.length,
    };
  }
}

export class QueueService {
  constructor(
    private db: DatabaseService,
    private io: Server,
    private waitTimeService: WaitTimeService
  ) {}

  /**
   * Adds a patient to the current clinic's queue timeline.
   */
  async addPatient(patientId: string, clinicId: string) {
    const position = await this.getNextPosition(clinicId);
    const tokenNumber = this.generateTokenNumber(position);

    // Calculate initial estimated wait
    const baseWait = await this.waitTimeService.calculateWaitTime(clinicId);

    const queueEntry = await this.db.createQueueEntry({
      patientId,
      clinic_id: clinicId,
      token_number: tokenNumber,
      position,
      status: 'waiting',
      estimated_wait: baseWait,
    });

    console.log(`✅ Queue entry created: ${tokenNumber} for patient ${patientId}`);
    return queueEntry;
  }

  /**
   * Reorders patients inside the queue based on priorities.
   * Emergency > priority > position.
   */
  async reorderQueue(clinicId: string) {
    const entries = await this.db.getActiveQueueEntries(clinicId);

    // Keep apart those already "in_consultation" or "called" -- they stay top-prioritized in their current order
    const inProgress = entries.filter((e) => ['called', 'in_consultation'].includes(e.status));
    const waitingList = entries.filter((e) => e.status === 'waiting');

    // Sort waiting list by clinical severity
    waitingList.sort((a, b) => {
      const aPatient = a.patient;
      const bPatient = b.patient;

      const aEmerg = aPatient?.is_emergency ? 1 : 0;
      const bEmerg = bPatient?.is_emergency ? 1 : 0;
      if (aEmerg !== bEmerg) return bEmerg - aEmerg; // Emergencies go first

      const aPrio = aPatient?.is_priority ? 1 : 0;
      const bPrio = bPatient?.is_priority ? 1 : 0;
      if (aPrio !== bPrio) return bPrio - aPrio; // Priorities go second

      // If both are priorities, sort by triage score (lower is more urgent)
      const aTriage = aPatient?.triage_score || 5;
      const bTriage = bPatient?.triage_score || 5;
      if (aTriage !== bTriage) return aTriage - bTriage;

      return a.position - b.position; // Standard order
    });

    const fullSorted = [...inProgress, ...waitingList];

    // Re-save queue positions index
    for (let i = 0; i < fullSorted.length; i++) {
       await this.db.updateQueuePosition(fullSorted[i].id, i + 1);
       fullSorted[i].position = i + 1;
    }

    return fullSorted;
  }

  /**
   * Calls the next available patient in the queue timeline.
   */
  async callNextToken(clinicId: string) {
    // Reorder first to ensure clinical triage safety
    await this.reorderQueue(clinicId);

    const nextEntry = await this.db.getNextInQueue(clinicId);
    if (!nextEntry) {
      console.log(`⚠️ No waiting patients in queue for clinic ${clinicId}`);
      return null;
    }

    // Update status to 'called' first, transitioning to consultation
    await this.db.updateQueueStatus(nextEntry.id, 'in_consultation');
    await this.db.updateCalledAt(nextEntry.id);

    // Calculate how long they actually waited
    const waitTimeMins = Math.floor(
      (Date.now() - new Date(nextEntry.created_at).getTime()) / 60000
    );
    await this.db.updateActualWait(nextEntry.id, waitTimeMins);

    // Log treated stats
    const todayAnalytics = await this.db.getClinicAnalytics(clinicId);
    if (todayAnalytics) {
      const newTotal = todayAnalytics.total_patients + 1;
      const newAvgWait = todayAnalytics.avg_wait_time === 0 
        ? waitTimeMins 
        : Math.round((todayAnalytics.avg_wait_time + waitTimeMins) / 2);
      await this.db.updateDailyAnalytics(clinicId, newTotal, newAvgWait, undefined);
    }

    // Broadcast called event across the clinic network
    this.io.to(`clinic:${clinicId}`).emit('token:called', {
      token: nextEntry.token_number,
      patientName: nextEntry.patient?.name || 'Unknown Patient',
      patientId: nextEntry.patient_id,
      queueId: nextEntry.id,
    });

    console.log(`📢 Called next client token ${nextEntry.token_number} at clinic ${clinicId}`);
    return nextEntry;
  }

  /**
   * Completes a patient's consultation session.
   */
  async completePatient(queueId: string, durationMinutes: number, doctorNotes?: string) {
    // Pull full queue data
    const entry = await this.db.getQueueEntry(queueId);
    if (!entry) return { success: false, error: 'Queue entry not found' };

    await this.db.updateQueueStatus(queueId, 'completed');
    await this.db.updateCompletedAt(queueId);

    // Save Consultation record
    await this.db.createConsultation({
      clinicId: entry.clinic_id,
      patientId: entry.patient_id,
      queueEntryId: queueId,
      actualDuration: durationMinutes,
      doctorNotes: doctorNotes || 'Consultation processed successfully.',
    });

    // Update dynamic statistics in analytics
    const todayAnalytics = await this.db.getClinicAnalytics(entry.clinic_id);
    if (todayAnalytics) {
       const recentAvgCons = todayAnalytics.avg_consultation_time === 0
         ? durationMinutes
         : Math.round((todayAnalytics.avg_consultation_time + durationMinutes) / 2);
       await this.db.updateDailyAnalytics(entry.clinic_id, undefined, undefined, recentAvgCons);
    }

    // Force post-completed positions offset re-order
    await this.reorderQueue(entry.clinic_id);

    // Broadcast full queue update
    await this.emitQueueUpdate(entry.clinic_id);
    await this.emitWaitTimeUpdate(entry.clinic_id);

    return { success: true };
  }

  private async getNextPosition(clinicId: string): Promise<number> {
    const listCount = await this.db.getActiveQueueCount(clinicId);
    return listCount + 1;
  }

  private generateTokenNumber(position: number): string {
    const padded = String(position).padStart(3, '0');
    return `T-${padded}`;
  }

  /**
   * Collects current queue data, computes clinic healthy flags and returns package
   */
  async getQueueData(clinicId: string): Promise<QueueUpdate> {
    const entries = await this.db.getActiveQueueEntries(clinicId);
    const health = this.calculateQueueHealth(entries);

    return {
      entries,
      health,
      total: entries.length,
    };
  }

  async getWaitTime(clinicId: string): Promise<number> {
    return this.waitTimeService.calculateWaitTime(clinicId);
  }

  private calculateQueueHealth(entries: QueueEntry[]): QueueHealth {
    const waiting = entries.filter((e) => e.status === 'waiting').length;
    const inConsultation = entries.filter((e) => e.status === 'in_consultation').length;
    const completed = entries.filter((e) => e.status === 'completed').length;
    const total = waiting + inConsultation;

    let status: 'green' | 'yellow' | 'red' = 'green';
    if (total > 8) status = 'red';
    else if (total > 4) status = 'yellow';

    return {
      total,
      waiting,
      inConsultation,
      completed,
      status,
    };
  }

  async emitQueueUpdate(clinicId: string) {
    const data = await this.getQueueData(clinicId);
    this.io.to(`clinic:${clinicId}`).emit('queue:update', data);
  }

  async emitWaitTimeUpdate(clinicId: string) {
    const waitTime = await this.getWaitTime(clinicId);
    const queueLength = await this.db.getActiveQueueCount(clinicId);
    const predictionData = await this.waitTimeService.getQueuePrediction(clinicId);

    this.io.to(`clinic:${clinicId}`).emit('waittime:update', {
      waitTime,
      queueLength,
      prediction: predictionData,
    });
  }

  async updateConsultationTime(clinicId: string, avgTime: number) {
    await this.db.updateClinicAvgTime(clinicId, avgTime);
    await this.emitWaitTimeUpdate(clinicId);
    await this.emitQueueUpdate(clinicId);
  }
}
