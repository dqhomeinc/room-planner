# Contracts

Runtime-validated schemas shared between the web application and reconstruction
worker. Every persisted payload includes an explicit contract version, and
contract changes require compatibility tests.

```sh
npm run test --workspace @room-planner/contracts
```
