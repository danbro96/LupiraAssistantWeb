// Structural mirror of the ingest receipts, narrowed to what applyReceipt reads (domain imports no
// generated code). `seq` is absent for batch-level rejects; `paused` is sent by location ingest only.
export interface IngestReceipt {
  rejects: { seq?: number | null; reason: string }[];
  paused?: boolean;
}
