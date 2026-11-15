# Foundation architecture

The primary MVP is design-first. The browser owns room creation, geometry
review, design exploration, editing, and visualization. A canonical metric
planning-room contract separates those capabilities from the way room geometry
was obtained.

```text
manual room or template -> canonical planning room -> design brief
  -> validated layout alternatives -> editable 2D and synchronized 3D
```

Manual dimensions and simple templates are the first input methods. Later 2D
importers, 3D importers, and video reconstruction must normalize into the same
planning-room contract while preserving confidence and provenance.

The separate reconstruction worker continues to own video processing. It
communicates through versioned contracts and private persisted jobs, but its
reconstruction evidence is not the editor's canonical model:

```text
guided capture -> private reconstruction job -> calibration and user review
  -> canonical planning room -> design workflow
```

The deterministic geometry and clearance validator remains authoritative when
layouts are suggested by rules, user edits, or an AI-assisted design concept.
Presentation must never turn inferred geometry into an unconditional fit claim.

Cloudflare Pages hosts the static web application. A later change will connect
the application to Supabase for authentication, persistence, and private media.
The reconstruction worker can begin on developer-owned hardware by claiming
jobs through authenticated outbound requests, then move to managed compute
without changing either the reconstruction or planning-room contracts.

See `docs/design-first-mvp-plan.md` for the primary development order and
`docs/reconstruction-development-plan.md` for the deferred reconstruction input
track.
