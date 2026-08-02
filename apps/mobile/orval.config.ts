import { defineConfig } from 'orval';

/**
 * Raw typed fetchers (no react-query): the collector/sync layers call these from headless background
 * tasks, and the UI reads the SQLite mirror — a second, mirror-unaware cache would only fight it.
 *
 * LocationApi and HealthApi are each split in two because they serve two auth schemes over one origin:
 * the `Ingest` tags authenticate with the device key, everything else with the OIDC bearer, and Orval
 * binds one mutator per target. Specs come from `npm run fetch:openapi`.
 */
const output = (dir: string, mutator: string, baseUrl = '') => ({
  target: `./src/data/api/generated/${dir}/api.ts`,
  schemas: `./src/data/api/generated/${dir}/models`,
  client: 'fetch' as const,
  mode: 'tags-split' as const,
  baseUrl,
  clean: true,
  override: { mutator: { path: './src/data/api/mutators.ts', name: mutator } },
});

export default defineConfig({
  locationIngest: {
    input: { target: './backend-location-openapi.json', filters: { tags: ['Ingest'] } },
    output: output('location-ingest', 'deviceKeyFetchLocation'),
  },
  location: {
    input: { target: './backend-location-openapi.json', filters: { tags: ['Devices', 'Me'] } },
    output: output('location', 'apiFetchLocation'),
  },
  healthIngest: {
    input: { target: './backend-health-openapi.json', filters: { tags: ['Ingest'] } },
    output: output('health-ingest', 'deviceKeyFetchHealth'),
  },
  health: {
    input: { target: './backend-health-openapi.json', filters: { tags: ['Me', 'HealthRecords'] } },
    output: output('health', 'apiFetchHealth'),
  },
  // The assistant surface rides the BFF: one origin, the /api/assistant prefix picks the upstream.
  assistant: {
    input: { target: './backend-assistant-openapi.json', filters: { tags: ['Auth', 'Profile', 'Inbox'] } },
    output: output('assistant', 'apiFetchAssistant', '/api/assistant'),
  },
});
