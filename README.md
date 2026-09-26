# Wave FR Admin Portal

This is a React single-page application built with Vite. The React entry point is `src/main.jsx`; it provides login, registered-person search, detection alerts, camera/type filtering, refresh, and logout.

## Run locally

1. Install a current [Node.js LTS](https://nodejs.org/) release (Node 20 or newer). This installs `npm` as well.
2. From this folder, install the exact project packages in the lockfile:

   ```powershell
   npm ci
   ```

3. Optionally configure the default API server. Copy `.env.example` to `.env.local` and replace the sample URL with an address reachable from this machine. You can also enter the API server URL on the login screen.

4. Start the development server:

   ```powershell
   npm run dev
   ```

5. Open the local URL printed by Vite, usually `http://localhost:5173`.

The API server must be reachable from the browser and allow this app's origin through CORS. Sign in with an administrator account on that API server.

## Production build

```powershell
npm run build
npm run preview
```

`npm run build` produces the deployable static site in `dist/`.
Set `VITE_API_BASE_URL` before building to configure the default API server for a production deployment; the login screen can also override it.
