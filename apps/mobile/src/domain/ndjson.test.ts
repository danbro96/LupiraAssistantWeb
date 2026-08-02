import { describe, it, expect } from 'vitest';
import { serializeNdjson, utf8ByteLength } from './ndjson';

describe('utf8ByteLength', () => {
  it('counts ASCII as one byte each', () => {
    expect(utf8ByteLength('abc')).toBe(3);
  });

  it('counts multi-byte code points correctly', () => {
    expect(utf8ByteLength('é')).toBe(2);
    expect(utf8ByteLength('€')).toBe(3);
    expect(utf8ByteLength('😀')).toBe(4); // surrogate pair → 4 bytes
  });
});

describe('serializeNdjson', () => {
  it('emits one JSON object per line with no trailing newline', () => {
    const { body, lineCount } = serializeNdjson([{ a: 1 }, { b: 2 }]);
    expect(body).toBe('{"a":1}\n{"b":2}');
    expect(body.endsWith('\n')).toBe(false);
    expect(lineCount).toBe(2);
  });

  it('reports the UTF-8 byte length of the body', () => {
    const { body, byteLength } = serializeNdjson([{ a: '€' }]);
    expect(byteLength).toBe(utf8ByteLength(body));
  });

  it('handles an empty array', () => {
    expect(serializeNdjson([])).toEqual({ body: '', lineCount: 0, byteLength: 0 });
  });
});
