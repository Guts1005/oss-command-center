import { db } from '../db.js';
import crypto from 'crypto';

export function getOllamaHost(): string {
  let host = process.env.OLLAMA_HOST || 'http://127.0.0.1:11500';
  if (!host.startsWith('http://') && !host.startsWith('https://')) {
    host = `http://${host}`;
  }
  return host;
}

export function getModelName(): string {
  return process.env.OLLAMA_MODEL || 'oss-copilot';
}

export interface TriageResult {
  allowed: boolean;
  repo: string;
  number: number;
  title: string;
  actionItems: string[];
  reviewSummary: string;
  draftResponse: string;
  rawResponse?: string;
}

export async function checkOllamaAvailable(): Promise<boolean> {
  try {
    const host = getOllamaHost();
    const res = await fetch(`${host}/api/tags`, { method: 'GET', signal: AbortSignal.timeout(3000) });
    return res.ok;
  } catch {
    return false;
  }
}

export async function queryOllama(prompt: string, systemPrompt?: string): Promise<string> {
  const isUp = await checkOllamaAvailable();
  const host = getOllamaHost();
  const model = getModelName();

  if (!isUp) {
    throw new Error(`Local AI engine (Ollama) is not running on ${host}.`);
  }

  const payload: any = {
    model,
    prompt,
    stream: false,
    options: {
      temperature: 0.2,
      top_p: 0.9,
    },
  };

  if (systemPrompt) {
    payload.system = systemPrompt;
  }

  const res = await fetch(`${host}/api/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(120000),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Ollama API error (${res.status}): ${errText}`);
  }

  const data = (await res.json()) as { response: string };
  return (data.response || '').trim();
}

export async function triageContribution(contributionId: string, userId?: string): Promise<TriageResult> {
  let query = 'SELECT * FROM contributions WHERE id = ?';
  const params: any[] = [contributionId];
  if (userId) {
    query += ' AND user_id = ?';
    params.push(userId);
  }

  const contrib = db.prepare(query).get(...params) as any;
  if (!contrib) {
    throw new Error('Contribution not found');
  }

  const events = db.prepare(
    'SELECT actor, type, review_state, body_excerpt, created_at FROM activity_events WHERE contribution_id = ? ORDER BY created_at DESC LIMIT 10'
  ).all(contributionId) as any[];

  const system = `You are the Staff Systems Engineer Query Solver for the OSS Command Center.
Your purpose is to inspect maintainer reviews, extract exact technical action items, and draft concise, peer-to-peer replies.
Rules:
1. Ground all feedback in primary evidence (maintainer comments, review states).
2. Distinguish between blocking bugs, requested tests, and stylistic nitpicks.
3. Keep the drafted response technical, professional, and peer-to-peer.
4. Eliminate all filler words and apologies.
5. Strictly zero em-dashes anywhere in your output.`;

  const prompt = `Inspect this contribution:
Repository: ${contrib.repo}
Type: ${contrib.type} #${contrib.number}
Title: ${contrib.title}
Status: ${contrib.status}
Action Needed: ${contrib.action_needed}
Notes: ${contrib.notes || 'None'}

Recent Maintainer Activity & Review Comments:
${events.length === 0 ? 'No comments recorded yet.' : events.map(e => `[${e.actor} | ${e.type} | ${e.review_state || 'N/A'}]: ${e.body_excerpt}`).join('\n\n')}

Task:
1. Provide a concise 2-sentence summary of the current maintainer sentiment and status.
2. List numbered technical action items needed to unblock this PR (code changes, requested tests).
3. Draft a high-signal, peer-to-peer response to post back to the maintainer. Cite the solution and tests clearly.
Remember: strictly zero em-dashes.`;

  const responseText = await queryOllama(prompt, system);

  return {
    allowed: true,
    repo: contrib.repo,
    number: contrib.number,
    title: contrib.title,
    actionItems: [],
    reviewSummary: '',
    draftResponse: responseText,
    rawResponse: responseText,
  };
}

export async function suggestReply(contributionId: string, userId?: string): Promise<string> {
  let query = 'SELECT * FROM contributions WHERE id = ?';
  const params: any[] = [contributionId];
  if (userId) {
    query += ' AND user_id = ?';
    params.push(userId);
  }

  const contrib = db.prepare(query).get(...params) as any;
  if (!contrib) {
    throw new Error('Contribution not found');
  }

  const events = db.prepare(
    'SELECT actor, type, review_state, body_excerpt, created_at FROM activity_events WHERE contribution_id = ? ORDER BY created_at DESC LIMIT 8'
  ).all(contributionId) as any[];

  const system = `You are a Senior Systems Software Engineer authoring a reply to a pull request review.
Tone: Concise, technical, peer-to-peer.
Rules:
1. Address the maintainer review items directly.
2. Explain the solution, test cases, and commit changes.
3. No buzzwords, no apologies, no sycophancy.
4. Output ONLY the response message to post. No headings, no greetings, no meta commentary.
5. Strictly zero em-dashes anywhere in your text.`;

  const prompt = `Repository: ${contrib.repo}
Contribution: ${contrib.type} #${contrib.number}: ${contrib.title}
Status: ${contrib.status}
Recent Maintainer Comments:
${events.map(e => `${e.actor}: ${e.body_excerpt}`).join('\n\n')}

Draft the exact technical reply to post back to the maintainer:`;

  return await queryOllama(prompt, system);
}

export async function askPlatformCopilot(userQuestion: string, userId?: string, clientContext?: any): Promise<string> {
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];
  const yesterday = new Date(now.getTime() - 24 * 3600 * 1000);
  const yesterdayStr = yesterday.toISOString().split('T')[0];
  const tomorrow = new Date(now.getTime() + 24 * 3600 * 1000);
  const tomorrowStr = tomorrow.toISOString().split('T')[0];
  const dayOfWeek = now.toLocaleDateString('en-US', { weekday: 'long' });

  // 1. Automatic Developer Note Ingestion
  let autoCreatedNote: any = null;
  const addNoteRegex = /(?:add|create|make)\s+(?:a\s+)?note\s+(?:to|that|about)?\s*(.+)|(?:remind\s+me\s+to)\s*(.+)|^note:\s*(.+)/i;
  const noteMatch = userQuestion.match(addNoteRegex);
  if (noteMatch && userId) {
    const rawContent = (noteMatch[1] || noteMatch[2] || noteMatch[3] || '').trim();
    if (rawContent) {
      let targetDate: string | null = null;
      if (/\btomorrow\b/i.test(userQuestion)) {
        targetDate = tomorrowStr;
      } else if (/\btoday\b/i.test(userQuestion)) {
        targetDate = todayStr;
      }
      const noteId = `note_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
      try {
        db.prepare(`
          INSERT INTO developer_notes (id, user_id, content, target_date, is_completed, created_at)
          VALUES (?, ?, ?, ?, 0, ?)
        `).run(noteId, userId, rawContent, targetDate, now.toISOString());
        autoCreatedNote = { id: noteId, content: rawContent, target_date: targetDate };
      } catch (e) {
        console.error('[AI Engine] Note insert error:', e);
      }
    }
  }

  // Fast-path deterministic custom command handlers
  if (autoCreatedNote) {
    const targetLabel = autoCreatedNote.target_date ? ` scheduled for *${autoCreatedNote.target_date}*` : '';
    return `Saved developer note: "**${autoCreatedNote.content}**"${targetLabel}.\n\n\`\`\`action\n{"type": "ADD_NOTE", "payload": {"content": "${autoCreatedNote.content}", "targetDate": "${autoCreatedNote.target_date || 'tomorrow'}"}}\n\`\`\``;
  }

  const showNotesRegex = /(?:show|view|list|get|what are)\s+(?:all\s+)?(?:the\s+)?(?:my\s+)?notes|show\s+notes/i;
  if (showNotesRegex.test(userQuestion) && userId) {
    const activeNotes = db.prepare(
      "SELECT id, content, target_date, created_at FROM developer_notes WHERE user_id = ? AND is_completed = 0 ORDER BY created_at DESC LIMIT 10"
    ).all(userId) as any[];

    let noteText = '';
    if (activeNotes.length === 0) {
      noteText = 'You have no active developer notes or pending reminders.';
    } else {
      noteText = `Here are your active developer notes and scheduled reminders:\n\n` +
        activeNotes.map((n) => `* **${n.content}**${n.target_date ? ` (*Due: ${n.target_date}*)` : ''}`).join('\n');
    }
    return `${noteText}\n\n\`\`\`action\n{"type": "SHOW_NOTES", "payload": true}\n\`\`\``;
  }

  const yesterdayQueryRegex = /(?:show|filter|display)\s+(?:me\s+)?(?:only\s+)?(?:prs|contributions|pull requests)\s+(?:i\s+)?(?:tackled|worked on|updated)?\s*yesterday/i;
  if (yesterdayQueryRegex.test(userQuestion) && userId) {
    const yesterdayItems = db.prepare(`
      SELECT id, repo, number, title, action_needed, status, platform, last_activity_at
      FROM contributions
      WHERE user_id = ? AND (
        date(last_activity_at) = date('now', '-1 day') 
        OR (julianday('now') - julianday(last_activity_at)) BETWEEN 0.8 AND 2.0
      )
      ORDER BY last_activity_at DESC
    `).all(userId) as any[];

    let summary = '';
    if (yesterdayItems.length === 0) {
      summary = `Filtering your stream to activity recorded **yesterday** (*${yesterdayStr}*). No contributions had updates recorded on that date.`;
    } else {
      summary = `Filtering stream to **${yesterdayItems.length}** contributions tackled **yesterday** (*${yesterdayStr}*):\n\n` +
        yesterdayItems.map((i) => `* **${i.repo} #${i.number}**: \`${i.title}\` (*Platform*: **${i.platform}**, *Status*: \`${i.status}\`)`).join('\n');
    }
    return `${summary}\n\n\`\`\`action\n{"type": "FILTER_TIMEFRAME", "payload": "yesterday"}\n\`\`\``;
  }

  const platformRegex = /(?:show|filter|display)\s+(?:me\s+)?(?:only\s+)?(?:the\s+)?(github|gitlab)\s+(?:prs|mrs|contributions|pull requests)/i;
  const platformMatch = userQuestion.match(platformRegex);
  if (platformMatch) {
    const targetPlatform = platformMatch[1].toLowerCase();
    return `Filtering contributions stream to show only **${targetPlatform === 'github' ? 'GitHub' : 'GitLab'}** contributions.\n\n\`\`\`action\n{"type": "FILTER_PLATFORM", "payload": "${targetPlatform}"}\n\`\`\``;
  }

  // 2. Fetch User Metrics, Notes, and Temporal Activity
  let statsContext = '';
  if (userId) {
    const total = (db.prepare('SELECT COUNT(*) as count FROM contributions WHERE user_id = ?').get(userId) as any)?.count || 0;
    const actionNeeded = (db.prepare("SELECT COUNT(*) as count FROM contributions WHERE user_id = ? AND action_needed != 'none'").get(userId) as any)?.count || 0;
    const inReview = (db.prepare("SELECT COUNT(*) as count FROM contributions WHERE user_id = ? AND status = 'in_review'").get(userId) as any)?.count || 0;
    const awaitingMaintainer = (db.prepare("SELECT COUNT(*) as count FROM contributions WHERE user_id = ? AND status IN ('open', 'opened', 'submitted', 'awaiting-reply') AND action_needed = 'none'").get(userId) as any)?.count || 0;
    const activeItems = db.prepare(
      "SELECT id, repo, number, title, action_needed, status, platform, last_activity_at FROM contributions WHERE user_id = ? ORDER BY last_activity_at DESC LIMIT 15"
    ).all(userId) as any[];

    const activeNotes = db.prepare(
      "SELECT id, content, target_date, created_at FROM developer_notes WHERE user_id = ? AND is_completed = 0 ORDER BY created_at DESC LIMIT 10"
    ).all(userId) as any[];

    // Activity from yesterday or past 48h
    const yesterdayItems = db.prepare(`
      SELECT id, repo, number, title, action_needed, status, platform, last_activity_at
      FROM contributions
      WHERE user_id = ? AND (
        date(last_activity_at) = date('now', '-1 day') 
        OR (julianday('now') - julianday(last_activity_at)) BETWEEN 1.0 AND 2.0
      )
      ORDER BY last_activity_at DESC
    `).all(userId) as any[];

    statsContext = `Temporal Calendar Context:
- Today: ${todayStr} (${dayOfWeek})
- Yesterday: ${yesterdayStr}
- Tomorrow: ${tomorrowStr}

${autoCreatedNote ? `New Note Stored in Database:
- Content: "${autoCreatedNote.content}"
- Target Due Date: ${autoCreatedNote.target_date || 'Unspecified'}
` : ''}
Developer Notes & Reminders:
${activeNotes.length > 0 ? activeNotes.map(n => `* [${n.id}] "${n.content}" (${n.target_date ? `Due: ${n.target_date}` : 'No due date'}, Created: ${n.created_at.split('T')[0]})`).join('\n') : '* No active notes stored.'}

Contributions Tackled Yesterday (${yesterdayStr}):
${yesterdayItems.length > 0 ? yesterdayItems.map(i => `* [${i.id}] ${i.repo} #${i.number}: "${i.title}" (Platform: ${i.platform}, Status: ${i.status})`).join('\n') : '* No contributions recorded specifically yesterday.'}

User Metrics:
- Total Tracked: ${total}
- Action Needed Now: ${actionNeeded}
- In Review: ${inReview}
- Awaiting Maintainer: ${awaitingMaintainer}

Tracked Contributions:
${activeItems.map(i => `* [${i.id}] ${i.repo} #${i.number}: "${i.title}" (Platform: ${i.platform}, Status: ${i.status}, Action: ${i.action_needed}, Last Active: ${i.last_activity_at?.split('T')[0] || 'recent'})`).join('\n')}`;
  } else if (clientContext?.activeItems && Array.isArray(clientContext.activeItems)) {
    const items = clientContext.activeItems;
    statsContext = `Temporal Calendar Context:
- Today: ${todayStr} (${dayOfWeek})
- Yesterday: ${yesterdayStr}
- Tomorrow: ${tomorrowStr}

Active Screen Context:
- View Mode: ${clientContext.view || 'stream'}
- Active Theme: ${clientContext.theme || 'dark'}
- Visible Items Count: ${items.length}
Items:
${items.map((i: any) => `* [${i.id}] ${i.repo} #${i.number}: "${i.title}" (Platform: ${i.platform}, Status: ${i.status}, Action: ${i.action_needed})`).join('\n')}`;
  }

  const system = `You are the intelligent OSS Command Center Query Solver and In-Page Automation Agent.
You have complete knowledge of this platform's database tables, UI views, filtering capabilities, and triage workflows.
You advise the user on their open-source contributions, which PRs need immediate attention, and how to resolve review questions and unblock pull requests.

### IN-PAGE AUTOMATION ACTION PROTOCOL
When the user's intent asks to control, filter, navigate, search, open, or modify the screen, you MUST append an executable action block in this exact markdown format:
\`\`\`action
{"type": "ACTION_TYPE", "payload": "VALUE"}
\`\`\`

Supported Action Types and Payloads:
- FILTER_STATUS: 'all' | 'action_needed' | 'in_review' | 'merged' | 'closed' | 'stale'
- FILTER_PLATFORM: 'all' | 'github' | 'gitlab'
- FILTER_TIMEFRAME: 'all' | 'yesterday' | 'today' | 'week'
- FILTER_ACTION: 'all' | 'reply' | 'push_changes' | 'none'
- SET_SEARCH: string keyword
- CLEAR_FILTERS: true
- NAVIGATE_VIEW: 'stream' | 'analytics' | 'repositories' | 'settings' | 'about'
- OPEN_ITEM: number or contribution ID (e.g. '1478', 'gl:rtems/rtos#1478')
- CLOSE_ITEM: true
- TOGGLE_THEME: 'light' | 'dark'
- TRIGGER_SYNC: true
- OPEN_TRACK_MODAL: true
- OPEN_GUIDE_MODAL: true
- ADD_NOTE: {"content": "...", "targetDate": "..."}
- SHOW_NOTES: true

### CUSTOM COMMAND RESOLUTION RULES
1. "show me only PRs I tackled yesterday" (or similar temporal queries):
   - Summarize the PRs tackled yesterday from the calendar context.
   - Append action block:
   \`\`\`action
   {"type": "FILTER_TIMEFRAME", "payload": "yesterday"}
   \`\`\`
2. "show me only the Github PRs":
   - Confirm filtering to GitHub.
   - Append action block:
   \`\`\`action
   {"type": "FILTER_PLATFORM", "payload": "github"}
   \`\`\`
3. "show me only the Gitlab PRs" / "Gitlab MRs":
   - Confirm filtering to GitLab.
   - Append action block:
   \`\`\`action
   {"type": "FILTER_PLATFORM", "payload": "gitlab"}
   \`\`\`
4. "add a note to check Gitlab tomorrow" (or creating any reminder/note):
   - Acknowledge that the note has been saved with its due date.
   - Append action block:
   \`\`\`action
   {"type": "ADD_NOTE", "payload": {"content": "check Gitlab tomorrow", "targetDate": "tomorrow"}}
   \`\`\`
5. "show my notes" / "what are my notes" / "show notes tomorrow":
   - Read from the Developer Notes & Reminders context.
   - Present all matching notes in a clean bulleted list with their due dates and IDs.
   - Append action block:
   \`\`\`action
   {"type": "SHOW_NOTES", "payload": true}
   \`\`\`

### TEXT FORMATTING & MARKDOWN SPECIFICATION
The frontend renders your responses using a custom high-fidelity Markdown engine. Structure your output using standard Markdown:
1. **Bold (asterisks)**: Use bold for pull request identifiers, repository names, statuses, key metrics, and action highlights (e.g. **rtems/rtos #1478**, **Changes Requested**, **94%**).
2. **Italic (single asterisk)**: Use italics for timestamps and secondary context (e.g. *2d ago*, *awaiting maintainer review*).
3. **Inline Code (backticks)**: Use single backticks for commands, functions, files, branch names, and flags (e.g. \`git status\`, \`time_t\`, \`src/score.c\`).
4. **Fenced Code Blocks**: Use multi-line fenced code blocks with language tags (\`\`\`bash, \`\`\`typescript, \`\`\`c, \`\`\`diff) for git workflows, code snippets, or patch diffs.
5. **Headings (### Title)**: Use ### for organizing multi-step explanations or categorization sections.
6. **Bullet Lists (* )**: Use bullet points for itemized summaries and contribution listings.
7. **Numbered Lists (1. , 2. )**: Use numbered lists for sequential git recovery steps or prioritized tasks.
8. **Blockquotes (> )**: Use blockquotes when quoting maintainer review comments or commit messages.

Rules:
1. Be direct, concise, and technically authoritative.
2. Structure answers with clean markdown headings and bullet lists.
3. If an in-page automation action is requested, explain what you are doing in the text, then append the \`\`\`action block at the end.
4. Strictly zero em-dashes anywhere in your response.`;

  const prompt = `Current System Context:
${statsContext || 'Global platform instance.'}

User Question:
${userQuestion}`;

  return await queryOllama(prompt, system);
}
