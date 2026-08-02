import { describe, expect, it } from 'vitest';
import {
  applyEdit,
  editSpecFor,
  fieldToInput,
  getField,
  inputToField,
  payloadSlotFor,
  visibleFields,
} from './edit-spec';

describe('payloadSlotFor / editSpecFor', () => {
  it('maps all editable kinds to their slot', () => {
    expect(payloadSlotFor('CreateEvent')).toBe('event');
    expect(payloadSlotFor('UpdateTask')).toBe('task');
    expect(payloadSlotFor('UpdateContact')).toBe('contact');
    expect(payloadSlotFor('CreatePlace')).toBe('place');
    expect(payloadSlotFor('SendCheckIn')).toBeNull();
    expect(editSpecFor('Report')).toBeNull();
  });
});

describe('visibleFields', () => {
  it('hides sub-object fields when the parent is absent', () => {
    const fields = visibleFields(editSpecFor('CreateTask')!, { title: 'Pay', bill: { amount: 12 } });
    const labels = fields.map((f) => f.label);
    expect(labels).toContain('Bill amount');
    expect(labels).not.toContain('Carrier');
  });
});

describe('getField / applyEdit', () => {
  const payload = { title: 'Pay', bill: { amount: 12, currency: 'SEK' } };

  it('reads nested paths', () => {
    expect(getField(payload, ['bill', 'amount'])).toBe(12);
    expect(getField(payload, ['delivery', 'carrier'])).toBeUndefined();
  });

  it('sets immutably without touching siblings', () => {
    const next = applyEdit(payload, ['bill', 'amount'], 99);
    expect(next).toEqual({ title: 'Pay', bill: { amount: 99, currency: 'SEK' } });
    expect(payload.bill.amount).toBe(12);
  });

  it('never invents a missing parent', () => {
    expect(applyEdit(payload, ['delivery', 'carrier'], 'DHL')).toBe(payload);
  });
});

describe('inputToField', () => {
  it('parses each type and rejects garbage', () => {
    expect(inputToField('number', '12.5')).toEqual({ ok: true, value: 12.5 });
    expect(inputToField('number', 'twelve').ok).toBe(false);
    expect(inputToField('datetime', '2026-08-07T19:00:00+02:00')).toEqual({
      ok: true,
      value: '2026-08-07T19:00:00+02:00',
    });
    expect(inputToField('datetime', 'friday').ok).toBe(false);
    expect(inputToField('date', '2026-08-09')).toEqual({ ok: true, value: '2026-08-09' });
    expect(inputToField('date', '2026-13-40').ok).toBe(false);
    expect(inputToField('list', 'a, b,, c')).toEqual({ ok: true, value: ['a', 'b', 'c'] });
  });

  it('clears on empty input and round-trips through fieldToInput', () => {
    expect(inputToField('text', '  ')).toEqual({ ok: true, value: null });
    expect(fieldToInput('list', ['a', 'b'])).toBe('a, b');
    expect(fieldToInput('text', null)).toBe('');
    expect(fieldToInput('number', 12.5)).toBe('12.5');
  });
});
