Feature layer.

- Owns reusable business-facing capabilities such as history, replay, account, and competition.
- Must consume `core/contracts/storage/services` instead of re-defining protocol or rule logic.
- Page migrations should prefer feature extraction over adding more page-local runtime helpers.
