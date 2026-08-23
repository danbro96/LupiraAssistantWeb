# LupiraAssistantMobile — agent notes

- **Monorepo** (npm workspaces, mirrors LupiraCalWeb) despite the repo name: `apps/mobile` (the
  canonical surface), `packages/domain` (`@lupira/assistant-domain`), `packages/tokens`
  (`@lupira/assistant-tokens`), `src/LupiraAssistantWeb` (.NET 10 BFF fronting assistant-api and
  comms-api). **No web SPA exists yet** — it is deferred in `docs/roadmap.md`; the tokens package is
  already shaped for it. Pre-release: v0.1.0, no tags, no EAS builds, BFF not deployed.
- **Two products in one app**: the assistant surface (inbox of proposals, comms archive browser,
  settings) and the household telemetry collector (background GPS → NDJSON store-and-forward).
- **Offline-first, both paths.** Assistant gestures apply optimistically → inbox cache + a queued ack
  on the pending-acks stream; fixes go to a SQLite buffer with a crash-safe monotonic `seq`. Both drain
  through `sync/sync-engine`.
- **Layering** (downward-only, `eslint-plugin-boundaries` v7): `domain → data → sync → state → ui`,
  with `collector` beside `sync`, and `config`/`debug`/`feedback`/`polyfills` as leaves. See
  `apps/mobile/eslint.config.mjs` — its header comment is the authority.
- **The headless cone must stay UI-free.** `index.ts` registers `collector/location-task` and
  `sync/background-upload-task` at module top level, so they load in the OS's bare JS context during
  cold start. Nothing Paper-flavored may reach them: mount `PaperProvider` strictly inside `App.tsx`
  (boundaries already forbids `collector`/`sync` → `ui`).
- **API clients are generated**: orval → `src/data/api/generated/` (never hand-edit). `client: 'fetch'`,
  not react-query — assistant reads come from the BFF and the inbox cache.
- **UI stack**: react-native-paper 5 (MD3), themed in `ui/theme/paperTheme.ts` from
  `@lupira/assistant-tokens`; React Navigation themes come from `adaptNavigationTheme`. Paper covers
  the MD3-expressible colors; the app's own semantics (`pending`, `failed`, `banner*`, `toast*`) stay
  on `useColors()`, the app's only color hook (never Paper's `useTheme()`). Components use
  `const c = useColors(); const styles = useMemo(() => makeStyles(c), [c])`.
  Icons are MaterialCommunityIcons (Paper's set). Confirms use `useConfirm()`
  (`ui/components/ConfirmDialog.tsx`); text inputs use `ui/components/TextField.tsx`.
  Tokens mirror the other repos' copies — see DevOps `Guides/design-tokens.md` and its drift check.
- **Row components take `styles` as a prop and are `memo`'d** — never a per-row `useMemo(makeStyles)`,
  and never Paper's `useTheme()` per row; that is what keeps list renders cheap.
- **`ui/screens/ThreadScreen.tsx` bubbles stay bespoke `View`s.** No `Card`/`Surface`: the list is
  `inverted`, where elevation renders wrong, and the day-break/`previous`-row coupling and
  `maxWidth: '85%'` alignment are load-bearing.
- **ToastHost stays bespoke** (not Paper's `Snackbar`): it is driven by an imperative zustand store
  callable from `sync`/`state`, carries a `nonce` re-arm plus haptics, and mounts outside the nav tree.
  Its `'#fff'` label is deliberate — the toast surface is dark in both schemes.
- Headers are declarative in `ui/navigation/RootStack.tsx` — no `setOptions` pattern here (unlike
  tasks-mobile).
- No reanimated, and don't add it — this app has no gestures to animate and it would move the Expo
  fingerprint. Paper 5 is pure JS, so it does not.
- Latest stable deps, bump hard. vitest (node env, `*.test.ts` — pure logic only; no UI tests).
  `packages/tokens` holds only constants, so it has no test script; adding logic there means adding one.
  Comment only the non-obvious *why*; docs = present state.
