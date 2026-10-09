# Tennis Booking — Netlify Database Edition

This package turns the mobile tennis booking page into one shared booking system.
All visitors using the same deployed URL read and update the same Netlify Database record.

## Important

There is no login, as requested. Anyone who knows the site URL can view, add, edit, import,
or delete bookings and players. Use an unguessable Netlify site name and share the URL only
with trusted friends.

## Deploy

1. Sign in to Netlify and create or open a project.
2. Connect this folder through a Git repository. Netlify Database and migrations are designed
   for normal project deploys; this is not a static-only Netlify Drop package.
3. In the project directory, install Netlify CLI 26+ and sign in:
   `npm install -g netlify-cli`
   `netlify login`
4. Link the folder to the Netlify project:
   `netlify link`
5. Initialize Netlify Database:
   `netlify database init`
6. Deploy:
   `netlify deploy --prod`

Netlify applies the SQL migration in `netlify/database/migrations` during production deployment.

## Local test

Run `npm install`, then `netlify dev`. The local database is separate from production.

## Existing phone records

On the old page, use Data Tools > Export backup. On the new deployed page, use
Data Tools > Import backup. The imported records are then stored in the shared database.
