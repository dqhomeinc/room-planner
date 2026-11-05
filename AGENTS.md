# Contributor guide

## Product constraints

- Store physical dimensions in meters. Convert only at input and display edges.
- Treat reconstructed geometry as inferred until a user validates it.
- Preserve the provenance and confidence of measurements.
- Never claim that a product fits when clearance or geometry is uncertain.
- Keep customer uploads and generated room data private by default.

## Repository map

- `apps/web`: mobile-first capture and room-planning application.
- `services/reconstruction`: replaceable video reconstruction worker.
- `contracts`: versioned data exchanged by the web app and worker.
- `catalog`: curated product data and validation rules.
- `tests/fixtures`: synthetic or explicitly consented test inputs.
- `docs`: architecture and operational decisions.

## Working agreements

1. Keep each pull request focused on one behavior or infrastructure concern.
2. Prefer splitting a change when its human-authored diff exceeds 500 lines.
3. Add or update tests for behavior changes.
4. Run `npm run format:check`, `npm run lint`, `npm run typecheck`, `npm test`,
   and `npm run build` before requesting review.
5. Do not commit secrets, customer media, generated reconstructions, or large
   binary fixtures.
6. Record architectural decisions in `docs/` when they affect multiple areas.

Generated files such as dependency lockfiles may exceed the review-size target;
keep them in the same PR as the dependency change that requires them.
