# Room Planner

A design-first room-planning experiment. The product turns known room geometry
and a user's goals into creative, validated, editable furniture layouts that can
be explored in 2D and 3D.

The first MVP starts with manual dimensions and simple room templates. Importers
and video reconstruction can later produce the same canonical planning-room
model without blocking design development. See
`docs/design-first-mvp-plan.md` for the development order.

## Local development

Requirements: Node.js 22 and npm.

```sh
npm install
npm run dev
```

Before opening a pull request:

```sh
npm run format:check
npm run lint
npm run typecheck
npm test
npm run build
```

## Deployment

Connect the repository to Cloudflare Pages with:

- Build command: `npm run build`
- Build output directory: `apps/web/dist`
- Node version: `22`

Pull requests then receive isolated preview deployments through the Cloudflare
Git integration. Production deployment should track `main`.

## GitHub setup

Add `ANTHROPIC_API_KEY` as a repository Actions secret. Configure the `main`
branch to require the `ci` and `claude-review` status checks and resolved review
conversations. A passing Claude status means the review completed; findings must
still be addressed by a human before merge.
