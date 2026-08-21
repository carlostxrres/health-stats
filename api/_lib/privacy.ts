import type { VercelRequest } from "@vercel/node";
import { appSettings } from "../../db/schema/index.js";
import type { EntryTypeCode } from "../../shared/entryTypes.js";
import { db } from "./db.js";
import { supabaseAdmin } from "./supabaseAdmin.js";

// Mirrors requireUser's token check, but returns a boolean instead of
// throwing — read access is unauthenticated by default (see
// createHandler), so privacy checks need to ask "is there a session?"
// without turning an absent one into an error.
async function isAuthenticated(req: VercelRequest): Promise<boolean> {
  const header = req.headers.authorization;
  const token = header?.startsWith("Bearer ") ? header.slice("Bearer ".length) : undefined;
  if (!token) return false;
  const { data, error } = await supabaseAdmin.auth.getUser(token);
  return !error && !!data.user;
}

async function getPrivateEntryTypes(): Promise<Set<EntryTypeCode>> {
  const [row] = await db
    .select({ privateEntryTypes: appSettings.privateEntryTypes })
    .from(appSettings);
  return new Set((row?.privateEntryTypes ?? []) as EntryTypeCode[]);
}

// True if `type` should be hidden from this specific request: it's marked
// private in settings and the request doesn't carry a valid session.
export async function isTypeHiddenFrom(req: VercelRequest, type: EntryTypeCode): Promise<boolean> {
  const privateTypes = await getPrivateEntryTypes();
  if (!privateTypes.has(type)) return false;
  return !(await isAuthenticated(req));
}

// Same check applied to a whole list of types at once, for the /entries
// aggregator (which fetches several types per request).
export async function filterVisibleTypes(
  req: VercelRequest,
  types: readonly EntryTypeCode[],
): Promise<EntryTypeCode[]> {
  const privateTypes = await getPrivateEntryTypes();
  if (privateTypes.size === 0) return [...types];
  if (await isAuthenticated(req)) return [...types];
  return types.filter((type) => !privateTypes.has(type));
}
