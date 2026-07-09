# Lupira Assistant — Roadmap

**Status:** assessment + remaining work, as of 2026-07-09 (code-inspected across all repos). Reads with `product-brief.md` and the backbone docs it references. The backbones document the **intended final state**; this file holds status + remaining work.

## Verdict
The idea is sound and the design fits the core goal: the LLM runs at only two entry points (contracted `ItemPrompt` fires, closed-topic extraction), all outbound interaction is deterministic and frozen, proposals are event-sourced, consent gates every user-record write. The original structural weak points — missing firing spine, single validation layer, comms loss modes — are fixed (Shipped, below), and the extraction path now decomposes into a triaging Scan + strict per-candidate Extract. What remains: finishing the hub's write path, building the app surface, calibrating segmentation, and defence-in-depth (consistency + isolation).

## State of the world (code vs docs)

| Component | State |
|---|---|
| assistant-api | Substantially built (intake, FireProcessor, ProposalRouter, ContractValidator, TargetResolver, OBO tokens, Telegram channel, CI). |
| cal-api | Fully built: materialisation (classes, curation, XOR payloads, `scheduled_fire` + stamped `principal_id`, Completeness) **and** the `lupira-cal-worker` dispatcher (claim leases, retry/backoff, per-kind expiry, push to `/fires`). |
| tasks-api | Ahead of its own doc: relations, `ListKind.Agent`, rich `ItemStatus`, metadata shipped. 16 MCP tools. No scheduler (non-goal honored). |
| gpt-api | Deployed: strict `response_format` json_schema→GBNF + response-vs-schema validation (batch 2); tool defs forwarded blind (no executor), token budgets unenforced. |
| comms-api | Built end-to-end: Telegram userbot, semantic segmentation, durable outbox push, Facebook backfill importer, MCP `archive_search` (FTS + pgvector + gateway rerank) + topic reads. Email connectors + triage: doc-only. |
| Mobile app | Auth + registration + location pipeline built. Inbox UI + offline cache shipped; the fetch and grant-status calls are stubs (no hub `/inbox` yet). |

Agent tool surface (MCP `/mcp`, LAN-only): cal 17 · tasks 16 · career 10 (rw) · health 5 (ro) · location 7 (ro, coarse) · LlmUtility ~28 (deterministic) · LlmSandbox `run_code` · DevOps 10. assistant-api exposes none (consumer — correct).

## Shipped

- **Batch 1 — cal firing spine.** `lupira-cal-worker`: SKIP-LOCKED claim/lease, retry/backoff, per-kind expiry, push `/fires`, `principal_id` stamping; >35d one-shot + `Guid.Empty` materialisation bugs fixed.
- **Batch 2 — three-layer structured output + run ledger.** Worker GBNF grammar constraint → gpt-api response-vs-schema validation (502 on miss) → `ContractValidator` semantic backstop; event-sourced `AgentRun` (prompt hash/version, per-attempt raw request/response + verdict, terminal outcome); `ProposedAction.RunId` traces every proposal to its run.
- **Batch 3 — comms reliability spine.** Atomic ingest transaction (EF + Marten, one commit), boot+periodic ingest reconciler, durable `comms.topic_outbox` + dispatcher (SKIP LOCKED + lease, unbounded capped retry), `ReleasedAt`-versioned re-release redelivery. Follow-up: redelivery carries the full merged window (no message windowing yet).
- **Batch 4 — anti-guessing guards.** Provenance-per-field: extraction cites per-message ordinals, ungrounded content fields strict-rejected (retry→Drop), durable refs persisted on `ProposedAction.sources` (`targetCalendar`/`isAllDay` the only exempt fields). No-LLM-date-arithmetic: reference instant in the prompt, strict-ISO parse + range check before emit.
- **Batch 5 — run profiles + two-phase extraction + reply vertical.** `RunProfile` spine (behaviour-preserving) with `ParentRunId` ledger lineage; a closed topic runs `Scan → per-candidate Extract` (the only path — no monolith, no flag). The Scan is the actionability gate (warm small tier; empty inventory = triage-negative); each Extract is strict + single-kind + failure-isolated. `fromPrincipal` marks the owner's own messages end-to-end (comms ingest → topic payload → the "you" window); reply obligations extract to a "Replies" task + one-shot nudge.
- **Batch 6 — Resolve × Contact (first resolution run).** An extracted contact is resolved against the address book before consent: a deterministic rung binds an exact email/name match (no LLM), an ambiguous set goes to a strict candidate-pick `ResolveContact` run (ledgered, `ParentRunId` = the extract run), and a match rebinds the proposal `CreateContact → UpdateContact` + `Target` via a new event-sourced `ActionRetargeted` — so create-vs-update is a resolution verdict, not an Extract guess. Adds cal-api `PUT /contacts/{id}` (merge), the assistant's contact query/update clients, and the `UpdateContact` writer arm.
- **Batch 7 — Resolve × Event + a reusable resolve seam.** The ladder is generalized into `IProposalResolver` (kind-agnostic orchestration) + one `IResolveStrategy` per `RefKind`, so each further resolution run is a small strategy. `Resolve × Event` is the second instance: an extracted event is matched against the user's calendar (deterministic on an equal title + same-day start, else a candidate-pick `ResolveEvent` run) and rebinds `CreateEvent → UpdateEvent` on a hit — so a re-timed/renamed event updates the occurrence instead of duplicating it. Reuses the existing cal-api `GET /items` (via a new `QueryEventsAsync`) and the already-wired `UpdateEvent` write path — no cal-api change. Not covered: all-day↔timed retiming (`UpdateCalendarItemRequest` carries no `IsAllDay`/`StartDate`).
- **Batch 8 — Resolve × Task (create-vs-update for tracked work).** An extracted task — a to-do, bill, delivery, or reply obligation (all extract to `CreateTask`) — is matched against the user's existing tasks before consent (deterministic on an equal title + same-day due, title-only when undated, else a candidate-pick `ResolveTask` run) and rebinds `CreateTask → UpdateTask` on a hit, so a repeated bill/parcel/reply/to-do converges onto one task. `IResolveStrategy.Handles` widened to a set so one strategy covers the whole family. Adds tasks-api cross-list `GET /items` search + id-only `PATCH /items/{id}` + id-only `POST /items/{id}/metadata` (list resolved server-side, mirroring cal-api), the assistant's task query/update clients, and the `UpdateTask` kind + writer arm. `TaskMatch` leads with the structured dedupe key — a bill's invoice number / a delivery's tracking number is definitive identity (differing same-kind key = definitively distinct), title+due-day the fallback — and the update refreshes the bill/delivery metadata blob. Remaining limitation: candidate fetch is title-based, so a same-key item whose title changed between notifications isn't surfaced (a metadata/text search on tasks-api is a later lever).
- **Since batch 4:** comms MCP surface (`archive_search` FTS + pgvector + gateway rerank; topic reads) · cal `ItemCategory` taxonomy + composable `ItemDetails` + Places catalog · assistant bills/deliveries→tasks routing + `AssistantProfile` routing defaults · doc convention set: backbones = intended final state, roadmap = status + remaining work.

## Remaining work

### Weak points (ranked)
1. **Segmentation uncalibrated + unaudited.** Fixed `θ_attach=0.55`, EMA centroid drift, cross-conversation merging, per-message embeddings of short text. No record of why a message landed in a topic — can't review or tune. → decision log (build order 1). *(Actionability triage is addressed — the batch-5 Scan is the gate — but segmentation calibration itself is untouched.)*
2. **Cross-substrate consistency manual.** Relations are by-convention strings (no existence/authz check; no reverse lookup on the tasks side); standing-monitor close is two unrelated writes, no reconciler; orphaned heartbeats fire forever. → consistency sweep (playbook).
3. **Isolation/security defence-in-depth.** Comms release path skips the per-message principal cross-check; refresh-token vault = crown jewels (key mgmt undecided); gateway keys plaintext/unscoped; the userbot files other people's group messages under the owner principal (multi-user policy question).

### Determinism playbook (open levers)
- **Candidate-selection over free generation** — the `Resolve × RefKind` profile family (backbone: Agent run profiles). **`Resolve × Contact` (batch 6) + `Resolve × Event` (batch 7) + `Resolve × Task` (batch 8) shipped** — deterministic-first ladder → LLM candidate-pick on ambiguity, `ActionRetargeted` for create-vs-update, behind a reusable `IProposalResolver` + per-kind `IResolveStrategy` seam. Remaining: `Resolve × Place/Container` (same shape; each needs its candidate-fetch client method) and career refs (with the career wiring). Task's structured-key matching + metadata-refresh shipped; the open Task lever is title-based candidate fetch (a key match on a re-titled item isn't surfaced).
- **Segmentation decision log** — append-only (message, candidates, scores, threshold, action) for calibration + golden replays.
- **Tool allowlist as code** — contract `Tools` filters the runner's tool set, enforced in the hub, every call logged into `AgentRun`. *(Partial: `Tools` recorded on `AgentRunStarted`; the executor loop + per-call logging land with connector work.)*
- **Confidence → policy thresholds in DB** per proposal kind; no auto-apply band until precision data exists.
- **Consistency sweep** as a DevOps-calendar `ItemAction(RunJob)` — dangling relations, orphaned heartbeats, monitors without prompts, parked fires.

### assistant-api
P0 core loop is live end-to-end (intake → contracted run → validation → policy → Telegram approval → cal/tasks writers).

**Write path**
- Policy classifies by action *kind* (`SendCheckIn`/`CreatePrompt`/`Report` free, all else asks) — the ownership/calendar-class-aware line is unbuilt (`PolicyService`).
- Writer arms missing: `CreatePrompt`, `UpdateContact`, `CreateRelation`, `CreateCareerEntry` → `NotSupportedException` → `WriteFailed`. `CreatePrompt` is policy-**Free**, so it auto-applies then fails at the writer.
- career-api unwired: no client, no `career` audience minted (enum kind + doc-comments only).
- `ItemAction`: only `SendCheckIn` executes; `Notify`/`CreateLinkedTask`/`ExpireTarget`/`RescheduleSelf`/`RunJob`/`Rescore` are declared no-ops (`ActionExecutor`).
- Runner `report` output: declared in the schema, never parsed/persisted.
- Two-phase `Scan → Extract` + `RunProfile` spine + `ParentRunId` shipped (batch 5) as the only extraction path. `Resolve × Contact` (batch 6) + `Resolve × Event` (batch 7) + `Resolve × Task` (batch 8) shipped behind a reusable `IProposalResolver`/`IResolveStrategy` seam; the rest of the `Resolve × RefKind` family (Place/Container/Career) remains unbuilt.
- Reply nudge is a **one-shot** (~24h) reminder, not the backbone's recurring-until-done; the recurring + skip-if-task-done upgrade needs a cal-api RRULE reminder + a tasks-api status read (rides the consistency-sweep work).

**Reliability / auth**
- Revoked grant → write fails with "Re-authentication required" on the action ledger only; fire-parking (`Parked` scaffolded, never appended) + proactive re-auth notice unbuilt; `OfflineGrantStatus.Expired` never set.
- Intake queue: no startup re-drive — a crash between the 202 ack and processing strands the item at `Recorded` (the `IntakeQueue` comment claims re-drive exists).
- Proposal-path `SendCheckIn` (OnMiss=Ask) delivers via `ActionWriter.DeliverAsync` without recording a pending `CheckIn` → the answer can't correlate, no follow-up run. Fired check-ins (`CheckInService`) unaffected.
- `FallbackMode.Ask`/`Retry` indistinguishable: always 2 attempts then Ask-unless-Drop (enum doc-comment contradicts).
- Ownership re-verify (principal owns `item_id`'s calendar) — open decision, unimplemented.

**Channel / hygiene**
- Telegram Edit button records intent only (no payload); edit-to-learn deferred.
- `PUT /me/profile/routing` can't set `CheckInCalendarId`/`BillsListId`/`DeliveriesListId` — discovery-only.
- comms pull tail (`ICommsApiClient.GetTopicTailAsync`) scaffolded + registered, unconsumed.
- Stale code comments: `OnBehalfOfTokenProvider` claims the runner parks fires; `GatewayClient`/`GatewayOptions` comment calls `JsonObject` the default (actual = `JsonSchema`).

### Mobile app
Foundation (layers/eslint-boundaries, PKCE auth, DeviceKey-vs-bearer split, store-and-forward + receipts, pause kill-switch, cursor-resume) matches the backbone.

**App ↔ hub integration seams**
- Enrollment mismatch: the app opens `/connect?return_uri=lupiraassistant://connected` (`data/auth/connect.ts`); the hub shipped `GET /auth/login` with `RedirectUri` hardcoded to `/auth/done` (an HTML close-me page — no deep-link return). One side must move; the return leg is an open decision in the app backbone.
- Grant status mismatch: the app intends `GET /me` (stub); the hub shipped `GET /auth/status` + `GET /me/profile`.
- Inbox fetch is a stub: `inbox-store.refresh()`/`refreshGrant()` log and return (`TODO(hub-spec)`); no assistant client exists; the offline cache is read-wired but never written; `grantStatus` stays `unknown`, so the reconnect card is never driven by live data. The hub has no `/inbox`.
- The hub lacks every other app-facing endpoint: proposals resolve, check-in answer, push-tokens, connectors, preferences.

**Unbuilt surface**
- `acks` stream: no `pending_acks` table/repo/uploader; `Stream` = `location|ring|summaries` only.
- Orval clients: no orval config, no `generated/` — the API layer is hand-written.
- Push: `expo-notifications` not a dependency, no wiring.
- Connectors/preferences stores + screens; tab navigation (still a native stack: RegisterDevice → Inbox, Settings via header).

**Scaffolding only**
- ring/summaries streams: seq keys, `pending_*` tables, and HealthApi ingest fns exist, but nothing writes them and the sync engine flushes only `location`; the HealthApi device key isn't minted.

### cal-api
- **DAV object paths don't gate on `Class == Agenda`.** System calendars are hidden from PROPFIND discovery, but a direct `REPORT`/`GET` with a known calendar GUID is only ACL-checked (`DavRouter.HandleCalendarReport`/`GetItem`) — the backbone's "System calendars never in DAV" isn't a hard guarantee.
- Rubric tune parked: weak-location (city-vs-venue → 0.5) not implemented — location presence is binary on `PlaceId`.
- Transitional: fire rows materialised before principal-stamping resolve their principal via the calendar's first `Owner` grant at dispatch; drop the fallback once pre-stamp rows have drained.
- `PromptIntent` still carries `CreateFollowUp`/`AskUser` — retired by the run-profile design (they're run *outputs*); prune the enum with the profile work.

### tasks-api
- **No reverse relation lookup.** cal-api exposes `GET /relations?toKind=&toRef=`; tasks-api lists only forward by `FromId` — "which task monitors this cal item" needs the cal-side query or a scan.
- Relation `ToKind`/`RelationType` are unvalidated free strings, asymmetric across APIs (tasks→cal `"cal-item"`, cal→tasks `"task"`) — no existence/authz check (weak point 2).
- VTODO regeneration drops stored VALARM sub-components (known `VtodoMapper` gap).

### comms-api
- **Attachments unwired**: `IAttachmentStore` is the `NoOp` seam; `Message.ObjectKey` never populated; media-only messages dropped at the connector/importer — the corpus is text-only.
- **Release path skips the per-message principal cross-check** (weak point 3): the payload builder fetches message bodies by id unscoped; contamination is only prevented by the assigner's principal-scoped candidate query.
- No topic merge (`θ_merge` is a doc knob with zero code) and no LLM topic labels (provisional label = the message's first words).
- `archive_search` fusion is concat + id-dedup — the reranker is the sole ranker (no score fusion/RRF); the `source` filter is the `Telegram|Facebook` enum, so future platforms (email) need an enum addition to be filterable.
- `GET /topics/{id}` / `get_topic` are not status-restricted — "open-topic tail" is convention, any topic's detail is returned.
- Optional rerank-members-before-release at close time is unbuilt; the "skip topics with nothing actionable" close-time triage is superseded by the assistant-side Scan (batch 5), so comms needn't add its own.
- Participant→Contact binding unwired: `Participant.ContactId` is a null seam — needs the write-back endpoint (`PUT /participants/{id}/contact`), `senderContactId` on topic payloads, and a `contactId` filter on `archive_search`; the resolving side is `Resolve × Contact` (build order 2). *(The `fromPrincipal` direction marker on the topic payload shipped in batch 5.)*

## Build order (next)

1. **Segmentation decision log + calibration.** Add the append-only decision log (message, candidates, scores, threshold, action) in comms-api for calibration + golden replays, then tune the fixed segmentation knobs (`θ_attach`, recency τ) against real topics.
2. **Extend the `Resolve × RefKind` family** — `Resolve × Contact` (batch 6) + `Resolve × Event` (batch 7) + `Resolve × Task` (batch 8) shipped behind the `IProposalResolver`/`IResolveStrategy` seam; apply the same ladder to Place/Container, then career refs (with the career wiring). Each needs its candidate-fetch client method — the run profile, ladder, and `ActionRetargeted` plumbing are reusable. On Task, structured-key matching (bill `invoiceNumber` / delivery `trackingNumber`) + metadata-refresh-on-update shipped; the remaining lever is a metadata/text search on tasks-api (so a key match survives a title change). Separately, the comms Participant→Contact write-back (endpoint + `senderContactId` payload field + `contactId` search filter) rides on `Resolve × Contact`.
3. **Email connector** — IMAP sidecar → `POST /ingest` + mbox batch import for history; adds a `Source` enum value (also unlocks the `archive_search` platform filter).
4. *(possible)* **Facebook Messenger live connector** — Facebook is backfill-only (export CLI). No official API for personal DMs: unofficial client (ban risk; same read-only posture as the Telegram userbot) vs periodic manual re-export (the `(PrincipalId, Source, SourceRef)` dedup makes re-imports safe). Decide if Messenger traffic warrants it.

Not yet sequenced: hub write-path completion (writer arms, ownership-aware policy, `ItemAction` executors, fire-parking + re-auth notice) · app surface (hub `/inbox` + resolve/answer endpoints, `acks` stream, native push) · memory (per-user facts + pgvector recall — unblocked since the gateway shipped `/v1/embeddings` + `/v1/rerank`) · consistency sweep + confidence thresholds (playbook).

Non-recommendation: don't split the hub. Internal seams are clean; the work is finishing the spine and adding defense-in-depth, not reshaping topology.
