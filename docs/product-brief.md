# Lupira Assistant — Product Brief

The north-star for what this product is meant to achieve. Solution-agnostic: no APIs, infrastructure, or topology here — those are derived from this and documented separately.

## Purpose
A personal chief-of-staff — a private instance for each user — that keeps their self-hosted personal record (calendar, tasks, contacts, notes, wellbeing, career) complete and current: capturing what arrives, prompting at the right moments, and asking the questions that fill the gaps. It runs for many users on shared self-hosted infrastructure, without depending on Google / Microsoft / Apple, and without ever becoming a chatbot they have to talk to.

## Problem
Actionable life-admin (meetings, deadlines, people, plans) arrives scattered across Telegram, two email accounts, and Facebook. Turning it into calendar/task/contact entries — and being reminded in time — is manual today, or outsourced to Big Tech assistants. Daniel wants that capability on his own infrastructure.

## Three pillars
1. **Capture** — read incoming comms, grouped into conversation topics rather than isolated messages, recognise what's actionable, and propose calendar/task/contact entries for one-tap approval. *(Reactive: input is an external signal.)*
2. **Prompt** — from held calendar/task state (+ time and location), surface timely nudges: what's next, when to leave, trip/travel prompts, slipping tasks. *(Assistant tells me something.)*
3. **Elicit** — proactively ask me questions, timed by my schedule and activity, to keep the record rich and current: clarify thinly-documented events, plan the day and week, follow up on past events, complete contacts, and log mood/health and career status. My answers are written straight back. *(Assistant asks me something; input is me.)*

## Outcomes — what "good" looks like
- Nothing actionable in my messages slips through uncaptured.
- Calendar, tasks, and contacts stay current without hand-entry.
- My events are richly documented and my contacts, wellbeing, and career record stay current — because it asks, I don't have to remember to.
- Quick notes are captured in a tap and resurface when relevant, not lost in a pile.
- I'm reminded of the next thing at the right moment, travel time included.
- It runs entirely on my infrastructure — data and the AI stay on the NAS.
- It never acts behind my back; every write waits for my approval.
- Anyone can run it as their own private assistant — fully isolated from mine, even when we share a calendar.

## Principles
- **Proactive, not conversational** — the assistant always initiates: proposals, prompts, and questions. I only ever respond — a tap or a short answer — and never drive an open-ended query. No voice, no chat thread.
- **Consent-first** — ask before any create or update. Always, no exceptions: nothing is written without my explicit approval.
- **Sovereign** — self-hosted end to end, including the LLM; personal content never leaves the LAN. Comms are captured and retained in full on his own infrastructure — integral to how it works, not an opt-in add-on.
- **Multi-user, LLM-isolated** — many people use the assistant, each a private tenant. Every LLM interaction is scoped to one user: no prompt, context, memory, or model state ever crosses users. Data is the exception — calendars, contacts, and task lists can be shared at the database plane through explicit access grants; wellbeing and career stay private. Even shared data enters the LLM only on one user's own request, under that user's access.
- **Anti-fatigue** — high-signal, batched, one-tap; it earns every interruption.
- **Additive** — it reads alongside my comms apps; it doesn't try to replace them.

## Non-goals
- Not a chatbot or voice assistant.
- Not a replacement for Telegram / email / Messenger as clients.
- Not a shared or team assistant — each user's assistant, reasoning, and memory are theirs alone; only the underlying data is ever shared, and only by explicit grant.
- Its scope is Daniel's personal record — calendar, tasks, contacts, notes, wellbeing, career. Comms are captured and retained to feed that record and his own research, not as a standalone product.

## Signals — user-facing vs internal
Two planes. The mobile app is the only surface Daniel touches; everything else is invisible plumbing.

**User-facing — to Daniel (mobile app):**
- A proposed action to approve: create event, create task, create or update contact.
- An upcoming-event reminder.
- A leave-by prompt: depart time for the next location-bound event.
- A trip prompt: route and timing for an upcoming destination.
- An overdue- or slipping-task prompt.
- A question to answer: an event clarification, a plan, a follow-up, a contact, a mood/health check-in, or a career update.
- A relevant note, surfaced when it bears on what I'm doing.
- A batched digest when items are low-priority or numerous.

**User-facing — from Daniel (mobile app):**
- Approve, edit, or dismiss a proposal.
- Answer or skip an elicited question.
- Opt a source or an individual chat in or out of watching.
- Grant or revoke a source connection.
- Set delivery preferences: per-item versus digest, and quiet hours.
- Capture a quick note, and reference or link existing notes.
- Tag a calendar event with a prompt; when the event occurs, that prompt fires as an internal signal the assistant runs.

**Elicited questions — what, and when asked**

| Topic | Asked when | Writes to |
|---|---|---|
| Plans for today and this week | Start of day; start of week | Tasks, calendar |
| Event clarification: attendees, description, location, travel | An upcoming event scores low on completeness, weighted by proximity | The event |
| Follow-up on a past event | Shortly after the event ends | Tasks, event notes |
| New contact, or missing contact details | A relevant contact scores low on completeness (upcoming-event attendee / recent), or an unknown person appears in comms | Contacts |
| Mood and health | A regular check-in cadence; after notable activity | Wellbeing log |
| Skills, projects, career status | A periodic review cadence | Career record |

**Internal — inbound signals (no user in the loop)**

| Input | Triggers | Drives |
|---|---|---|
| Telegram messages | When a conversation topic goes quiet — grouped into topics, not per message | Capture — extract actionable items |
| Gmail and Outlook mail | When a mail thread or topic settles | Capture — extract actionable items |
| Facebook event invites | Checked periodically from the events feed | Capture — propose event |
| Location and presence | On a movement event — arrival, departure, approaching a destination | Prompt — leave-by, trips |
| Health: sleep, activity (Phase 2) | Checked periodically, plus threshold crossings | Prompt — wellness-aware scheduling |
| Event-bound prompt | When its tagged event occurs | Whatever the prompt directs — capture, prompt, or elicit |

**Internal — outbound (no user in the loop):**
- Persist each inbound item to the capture inbox.
- Write a confirmed event, task, or contact — from an approved proposal.
- Enrich an existing event, contact, wellbeing log, or career record — from an answered question.
- Write or update a note, and its links to events, tasks, or contacts.

## Temporal model — calendars as the backbone
The calendar is the solution's universal scheduling and temporal-tracking substrate: anything that happens at a time is an event, including the assistant's own scheduled work. Calendars are purpose-built and split into two classes.

**Agenda calendars — my timeline, shown to me**
- Personal — my own events.
- Group — a shared calendar (household, family, or team).
- Birthdays — auto-fed from contacts.
- Availability — office/home/vacation/sick, whole-day or split within a day (office morning, home afternoon); a status layer many features condition on (commute and leave-by, trip planning, reachability, when to ask, wellbeing).
- Food plan — meal planning (Future, with the recipes/food domain).

**System calendars — the assistant's substrate, normally hidden from my agenda**
- All-events inbox — the superset of every external event seen (Facebook and other sources), a source of truth whether or not I plan to attend; Capture proposes from here into the agenda calendars.
- LlmPrompts — the assistant's scheduled prompt work: Elicit questions, plus research/aggregation that often spawns follow-up prompts. Each is an event-bound prompt that fires at the right time.
- DevOps routines — recurring operational tasks (package upgrades) as event-bound prompts that fire the assistant to act.

System calendars run on event-bound payloads — a system event carries a contracted LLM prompt or a deterministic action that fires as an internal signal when it occurs. Scheduled actions carry a **typed contract** (intent, target, expected output), so outcomes are predictable rather than free-form LLM latitude.

**Grounded in the calendar service (cal-api).** Most of this already exists there — many calendars with owner/read-write/read sharing, and the Inbox→committed lifecycle as the existing per-calendar Proposed/Accepted membership. The additions are small: a calendar class (agenda vs system), an event-bound prompt on items, and partial-day availability; iCal/vCard become generated projections with the structured record canonical. Reliable firing — retry, catch-up, idempotency — is handled by a **dedicated scheduler/worker**, not a naive calendar timer, which resolves the job-runner caveat. Full design: `LupiraCalApi/docs/temporal-backbone.md`.

## Tracking — calendar vs tasks
The assistant tracks its own work in two substrates, split by whether the work *fires* or is *tracked to done*:
- **Calendar (cal-api)** — things with a moment of action: events and prompts that fire at a time. Owns the clock.
- **Tasks (tasks-api)** — open items tracked to completion, with no firing moment: the assistant's backlog.

So an unhealthy API → a task (fix it); "research desserts Friday and report" → a prompt event; "tell me when the game releases" → a task (the durable goal) plus a recurring prompt that does the checking and closes the task when met. **A bill or a delivery is a task** — tracked to done (paid / received), on its own "Bills"/"Deliveries" list, never a calendar event; its due date or arrival is a linked prompt that fires the nudge. They compose: prompts spawn prompts, prompts spawn tasks, tasks spawn prompts.

The assistant keeps its own lists and calendars, separate from mine. Per-user agent work is isolated like everything else; system/ops work (health, upgrades) is the operator's, not any user's. Creating its own tracking item is internal bookkeeping — no approval; the real-world action it leads to still follows consent-first.

**Grounded in the task service (tasks-api).** The assistant's lists, roles, and agent surface already exist; the additions are cross-links (a task ↔ its cal-api prompt or an external ref) and a richer status. Firing stays in cal-api — tasks-api gets no scheduler, which is what keeps the two substrates cleanly split. Full design: `LupiraTasksApi/docs/tracking-backbone.md`.

## Success signals
- Share of events/tasks that arrived as an accepted proposal vs hand-entered.
- Proposal precision (approve vs dismiss) stays high — noise stays low.
- Time from a conversation topic settling → filed.
- Missed-event rate → ~0.
- I stop reflexively opening Google Calendar / Outlook.

## Future — out of scope for first release
Captured to keep v1 scoping honest; none ship in the first release.
- **Transit fares and schedules** — live options from SJ (trains), SL (Stockholm local transport), Flixbus (coaches), and flights, so trip prompts carry real departures and cost.
- **Map view** — a self-hosted, Google-Maps-like surface plotting contacts, events, and trips; a Big-Tech-free map in its own right. The heaviest item here — a maps/tiles service, not just a connector.
- **GitHub** — surface repo and project activity into the career/project record, and propose tasks from issues or PRs assigned to me.
- **Docker Hub** — surface image build and publish status (new tags, failed pushes) for my deployments.
- **Jellyfin** — answer media questions: what's newly added, and whether a title already exists in the library.
- **Nextcloud (read-only)** — read files and notes for context when proposing or answering.
- **Recipes and food log** — handle recipes and track what I've eaten, in a dedicated store with its own API; a new wellbeing-adjacent record domain the assistant can elicit (meals) and propose from (recipe plans).
- **Historical comms research** — the comms substrate (`comms-api`) backfills the user's full message history (Facebook export first — the conversations since he started using it) into its corpus, retained in full, and makes it queryable full-text + semantically for researching past ventures and events. An optional retention policy may come in a later phase. Design: `LupiraCommsApi/docs/comms-backbone.md`.

## Deferred (consequences, not vision)
Which APIs, batch-vs-service, ingestion topology, schemas, and deployment are derived from this brief and documented in the architecture layer:
- `LupiraCalApi/docs/temporal-backbone.md` — the calendar/scheduling backbone.
- `LupiraTasksApi/docs/tracking-backbone.md` — the tracked-to-done backlog.
- `GptApi/docs/llm-gateway-backbone.md` — the LLM gateway.
- `LupiraAssistantApi/docs/assistant-backbone.md` — the hub (P0 core loop); ties the above together.
- `LupiraCommsApi/docs/comms-backbone.md` — the comms substrate: live ingestion, semantic topic segmentation, and research search; feeds the assistant closed topics for capture.
