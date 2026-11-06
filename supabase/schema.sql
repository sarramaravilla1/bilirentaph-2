-- Run once in Supabase SQL Editor. Do not put service-role keys in your frontend.
create table if not exists public.properties (
 id bigint generated always as identity primary key,
 owner_id uuid not null references auth.users(id) on delete cascade,
 title text not null check (char_length(title) between 3 and 120),
 city text not null,
 price numeric(14,2) not null check (price>0),
 mode text not null check (mode in ('Buy','Rent')),
 type text not null,
 beds integer not null default 0 check (beds>=0),
 baths integer not null default 0 check (baths>=0),
 area numeric(12,2) not null check (area>0),
 lat double precision not null check (lat between 4 and 22),
 lng double precision not null check (lng between 116 and 127),
 description text not null default '',
 image_url text,
 status text not null default 'pending' check (status in ('pending','approved','rejected')),
 created_at timestamptz not null default now()
);
create index if not exists properties_status_created_idx on public.properties(status,created_at desc);
create index if not exists properties_owner_idx on public.properties(owner_id);
alter table public.properties enable row level security;
-- Public sees approved listings. Owners can also see their own submissions.
create policy "read approved or own" on public.properties for select to anon,authenticated using (status='approved' or owner_id=(select auth.uid()));
-- Never allow users to set their own approval state.
create policy "owners submit pending" on public.properties for insert to authenticated with check (owner_id=(select auth.uid()) and status='pending');
-- Intentionally no client UPDATE/DELETE policy for v2.2. Moderation occurs in dashboard.
create table if not exists public.favorites (
 user_id uuid not null references auth.users(id) on delete cascade,
 property_id bigint not null references public.properties(id) on delete cascade,
 created_at timestamptz not null default now(),
 primary key(user_id,property_id)
);
alter table public.favorites enable row level security;
create policy "read own favorites" on public.favorites for select to authenticated using(user_id=(select auth.uid()));
create policy "add own favorites" on public.favorites for insert to authenticated with check(user_id=(select auth.uid()) and exists(select 1 from public.properties p where p.id=property_id and p.status='approved'));
create policy "remove own favorites" on public.favorites for delete to authenticated using(user_id=(select auth.uid()));
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values ('property-photos','property-photos',true,5242880,array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set public=true,file_size_limit=5242880,allowed_mime_types=array['image/jpeg','image/png','image/webp'];
create policy "owners upload their own images" on storage.objects for insert to authenticated
with check(bucket_id='property-photos' and (storage.foldername(name))[1]=(select auth.uid())::text);
-- Photos are public; avoid uploading IDs, title deeds, or private documents.
