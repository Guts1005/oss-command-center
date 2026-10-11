import express from 'express';
import { db } from '../db.js';
import { optionalAuth, AuthenticatedRequest } from '../middleware/auth.js';
import { z } from 'zod';
import crypto from 'crypto';

export const notesRouter = express.Router();
notesRouter.use(optionalAuth);

function getEffectiveUserId(req: AuthenticatedRequest): string {
  if (req.user) return req.user.id;
  return 'e1fd3a8b-0fa3-47a6-bbf5-01b97b414cf4';
}

const noteSchema = z.object({
  content: z.string().min(1, 'Note content cannot be empty'),
  target_date: z.string().optional().nullable(),
  targetDate: z.string().optional().nullable(),
});

// GET /api/notes - Retrieve developer notes
notesRouter.get('/', (req: AuthenticatedRequest, res) => {
  try {
    const userId = getEffectiveUserId(req);
    if (!userId) {
      return res.json([]);
    }

    const notes = db.prepare(`
      SELECT id, user_id, content, target_date, is_completed, created_at
      FROM developer_notes
      WHERE user_id = ?
      ORDER BY created_at DESC
    `).all(userId);

    return res.json(notes);
  } catch (err: any) {
    console.error('[API /notes GET error]:', err);
    return res.status(500).json({ error: 'Failed to retrieve notes', details: err.message });
  }
});

// POST /api/notes - Create a new developer note
notesRouter.post('/', (req: AuthenticatedRequest, res) => {
  try {
    const userId = getEffectiveUserId(req);
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required to persist notes' });
    }

    const parsed = noteSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid note payload', details: parsed.error.issues });
    }

    const id = `note_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    const now = new Date();
    let targetDate = parsed.data.target_date || parsed.data.targetDate || null;
    if (targetDate && targetDate.toLowerCase() === 'tomorrow') {
      const tomorrow = new Date(now.getTime() + 24 * 3600 * 1000);
      targetDate = tomorrow.toISOString().split('T')[0];
    } else if (targetDate && targetDate.toLowerCase() === 'today') {
      targetDate = now.toISOString().split('T')[0];
    }

    db.prepare(`
      INSERT INTO developer_notes (id, user_id, content, target_date, is_completed, created_at)
      VALUES (?, ?, ?, ?, 0, ?)
    `).run(id, userId, parsed.data.content, targetDate, now.toISOString());

    const note = {
      id,
      user_id: userId,
      content: parsed.data.content,
      target_date: targetDate,
      is_completed: 0,
      created_at: now,
    };

    return res.status(201).json(note);
  } catch (err: any) {
    console.error('[API /notes POST error]:', err);
    return res.status(500).json({ error: 'Failed to create note', details: err.message });
  }
});

// PATCH /api/notes/:id - Toggle or update completion status
notesRouter.patch('/:id', (req: AuthenticatedRequest, res) => {
  try {
    const userId = getEffectiveUserId(req);
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { id } = req.params;
    const existing = db.prepare('SELECT * FROM developer_notes WHERE id = ? AND user_id = ?').get(id, userId) as any;
    if (!existing) {
      return res.status(404).json({ error: 'Note not found' });
    }

    const nextCompleted = existing.is_completed === 1 ? 0 : 1;
    db.prepare('UPDATE developer_notes SET is_completed = ? WHERE id = ? AND user_id = ?').run(nextCompleted, id, userId);

    return res.json({ id, is_completed: nextCompleted });
  } catch (err: any) {
    console.error('[API /notes PATCH error]:', err);
    return res.status(500).json({ error: 'Failed to update note', details: err.message });
  }
});

// DELETE /api/notes/:id - Delete a note
notesRouter.delete('/:id', (req: AuthenticatedRequest, res) => {
  try {
    const userId = getEffectiveUserId(req);
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { id } = req.params;
    db.prepare('DELETE FROM developer_notes WHERE id = ? AND user_id = ?').run(id, userId);

    return res.json({ success: true, id });
  } catch (err: any) {
    console.error('[API /notes DELETE error]:', err);
    return res.status(500).json({ error: 'Failed to delete note', details: err.message });
  }
});
