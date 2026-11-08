import { z } from 'zod';

export const CONTRACT_VERSION = 1 as const;
export const ContractVersionSchema = z.literal(CONTRACT_VERSION);

export const ProjectIdSchema = z.string().uuid().brand<'ProjectId'>();
export const UserIdSchema = z.string().uuid().brand<'UserId'>();
export const JobIdSchema = z.string().uuid().brand<'JobId'>();
export const AttemptIdSchema = z.string().uuid().brand<'AttemptId'>();

export const IsoDateTimeSchema = z
  .string()
  .datetime({ offset: true })
  .brand<'IsoDateTime'>();

export const MetersSchema = z.number().finite().nonnegative().brand<'Meters'>();

export const CoordinateMetersSchema = z
  .number()
  .finite()
  .brand<'CoordinateMeters'>();

export const ConfidenceSchema = z
  .number()
  .finite()
  .min(0)
  .max(1)
  .brand<'Confidence'>();

export const UnitSystemSchema = z.enum(['metric', 'imperial']);

export type ProjectId = z.infer<typeof ProjectIdSchema>;
export type UserId = z.infer<typeof UserIdSchema>;
export type JobId = z.infer<typeof JobIdSchema>;
export type AttemptId = z.infer<typeof AttemptIdSchema>;
export type IsoDateTime = z.infer<typeof IsoDateTimeSchema>;
export type Meters = z.infer<typeof MetersSchema>;
export type CoordinateMeters = z.infer<typeof CoordinateMetersSchema>;
export type Confidence = z.infer<typeof ConfidenceSchema>;
export type UnitSystem = z.infer<typeof UnitSystemSchema>;
