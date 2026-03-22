App assembly layer.

- Owns application-level composition and route-to-page wiring.
- Must not implement game rules, storage schema, or raw API protocol details.
- First migration target: host unified page bootstrap for `modes -> palette -> history -> account`.
