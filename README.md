# Welcome to your Lovable project

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Open your project in the [Lovable editor](https://lovable.dev) and keep building.

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: connect the project to GitHub and every change made in Lovable is committed straight to your repository.
- **Full ownership**: this code is yours. Push to your repository and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js 20.9+ and Bun — [install Bun](https://bun.sh/docs/installation).

```sh
git clone <this-repository-url>
cd <repository-name>
bun install
bun run dev      # http://localhost:3000
bun run build    # production build (type-checks)
bun run lint
```

The site is a Next.js App Router app: pages and API routes live in `src/app`, and the
Whop plan IDs for the two courses live in `src/lib/whop-plans.ts` (regular prices; the prices
themselves are in `src/components/shukraan/data.ts`). Discount
codes and the discounted plans they open live only on the server, in
`src/lib/discount-codes.server.ts`; `/api/public/discount` checks a code. Each group's
WhatsApp link and QR code are files in `whatsapp-gruplari/` (see its README.txt); the server
reads them and returns them with the saved registration, so they never have a URL.

## Content, languages and the control panel

The landing page's texts are not in the code. The standard page lives in `content/` as JSON, one
file per language (`content/pages/standart/tr.json`, `en.json`, `ar.json`), with the brand name,
the tagline per language and the language list in `content/site.json`. These files are the seed;
everything edited in the control panel is stored in `DATA_DIR` (a persistent volume in Docker,
`/app/data`): drafts, published pages, the last 30 published versions, deleted sections (kept 30
days) and uploaded images (converted to WebP, metadata removed, 10 MB at most).

| Path | Shows |
| --- | --- |
| `/`, `/en`, `/ar` | The standard page in Turkish, English, Arabic (`/tr` redirects to `/`) |
| `/dad40`, `/en/dad40` … | A referral link: the standard page with that link's discount code |
| `/<slug>`, `/en/<slug>` … | A course page made in the panel with «Duplicate page» |
| `/admin` | The control panel (Arabic): log in with `ADMIN_PASSWORD` |

In the panel, edit mode is the page itself: click any text or image to change it (per language:
العربية · English · Türkçe), add, duplicate, hide, reorder (drag in «الأقسام») or delete
sections, change page settings (course name and slug, Whop plan or checkout link, WhatsApp number
and message, lockup colours, SEO and share image per language, and the offer code applied when the
page opens, so prices show the old price struck through), copy a preview link, and press «نشر» to
publish. Every section has «مشاركة» in the panel (never on the public page): its public link in that
language, share buttons, and a PNG of the section for Instagram and stories. Each publish keeps a version that can be restored. A language added in «الإعدادات
العامة» needs no code change: its pages start from the English text and its tagline falls back to
English until it has its own.

## Self-hosting with Coolify

This project includes a `Dockerfile` and `docker-compose.yml` for self-hosting on [Coolify](https://coolify.io) or any Docker-based platform.

### Quick start with Docker

The `Dockerfile` installs with Bun, builds Next.js in `standalone` mode and runs the result with Node.js.

```sh
# Build the image
docker build -t ruhulqudus-app .

# Run locally
docker run -p 3000:3000 ruhulqudus-app
```

Then open `http://localhost:3000`.

### Deploy on Coolify

1. Push the repository to GitHub/GitLab.
2. In Coolify, create a new **Resource** → **Application** → choose your repository.
3. Set the **Build Pack** to `Dockerfile`.
4. Make sure Coolify exposes port `3000`.
5. Add your domain (e.g. `ruhulqudus.com`) in Coolify → Domains.
6. In **Environment Variables**, add `ADMIN_PASSWORD` (a long random password; it turns on
   `/admin`).
7. In **Persistent Storage**, add a volume mounted at `/app/data` (the panel's pages, versions,
   trash and uploads; without it every edit is lost on redeploy).
8. Deploy, then open `https://<your domain>/admin` and log in.

### Environment variables

| Variable | Default | Description |
| --- | --- | --- |
| `NODE_ENV` | `production` | Node environment |
| `PORT` | `3000` | Server port |
| `DATABASE_URL` | — | Neon/Postgres connection string used by the `/api/public/*` registration routes |
| `NEXT_PUBLIC_UMAMI_WEBSITE_ID` | — | Umami website id. Set it to turn on visitor analytics; empty loads no script |
| `NEXT_PUBLIC_UMAMI_SRC` | `https://cloud.umami.is/script.js` | Umami script URL (change it for a self-hosted Umami) |
| `ADMIN_PASSWORD` | — | The control panel's password. Empty turns `/admin` off. Changing it signs every session out |
| `DATA_DIR` | `/app/data` in Docker (`./data` locally) | Where the panel stores pages, versions, trash and uploads; mount a persistent volume here |

#### Control panel security

One password, checked in constant time; a signed session cookie (httpOnly, Secure,
SameSite=Strict) for 12 hours, with logout; at most 5 failed logins per 15 minutes per IP (the
last `X-Forwarded-For` entry, set by Coolify's proxy); every change must come from the site itself
(Origin check). `/admin`, `/preview/…` and `/api/admin/…` are `noindex`, `no-store` and cannot be
framed. Rich text keeps only bold, italic, links and lists (sanitised on the server); links and
image sources are checked; uploads are re-encoded as WebP.

#### Visitor analytics (Umami)

Umami is cookieless, so the site shows no cookie banner. The script loads only in a production
build with `NEXT_PUBLIC_UMAMI_WEBSITE_ID` set (see `.env.example`); both variables are inlined at
build time, so on Coolify mark them as build variables. Query strings are not sent. Besides
pageviews, the site sends only these events, none with personal data, a discount code or a payment
id: `whatsapp_float_click`, `whatsapp_footer_click`, `price_card_click` (`course`), `group_select`
(`course`, `type`), `payment_step_open` (`course`), `discount_code_result` (`valid`),
`payment_complete` (`course`, once per payment) and `whatsapp_group_join_click`. On a course page
made in the panel, or in a language other than Turkish, every event also carries `page` (the
slug) and `lang`, so new pages are tracked without any change. The panel and preview links are
never tracked.

### Docker Compose

```sh
docker compose up -d --build
```

## Built with

- Next.js (App Router)
- TypeScript
- React
- Tailwind CSS
- Whop Elements (embedded checkout)
- sanitize-html and sharp (control panel)
