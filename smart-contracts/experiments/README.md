# Experiments (M0 verification probes)

These are the isolated probe contracts + scripts written during M0 to answer the
⚠️ NEEDS-EXPERIMENT questions in `.agents/PLAN-M0-verification.md` before any production
contract code was written — encrypted arithmetic feasibility, encrypted comparison, sorting
capacity, and the Hello World SDK smoke test. Kept for transparency into the verification
process, not part of the production auction system.

Results are recorded in `DECISIONS.md` (section "Eksperimen M0 — Status Probe").

Note: `ProbeArith.sol` and `scripts/probe-arith.ts` stayed in `contracts/`/`scripts/` (not moved
here) because `test/nox-local.test.ts` still deploys `ProbeArith` as a minimal real-Nox-primitive
smoke test — Hardhat only compiles contracts under `contracts/`, so moving it here would break
that test.
