# PrepAI Database Design (Phase 3)

MongoDB with Mongoose. Models live in `server/src/models`.

## Collections
| Collection | Purpose | Key indexes |
|---|---|---|
| users | Accounts, roles, profile | `email` unique |
| refreshtokens | Hashed refresh tokens with rotation families | `tokenHash` unique, `family`, TTL on `expiresAt` |
| resumes | Uploaded resumes and AI analysis | `{userId, createdAt:-1}`, `{userId, sha256}` unique |
| jobmatches | Resume vs job description results | `{userId, createdAt:-1}` |
| interviewsessions | Mock interviews with per-question feedback | `{userId, createdAt:-1}` |
| studydocuments | Admin-approved study materials | `{status, topic}` |
| documentchunks | Chunks and embeddings for RAG | `{documentId, ordinal}` unique, plus vector index |
| studyconversations | Study assistant chats with citations | `{userId, updatedAt:-1}` |
| dsaproblems | DSA tracker | `{userId, status, topic}`, `{userId, platform, title}` unique |
| jobs | Mongo-backed async queue | `{status, runAt}`, `idempotencyKey` unique sparse |
| aiusages | Per-user daily AI quota | `{userId, day}` unique, TTL |
| auditlogs | Security audit trail | `{actorId, createdAt}`, `{action, createdAt}`, TTL 1 year |

## Design rules
- **Ownership:** every user-owned document has `userId`, and every query filters on it (server-side, never from the request body).
- **Sensitive fields** (`passwordHash`, `extractedText`, `embedding`) use `select: false`, so they are never returned by accident.
- **Bounded growth:** array and string lengths are capped in the schema, list endpoints are paginated (max 50), and TTL indexes clean up tokens, quota rows, and audit logs.
- **Idempotency:** unique `idempotencyKey` on jobs and a resume SHA-256 duplicate guard prevent double processing.
- **Schema changes:** additive changes are deployed first. Destructive changes use a migration script run in a separate release step. Migrations are not set up yet (planned for Phase 5 hardening).

## Atlas Vector Search index (collection `documentchunks`)
```json
{
  "fields": [
    { "type": "vector", "path": "embedding", "numDimensions": 1024, "similarity": "cosine" },
    { "type": "filter", "path": "documentId" }
  ]
}
```
`numDimensions` must match the chosen embedding model. It is a placeholder until the embedding provider is confirmed.

## Retention
| Data | Retention |
|---|---|
| Account deletion request | Soft-delete immediately, hard purge of resumes, interviews, conversations, and DSA data within 30 days |
| Audit logs | 1 year |
| Refresh tokens | Until expiry |
| Resume text | Deleted with the resume |
