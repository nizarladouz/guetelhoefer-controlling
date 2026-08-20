-- =========================================================================
--  Gütelhöfer Filial-Controlling · Datenmodell
--  Einmalig im Supabase SQL-Editor ausführen.
-- =========================================================================

-- ---------- Rollen ------------------------------------------------------
-- admin       = darf alles, inklusive Nutzerverwaltung
-- bearbeiter  = darf importieren und bewerten
-- betrachter  = darf nur lesen (Jörg)
create type rolle as enum ('admin', 'bearbeiter', 'betrachter');

create table profile (
  id          uuid primary key references auth.users on delete cascade,
  name        text not null default '',
  rolle       rolle not null default 'betrachter',
  erstellt_am timestamptz not null default now()
);

-- Neue Auth-Nutzer bekommen automatisch ein Profil mit der geringsten Rolle.
-- Die Hochstufung auf bearbeiter/admin erfolgt bewusst von Hand.
create function neues_profil() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into profile (id, name) values (new.id, coalesce(new.raw_user_meta_data->>'name', ''));
  return new;
end $$;

create trigger auf_neuen_nutzer
  after insert on auth.users
  for each row execute function neues_profil();

-- Hilfsfunktion für die Policies. security definer umgeht RLS auf profile
-- und verhindert damit eine Endlosschleife bei der Rechteprüfung.
create function darf_schreiben() returns boolean
language sql security definer stable set search_path = public as $$
  select exists (
    select 1 from profile
    where id = auth.uid() and rolle in ('admin', 'bearbeiter')
  );
$$;

-- ---------- Wochen ------------------------------------------------------
create table woche (
  id           uuid primary key default gen_random_uuid(),
  kw           smallint not null check (kw between 1 and 53),
  jahr         smallint not null check (jahr between 2024 and 2100),
  abgeschlossen boolean not null default false,
  notiz        text not null default '',
  erstellt_am  timestamptz not null default now(),
  unique (kw, jahr)
);

-- ---------- Kontakte ----------------------------------------------------
-- Ein Kunde existiert einmal und taucht über die Wochen hinweg immer wieder auf.
create table kontakt (
  id            uuid primary key default gen_random_uuid(),
  superchat_id  text unique,
  name          text not null default '',
  telefon       text not null default '',
  rechnung      text not null default '',
  filiale       smallint not null check (filiale between 1 and 5),
  erstellt_am   timestamptz not null default now()
);
create index on kontakt (filiale);

-- ---------- Sendungen ---------------------------------------------------
-- Der Kampagnen-Status eines Kontakts in einer bestimmten Woche.
create table sendung (
  id             uuid primary key default gen_random_uuid(),
  woche_id       uuid not null references woche on delete cascade,
  kontakt_id     uuid not null references kontakt on delete cascade,
  kampagne       text not null default '',
  gesendet_am    timestamptz,
  gelesen_am     timestamptz,
  beantwortet_am timestamptz,
  ok_am          timestamptz,          -- "Alles OK!"-Schnellantwort geklickt
  unique (woche_id, kontakt_id)
);
create index on sendung (woche_id);

-- Erreicht = gelesen ODER beantwortet ODER OK-Klick.
-- Superchat leert "gelesen_am", sobald geantwortet wurde; ohne die
-- Oder-Verknüpfung fielen die aktivsten Kunden aus dem Nenner.
alter table sendung add column erreicht boolean
  generated always as (
    gelesen_am is not null or beantwortet_am is not null or ok_am is not null
  ) stored;

-- Individual-Antwort = hat geschrieben, statt den Button zu klicken.
alter table sendung add column individual boolean
  generated always as (beantwortet_am is not null and ok_am is null) stored;

-- ---------- Bewertungen -------------------------------------------------
create type wertung as enum ('danke', 'rueckfrage', 'negativ');

create table bewertung (
  id             uuid primary key default gen_random_uuid(),
  sendung_id     uuid not null unique references sendung on delete cascade,
  wertung        wertung,
  notiz          text not null default '',
  screenshot     text,                 -- Pfad im Storage-Bucket "screenshots"
  antworttext    text not null default '',  -- später per Superchat-API befüllbar
  bearbeiter_id  uuid references profile,
  bearbeitet_am  timestamptz not null default now()
);

-- ---------- Auswertung --------------------------------------------------
-- Eine Zeile je Woche und Filiale. Basis für Dashboard und Trendansicht.
create view statistik as
select
  s.woche_id,
  w.kw,
  w.jahr,
  k.filiale,
  count(*)                                         as gesendet,
  count(*) filter (where s.erreicht)               as erreicht,
  count(*) filter (where s.ok_am is not null)      as ok,
  count(*) filter (where s.individual)             as individual,
  count(*) filter (where s.individual and b.wertung = 'danke')      as danke,
  count(*) filter (where s.individual and b.wertung = 'rueckfrage') as rueckfrage,
  count(*) filter (where s.individual and b.wertung = 'negativ')    as negativ,
  count(*) filter (where s.individual and b.wertung is null)        as offen,
  round(
    100.0 * count(*) filter (where s.ok_am is not null)
    / nullif(count(*) filter (where s.erreicht), 0), 1
  ) as ok_quote
from sendung s
join woche w   on w.id = s.woche_id
join kontakt k on k.id = s.kontakt_id
left join bewertung b on b.sendung_id = s.id
group by s.woche_id, w.kw, w.jahr, k.filiale;

-- ---------- Row Level Security -----------------------------------------
-- Ohne diesen Block wären die Kundendaten für jeden mit der URL lesbar.
alter table profile   enable row level security;
alter table woche     enable row level security;
alter table kontakt   enable row level security;
alter table sendung   enable row level security;
alter table bewertung enable row level security;

create policy "eigenes profil lesen" on profile
  for select to authenticated using (id = auth.uid());

-- Angemeldete dürfen lesen, schreiben nur admin und bearbeiter.
do $$
declare t text;
begin
  foreach t in array array['woche','kontakt','sendung','bewertung'] loop
    execute format('create policy "lesen" on %I for select to authenticated using (true)', t);
    execute format('create policy "anlegen" on %I for insert to authenticated with check (darf_schreiben())', t);
    execute format('create policy "aendern" on %I for update to authenticated using (darf_schreiben())', t);
    execute format('create policy "loeschen" on %I for delete to authenticated using (darf_schreiben())', t);
  end loop;
end $$;

-- ---------- Storage -----------------------------------------------------
insert into storage.buckets (id, name, public) values ('screenshots', 'screenshots', false);

create policy "screenshots lesen" on storage.objects
  for select to authenticated using (bucket_id = 'screenshots');
create policy "screenshots schreiben" on storage.objects
  for insert to authenticated with check (bucket_id = 'screenshots' and darf_schreiben());
create policy "screenshots loeschen" on storage.objects
  for delete to authenticated using (bucket_id = 'screenshots' and darf_schreiben());
