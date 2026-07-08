# Lupira Assistant — Roadmap

**Status:** assessment + build order, as of 2026-07-07 (code-inspected across all repos). Reads with `product-brief.md` and the backbone docs it references.

## Verdict
The idea is sound and the design fits the core goal: the LLM runs at only two entry points (contracted `ItemPrompt` fires, closed-topic extraction), all outbound interaction is deterministic and frozen, proposals are event-sourced, consent gates every user-record write. Weak points are in the reliability spine (missing), validation concentrated in one layer, and comms loss modes — not in the concept.

## State of the world (code vs docs)

| Component | State |
|---|---|
| assistant-api | Substantially built (intake, FireProcessor, ProposalRouter, ContractValidator, TargetResolver, OBO tokens, Telegram channel, CI). |
| cal-api | Fully built: materialisation (classes, curation, XOR payloads, `scheduled_fire` + stamped `principal_id`, Completeness) **and** the `lupira-cal-worker` dispatcher (claim leases, retry/backoff, per-kind expiry, push to `/fires`). |
| tasks-api | Ahead of its own doc: relations, `ListKind.Agent`, rich `ItemStatus`, metadata shipped. 16 MCP tools. No scheduler (non-goal honored). |
| gpt-api | Deployed thin passthrough: `response_format`/`tools` forwarded blind, no schema validation, no tool allowlist, token budgets unenforced. |
| comms-api | Built end-to-end (Telegram userbot, deterministic segmentation, TopicReleased push). Email, research search, rerank, triage: doc-only. |
| Mobile app | Built (location uploader, read-only Inbox). |

Agent tool surface (MCP `/mcp`, LAN-only): cal 17 · tasks 16 · career 10 (rw) · health 5 (ro) · location 7 (ro, coarse) · LlmUtility ~28 (deterministic) · LlmSandbox `run_code` · DevOps 10. assistant-api exposes none (consumer — correct).

## Weak points, ranked

1. ~~**Firing spine missing.**~~ **Done (batch 1):** `lupira-cal-worker` ships from the cal-api repo (claim/lease/backoff/expiry, push to `/fires`); the >35d one-shot and `Guid.Empty` materialisation bugs are fixed (`FireContext` resolver + widened sweep).
2. ~~**Comms loss modes.**~~ **Done (batch 3):** durable `comms.topic_outbox` written in the same commit as `TopicReleased` + dispatcher (SKIP LOCKED claim/lease, unbounded retry w/ capped backoff); embedding + topic assignment now commit in one shared PG transaction; boot+periodic ingest reconciler re-drives unprocessed rows; re-released topics redeliver via `ReleasedAt`-versioned dedupe keys (assistant `/inbound`).
3. **Single validation layer.** Gateway enforces nothing; hub's `ContractValidator` is the only defense. Schema misses become retry→OnMiss churn on constrained hardware.
4. **Segmentation uncalibrated + unaudited.** Fixed `θ_attach=0.55`, EMA centroid drift, cross-conversation merging, per-message embeddings of short text. No record of why a message landed in a topic — can't review or tune.
5. **No actionability triage** → every idle conversation runs extraction on a gateway where only `qwen3-1.7b` is warm, reasoning tier cold-loads 120B on CPU (head-of-line blocking), bursts 429.
6. **Cross-substrate consistency manual.** Relations are by-convention strings (no existence/authz check); standing-monitor close is two unrelated writes, no reconciler; orphaned heartbeats fire forever.
7. **Isolation/security defense-in-depth.** Comms release path skips per-message principal cross-check; refresh-token vault = crown jewels (key mgmt undecided); gateway keys plaintext/unscoped; userbot files other people's group messages under owner principal (multi-user policy question).
8. ~~**Doc drift.**~~ **Done (batch 1):** assistant-backbone/README, tasks tracking-backbone, health README all corrected to present state.

## Determinism playbook (leverage order)

1. ✅ **Grammar-constrained decoding** (batch 2) — hub sends contract `Output` schema as strict `response_format` (llama.cpp json_schema→GBNF); gpt-api validates the response vs the caller schema before returning (502 on miss); `ContractValidator` stays as the semantic backstop. Three layers.
2. ✅ **`AgentRun` event-sourced aggregate** (batch 2) — prompt hash + version, resolved model, contract, per-attempt raw request/response + validation verdict + retries, terminal outcome. `ProposedAction.RunId` → run. Every proposal replayable from DB. (Context refs beyond inbound item + tool-call results land with memory/connector work.)
3. **Provenance-per-field** — every substantive `ProposedAction` field carries an evidence ref (message/answer/record id); validator rejects ungrounded fields.
4. **Candidate-selection over free generation** — code fetches candidates (contacts, calendars, lists); LLM picks index or `none`, never free-texts an identifier. Extend the `TargetResolver` seam to extraction.
5. **No LLM date arithmetic** — model emits ISO-8601 only; hub parses + range-checks.
6. ✅ **Outbox/reconcile comms→assistant** (batch 3) — durable outbox in comms (atomic with release) + dispatcher; single-transaction message processing; boot+periodic ingest reconciler. Poll endpoint retained as read fallback.
7. **Segmentation decision log** — append-only (message, candidates, scores, threshold, action) for calibration + golden replays.
8. **Tool allowlist as code** — contract `Tools` filters the runner's tool set, enforced in hub, every call logged into `AgentRun`. Hub keeps typed REST clients (not MCP) for writes. *(Partial: contract `Tools` are now recorded on `AgentRunStarted`; per-tool-call logging awaits the connector/tool-execution work.)*
9. **Confidence → policy thresholds in DB** per proposal kind; no auto-apply band until precision data exists.
10. **Consistency sweep as DevOps-calendar `ItemAction(RunJob)`** — dangling relations, orphaned heartbeats, monitors without prompts, parked fires.

## Build order

1. ✅ **`lupira-cal-worker`** — shipped (batch 1): separate host sharing `LupiraCalApi.Core`, SKIP-LOCKED claim loop + lease, push `/fires`, attempts/backoff/expiry, `principal_id` stamping; >35d one-shot + `Guid.Empty` bugs fixed; doc drift (assistant/tasks/health) corrected.
2. ✅ **Gateway schema enforcement (#1) + `AgentRun` envelope (#2)** — shipped (batch 2): three-layer structured-output enforcement (worker GBNF → gpt-api validation → `ContractValidator`) + full event-sourced `AgentRun` with per-attempt raw bodies; `ProposedAction.RunId` traces every proposal to its run.
3. ✅ **Comms outbox/reconcile (#6)** — shipped (batch 3): outbox + dispatcher, atomic ingest transaction, reconciler, re-release redelivery (`Topic:{ref}:{releasedAt}` dedupe keys). Follow-up noted: redelivery carries the full merged window (no message windowing yet).
4. Triage gate + segmentation decision log — before email connectors multiply volume.

Non-recommendation: don't split the hub. Internal seams are clean; the work is finishing the spine and adding defense-in-depth, not reshaping topology.
