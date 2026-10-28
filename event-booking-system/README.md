# CampusSpark — Event Booking System

A beginner-friendly college event booking website. Built with HTML, CSS, vanilla JavaScript, Node.js, Express and Supabase PostgreSQL. Intended as a 3-day educational project.

## Features
- Responsive event listings, search, category filter and refresh
- Create, edit and delete events (CRUD)
- Reserve a place, reject duplicates and prevent overbooking atomically
- Find bookings by email and cancel them
- Loading states, validation, empty states and API error messages
- No sample/mock database data: the app reads and writes real Supabase tables

## Prerequisites
Install Node.js 18+ and npm, create a free Supabase project, and optionally install Git.

## Supabase setup
1. Go to https://supabase.com/dashboard and create a project.
2. Open **SQL Editor** → **New query**. Paste all of `database/schema.sql` and run it.
3. In **Project Settings → API** (or **API Keys** in newer dashboards), find your **Project URL** and **service_role/secret key**. Keep the secret private.
4. Copy `backend/.env.example` to `backend/.env` and replace the placeholders. Never commit `.env` or put the secret in frontend code.
5. RLS is enabled for both tables. There are **no browser-accessible anon policies**. The server uses the privileged service-role key to access tables. Never publish that key.

## Install and run
Open a terminal **inside the backend directory**:

```bash
cd event-booking-system/backend
npm install
npm run dev
```

`npm install` installs every declared package. These optional commands demonstrate the dependencies, but **are not required**:

```bash
npm install express cors dotenv @supabase/supabase-js ws
npm install --save-dev nodemon
```

For normal startup use `npm start`. Open **http://localhost:3000**. Express serves the frontend, so do not open `index.html` as a file or with an unrelated Live Server port. Use Ctrl+C to stop.

## API endpoints
| Method | Route | Purpose |
|---|---|---|
| GET | `/api/health` | Health response |
| GET | `/api/events` | List events |
| POST | `/api/events` | Create event |
| PUT | `/api/events/:id` | Update event |
| DELETE | `/api/events/:id` | Delete event |
| POST | `/api/bookings` | Reserve event |
| GET | `/api/bookings?email=...` | Find email's bookings |
| DELETE | `/api/bookings/:id` | Cancel booking (JSON body with `email`) |

Example event request JSON: `{"title":"Coding Workshop","description":"Intro to web apps","category":"Tech","location":"Lab 1","event_date":"2026-12-05T10:00:00.000Z","capacity":40}`.

Example booking request JSON: `{"event_id":"EVENT_UUID","attendee_name":"Student","attendee_email":"student@example.com"}`.

## Test manually
1. Visit `/api/health` and confirm `{ "status": "ok" }`.
2. Create an event from the form; verify it appears and is in Supabase Table Editor.
3. Search/filter; edit the event and reload to confirm persistence.
4. Book using an email; try booking twice (should reject duplicate).
5. Search bookings using that email and cancel; verify the booking is removed.
6. Delete the event and confirm it disappears.
7. Disconnect the backend to see the frontend's network-error message.

Static syntax check: `npm run check` (inside backend). The ZIP build also runs JavaScript syntax and file consistency checks when available. **A live database integration test requires your own Supabase credentials and was not performed during ZIP generation.**

## Git and GitHub
From the project root:
```bash
git init
git add .
git commit -m "Initial event booking system"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPOSITORY.git
git push -u origin main
```
Create the empty repository on GitHub first. Check `git status` to ensure `.env` and `node_modules` are excluded.

## Common errors
- **Missing credentials:** create `backend/.env` with the real URL and secret key; restart server.
- **Table not found:** run `database/schema.sql` in the correct Supabase project.
- **Failed to fetch:** start Express, then open `http://localhost:3000` (not a `file://` URL).
- **Port already used:** change `PORT` in `.env` and restart.
- **RLS/permission denied:** ensure the backend has the service-role/secret key, not the public anon key; keep RLS enabled.
- **Duplicate booking:** one email can book an event once.
- **Event full:** cancel a booking or increase event capacity.

## Security limitations / next steps
**Important:** This is a classroom demo, **not a production-ready public booking service**. There is no login, email verification, organizer ownership, or authorization on event CRUD. Anyone with access to the site can create, edit or delete events. Anyone knowing an email can view/cancel its bookings. Add Supabase Auth, organizer roles, server-side identity verification, rate limiting, restricted CORS, and abuse protection before deploying publicly. Do not expose this demo publicly with real student data. The `ws` package is included as requested but not needed for these REST features. The database service-role key bypasses RLS *on the server only*; RLS remains enabled and direct anonymous table access is denied. The capacity rule is enforced on bookings through a locked SQL function, but lowering an event's capacity below existing bookings is not blocked. No email notifications or payments are implemented.

## 60-second demo script
“Hello everyone. My project is the Event Booking System, called CampusSpark. Students can see events and search by category or location. Organizers can add, edit and delete events. Students book an event by entering their name and email, and the system prevents duplicate bookings and full events. My frontend uses HTML, CSS and JavaScript. The backend uses Express, and Supabase PostgreSQL stores events and bookings. Now I will create an event, book a seat, view my booking and cancel it. Thank you!”

## Five viva questions
1. **What is frontend?** The part of a website users see and interact with.
2. **What is backend?** Server code that validates requests and talks to the database.
3. **What is REST API?** HTTP routes that let the frontend request or change data.
4. **What is Supabase?** A platform that provides a hosted PostgreSQL database and APIs.
5. **Why use RLS?** It restricts which database roles can access rows; this demo keeps public roles blocked and uses a secret server-side role.
