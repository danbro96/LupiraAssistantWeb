// No trailing newline — server splits on '\n' and a trailing empty line counts as a malformed row.
export function utf8ByteLength(s: string): number {
  let bytes = 0;
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    if (c < 0x80) bytes += 1;
    else if (c < 0x800) bytes += 2;
    else if (c >= 0xd800 && c <= 0xdbff) {
      // High surrogate: 4 UTF-8 bytes; skip the paired low surrogate.
      bytes += 4;
      i++;
    } else bytes += 3;
  }
  return bytes;
}

export interface SerializedNdjson {
  body: string;
  lineCount: number;
  byteLength: number;
}

export function serializeNdjson(rows: readonly object[]): SerializedNdjson {
  const body = rows.map((r) => JSON.stringify(r)).join('\n');
  return { body, lineCount: rows.length, byteLength: utf8ByteLength(body) };
}
