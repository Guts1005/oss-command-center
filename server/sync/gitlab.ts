import axios from 'axios';
import { db } from '../db.js';

export async function syncGitLab(host = 'https://gitlab.rtems.org', username = 'Sharvin') {
  console.log(`[GitLab Sync] Querying authored MRs on ${host} for user: ${username}`);
  
  // RTEMS upstream project: rtems/rtos/rtems
  const projectPath = encodeURIComponent('rtems/rtos/rtems');
  const url = `${host}/api/v4/projects/${projectPath}/merge_requests?author_username=${username}&per_page=20`;

  try {
    const resp = await axios.get(url, { timeout: 15000 });
    const mrs = resp.data || [];
    const now = new Date().toISOString();

    const insertContrib = db.prepare(`
      INSERT INTO contributions (
        id, platform, repo, number, title, type, url, author, status,
        action_needed, difficulty, bounty_amount, created_at, last_activity_at,
        last_synced_at, unread, notes
      ) VALUES (
        @id, @platform, @repo, @number, @title, @type, @url, @author, @status,
        @action_needed, @difficulty, @bounty_amount, @created_at, @last_activity_at,
        @last_synced_at, @unread, @notes
      )
      ON CONFLICT(id) DO UPDATE SET
        title = excluded.title,
        status = excluded.status,
        action_needed = excluded.action_needed,
        last_activity_at = excluded.last_activity_at,
        last_synced_at = excluded.last_synced_at,
        unread = excluded.unread
    `);

    const insertEvent = db.prepare(`
      INSERT OR REPLACE INTO activity_events (
        id, contribution_id, actor, actor_avatar, type, review_state, body_excerpt, created_at
      ) VALUES (
        @id, @contribution_id, @actor, @actor_avatar, @type, @review_state, @body_excerpt, @created_at
      )
    `);

    for (const mr of mrs) {
      const id = `gl:rtems/rtos/rtems!${mr.iid}`;
      
      // 1. Normalize status token bug: 'opened' -> 'open'
      let status = mr.state === 'opened' ? 'open' : mr.state; // 'open' | 'merged' | 'closed'
      if (mr.draft || mr.work_in_progress || mr.title.toLowerCase().startsWith('draft:')) {
        status = 'draft';
      }

      // Fetch single MR detail for rich metadata
      let detail: any = null;
      try {
        const detailResp = await axios.get(`${host}/api/v4/projects/${projectPath}/merge_requests/${mr.iid}`, { timeout: 10000 });
        detail = detailResp.data;
      } catch (e: any) {
        // detail fetch optional
      }

      // Fetch discussions from public discussions.json endpoint
      let maintainerFeedbackDetected = false;
      const fetchedNotes: any[] = [];
      try {
        const discResp = await axios.get(`${host}/rtems/rtos/rtems/-/merge_requests/${mr.iid}/discussions.json`, { timeout: 10000 });
        const discussions = discResp.data || [];
        for (const disc of discussions) {
          for (const note of (disc.notes || [])) {
            const rawNoteText = note.note || '';
            const isSignificantSystemNote = Boolean(
              note.system && (
                rawNoteText.includes('approved this merge request') ||
                rawNoteText.includes('automatic merge') ||
                rawNoteText.includes('marked this merge request as') ||
                rawNoteText.includes('merged')
              )
            );

            if ((!note.system || isSignificantSystemNote) && note.author) {
              const noteActor = note.author.name || note.author.username || 'Maintainer';
              const isMaintainer = (note.author.username || '').toLowerCase() !== username.toLowerCase();
              if (isMaintainer) {
                maintainerFeedbackDetected = true;
              }

              const isApproval = rawNoteText.includes('approved this merge request') || rawNoteText.includes('automatic merge');
              fetchedNotes.push({
                id: `gl_note_${note.id}`,
                actor: noteActor,
                avatar: note.author.avatar_url || null,
                body: rawNoteText,
                created_at: note.created_at,
                isMaintainer,
                type: isApproval ? 'review' : 'comment',
                review_state: isApproval ? 'APPROVED' : (isMaintainer && !note.system ? 'CHANGES_REQUESTED' : null)
              });
            }
          }
        }
      } catch (e: any) {
        // discussions.json fetch optional
      }

      // 2. Derive action_needed dynamically based on latest conversational speaker
      let action_needed: 'reply' | 'push-changes' | 'none' = 'none';
      if (status === 'merged' || status === 'closed') {
        action_needed = 'none';
      } else if (status === 'draft') {
        action_needed = 'push-changes';
      } else if (fetchedNotes.length > 0) {
        // Sort notes chronologically to check who spoke last
        const sortedNotes = [...fetchedNotes].sort(
          (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );
        const lastNote = sortedNotes[sortedNotes.length - 1];
        if (lastNote && lastNote.isMaintainer) {
          if (lastNote.review_state === 'APPROVED') {
            action_needed = 'none'; // Maintainer approved! Waiting for CI / merge
          } else {
            action_needed = 'push-changes'; // maintainer requested action/changes
          }
        } else {
          action_needed = 'none'; // author replied or pushed changes -> awaiting maintainer review
        }
      }

      const existing = db.prepare('SELECT last_activity_at, last_viewed_at, unread, notes FROM contributions WHERE id = ?').get(id) as any;
      const lastActivity = mr.updated_at || mr.created_at;

      // 3. Normalized unread logic (only recent or truly unviewed new events)
      let unread = 0;
      if (existing) {
        if (existing.last_viewed_at) {
          unread = new Date(lastActivity).getTime() > new Date(existing.last_viewed_at).getTime() ? 1 : 0;
        } else {
          const ageDays = (Date.now() - new Date(lastActivity).getTime()) / (1000 * 60 * 60 * 24);
          unread = ageDays <= 14 ? 1 : 0;
        }
      } else {
        const ageDays = (Date.now() - new Date(lastActivity).getTime()) / (1000 * 60 * 60 * 24);
        unread = ageDays <= 14 ? 1 : 0;
      }

      insertContrib.run({
        id,
        platform: 'gitlab',
        repo: 'rtems/rtos/rtems',
        number: mr.iid,
        title: mr.title,
        type: 'pr', // map MR to pr type
        url: mr.web_url,
        author: mr.author?.username || username,
        status,
        action_needed,
        difficulty: 'hard',
        bounty_amount: null,
        created_at: mr.created_at,
        last_activity_at: lastActivity,
        last_synced_at: now,
        unread,
        notes: existing?.notes || null
      });

      // Insert primary creation event
      insertEvent.run({
        id: `gl_created_${id}`,
        contribution_id: id,
        actor: mr.author?.username || username,
        actor_avatar: mr.author?.avatar_url || null,
        type: 'status-change',
        review_state: null,
        body_excerpt: mr.description ? mr.description.slice(0, 500) : 'Merge request opened on RTEMS GitLab',
        created_at: mr.created_at
      });

      // Insert merge event if merged
      if (status === 'merged') {
        const merger = detail?.merged_by?.name || detail?.merged_by?.username || 'Chris Johns (Maintainer)';
        insertEvent.run({
          id: `gl_merged_${id}`,
          contribution_id: id,
          actor: merger,
          actor_avatar: detail?.merged_by?.avatar_url || null,
          type: 'review',
          review_state: 'APPROVED',
          body_excerpt: `Merged into master by ${merger}`,
          created_at: detail?.merged_at || mr.updated_at || mr.created_at
        });
      }

      // Insert maintainer discussion notes & reviews
      for (const note of fetchedNotes) {
        insertEvent.run({
          id: note.id,
          contribution_id: id,
          actor: note.actor,
          actor_avatar: note.avatar,
          type: note.type || 'comment',
          review_state: note.review_state || null,
          body_excerpt: note.body.slice(0, 1000),
          created_at: note.created_at
        });
      }
    }

    console.log(`[GitLab Sync] Processed ${mrs.length} MRs with normalized status tokens.`);
  } catch (err: any) {
    console.error(`[GitLab Sync] Error: ${err.message}`);
  }
}
