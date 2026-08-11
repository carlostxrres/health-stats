import type { VercelRequest, VercelResponse } from "@vercel/node";
import { eq } from "drizzle-orm";
import { bodyPhotoFiles, bodyPhotos } from "../../db/schema";
import { bodyPhotoInputSchema } from "../../shared/validation";
import { db } from "../_lib/db";
import { createHandler } from "../_lib/http";

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

export default createHandler({ PATCH: update });
