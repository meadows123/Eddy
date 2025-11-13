-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Create venues table
create table venues (
    id uuid default uuid_generate_v4() primary key,
    name text not null,
    description text,
    type text not null check (type in ('restaurant', 'club', 'lounge')),
    price_range text not null check (price_range in ('$', '$$', '$$$')),
    rating decimal(3,2) check (rating >= 0 and rating <= 5),
    vibe text check (vibe in ('Sophisticated', 'Energetic', 'Relaxed')),
    address text not null,
    city text not null,
    state text not null,
    country text not null,
    latitude decimal(10,8) not null,
    longitude decimal(11,8) not null,
    contact_phone text,
    contact_email text,
    website_url text,
    opening_hours jsonb,
    created_at timestamp with time zone default timezone('utc'::text, now()),
    updated_at timestamp with time zone default timezone('utc'::text, now()),
    owner_id uuid references auth.users(id),
    is_active boolean default true
);

-- Create venue_images table
create table venue_images (
    id uuid default uuid_generate_v4() primary key,
    venue_id uuid references venues(id) on delete cascade,
    image_url text not null,
    is_primary boolean default false,
    created_at timestamp with time zone default timezone('utc'::text, now())
);

-- Create venue_tables table
create table venue_tables (
    id uuid default uuid_generate_v4() primary key,
    venue_id uuid references venues(id) on delete cascade,
    table_number text not null,
    capacity int not null check (capacity > 0),
    table_type text not null check (table_type in ('indoor', 'outdoor', 'bar')),
    status text not null check (status in ('available', 'reserved', 'occupied')),
    created_at timestamp with time zone default timezone('utc'::text, now()),
    updated_at timestamp with time zone default timezone('utc'::text, now())
);

-- Create bookings table
create table bookings (
    id uuid default uuid_generate_v4() primary key,
    venue_id uuid references venues(id) on delete cascade,
    user_id uuid references auth.users(id),
    table_id uuid references venue_tables(id),
    booking_date date not null,
    start_time time not null,
    end_time time not null,
    number_of_guests int not null check (number_of_guests > 0),
    status text not null check (status in ('pending', 'confirmed', 'cancelled', 'completed')),
    total_amount decimal(10,2),
    created_at timestamp with time zone default timezone('utc'::text, now()),
    updated_at timestamp with time zone default timezone('utc'::text, now())
);

-- Create venue_reviews table
create table venue_reviews (
    id uuid default uuid_generate_v4() primary key,
    venue_id uuid references venues(id) on delete cascade,
    user_id uuid references auth.users(id),
    rating int not null check (rating >= 1 and rating <= 5),
    review_text text,
    created_at timestamp with time zone default timezone('utc'::text, now()),
    updated_at timestamp with time zone default timezone('utc'::text, now())
);

-- Create venue_amenities table
create table venue_amenities (
    id uuid default uuid_generate_v4() primary key,
    venue_id uuid references venues(id) on delete cascade,
    amenity_name text not null,
    created_at timestamp with time zone default timezone('utc'::text, now())
);

-- Create indexes for better query performance
create index idx_venues_location on venues(city, state, country);
create index idx_venues_type on venues(type);
create index idx_venues_price_range on venues(price_range);
create index idx_venues_rating on venues(rating);
create index idx_bookings_date on bookings(booking_date);
create index idx_bookings_status on bookings(status);
create index idx_venue_tables_status on venue_tables(status);

-- Create function to update updated_at timestamp
create or replace function update_updated_at_column()
returns trigger as $$
begin
    new.updated_at = timezone('utc'::text, now());
    return new;
end;
$$ language plpgsql;

-- Create triggers for updated_at
create trigger update_venues_updated_at
    before update on venues
    for each row
    execute function update_updated_at_column();

create trigger update_venue_tables_updated_at
    before update on venue_tables
    for each row
    execute function update_updated_at_column();

create trigger update_bookings_updated_at
    before update on bookings
    for each row
    execute function update_updated_at_column();

-- Enable Row Level Security (RLS)
alter table venues enable row level security;
alter table venue_images enable row level security;
alter table venue_tables enable row level security;
alter table bookings enable row level security;
alter table venue_reviews enable row level security;
alter table venue_amenities enable row level security;

-- Create RLS policies
-- Venues: Anyone can read, only owners can write
create policy "Venues are viewable by everyone"
    on venues for select
    using (true);

create policy "Venues are editable by owner"
    on venues for all
    using (auth.uid() = owner_id);

-- Venue Images: Anyone can read, only venue owners can write
create policy "Venue images are viewable by everyone"
    on venue_images for select
    using (true);

create policy "Venue images are editable by venue owner"
    on venue_images for all
    using (
        exists (
            select 1 from venues
            where venues.id = venue_images.venue_id
            and venues.owner_id = auth.uid()
        )
    );

-- Bookings: Users can only see their own bookings, venue owners can see all bookings for their venues
create policy "Users can view their own bookings"
    on bookings for select
    using (auth.uid() = user_id);

create policy "Venue owners can view their venue bookings"
    on bookings for select
    using (
        exists (
            select 1 from venues
            where venues.id = bookings.venue_id
            and venues.owner_id = auth.uid()
        )
    );

create policy "Users can create their own bookings"
    on bookings for insert
    with check (auth.uid() = user_id);

-- Reviews: Anyone can read, only authenticated users can write
create policy "Reviews are viewable by everyone"
    on venue_reviews for select
    using (true);

create policy "Authenticated users can create reviews"
    on venue_reviews for insert
    with check (auth.uid() = user_id);

-- Insert some sample data for development
insert into venues (name, description, type, price_range, rating, vibe, address, city, state, country, latitude, longitude, contact_phone, contact_email)
values
    ('Skyline Restaurant', 'Elegant dining with city views', 'restaurant', '$$$', 4.5, 'Sophisticated', '123 Main St', 'Lagos', 'Lagos', 'Nigeria', 6.5244, 3.3792, '+2341234567890', 'contact@skyline.com'),
    ('The Groove Club', 'Vibrant nightlife destination', 'club', '$$', 4.2, 'Energetic', '456 Club Ave', 'Lagos', 'Lagos', 'Nigeria', 6.5248, 3.3795, '+2341234567891', 'info@grooveclub.com'),
    ('Cloud Nine Lounge', 'Relaxed atmosphere with great cocktails', 'lounge', '$$$', 4.7, 'Relaxed', '789 Lounge Rd', 'Lagos', 'Lagos', 'Nigeria', 6.5242, 3.3789, '+2341234567892', 'hello@cloudnine.com'); 