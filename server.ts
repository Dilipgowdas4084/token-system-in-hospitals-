/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import path from 'path';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';

import { DatabaseService } from './src/server/db.js';
import { AIService } from './src/server/ai.js';
import { WaitTimeService, QueueService } from './src/server/queue.js';

dotenv.config();

const PORT = 3000;
const IS_PROD = process.env.NODE_ENV === 'production';

async function startServer() {
  const app = express();
  const server = http.createServer(app);

  // Initialize Socket.io
  const io = new SocketIOServer(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
  });

  // Body parsers
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Initialize Services
  const db = new DatabaseService();
  await db.initialize();

  const ai = new AIService();
  const waitTimeService = new WaitTimeService(db, ai);
  const queueService = new QueueService(db, io, waitTimeService);

  // ==================== REST API ENDPOINTS ====================

  // System Health
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: 'Token System Core',
    });
  });

  // Get All Clinics
  app.get('/api/clinics', async (req, res) => {
    try {
      const clinics = await db.getAllClinics();
      res.json(clinics);
    } catch (error) {
      console.error('Error fetching clinics:', error);
      res.status(500).json({ error: 'Failed to retrieve clinics' });
    }
  });

  // Get Specific Clinic
  app.get('/api/clinics/:id', async (req, res) => {
    try {
      const clinic = await db.getClinic(req.params.id);
      if (!clinic) {
        return res.status(404).json({ error: 'Clinic not found' });
      }
      res.json(clinic);
    } catch (error) {
      console.error('Error fetching clinic:', error);
      res.status(500).json({ error: 'Failed to retrieve clinic info' });
    }
  });

  // Get Clinic Real-time Analytics
  app.get('/api/analytics/:clinicId', async (req, res) => {
    try {
      const analytics = await db.getClinicAnalytics(req.params.clinicId);
      res.json(analytics);
    } catch (error) {
      console.error('Error fetching analytics:', error);
      res.status(500).json({ error: 'Failed to fetch analytics' });
    }
  });

  // Get AI Wait-Time Predictions for clinic
  app.get('/api/prediction/:clinicId', async (req, res) => {
    try {
      const prediction = await waitTimeService.getQueuePrediction(req.params.clinicId);
      res.json(prediction);
    } catch (error) {
      console.error('Error fetching waiting predictions:', error);
      res.status(500).json({ error: 'Failed to fetch dynamic predictions' });
    }
  });

  // Manual Patient Creation (with AI Triage)
  app.post('/api/patients', async (req, res) => {
    try {
      const { name, age, gender, phone, clinicId, symptoms } = req.body;
      if (!name || !clinicId) {
        return res.status(400).json({ error: 'Name and clinicId are required' });
      }

      // Assess clinical triage via Gemini
      const triage = await ai.assessTriage(name, age ? Number(age) : undefined, gender, symptoms);

      const patient = await db.createPatient({
        clinicId,
        name,
        age: age ? Number(age) : undefined,
        gender,
        phone,
        is_priority: triage.isPriority,
        priority_reason: triage.reason || undefined,
        triage_score: triage.score,
        triage_notes: triage.notes,
      });

      const entry = await queueService.addPatient(patient.id, clinicId);

      // Trigger socket notifications of live change
      await queueService.reorderQueue(clinicId);
      await queueService.emitQueueUpdate(clinicId);
      await queueService.emitWaitTimeUpdate(clinicId);

      res.status(201).json({ patient, queueEntry: entry });
    } catch (error) {
       console.error('Error creating patient:', error);
       res.status(500).json({ error: 'Failed to add patient' });
    }
  });

  // AI-powered consultation notes enhancer
  app.post('/api/consultation/notes', async (req, res) => {
    try {
      const { symptoms, triageNotes, rawDoctorNotes } = req.body;
      const summaryNotes = await ai.generateConsultationSummary(
        symptoms || '',
        triageNotes || '',
        rawDoctorNotes || ''
      );
      res.json({ notes: summaryNotes });
    } catch (error) {
      console.error('Notes generation error:', error);
      res.status(500).json({ error: 'Failed to enrich clinical notes' });
    }
  });

  // ==================== REAL-TIME WEBSOCKET ACTIONS ====================

  io.on('connection', (socket) => {
    console.log(`🔌 Client socket connection verified: ${socket.id}`);

    // Join Clinic Lobby
    socket.on('join:clinic', async (clinicId: string) => {
      if (!clinicId) return;
      socket.join(`clinic:${clinicId}`);
      console.log(`👥 Client ${socket.id} joined clinic channel: clinic:${clinicId}`);

      // Push instant frame snapshots
      const qData = await queueService.getQueueData(clinicId);
      socket.emit('queue:update', qData);

      const waitTime = await waitTimeService.calculateWaitTime(clinicId);
      const prediction = await waitTimeService.getQueuePrediction(clinicId);
      socket.emit('waittime:update', {
        waitTime,
        queueLength: qData.entries.filter(e => e.status === 'waiting').length,
        prediction,
      });
    });

    // Patient Register Entry
    socket.on('patient:add', async (data: any, callback: Function) => {
      try {
        const { name, age, gender, phone, clinicId, symptoms } = data;
        if (!name || !clinicId) {
          throw new Error('Required arguments: Name, ClinicId');
        }

        // Gemini triage assessment
        const triage = await ai.assessTriage(name, age ? Number(age) : undefined, gender, symptoms);

        const patient = await db.createPatient({
          clinicId,
          name,
          age: age ? Number(age) : undefined,
          gender,
          phone,
          is_priority: triage.isPriority,
          priority_reason: triage.reason || undefined,
          triage_score: triage.score,
          triage_notes: triage.notes,
        });

        const queueEntry = await queueService.addPatient(patient.id, clinicId);

        // Save reordered locations
        await queueService.reorderQueue(clinicId);
        await queueService.emitQueueUpdate(clinicId);
        await queueService.emitWaitTimeUpdate(clinicId);

        if (callback) {
          callback({ success: true, data: { patient, queueEntry } });
        }
      } catch (err: any) {
        console.error('Socket add patient error:', err);
        if (callback) callback({ success: false, error: err.message });
      }
    });

    // Doctor Calls Next Patient
    socket.on('token:call', async (data: any, callback: Function) => {
      try {
        const { clinicId } = data;
        if (!clinicId) throw new Error('Clinic ID is required');

        const nextEntry = await queueService.callNextToken(clinicId);
        await queueService.emitQueueUpdate(clinicId);
        await queueService.emitWaitTimeUpdate(clinicId);

        if (callback) {
          callback({ success: true, data: nextEntry });
        }
      } catch (error: any) {
        console.error('Socket callToken error:', error);
        if (callback) callback({ success: false, error: error.message });
      }
    });

    // Complete Consultation Treatment
    socket.on('patient:complete', async (data: any, callback: Function) => {
      try {
        const { queueId, duration, notes } = data;
        if (!queueId) throw new Error('Queue Entry ID is required');

        const hours = duration ? Number(duration) : 10;
        const result = await queueService.completePatient(queueId, hours, notes);

        if (callback) {
          callback({ success: true, data: result });
        }
      } catch (error: any) {
         console.error('Socket complete error:', error);
         if (callback) callback({ success: false, error: error.message });
      }
    });

    // Emergency Status Override
    socket.on('emergency:override', async (data: any, callback: Function) => {
      try {
        const { patientId, clinicId, reason } = data;
        if (!patientId || !clinicId) throw new Error('Patient ID and Clinic ID criteria missed');

        await db.markPatientAsPriority(patientId, reason || 'Emergency Override');
        await queueService.reorderQueue(clinicId);
        await queueService.emitQueueUpdate(clinicId);
        await queueService.emitWaitTimeUpdate(clinicId);

        if (callback) callback({ success: true });
      } catch (error: any) {
        console.error('Socket emergency override error:', error);
        if (callback) callback({ success: false, error: error.message });
      }
    });

    // Modify Consulting Speed Parameters
    socket.on('doctor:update', async (data: any, callback: Function) => {
      try {
        const { clinicId, avgTime } = data;
        if (!clinicId || !avgTime) throw new Error('Missing ClinicId or AvgTime');

        await queueService.updateConsultationTime(clinicId, Number(avgTime));
        if (callback) callback({ success: true });
      } catch (err: any) {
        if (callback) callback({ success: false, error: err.message });
      }
    });

    socket.on('disconnect', () => {
      console.log(`🔌 Client disconnected: ${socket.id}`);
    });
  });

  // ==================== VITE CLIENT INTEGRATION ====================

  if (!IS_PROD) {
    // Development Mode
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
    console.log('⚡ Vite development middleware injected successfully');
  } else {
    // Production Mode
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
    console.log('📦 Server serving static production assets from dist/');
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Token System Server running on http://localhost:${PORT}`);
  });
}

startServer().catch((error) => {
  console.error('Fatal initialization failure:', error);
});
