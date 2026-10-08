# CipherStash setup — write an encryption rollout plan

Integration: `supabase` · Package manager: `npm`

`npx stash plan` runs the planning phase for the **encryption rollout** — your job is to produce a reviewable plan at `.cipherstash/plan.md` that covers everything the user must land in their repo and deploy to production before any historical data can be backfilled. **Do not** make code or schema changes here; do not run mutating CLI commands. Read-only inspection is encouraged.

The encryption-cutover plan (backfill → switch reads to encrypted → drop plaintext) is a separate plan written by re-running `npx stash plan` after dual-writes are live in production. Stay in scope.

## Where am I?

Run `npx stash status` first. It tells you which columns are mid-rollout, which have been deployed, and what's left. Re-read it as you go — never plan blind.

## What `stash init` already did

- [x] Authenticated to CipherStash and selected a workspace
- [x] Detected integration: `supabase`
- [x] Wrote a placeholder encryption client at `./src/encryption/index.ts` (a small file showing the encryption-client patterns; the user's real Drizzle/Supabase schema files remain authoritative)
- [x] Installed `@cipherstash/stack` (runtime)
- [x] Installed `stash` (CLI, dev dep)
- [x] Installed the EQL extension and `cipherstash.cs_migrations` into the database

## Skills loaded

Reusable rules and worked examples live in `AGENTS.md` (Cursor / Windsurf / Cline):

- **`stash-encryption`** — the encryption API, schema definition, and the rollout-and-cutover lifecycle (the source of truth for taking encryption to production)
- **`stash-supabase`** — Supabase-specific patterns: `encryptedSupabase` wrapper, encrypted query filters, transparent decryption, the rollout/cutover walkthrough
- **`stash-indexing`** — index recipes for encrypted columns — the `eql_v3` extractor functional indexes, Supabase/managed-Postgres constraints, EXPLAIN verification
- **`stash-postgres`** — hand-written Postgres SQL over `pg` / `postgres-js`: the encrypted predicate matrix, `eql_v3.query_*` operand casts, per-driver parameter binding
- **`stash-edge`** — the `@cipherstash/stack/wasm-inline` entry for Deno / Supabase Edge Functions / Workers: imports, `CS_*` credentials, the credential-identity rule
- **`stash-managed-platforms`** — managed AI app platforms (Lovable, v0, Bolt, Replit): the WASM entry, headless `auth login --json`, minting `CS_*` with `stash env`, installing EQL as a non-`postgres` role, and which predicates survive PostgREST
- **`stash-deployment`** — taking a rollout to a live environment — the multi-deploy ladder and its gates, backfilling against a production database, `CS_*` credentials at build and run time, Prisma Postgres/Compute specifics
- **`stash-zerokms`** — the ZeroKMS key model — keysets scope every encrypt/decrypt/query, clients and grants, the default keyset, multi-tenant `config.keyset`, and diagnosing keyset-access failures
- **`stash-auth`** — authenticating to CipherStash — the CTS service-token model, `@cipherstash/auth` strategies (`config.authStrategy`), the four `CS_*` variables and `stash env`, lock context, and auth failure codes
- **`stash-cli`** — `stash` command reference — `status`, `plan`, `impl`, `eql install`, the staged EQL v3 read-switch workflow, and `encrypt {backfill,drop}`.

Read the skills before answering API or pattern questions. The doctrine in `AGENTS.md` covers the invariants that apply regardless of which flow you take — never log plaintext, never `.notNull()` on creation, etc.

## What this plan covers

Two paths, depending on whether the column already exists:

- **Add a new encrypted column** — single deploy, no rollout/cutover split. Declared encrypted from the start.
- **Encryption rollout for an existing column** — the encrypted twin column and the application-side dual-write code. All of this lands in one PR; the user deploys it; `cs_migrations` records `dual_writing` the next time backfill is invoked.

Converting a populated column in place is **not** supported — any "just swap the type" approach corrupts data. If the user asks for that, the plan must explain why and route them to the encryption-rollout flow.

## Your task: produce the rollout plan file

Write `.cipherstash/plan.md` covering, for each table+column the user wants to protect:

- **A machine-readable summary block at the very top of the file**, before any heading or prose. `stash impl` parses this to render a confirmation panel before launching implementation. Use this exact shape (valid JSON, single block, no other content inside the comment):

  ```
  <!-- cipherstash:plan-summary
  {
    "step": "rollout",
    "columns": [
      {"table": "<table_name>", "column": "<column_name>", "path": "new" | "migrate"}
    ]
  }
  -->
  ```

  `step` is `"rollout"` for this plan. `path` is `"new"` for additive columns (no plaintext predecessor) and `"migrate"` for columns that already exist with live data. Keep the block in sync with the prose; if you revise the plan, regenerate the summary.

Then, the prose plan covers:

- The table and column names (extract candidates from `.cipherstash/context.json`; if the user hasn't yet said which columns matter, ask before writing the plan).
- Which path applies per column (additive new column or encryption-rollout for an existing one). Justify briefly.
- For migrate columns: what the rollout PR contains — schema-add and the exact dual-write code change. The dual-write definition matters: every persistence path that mutates the row writes both columns, in the same transaction, on every code branch.
- Project-specific risks. Common ones: bundler exclusion not yet configured (Next.js / webpack / Vite), top-level-await in the placeholder encryption client breaks non-Next contexts, existing partial CipherStash state (run `npx stash eql status` and note any pre-existing encrypted columns or pending configs).
- A "Deploy gate" section near the end of the plan that explicitly says: after the rollout PR is in production and serving real traffic, the user runs `npx stash status` to confirm, then `npx stash plan` again — at that point the CLI will detect dual-writes and produce a separate cutover plan covering backfill, read-path switch, and drop.
- Open questions for the user — anything you can't determine from the schema, context.json, or the skills.

After writing the plan, also offer to copy it into `docs/plans/cipherstash-encryption-rollout.md` if the project has a `docs/plans/` directory — many teams version their plans alongside the code. Don't copy without asking. If `docs/plans/` does not exist, leave the plan at `.cipherstash/plan.md` and don't create the directory.

## What you must NOT do

- Edit schema files, application code, or migration files. The plan describes future changes — it does not perform them.
- Run `npx stash encrypt backfill`, `npx stash encrypt drop`, or any other state-mutating command.
- Run schema migrations (`drizzle-kit migrate`, `supabase db reset`, `prisma migrate`, etc.).
- Modify the placeholder encryption client beyond what is required to read it.

Read-only commands (`npx stash status`, `npx stash eql status`, file reads, greps, `npx stash doctor` if available) are fine and encouraged — the plan is more useful when grounded in the actual current state.

## Your first response

Send the user a short orientation message before writing anything. Confirm setup is complete, list the skills loaded (if any) with one-line purposes, explain what an encryption rollout is in your own words, and end with a clear question — *"Which table(s) and column(s) would you like the rollout plan to cover? You can name them or describe what you're trying to protect."* Reference concrete tables/columns from `.cipherstash/context.json` when it helps.

Once the user answers, write `.cipherstash/plan.md`. Show the plan in chat as well so the user can react inline. After the plan is approved, tell the user to run `npx stash impl` to execute it.

## Stop and ask the user when

- The user asks to convert a populated column in place. Explain why it doesn't work and offer the migrate-existing-column flow instead.
- A column the user names is already encrypted — an `eql_v3_*` domain (`eql_v3_text_search`, `eql_v3_integer_ord`, …) on the default path, or the legacy `eql_v2_encrypted` udt — but with a different EQL config than they've described. This is the post-cutover re-encryption case (`stash encrypt update`, not yet shipped) — surface it in the plan as a flagged risk.
- You discover existing partial CipherStash setup that disagrees with what the user is describing — someone else may have run `stash init` earlier with different choices. Note this in the plan and ask the user to clarify before writing prescriptive steps.
- The user names columns that don't appear in `.cipherstash/context.json` or in the schema files you can see. Confirm the names rather than guessing.
