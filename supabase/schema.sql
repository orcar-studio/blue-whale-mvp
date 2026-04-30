create table if not exists creator_applications (
  id uuid primary key default gen_random_uuid(),
  nickname text not null,
  password_hash text,
  password text,
  destination text not null check (destination in ('Jeju', 'Seoul', 'Busan', 'Gangneung')),
  start_date date not null,
  end_date date not null,
  contact_instagram text,
  contact_email text,
  contact_phone text,
  status text not null default 'new' check (status in ('new', 'blue_whale_reviewing', 'proposal_received', 'confirmed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists creator_social_accounts (
  id uuid primary key default gen_random_uuid(),
  creator_application_id uuid not null references creator_applications(id) on delete cascade,
  platform text not null check (platform in ('Instagram', 'TikTok', 'YouTube', 'Naver Blog')),
  handle text not null,
  profile_url text not null,
  reviewed_followers integer,
  reviewed_average_views integer,
  reviewed_average_likes integer,
  created_at timestamptz not null default now()
);

create table if not exists business_offers (
  id uuid primary key default gen_random_uuid(),
  login_id text not null,
  password_hash text,
  password text,
  location text not null check (location in ('Jeju', 'Seoul', 'Busan', 'Gangneung')),
  category text not null check (category in ('Hotel', 'Rental Car', 'Restaurant', 'Cafe', 'Beauty', 'Activity', 'Photo Shoot', 'Connectivity')),
  sponsorship_details text not null,
  desired_content_types text[] not null default '{}',
  no_content_preference boolean not null default true,
  business_name text not null,
  image_url text,
  reference_label text,
  reference_url text,
  source_type text not null default 'manual' check (source_type in ('seeded', 'partner', 'reference', 'manual')),
  availability_status text not null default 'requestable' check (availability_status in ('requestable', 'partner_confirmed', 'paused')),
  address text,
  website_or_social text,
  short_description text,
  contact_name text,
  contact_email text,
  contact_phone text,
  contact_instagram text,
  status text not null default 'active' check (status in ('active', 'draft', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists creator_offer_preferences (
  id uuid primary key default gen_random_uuid(),
  creator_application_id uuid not null references creator_applications(id) on delete cascade,
  business_offer_id uuid not null references business_offers(id) on delete cascade,
  preference text not null check (preference in ('interested', 'not_interested')),
  outreach_status text not null default 'interest_saved' check (
    outreach_status in (
      'interest_saved',
      'blue_whale_reviewing',
      'business_contacted',
      'business_replied',
      'proposal_received',
      'not_available',
      'confirmed'
    )
  ),
  operator_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (creator_application_id, business_offer_id)
);

create table if not exists business_proposals (
  id uuid primary key default gen_random_uuid(),
  business_offer_id uuid not null references business_offers(id) on delete cascade,
  creator_application_id uuid not null references creator_applications(id) on delete cascade,
  title text,
  provide_details text not null,
  proposal_message text not null,
  included_items text,
  excluded_items text,
  requested_content text,
  available_dates text,
  upload_deadline text,
  contact_preference text not null default 'blue_whale' check (contact_preference in ('blue_whale', 'direct_ok')),
  status text not null default 'proposal_received' check (
    status in (
      'under_blue_whale_review',
      'proposal_received',
      'sent_to_creator',
      'creator_interested',
      'creator_declined',
      'confirmed'
    )
  ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists operator_tasks (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('contact_business', 'review_creator', 'deliver_proposal')),
  creator_application_id uuid not null references creator_applications(id) on delete cascade,
  business_offer_id uuid references business_offers(id) on delete set null,
  business_proposal_id uuid references business_proposals(id) on delete set null,
  status text not null default 'open' check (status in ('open', 'in_progress', 'done', 'blocked')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_creator_applications_lookup on creator_applications (lower(nickname));
create index if not exists idx_business_offers_lookup on business_offers (lower(login_id));
create index if not exists idx_business_offers_market on business_offers (location, availability_status, category);
create index if not exists idx_creator_offer_preferences_offer on creator_offer_preferences (business_offer_id, preference, outreach_status);
create index if not exists idx_operator_tasks_queue on operator_tasks (status, type, created_at);
