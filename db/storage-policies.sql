-- Storage RLS policies for the `health-photos` bucket.
--
-- Run this once in the Supabase SQL editor (or via psql against DIRECT_URL)
-- after creating the private `health-photos` bucket. `storage.objects` is
-- managed by Supabase, not by drizzle-kit, so this lives outside db/migrations
-- and has to be applied by hand.
--
-- The app is single-user (see README "Auth"), so access is scoped to the
-- bucket only, not to a per-user folder — object paths are like
-- "meals/<uuid>-file.jpg", "workouts/...", "body-photos/..." with no user id
-- prefix. Without these policies, storage.objects has RLS enabled by default
-- with no policies, so every insert fails with "new row violates row-level
-- security policy".

create policy "Authenticated users can read health photos"
on storage.objects for select
to authenticated
using (bucket_id = 'health-photos');

-- /view and its sub-routes (e.g. /view/feed) are intentionally public so the
-- app owner's trainer can view progress without logging in. Those pages
-- render photos client-side via createSignedUrl(), which needs to pass this
-- select policy for the `anon` role too, or every photo silently falls back
-- to a placeholder for logged-out viewers.
create policy "Anonymous users can read health photos"
on storage.objects for select
to anon
using (bucket_id = 'health-photos');

create policy "Authenticated users can upload health photos"
on storage.objects for insert
to authenticated
with check (bucket_id = 'health-photos');

create policy "Authenticated users can update health photos"
on storage.objects for update
to authenticated
using (bucket_id = 'health-photos')
with check (bucket_id = 'health-photos');

create policy "Authenticated users can delete health photos"
on storage.objects for delete
to authenticated
using (bucket_id = 'health-photos');
