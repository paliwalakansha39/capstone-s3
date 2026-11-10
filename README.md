# DTC Bus Management System — Frontend Demo

This frontend-only preview includes a DTC landing page, demo sign-in, a
dashboard, admin profile, and locally stored user-management interactions.
Bus, route, and duty scheduling features are not included.

## Run locally

Requirements: Node.js 20+ and npm.

```sh
cd frontend
npm install
npm run dev
```

Open the Vite URL (normally `http://localhost:5173`). On the sign-in page,
enter any valid email address and a password of at least 8 characters. The
dashboard session, sample users, and user changes are stored in that browser's
local storage.

Use `npm run build` to create the production build and `npm run preview` to
serve it locally.

## Demo limitations

This is a UI prototype only. Sign-in is not real authentication, browser-local
data is not shared or backed up, and this application must not be used to
protect real accounts or operational data. A production deployment needs a
properly secured backend and database.
# capstone-s3
