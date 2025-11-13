-- Create user_profiles table (extends auth.users)
create table user_profiles (
    id uuid references auth.users on delete cascade primary key,
    first_name text,
    last_name text,
    phone_number text,
    date_of_birth date,
    created_at timestamp with time zone default timezone('utc'::text, now()),
    updated_at timestamp with time zone default timezone('utc'::text, now())
);

-- Create saved_venues table (for user's favorite venues)
create table saved_venues (
    id uuid default uuid_generate_v4() primary key,
    user_id uuid references auth.users on delete cascade,
    venue_id uuid references venues on delete cascade,
    created_at timestamp with time zone default timezone('utc'::text, now()),
    unique(user_id, venue_id)
);

-- Create user_bookings table (for user's booking history)
create table user_bookings (
    id uuid default uuid_generate_v4() primary key,
    user_id uuid references auth.users on delete cascade,
    venue_id uuid references venues on delete cascade,
    booking_date date not null,
    start_time time not null,
    end_time time not null,
    number_of_guests int not null,
    status text not null check (status in ('pending', 'confirmed', 'cancelled', 'completed')),
    total_amount decimal(10,2),
    created_at timestamp with time zone default timezone('utc'::text, now()),
    updated_at timestamp with time zone default timezone('utc'::text, now())
);

-- Create user_preferences table (for user's preferences)
create table user_preferences (
    id uuid default uuid_generate_v4() primary key,
    user_id uuid references auth.users on delete cascade,
    preferred_venue_types text[],
    preferred_price_range text[],
    preferred_vibes text[],
    created_at timestamp with time zone default timezone('utc'::text, now()),
    updated_at timestamp with time zone default timezone('utc'::text, now())
);

-- Enable Row Level Security
alter table user_profiles enable row level security;
alter table saved_venues enable row level security;
alter table user_bookings enable row level security;
alter table user_preferences enable row level security;

-- Create RLS policies
-- User profiles: Users can only read and update their own profile
create policy "Users can view own profile"
    on user_profiles for select
    using (auth.uid() = id);

create policy "Users can update own profile"
    on user_profiles for update
    using (auth.uid() = id);

-- Saved venues: Users can only manage their own saved venues
create policy "Users can view own saved venues"
    on saved_venues for select
    using (auth.uid() = user_id);

create policy "Users can manage own saved venues"
    on saved_venues for all
    using (auth.uid() = user_id);

-- User bookings: Users can only view and manage their own bookings
create policy "Users can view own bookings"
    on user_bookings for select
    using (auth.uid() = user_id);

create policy "Users can manage own bookings"
    on user_bookings for all
    using (auth.uid() = user_id);

-- User preferences: Users can only view and update their own preferences
create policy "Users can view own preferences"
    on user_preferences for select
    using (auth.uid() = user_id);

create policy "Users can manage own preferences"
    on user_preferences for all
    using (auth.uid() = user_id);

-- Create function to handle new user signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
    insert into public.user_profiles (id)
    values (new.id);
    
    insert into public.user_preferences (user_id)
    values (new.id);
    
    return new;
end;
$$ language plpgsql security definer;

-- Create trigger for new user signup
create trigger on_auth_user_created
    after insert on auth.users
    for each row execute procedure public.handle_new_user(); 