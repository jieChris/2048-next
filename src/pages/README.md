Page layer.

- Owns page-level structure and page-specific orchestration.
- Reads from `app/features/ui` boundaries, not from legacy globals directly.
- New page-system migrations should land here before legacy page scripts are retired.
