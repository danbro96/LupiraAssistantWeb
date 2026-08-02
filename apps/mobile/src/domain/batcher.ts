export interface BatchItem {
  seq: number;
  json: string;
  bytes: number;
}

export interface BatchLimits {
  maxLines: number;
  maxBytes: number;
}

// Always includes the first row even if it alone exceeds maxBytes — an NDJSON line can't be split.
export function selectBatch(items: readonly BatchItem[], limits: BatchLimits): BatchItem[] {
  const out: BatchItem[] = [];
  let bytes = 0;
  for (const it of items) {
    if (out.length >= limits.maxLines) break;
    const add = it.bytes + (out.length > 0 ? 1 : 0); // +1 for joining newline
    if (out.length > 0 && bytes + add > limits.maxBytes) break;
    out.push(it);
    bytes += add;
  }
  return out;
}
