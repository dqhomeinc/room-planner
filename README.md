# Room Planner

A mobile-first room-planning experiment. The product will turn a guided phone
video and one verified reference measurement into an editable, furnished room.

This repository currently contains the foundation and a deployable product
preview. Reconstruction, calibration, and furnishing will arrive as isolated
follow-up changes after the capture feasibility experiment.

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
