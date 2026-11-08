import { describe, expect, it } from 'vitest';
import {
  ConfidenceSchema,
  ContractVersionSchema,
  CoordinateMetersSchema,
  IsoDateTimeSchema,
  MetersSchema,
  ProjectIdSchema,
  UnitSystemSchema,
} from './common';

describe('common contract primitives', () => {
  it('accepts the current contract version only', () => {
    expect(ContractVersionSchema.parse(1)).toBe(1);
    expect(() => ContractVersionSchema.parse(2)).toThrow();
  });

  it('requires UUID identifiers', () => {
    expect(ProjectIdSchema.parse('7a7967ac-400d-4b87-a96c-58e9299a5e47')).toBe(
      '7a7967ac-400d-4b87-a96c-58e9299a5e47',
    );
    expect(() => ProjectIdSchema.parse('project-1')).toThrow();
  });

  it('requires timestamps with an explicit offset', () => {
    expect(IsoDateTimeSchema.parse('2026-11-05T15:00:00Z')).toBe(
      '2026-11-05T15:00:00Z',
    );
    expect(() => IsoDateTimeSchema.parse('2026-11-05T15:00:00')).toThrow();
  });

  it('keeps distances nonnegative while allowing signed coordinates', () => {
    expect(MetersSchema.parse(2.4)).toBe(2.4);
    expect(CoordinateMetersSchema.parse(-1.2)).toBe(-1.2);
    expect(() => MetersSchema.parse(-0.01)).toThrow();
    expect(() => CoordinateMetersSchema.parse(Number.NaN)).toThrow();
  });

  it('bounds confidence values from zero to one', () => {
    expect(ConfidenceSchema.parse(0)).toBe(0);
    expect(ConfidenceSchema.parse(1)).toBe(1);
    expect(() => ConfidenceSchema.parse(1.01)).toThrow();
  });

  it('accepts supported display unit systems', () => {
    expect(UnitSystemSchema.parse('metric')).toBe('metric');
    expect(UnitSystemSchema.parse('imperial')).toBe('imperial');
    expect(() => UnitSystemSchema.parse('feet')).toThrow();
  });
});
