import { z } from 'zod';
import {
  ContractVersionSchema,
  IsoDateTimeSchema,
  ProjectIdSchema,
  UnitSystemSchema,
  UserIdSchema,
} from './common';

export const ProjectStatusSchema = z.enum([
  'active',
  'archived',
  'deletion_pending',
]);

export const ProjectSchema = z
  .object({
    contractVersion: ContractVersionSchema,
    id: ProjectIdSchema,
    ownerId: UserIdSchema,
    name: z.string().trim().min(1).max(120),
    status: ProjectStatusSchema,
    preferredUnitSystem: UnitSystemSchema,
    createdAt: IsoDateTimeSchema,
    updatedAt: IsoDateTimeSchema,
  })
  .strict()
  .refine(
    ({ createdAt, updatedAt }) =>
      Date.parse(updatedAt) >= Date.parse(createdAt),
    {
      message: 'updatedAt cannot precede createdAt',
      path: ['updatedAt'],
    },
  );

export type ProjectStatus = z.infer<typeof ProjectStatusSchema>;
export type Project = z.infer<typeof ProjectSchema>;
