-- Profiles (Supabase Auth)
create table profiles (
  id uuid primary key references auth.users on delete cascade,
  email text unique not null,
  created_at timestamp default now()
);

-- Companies (dados cadastrais reais)
create table companies (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles on delete cascade,
  cnpj text not null unique,
  company_name text,
  status text,
  opening_date date,
  legal_nature text,
  company_size text,
  primary_cnae text,
  capital_social bigint,
  address text,
  state text,
  created_at timestamp default now(),
  updated_at timestamp default now()
);

-- Financial Data (opcional, fornecido pelo usuário)
create table financial_data (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null unique references companies on delete cascade,
  revenue bigint,
  revenue_previous_period bigint,
  ebitda bigint,
  debt bigint,
  data_type text default 'user_provided',
  observed_at timestamp default now(),
  created_at timestamp default now()
);

-- Website Analysis (dados reais do site)
create table website_analysis (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null unique references companies on delete cascade,
  url text,
  title text,
  description text,
  h1 text,
  word_count int,
  pages_detected int,
  has_contact_info boolean,
  has_about boolean,
  has_products boolean,
  structured_data jsonb,
  data_type text default 'real',
  analyzed_at timestamp default now(),
  created_at timestamp default now()
);

-- AI Observations (cada chamada à IA)
create table ai_observations (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies on delete cascade,
  segment text,
  provider text default 'openai',
  model text,
  prompt text,
  response text,
  presence int,
  recommendation int,
  position int,
  relevance float,
  competitive_share int,
  data_type text default 'real',
  created_at timestamp default now()
);

-- Competitors (descobertos via IA)
create table competitors (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies on delete cascade,
  competitor_name text,
  ai_visibility int,
  financial_strength int,
  domain_authority int,
  confirmed boolean default false,
  created_at timestamp default now()
);

-- Diagnostics (resultado final)
create table diagnostics (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles on delete cascade,
  company_id uuid not null references companies on delete cascade,
  abvs_score int,
  abvs_confidence int,
  data_coverage int,
  ai_visibility int,
  financial_strength int,
  competitive_position int,
  digital_authority int,
  gap int,
  gap_interpretation text,
  data_quality jsonb,
  created_at timestamp default now()
);

-- Action Items (recomendações)
create table action_items (
  id uuid primary key default gen_random_uuid(),
  diagnostic_id uuid not null references diagnostics on delete cascade,
  priority int,
  title text,
  description text,
  impact text,
  category text
);

-- RLS Policies
alter table profiles enable row level security;
alter table companies enable row level security;
alter table financial_data enable row level security;
alter table website_analysis enable row level security;
alter table ai_observations enable row level security;
alter table competitors enable row level security;
alter table diagnostics enable row level security;
alter table action_items enable row level security;

-- Profiles RLS
create policy "Users can only see their own profile" on profiles
  for select using (auth.uid() = id);

-- Companies RLS
create policy "Users can only see their own companies" on companies
  for select using (auth.uid() = user_id);

create policy "Users can insert their own companies" on companies
  for insert with check (auth.uid() = user_id);

-- Financial Data RLS
create policy "Users can see their company financial data" on financial_data
  for select using (
    company_id in (select id from companies where user_id = auth.uid())
  );

-- Website Analysis RLS
create policy "Users can see their website analysis" on website_analysis
  for select using (
    company_id in (select id from companies where user_id = auth.uid())
  );

-- AI Observations RLS
create policy "Users can see their AI observations" on ai_observations
  for select using (
    company_id in (select id from companies where user_id = auth.uid())
  );

-- Competitors RLS
create policy "Users can see their competitors" on competitors
  for select using (
    company_id in (select id from companies where user_id = auth.uid())
  );

-- Diagnostics RLS
create policy "Users can only see their own diagnostics" on diagnostics
  for select using (auth.uid() = user_id);

create policy "Users can insert their own diagnostics" on diagnostics
  for insert with check (auth.uid() = user_id);

-- Action Items RLS
create policy "Users can see action items from their diagnostics" on action_items
  for select using (
    diagnostic_id in (select id from diagnostics where user_id = auth.uid())
  );
