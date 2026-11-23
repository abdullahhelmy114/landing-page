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
Whop plan IDs for the two courses live in `src/lib/whop-plans.ts` (regular prices). Discount
codes and the discounted plans they open live only on the server, in
`src/lib/discount-codes.server.ts`; `/api/public/discount` checks a code. Each group's
WhatsApp link and QR code are files in `whatsapp-gruplari/` (see its README.txt); the server
reads them and returns them with the saved registration, so they never have a URL.

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
6. Deploy.

### Environment variables

| Variable | Default | Description |
| --- | --- | --- |
| `NODE_ENV` | `production` | Node environment |
| `PORT` | `3000` | Server port |
| `DATABASE_URL` | — | Neon/Postgres connection string used by the `/api/public/*` registration routes |
| `NEXT_PUBLIC_UMAMI_WEBSITE_ID` | — | Umami website id. Set it to turn on visitor analytics; empty loads no script |
| `NEXT_PUBLIC_UMAMI_SRC` | `https://cloud.umami.is/script.js` | Umami script URL (change it for a self-hosted Umami) |

#### Visitor analytics (Umami)

Umami is cookieless, so the site shows no cookie banner. The script loads only in a production
build with `NEXT_PUBLIC_UMAMI_WEBSITE_ID` set (see `.env.example`); both variables are inlined at
build time, so on Coolify mark them as build variables. Query strings are not sent. Besides
pageviews, the site sends only these events, none with personal data, a discount code or a payment
id: `whatsapp_float_click`, `whatsapp_footer_click`, `price_card_click` (`course`), `group_select`
(`course`, `type`), `payment_step_open` (`course`), `discount_code_result` (`valid`),
`payment_complete` (`course`, once per payment) and `whatsapp_group_join_click`.

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
