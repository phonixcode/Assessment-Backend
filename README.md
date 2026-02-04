# Assessment Backend

Node.js/TypeScript backend: 
- **Task A – Idempotent Wallet** (create user → fund → transfer) and
- **Task B – Interest Accumulator** (daily interest at 27.5% pa).

**API docs & Postman:** [View in Postman](https://documenter.getpostman.com/view/36429449/2sBXc7MQr2)

## Requirements

- Node.js >= 18
- PostgreSQL

## Setup

```bash
cp .env.example .env
# Set DB_HOST, DB_USER, DB_PASSWORD, DB_NAME

npm install
npm run migrate
npm run seed
npm run build
npm start
```

- `npm run seed` – creates demo users and wallets (fixed ids for user-a, user-b).
- `npm run dev` – watch mode.

## Wallet flow (A)

1. **Create user** :– `POST /api/users` with `{ "username": "alice" }`. Returns `user.id` and `wallet.id`, `wallet.walletNumber` (balance 0). Each wallet gets a unique **wallet number** (e.g. `WN1234567890`). All **id** values are UUIDs (stored as UUID strings in the `id` column).
2. **Fund wallet** – `POST /api/wallets/:id/fund` with `{ "amountCents": 10000 }`. `:id` is the wallet id (UUID).
3. **Transfer** – `POST /api/transfer` with `Idempotency-Key` header and body `{ "fromUserId": "<user-id>", "toUserId": "<user-id>", "amountCents": 1000 }`. `fromUserId` / `toUserId` are user ids (UUIDs). Idempotent: same key returns same result without double-spending.

column names are **id**, **userId**, **walletId**; the values stored in those columns are **UUID strings** (no integer ids).

## API summary

| Method | Path | Body / Query | Description |
|--------|------|--------------|-------------|
| POST | /api/users | `{ username }` | Create user + wallet (0 balance). Returns `user.id`, `wallet.id`, `wallet.walletNumber`. |
| GET | /api/users/:id | — | Get user by id with wallet. 404 if not found. |
| POST | /api/wallets/:id/fund | `{ amountCents }` | Credit wallet. Returns `walletId`, `balanceCents`, `creditedCents`. |
| GET | /api/wallets/:id | — | Get wallet by id. 404 if not found. |
| GET | /api/wallets/:id/ledger | `?limit=50` (1–100) | Ledger entries for wallet, newest first. |
| POST | /api/transfer | `{ fromUserId, toUserId, amountCents }` + header `Idempotency-Key` | Transfer between users (by user id). Idempotent. Returns `fromWalletId`, `toWalletId`, balances. |
| GET | /api/interest/records | `?walletId=&limit=50` | List interest records; optional walletId filter. |
| POST | /api/interest/accrue | `{ walletId, balanceCentsAtEod, interestDate }` | Accrue one day interest (27.5% pa). |

## Seeded data

After `npm run seed`:

- **user-a**: user id `aaaaaaaa-0000-4000-8000-000000000001`, wallet id `cccccccc-0000-4000-8000-000000000001`, wallet number `WN1000000001`
- **user-b**: user id `bbbbbbbb-0000-4000-8000-000000000002`, wallet id `cccccccc-0000-4000-8000-000000000002`, wallet number `WN1000000002`

Use these in Postman (collection vars) or fund then transfer.

## Postman & API docs

- **Published API docs:** [View](https://documenter.getpostman.com/view/36429449/2sBXc7MQr2)

## Tests & coverage

```bash
npm test          # runs tests with coverage
npm run test:watch # watch mode
```

Coverage is generated into `coverage/` (e.g. `coverage/lcov-report/index.html`). Current focus:

- **Transfer service** – idempotency, validation, 404/402/500 paths, unique violation and rethrow.
- **Interest math** – `dailyRateForYear`, `daysInYear`, `dailyInterestCents` (leap vs non-leap, rounding).

Open `coverage/lcov-report/index.html` in a browser after `npm test` to see line/branch coverage per file.

## Thought process & trade-offs

**Task A (Idempotent Wallet)**  
- **Idempotency:** One row per request in `TransactionLog` with a unique `idempotencyKey`. We create a PENDING row first; on unique violation we treat it as “in progress” or return a cached response if another process already completed/failed. This avoids double-spend and gives a clear audit trail.  
- **Identifiers:** All PKs and FKs are UUIDs (strings). Transfers are keyed by **user id**; we resolve to wallets inside the transaction so the API stays user-centric.  
- **Wallet number:** Format `WN` + 10 digits, generated at creation; separate from internal `id` so it can be shown to users or used in references.  
- **Concurrency:** Transfer runs in a single DB transaction with `REPEATABLE_READ` and row locks on both wallets so balances and ledger stay consistent.  
- **Failure logging:** If the main transfer fails, we update the same `TransactionLog` row to FAILED and store the error/status so a retry with the same idempotency key can return that outcome.

**Task B (Interest Accumulator)**  
- **Precision:** Interest uses `decimal.js` so we don’t rely on float math; daily rate = 27.5% / days-in-year, then `floor(balanceCents × dailyRate)` for integer cents.  
- **Year from date:** The divisor (365 or 366) is derived from the **year of the interest date** you send, not a fixed year. So 2024 in examples is just a sample; any year works and leap years get 366 days.  
- **Idempotent accrue:** One `InterestRecord` per (wallet, date). We check for an existing record before creating; duplicate calls for the same wallet/date return the same result and don’t double-credit.  
- **Balance source:** The API accepts `balanceCentsAtEod` in the request rather than reading the wallet at call time, so the caller can pass an EOD snapshot (e.g. from a batch job) and keep interest aligned to that snapshot.

**General**  
- **Single codebase:** Both tasks live in one repo for simpler evaluation and shared config (DB, migrations, seed).  
- **Service → controller:** Services return `{ statusCode, body }` so controllers stay thin and logic is easy to unit-test without HTTP.  
- **GET endpoints:** Added for user, wallet, ledger, and interest records so the API is explorable and the Postman collection can show full flows (create/fund/transfer then read back).  
- **Postman structure:** Task A and Task B are in separate folders so it’s clear which endpoints belong to which problem.

## Database

- **Users** – id (UUID PK), username
- **Wallets** – id (UUID PK), walletNumber (unique), userId (UUID FK), balanceCents, currency (NGN)
- **Ledgers** – id (UUID PK), walletId (UUID FK), amountCents, type, referenceId, referenceType, balanceAfterCents
- **TransactionLogs** – id (UUID PK), idempotencyKey, state, fromWalletId, toWalletId, …
- **InterestRecords** – id (UUID PK), walletId (UUID FK), …

Migrations: `npm run migrate`. Seed: `npm run seed`.
