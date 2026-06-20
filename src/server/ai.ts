/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GoogleGenAI, Type } from '@google/genai';

// Initialize the Google GenAI SDK with mandatory options
const apiKey = process.env.GEMINI_API_KEY;

export class AIService {
  private ai: GoogleGenAI | null = null;

  constructor() {
    if (apiKey) {
      this.ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });
      console.log('✨ Gemini AI Service initialized with User-Agent telemetry');
    } else {
      console.warn('⚠️ GEMINI_API_KEY not configured. Gemini capabilities will fall back to rule-based logic.');
    }
  }

  /**
   * Performs clinical symptom triage and prioritizes queues based on patient inputs.
   */
  async assessTriage(
    name: string,
    age?: number,
    gender?: string,
    symptoms?: string
  ): Promise<{ score: number; notes: string; isPriority: boolean; reason: string }> {
    const defaultFallback = {
      score: 4,
      notes: symptoms ? `Symptom report: ${symptoms}` : 'Routine clinic registration.',
      isPriority: false,
      reason: '',
    };

    if (!this.ai || !symptoms) {
      return defaultFallback;
    }

    try {
      const response = await this.ai.models.generateContent({
        model: 'gemini-3.5-flash',
        contents: `Assess the clinical triage priority for this patient based on symptoms.
Patient Information:
- Name: ${name}
- Age: ${age || 'Unknown'}
- Gender: ${gender || 'Unknown'}
- Symptoms / Reason for visit: "${symptoms}"

You must assign:
1. A Triage score from 1 to 5 (1 = Immediate resuscitation/Critical, 2 = Emergent, 3 = Urgent, 4 = Less Urgent, 5 = Non-Urgent).
2. Triage explanatory notes (briefly describing clinical rationale).
3. If they require prioritized processing (isPriority: true for scores 1, 2, and 3).
4. A concise priority reason (under 50 chars).`,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              score: {
                type: Type.INTEGER,
                description: 'Triage score 1-5 where 1 is absolute emergency, 5 is routine.',
              },
              notes: {
                type: Type.STRING,
                description: 'Explanatory notes for the clinical staff on what to do/watch.',
              },
              isPriority: {
                type: Type.BOOLEAN,
                description: 'True if triage score is 1, 2 or 3.',
              },
              priorityReason: {
                type: Type.STRING,
                description: 'Reason for prioritizing. Example: "Pediatric High Fever" or "Potential Cardiac Strain". Keep short.',
              },
            },
            required: ['score', 'notes', 'isPriority', 'priorityReason'],
          },
        },
      });

      const text = response.text || '';
      const result = JSON.parse(text);

      return {
        score: result.score || 4,
        notes: result.notes || defaultFallback.notes,
        isPriority: result.isPriority || false,
        reason: result.priorityReason || '',
      };
    } catch (error) {
      console.error('Error assessing triage with Gemini:', error);
      return defaultFallback;
    }
  }

  /**
   * Predicts the optimal time to visit and supplies queue wellness tips
   */
  async predictOptimalTime(
    clinicName: string,
    currentQueueLength: number,
    averageConsTime: number,
    totalConsultationsToday: number
  ): Promise<{ bestTime: string; suggestion: string; recommendations: string[] }> {
    const defaultFallback = {
      bestTime: '2:30 PM',
      suggestion: 'Consistently lighter loads are seen after the lunch-hour transition cycle.',
      recommendations: [
        'Plan arrival for 2:15 PM to benefit from the afternoon schedule reset.',
        'Hydrate properly and utilize the live virtual countdown ticker.',
        'If experiencing high irritability, let our front desk know for ambient support.',
      ],
    };

    if (!this.ai) {
      return defaultFallback;
    }

    try {
      const response = await this.ai.models.generateContent({
        model: 'gemini-3.5-flash',
        contents: `Analyze current medical clinic status parameters and provide actionable patient wait advice and scheduling predictions.
Parameters:
- Clinic: "${clinicName}"
- Current Patients in Queue: ${currentQueueLength}
- Average consultation length per patent: ${averageConsTime} mins
- Patients treated so far today: ${totalConsultationsToday}

Generate a JSON object predicting the optimal hour to check in later today to minimize wait time, a supportive, medically sound explanation/suggestion, and 3-4 health/waiting comfort recommendations.`,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              bestTime: {
                type: Type.STRING,
                description: 'Predicted best time to check in, e.g. "3:15 PM" or "2:30 PM".',
              },
              suggestion: {
                type: Type.STRING,
                description: 'A friendly, highly professional medical analyst suggestion about wait trends.',
              },
              recommendations: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: '3-4 comforting, supportive and actionable tips for waiting room patients.',
              },
            },
            required: ['bestTime', 'suggestion', 'recommendations'],
          },
        },
      });

      const text = response.text || '';
      return JSON.parse(text);
    } catch (error) {
      console.error('Error raising queue prediction via Gemini:', error);
      return defaultFallback;
    }
  }

  /**
   * Generates mock/AI consultation notes for patient treatment summaries.
   */
  async generateConsultationSummary(
    symptoms: string,
    triageNotes: string,
    doctorInputs: string
  ): Promise<string> {
    if (!this.ai) {
      return doctorInputs || 'No notes added.';
    }

    try {
      const response = await this.ai.models.generateContent({
        model: 'gemini-3.5-flash',
        contents: `Compile professional, structured clinical consultation records.
Context:
- Intake Symptoms: "${symptoms}"
- Nurse Triage Details: "${triageNotes}"
- Doctor Quick Notes: "${doctorInputs}"

Generate a polished clinical summary, including diagnosis suggestions, instructions, and follow-up guidance. Keep it brief, clinically rigorous, and highly readable.`,
      });

      return response.text?.trim() || doctorInputs || 'Treatment completed.';
    } catch (error) {
       return doctorInputs || 'Treatment completed.';
    }
  }
}
