# PlanejaTrip

A full-featured collaborative trip planning app built with React, TypeScript and Supabase, with AI-powered itinerary suggestions via the Google Gemini API.

## Features

- **User authentication**: sign up, log in and password recovery
- **Collaborative planning**: invite friends to join your trips
- **Day-by-day organisation**: structure your trip day by day with detailed activities
- **Budget tracking**: compare estimated budget vs. actual spend for each activity
- **Categories**: organise activities into custom categories
- **Multiple currencies**: supports BRL, USD and EUR
- **Permissions**: role-based access with view-only and edit permissions
- **AI integration**: smart itinerary suggestions and a travel assistant chat powered by Google Gemini
- **Invitation system**: invite participants and manage accepted/rejected invites

## Tech Stack

- **Frontend**: React 19 + TypeScript
- **Build tool**: Vite
- **Backend**: Supabase (PostgreSQL + Auth + Storage)
- **AI**: Google Gemini API
- **Email**: EmailJS (invitation emails)
- **Styling**: Tailwind CSS (utility classes)

## Prerequisites

Before you start, make sure you have:

- **Node.js** (version 18 or later)
- **npm** or **yarn**
- A [Supabase](https://supabase.com) account
- An API key from [Google AI Studio](https://ai.google.dev/)
- An [EmailJS](https://www.emailjs.com/) account (free tier: 200 emails/month)

## Project Setup

### 1. Clone the repository

```bash
git clone https://github.com/Vitorfarani/PlanejaTrip.git
cd PlanejaTrip
```

### 2. Install dependencies

```bash
npm install
```

### 3. Set up Supabase

#### 3.1. Create a new Supabase project

1. Go to [supabase.com/dashboard](https://supabase.com/dashboard)
2. Click "New Project"
3. Fill in the details and wait for the project to be created

#### 3.2. Run the SQL script to create the tables

Open the **SQL Editor** in the Supabase dashboard and run:

```sql
-- User profiles table
CREATE TABLE profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Trips table
CREATE TABLE trips (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  destination TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  description TEXT,
  budget NUMERIC NOT NULL,
  currency TEXT NOT NULL DEFAULT 'BRL',
  is_completed BOOLEAN DEFAULT FALSE,
  owner_email TEXT NOT NULL,
  days JSONB NOT NULL DEFAULT '[]',
  categories JSONB NOT NULL DEFAULT '[]',
  preferences JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Trip participants table
CREATE TABLE trip_participants (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  trip_id UUID REFERENCES trips(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  name TEXT NOT NULL,
  permission TEXT NOT NULL CHECK (permission IN ('EDIT', 'VIEW_ONLY')),
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(trip_id, user_id)
);

-- Invites table
CREATE TABLE invites (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  trip_id UUID REFERENCES trips(id) ON DELETE CASCADE,
  trip_name TEXT NOT NULL,
  host_name TEXT NOT NULL,
  host_email TEXT NOT NULL,
  guest_email TEXT NOT NULL,
  permission TEXT NOT NULL CHECK (permission IN ('EDIT', 'VIEW_ONLY')),
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'REJECTED')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(trip_id, guest_email)
);

-- Trigger that creates a profile automatically after sign-up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', 'User'),
    NEW.email
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Security policies (Row Level Security)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE trip_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE invites ENABLE ROW LEVEL SECURITY;

-- Policies for profiles
CREATE POLICY "Profiles are publicly readable" ON profiles FOR SELECT USING (true);
CREATE POLICY "Users can update their own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

-- Policies for trips
CREATE POLICY "Users can view their own trips" ON trips FOR SELECT USING (
  owner_email = auth.jwt()->>'email' OR
  EXISTS (SELECT 1 FROM trip_participants WHERE trip_id = trips.id AND user_id = auth.uid())
);
CREATE POLICY "Users can create trips" ON trips FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update their trips" ON trips FOR UPDATE USING (
  owner_email = auth.jwt()->>'email' OR
  EXISTS (SELECT 1 FROM trip_participants WHERE trip_id = trips.id AND user_id = auth.uid() AND permission = 'EDIT')
);
CREATE POLICY "Users can delete their trips" ON trips FOR DELETE USING (owner_email = auth.jwt()->>'email');

-- Policies for trip_participants
CREATE POLICY "Participants can view their memberships" ON trip_participants FOR SELECT USING (
  user_id = auth.uid() OR
  EXISTS (SELECT 1 FROM trips WHERE id = trip_participants.trip_id AND owner_email = auth.jwt()->>'email')
);
CREATE POLICY "Participants can be added" ON trip_participants FOR INSERT WITH CHECK (true);
CREATE POLICY "Participants can be removed" ON trip_participants FOR DELETE USING (
  EXISTS (SELECT 1 FROM trips WHERE id = trip_participants.trip_id AND owner_email = auth.jwt()->>'email')
);

-- Policies for invites
CREATE POLICY "Users can view invites sent to them" ON invites FOR SELECT USING (guest_email = auth.jwt()->>'email' OR host_email = auth.jwt()->>'email');
CREATE POLICY "Users can create invites" ON invites FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update invites" ON invites FOR UPDATE USING (guest_email = auth.jwt()->>'email' OR host_email = auth.jwt()->>'email');
CREATE POLICY "Users can delete invites" ON invites FOR DELETE USING (guest_email = auth.jwt()->>'email' OR host_email = auth.jwt()->>'email');
```

#### 3.3. Configure authentication

In the Supabase dashboard:

1. Go to **Authentication** → **Providers** → **Email**
2. **DISABLE** the **"Confirm email"** option (or configure SMTP if you want email confirmation)
3. Under **Authentication** → **URL Configuration**:
   - **Site URL**: `http://localhost:5173`
   - **Redirect URLs**: `http://localhost:5173/**`

### 4. Set up EmailJS (for invitation emails)

Follow the full guide in [`docs/SETUP_EMAIL.md`](docs/SETUP_EMAIL.md) (in Portuguese).

**Quick summary:**

1. Create a free account at [emailjs.com](https://www.emailjs.com/)
2. Set up an email service (Gmail recommended)
3. Create an email template using the provided variables
4. Copy the Service ID, Template ID and Public Key

### 5. Configure environment variables

Create a `.env.local` file in the project root:

```bash
# Supabase
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# Google Gemini API
GEMINI_API_KEY=your_gemini_api_key

# EmailJS (for invitation emails)
VITE_EMAILJS_SERVICE_ID=your_service_id
VITE_EMAILJS_TEMPLATE_ID=your_template_id
VITE_EMAILJS_PUBLIC_KEY=your_public_key
```

**Where to get the credentials:**

- **Supabase**: go to **Project Settings** → **API** in the Supabase dashboard
  - `VITE_SUPABASE_URL`: Project URL
  - `VITE_SUPABASE_ANON_KEY`: anon/public key
- **Gemini API**: go to [Google AI Studio](https://ai.google.dev/) and generate an API key
- **EmailJS**: follow the guide in [`docs/SETUP_EMAIL.md`](docs/SETUP_EMAIL.md)

### 6. Run the project

```bash
npm run dev
```

The app will be available at `http://localhost:5173`.

## Available Scripts

```bash
# Development
npm run dev

# Production build
npm run build

# Preview the build
npm run preview

# Alternative build with esbuild
npm run build:esbuild
```

## Project Structure

```
PlanejaTrip/
├── components/          # React components
│   ├── LoginScreen.tsx
│   ├── ProfileScreen.tsx
│   ├── TripForm.tsx
│   ├── TripDashboard.tsx
│   ├── DailyPlan.tsx
│   ├── FinancialView.tsx
│   ├── TravelAssistantChat.tsx
│   └── ...
├── services/            # Integration services
│   ├── authService.ts       # Authentication
│   ├── tripService.ts       # Trip management
│   ├── inviteService.ts     # Invitation system
│   ├── emailService.ts      # Email sending (EmailJS)
│   ├── geminiService.ts     # AI suggestions and chat (Gemini)
│   └── profileService.ts    # User profiles
├── docs/                # Documentation
│   ├── SETUP_EMAIL.md       # EmailJS setup guide
│   ├── database_schema.md   # Database schema
│   └── ...
├── src/
│   └── lib/
│       └── supabaseClient.ts  # Supabase client
├── types.ts             # TypeScript type definitions
├── App.tsx              # Root component
└── index.html           # HTML entry point
```

## Main Features

### Authentication
- New user registration
- Email/password login
- Password recovery
- Persistent sessions

### Trip Management
- Create trips with dates, budget and destination
- Organise activities by day
- Categorise activities
- Track estimated vs. actual costs
- Multiple currency support

### Collaboration
- Invite participants by email
- **Automatic invitation emails** with trip details
- Edit or view-only permissions
- Accept/decline invitations
- Notifications for declined invitations
- Resend invitations

### AI (Google Gemini)
- Smart itinerary suggestions
- Activity generation based on preferences
- Budget optimisation
- Travel assistant chat

## Troubleshooting

### Error: "Email address is invalid"
- Disable email confirmation in Supabase (see section 3.3)
- Or configure SMTP correctly

### Error: "Invalid API key" (Supabase)
- Check that you copied the correct key
- Make sure you are using the `anon/public key`, not the `service_role key`

### Tables don't show up
- Run the full SQL script from section 3.2
- Check the RLS (Row Level Security) policies

### Build fails
- Clear the cache: `rm -rf node_modules package-lock.json`
- Reinstall: `npm install`

### Invitation emails are not arriving
- Check that the EmailJS variables are set in `.env.local`
- Check the recipient's spam folder
- Check the browser console for errors
- Follow the full guide in [`docs/SETUP_EMAIL.md`](docs/SETUP_EMAIL.md)
- Free tier limit: 200 emails/month on EmailJS

## Contributing

1. Fork the project
2. Create a feature branch (`git checkout -b feature/MyFeature`)
3. Commit your changes (`git commit -m 'Add MyFeature'`)
4. Push to the branch (`git push origin feature/MyFeature`)
5. Open a Pull Request

## License

This project is licensed under the ISC License.

## Support

For issues or questions, please open an issue in this repository.
