import type { VercelRequest, VercelResponse } from "@vercel/node";
import { desc, eq } from "drizzle-orm";
import { bodyPhotoFiles, bodyPhotos } from "../db/schema/index.js";
import { bodyPhotoInputSchema } from "../shared/validation/index.js";
import { db } from "./_lib/db.js";
import { createHandler } from "./_lib/http.js";

async function list(_req: VercelRequest, res: VercelResponse) {
  const rows = await db.query.bodyPhotos.findMany({
    orderBy: desc(bodyPhotos.takenAt),
    limit: 50,
    with: { files: true },
  });
  res.status(200).json(rows);
}

async function create(req: VercelRequest, res: VercelResponse) {
  const input = bodyPhotoInputSchema.parse(req.body);

  const row = await db.transaction(async (tx) => {
    const [photo] = await tx
      .insert(bodyPhotos)
      .values({ takenAt: input.takenAt, description: input.description })
      .returning();

    await tx.insert(bodyPhotoFiles).values(
      input.photoStoragePaths.map((storagePath, position) => ({
        bodyPhotoId: photo.id,
        storagePath,
        position,
      })),
    );

    return photo;
  });

  res.status(201).json(row);
}

async function update(req: VercelRequest, res: VercelResponse) {
  const id = typeof req.query.id === "string" ? req.query.id : undefined;
  if (!id) {
    res.status(400).json({ error: "Missing id" });
    return;
  }

  const input = bodyPhotoInputSchema.parse(req.body);

  const row = await db.transaction(async (tx) => {
    const [photo] = await tx
      .update(bodyPhotos)
      .set({
        takenAt: input.takenAt,
        description: input.description ?? null,
      })
      .where(eq(bodyPhotos.id, id))
      .returning();

    if (!photo) {
      return undefined;
    }

    await tx.delete(bodyPhotoFiles).where(eq(bodyPhotoFiles.bodyPhotoId, photo.id));

    await tx.insert(bodyPhotoFiles).values(
      input.photoStoragePaths.map((storagePath, position) => ({
        bodyPhotoId: photo.id,
        storagePath,
        position,
      })),
    );

    return photo;
  });

  if (!row) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.status(200).json(row);
}

async function remove(req: VercelRequest, res: VercelResponse) {
  const id = typeof req.query.id === "string" ? req.query.id : undefined;
  if (!id) {
    res.status(400).json({ error: "Missing id" });
    return;
  }
  await db.delete(bodyPhotos).where(eq(bodyPhotos.id, id));
  res.status(204).end();
}

export default createHandler({ GET: list, POST: create, PATCH: update, DELETE: remove });
