# Contracts

Runtime-validated schemas shared between the web application and reconstruction
worker. Every persisted payload includes an explicit contract version, and
contract changes require compatibility tests.

## Proposal input hashes

Design-proposal input hashes use RFC 8785 JSON Canonicalization Scheme output,
encoded as UTF-8 and hashed with SHA-256. Stored values use the form
`sha256:<lower-case hexadecimal digest>`. Timestamps are descriptive metadata;
the hash identifies the exact validated contract payload.

The planning-room snapshot also summarizes design-relevant geometry. Its
minimum confidence is the lowest confidence across the boundary, wall height,
openings, and fixed features. `user_validated` means every relevant element is
user-validated, `partially_validated` means at least one is, and `inferred`
means none are. This summary never upgrades the provenance stored in the room.

```sh
npm run test --workspace @room-planner/contracts
```
