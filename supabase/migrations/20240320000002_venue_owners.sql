-- Create venue_owners table
create table venue_owners (
    id uuid default uuid_generate_v4() primary key,
    user_id uuid references auth.users(id) not null unique,
    full_name text not null,
    phone text,
    email text not null,
    created_at timestamp with time zone default timezone('utc'::text, now()),
    updated_at timestamp with time zone default timezone('utc'::text, now())
);

-- Enable RLS
alter table venue_owners enable row level security;

-- Create policies
create policy "Users can view their own venue owner profile"
    on venue_owners for select
    using (auth.uid() = user_id);

create policy "Users can insert their own venue owner profile"
    on venue_owners for insert
    with check (auth.uid() = user_id);

create policy "Users can update their own venue owner profile"
    on venue_owners for update
    using (auth.uid() = user_id);

-- Create trigger to update updated_at timestamp
create or replace function update_updated_at_column()
returns trigger as $$
begin
    new.updated_at = timezone('utc'::text, now());
    return new;
end;
$$ language plpgsql;

create trigger update_venue_owners_updated_at
    before update on venue_owners
    for each row
    execute function update_updated_at_column(); 