import { z } from "zod";

export const bodyPhotoInputSchema = z.object({
  takenAt: z.iso.datetime({ offset: true }),
  description: z.string().max(2000).optional(),
  photoStoragePaths: z.array(z.string().min(1)).min(1),
});

export type BodyPhotoInput = z.infer<typeof bodyPhotoInputSchema>;
