import { parse as parseExif } from "exifr/dist/lite.esm.mjs";
import { localInputToIso } from "@/lib/datetime";

// EXIF DateTimeOriginal is "YYYY:MM:DD HH:MM:SS" with no timezone. When the
// camera also wrote OffsetTimeOriginal (e.g. "+02:00"), use it directly;
// otherwise assume the photo was taken in the browser's current timezone.
function toIso(rawDateTime: string, rawOffset: string | undefined): string | null {
  const match = rawDateTime.match(/^(\d{4}):(\d{2}):(\d{2}) (\d{2}):(\d{2}):(\d{2})$/);
  if (!match) return null;
  const [, year, month, day, hour, minute, second] = match;
  if (rawOffset) {
    return `${year}-${month}-${day}T${hour}:${minute}:${second}${rawOffset}`;
  }
  return localInputToIso(`${year}-${month}-${day}T${hour}:${minute}`);
}

async function extractEatenAt(file: File): Promise<string | null> {
  try {
    const tags = await parseExif(file, {
      pick: ["DateTimeOriginal", "OffsetTimeOriginal"],
      reviveValues: false,
    });
    if (!tags?.DateTimeOriginal) return null;
    return toIso(tags.DateTimeOriginal, tags.OffsetTimeOriginal);
  } catch {
    return null;
  }
}

// Returns the earliest EXIF capture date among the given files (as an
// ISO-8601 datetime with offset), or null if none carry a usable one.
export async function extractEarliestEatenAt(files: File[]): Promise<string | null> {
  const isos = await Promise.all(files.map(extractEatenAt));
  const valid = isos.filter((iso): iso is string => iso !== null);
  if (valid.length === 0) return null;
  return valid.reduce((earliest, iso) =>
    new Date(iso).getTime() < new Date(earliest).getTime() ? iso : earliest,
  );
}
