# Deployment env templates

Copy-paste these when hosting. None of them contain real secrets — fill the `<...>` and empty values.

| File | Paste into |
|---|---|
| `render-backend.env` | Render → dundu-api → Environment → **Add from .env** |
| `vercel-web.env` | Vercel → dundu-web → Settings → Environment Variables |
| `vercel-admin.env` | Vercel → dundu-admin → Settings → Environment Variables |
| `mobile.env` | `mobile/.env` on each developer machine / EAS secrets |

Full step-by-step instructions: `DUNDU_Hosting_Guide.pdf` (repo root).
