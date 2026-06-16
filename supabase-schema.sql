-- ============================================================
-- AML Guard — Supabase Schema
-- PostgreSQL 15+ with Row-Level Security
-- ============================================================

-- 1. PROFILES (extends auth.users)
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  full_name text not null,
  email text not null,
  company_name text,
  company_id text,  -- IČO
  company_type text, -- realestate, accounting, auto, legal, crypto, other
  employee_count int default 1,
  jurisdiction text not null default 'SK', -- SK or CZ
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.profiles enable row level security;

create policy "Users can view own profile"
  on public.profiles for select using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update using (auth.uid() = id);

-- 2. COMPANIES (if profile represents a firm with multiple users)
create table public.companies (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  ico text,
  dic text,
  address text,
  jurisdiction text not null default 'SK',
  company_type text,
  employee_count int default 1,
  compliance_officer text, -- meno zodpovednej osoby
  is_obo bool default false, -- je to obecne prospešná organizácia?
  risk_level text default 'low', -- low, medium, high
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.companies enable row level security;

create policy "Users can view own company"
  on public.companies for select using (
    auth.uid() in (select id from public.profiles where company_id = companies.id)
  );

-- 3. COMPANY MEMBERS
create table public.company_members (
  id uuid default gen_random_uuid() primary key,
  company_id uuid references public.companies on delete cascade not null,
  profile_id uuid references public.profiles on delete cascade not null,
  role text default 'member', -- admin, compliance_officer, member
  joined_at timestamptz default now(),
  unique(company_id, profile_id)
);

alter table public.company_members enable row level security;

-- 4. AML POLICIES
create table public.policies (
  id uuid default gen_random_uuid() primary key,
  company_id uuid references public.companies on delete cascade not null,
  title text not null,
  version int default 1,
  status text default 'draft', -- draft, active, archived
  policy_type text not null, -- aml_policy, risk_assessment, cdd_procedure, str_procedure, training_policy
  jurisdiction text not null, -- SK, CZ
  content jsonb not null, -- structured policy data
  pdf_url text, -- generated PDF path
  approved_by text, -- kto schválil
  approved_at timestamptz,
  valid_until timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.policies enable row level security;
create index idx_policies_company on public.policies(company_id);
create index idx_policies_type on public.policies(policy_type);

-- 5. CDD RECORDS (Customer Due Diligence)
create table public.cdd_records (
  id uuid default gen_random_uuid() primary key,
  company_id uuid references public.companies on delete cascade not null,
  person_type text not null, -- individual, legal_entity
  first_name text,
  last_name text not null,
  legal_name text, -- for legal entities
  ico text, -- IČO / rodné číslo
  nationality text,
  birth_date date,
  address text,
  id_document_type text, -- obciansky, pas, vodicak
  id_document_number text,
  id_document_url text, -- Supabase storage URL
  id_verified bool default false,
  id_verified_at timestamptz,
  is_pep bool default false, -- Politically Exposed Person
  pep_source text,
  risk_level text default 'low', -- low, medium, high
  risk_reason text,
  business_relationship text, -- popis obchodného vzťahu
  purpose_of_business text, -- účel obchodu
  status text default 'active', -- active, archived, rejected
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.cdd_records enable row level security;
create index idx_cdd_company on public.cdd_records(company_id);
create index idx_cdd_ico on public.cdd_records(ico);
create index idx_cdd_name on public.cdd_records(last_name, first_name);

-- 6. UBO RECORDS (Ultimate Beneficial Owners)
create table public.ubo_records (
  id uuid default gen_random_uuid() primary key,
  company_id uuid references public.companies on delete cascade not null,
  cdd_record_id uuid references public.cdd_records on delete set null,
  full_name text not null,
  birth_date date,
  nationality text,
  citizenship_country text,
  ownership_percent decimal(5,2) not null, -- % vlastníctva
  ownership_type text, -- direct, indirect (cez inú firmu)
  controlling_entity text, -- ak indirect, názov entity cez ktorú kontroluje
  is_statutory bool default false, -- je štatutár?
  id_document_url text,
  address text,
  notes text,
  verified_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.ubo_records enable row level security;
create index idx_ubo_company on public.ubo_records(company_id);

-- 7. STR REPORTS (Suspicious Transaction Reports)
create table public.str_reports (
  id uuid default gen_random_uuid() primary key,
  company_id uuid references public.companies on delete cascade not null,
  cdd_record_id uuid references public.cdd_records on delete set null,
  report_number text unique, -- auto-generated
  status text default 'draft', -- draft, submitted, archived
  transaction_date date,
  transaction_amount decimal(15,2),
  transaction_currency text default 'EUR',
  transaction_type text, -- cash, transfer, crypto, other
  suspicion_reasons jsonb not null, -- list of suspicion indicators
  description text not null, -- popis podozrivého obchodu
  supporting_docs jsonb, -- URLs to uploaded docs
  submitted_to text, -- authority name
  submitted_at timestamptz,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.str_reports enable row level security;
create index idx_str_company on public.str_reports(company_id);
create index idx_str_status on public.str_reports(status);

-- 8. TRAINING RECORDS
create table public.training_records (
  id uuid default gen_random_uuid() primary key,
  company_id uuid references public.companies on delete cascade not null,
  profile_id uuid references public.profiles on delete cascade not null,
  training_type text not null, -- initial, annual, special
  module_name text not null,
  completed_at timestamptz not null default now(),
  score int, -- kvíz score v %
  passed bool default false,
  certificate_url text,
  valid_until timestamptz, -- +1 year from completed_at
  created_at timestamptz default now()
);

alter table public.training_records enable row level security;
create index idx_training_company on public.training_records(company_id);
create index idx_training_profile on public.training_records(profile_id);

-- ============================================================
-- FUNCTIONS
-- ============================================================

-- Auto-generate STR report number
create or replace function public.generate_str_number()
returns text
language plpgsql
as $$
declare
  year text := extract(year from now())::text;
  seq int;
begin
  select coalesce(max(substring(report_number from '\d+$')::int), 0) + 1
  into seq
  from public.str_reports
  where report_number like 'STR-' || year || '-%';
  
  return 'STR-' || year || '-' || lpad(seq::text, 5, '0');
end;
$$;

-- ============================================================
-- TRIGGERS
-- ============================================================

-- Auto-assign STR number on insert
create or replace function public.assign_str_number()
returns trigger
language plpgsql
as $$
begin
  if new.report_number is null then
    new.report_number := public.generate_str_number();
  end if;
  return new;
end;
$$;

create trigger trg_assign_str_number
  before insert on public.str_reports
  for each row
  execute function public.assign_str_number();

-- ============================================================
-- SEED DATA: template policy categories
-- ============================================================

create table public.policy_templates (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  jurisdiction text not null, -- SK, CZ
  category text not null, -- realestate, accounting, auto, legal, crypto, general
  template jsonb not null, -- structured questionnaire + document template
  created_at timestamptz default now()
);

insert into public.policy_templates (name, jurisdiction, category, template) values
('AML politika pre realitné kancelárie', 'SK', 'realestate', '{"sections": ["Úvod", "Rozsah pôsobnosti", "Určenie zodpovednej osoby", "Identifikácia a verifikácia klienta", "Konečný užívateľ výhod", "Politicky exponované osoby", "Rizikový manažment", "Hlásenie podozrivých obchodov", "Školenia", "Archivácia", "Záverečné ustanovenia"]}'),
('AML politika pro realitní kanceláře', 'CZ', 'realestate', '{"sections": ["Úvod", "Rozsah působnosti", "Určení odpovědné osoby", "Identifikace a verifikace klienta", "Konečný uživatel výhod", "Politicky exponované osoby", "Rizikový management", "Hlášení podezřelých obchodů", "Školení", "Archivace", "Závěrečná ustanovení"]}'),
('AML politika pre účtovné firmy', 'SK', 'accounting', '{"sections": ["Úvod", "Rozsah pôsobnosti", "Zodpovedná osoba", "Identifikácia klienta", "Previerka klienta", "Konečný užívateľ výhod", "Politicky exponované osoby", "Hodnotenie rizika", "Hlásenie podozrivých obchodov", "Školenia", "Archivácia dokumentov"]}'),
('AML politika pro účetní firmy', 'CZ', 'accounting', '{"sections": ["Úvod", "Rozsah působnosti", "Odpovědná osoba", "Identifikace klienta", "Prověrka klienta", "Konečný uživatel výhod", "Politicky exponované osoby", "Hodnocení rizika", "Hlášení podezřelých obchodů", "Školení", "Archivace dokumentů"]}');
