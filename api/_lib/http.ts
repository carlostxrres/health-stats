import type { VercelRequest, VercelResponse } from "@vercel/node";
import { ZodError } from "zod";
import { requireUser, UnauthorizedError } from "./auth";

type Method = "GET" | "POST" | "DELETE" | "PATCH";
type Handler = (req: VercelRequest, res: VercelResponse) => Promise<void>;

// Wraps a Vercel function with the auth guard, method dispatch, and a single
// place to turn thrown errors into HTTP responses.
export function createHandler(methods: Partial<Record<Method, Handler>>) {
  return async (req: VercelRequest, res: VercelResponse) => {
    try {
      if (req.method !== "GET") {
        await requireUser(req);
      }

      const handler = methods[req.method as Method];
      if (!handler) {
        res.setHeader("Allow", Object.keys(methods).join(", "));
        res.status(405).json({ error: "Method not allowed" });
        return;
      }
      await handler(req, res);
    } catch (error) {
      if (error instanceof UnauthorizedError) {
        res.status(401).json({ error: error.message });
        return;
      }
      if (error instanceof ZodError) {
        res.status(400).json({ error: "Validation error", issues: error.issues });
        return;
      }
      console.error(error);
      res.status(500).json({ error: "Internal server error" });
    }
  };
}
