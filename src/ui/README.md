UI layer.

- Owns presentation, interaction wiring, and visual components.
- Must stay replaceable and avoid direct rule, storage, or network access.
- Any new component that needs business data should receive it from `pages/features/app`, not build protocol payloads itself.
