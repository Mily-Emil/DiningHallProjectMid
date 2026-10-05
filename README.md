# Kitchen Connect

baca laporan diatas dan tolong buatkan frontend dan backend dari sistem tersebut. gunakan bahasa javascript dan untuk databasenya gunakan supabase dan buatkan agar supabasenya bisa saya dan teman2 saya akses. Dan untuk flownya seperti ini: mulai > mahasiswa login (pake nomor regis) > generate token qr for mo scan > staff dapur ngescan nanti > token valid > status makanan di teirma. Kalau tidak valid, balik lagi dari awal. Dan buatkan juga agar saat di run di terminal menggunakan "npm run dev" bukan "bun run dev"

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/72cd675c-7d4d-44c6-8398-87a834a159dc).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```

## Deployment

Deploy the application from the `DiningHallMid` directory to Vercel. Database
migrations are separate from Vercel deployments: before using the assisted-meal
feature on an existing Supabase project, run the SQL in
`supabase/migrations/20261004100000_add_assisted_scan_status.sql` once in the
Supabase SQL Editor. This adds the `assisted` attendance status used by staff.

To restrict staff access, also run
`supabase/migrations/20261005040000_restrict_self_assigned_roles.sql` once.
New accounts are always assigned the student role; an administrator must grant
the `staff` role to approved staff accounts through Supabase. Review existing
staff-role assignments after applying this migration and remove any that were
not granted to approved staff.

For a temporary class demonstration, set the Vercel server environment variable
`DEMO_DINNER_WINDOW` to `16:00-17:30` and redeploy. This opens the dinner session
from 16.00 to 17.30 WITA while preserving the normal breakfast and lunch times.
After the demonstration, remove the variable and redeploy to restore the normal
dinner hours (18.00–20.00 WITA). Leave it unset for normal operation.
