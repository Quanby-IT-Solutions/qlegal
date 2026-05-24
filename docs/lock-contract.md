# Meeting Document Lock Contract

**Version**: 2026-02-27  
**Status**: Authoritative

This contract defines what happens when a meeting's `isDocumentOrderLocked` flag is set to `true`.

## Contract Type

Full document-freeze lock for document setup actions.

## Allowed vs Blocked While Locked

| Action                 | While Locked | Notes                                                                |
| ---------------------- | ------------ | -------------------------------------------------------------------- |
| Reorder documents      | Blocked      | Document list order cannot be changed.                               |
| Upload / add documents | Blocked      | No new documents can be added.                                       |
| Signer changes         | Blocked      | Signer assignment/edits are frozen.                                  |
| Project creation       | Blocked      | Creating a new signing project is blocked while locked.              |
| Signing progression    | Allowed      | Existing signing flow continues using current document/signer order. |

## API Error Convention

When a blocked action is attempted while locked, the API must reject with:

- `code`: `FORBIDDEN`
- `message`: `Document changes are locked for this meeting. Unlock to upload documents, reorder documents, or edit signers.`

## Acceptance Criteria

- UI disable/hide states match this table.
- API mutations enforce this table (server-side authority).
- `docs/user-manual-enp.md` remains aligned with this contract.
