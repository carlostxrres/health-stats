import { z } from "zod";
import { ENTRY_TYPE_CODES } from "../entryTypes";

export const entriesQuerySchema = z.object({
  type: z.array(z.enum(ENTRY_TYPE_CODES)).optional(),
  from: z.iso.date().optional(),
  to: z.iso.date().optional(),
  sort: z.enum(["asc", "desc"]).default("desc"),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

export type EntriesQuery = z.infer<typeof entriesQuerySchema>;
