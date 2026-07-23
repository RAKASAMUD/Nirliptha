# Nirlipta — Confidential Sealed-Bid Auction on Nox Protocol

Nirlipta is a sealed-bid, uniform-price auction for primary issuance of real-world assets (RWA), built on [Nox Protocol](https://noxprotocol.io)'s TEE-based confidential computing. Bid quantities and prices are never plaintext on-chain — the auction clears inside a Trusted Execution Environment, and post-auction ownership stays confidential indefinitely, not just during the bidding window.

## The Problem

Sealed-bid auctions for large private placements — Vitol's $135M bribery case over tender bid access, the opacity around deals like the Boeing–Lockheed $615M ULA sale, the a16z "State of Crypto" June 2026 report naming privacy as the last blocker to institutional on-chain adoption — all share one root cause: someone has to hold everyone's secret numbers before the auction clears. That trusted party is a single point of failure, bribery, or leak.

Nirlipta removes the trusted party. Bids are encrypted client-side and only ever computed on inside a TEE — no operator, including the issuer, ever sees another bidder's Q or P in plaintext.

## How It Works

```
Issuer opens auction (quantity, reserve price, deadline — public parameters)
        │
        ▼
Investors submit encrypted bids (Q, P never leave their device unencrypted)
        │
        ▼
Deadline passes → issuer calls finalize()
        │           TEE computes rank-sort + allocations + clearing price,
        │           all still encrypted
        ▼
completeSettlement() reveals ONLY the clearing price (public, aggregate)
        │           individual allocations remain encrypted handles
        ▼
Bidders claim() — winners get cAsset + refund, losers get full refund
        │           claim() is a single indistinguishable function — an
        │           outside observer cannot tell winner claims from loser claims
        ▼
Issuer withdrawToSafe() — proceeds settle to a Gnosis Safe treasury
        │
        ▼
Ownership stays confidential FOREVER (not just during bidding).
Auditor access is opt-in and revocable: grantAuditView() lets a specific
auditor decrypt a specific bidder's allocation; rotateHandles() re-randomizes
every handle's ACL — a previously-granted auditor goes blind to future state.
```

## What Makes Nirlipta Different

Most confidential-auction demos stop at "the bid was private during the auction." Nirlipta keeps going: post-settlement token ownership (`confidentialBalanceOf`) stays an opaque handle on Etherscan forever — there is no moment where the cap table becomes plaintext. Compliance is handled by opt-in, revocable audit access (`grantAuditView` + `rotateHandles`) instead of by making the ledger public.

This is a deliberate trilemma trade-off: full bidder anonymity is out of scope (identity = pseudonymous wallet address, which chain analysis can de-anonymize) in exchange for a system that is trustless (no operator custody of secrets) and practical (no relayer/mixnet required for the demo). See [Known Limitations](#known-limitations).

## Architecture

```
AuctionFactory ──creates──> Auction (one instance per auction)
      │                          │
      │                          ├── escrows cAsset (quantity for sale)
      │                          ├── escrows cUSD deposits (Q×P per bid)
      │                          └── settles cUSD proceeds to a Safe

CUSD, CAsset ── extend ERC7984 (confidential fungible token, Nox-native)
```

- **`CUSD.sol` / `CAsset.sol`** — confidential ERC-7984 tokens (owner-only mint, encrypted balances/transfers).
- **`AuctionFactory.sol`** — mints `Auction` instances, tracks the registry.
- **`Auction.sol`** — the full state machine: `AwaitingEscrow → Open → PendingReveal → Settled`. Handles `submitBid`, `finalize`, `completeSettlement`, `claim`, `withdrawToSafe`, `grantAuditView`, `rotateHandles`.
- **`AuctionTypes.sol`** — shared `Status` enum + `BidRecord`/`AllocationRecord` structs.

Nox's off-chain components (Handle Gateway, KMS, Runner) are consumed via `@iexec-nox/handle` and `@iexec-nox/nox-protocol-contracts` — not built by this project.

## Deployed Contracts (Sepolia)

| Contract | Address | Etherscan |
|---|---|---|
| cUSD | `0x7309886ee42Aa29a796A479A01Eef07a61c8F6Fd` | [link](https://sepolia.etherscan.io/address/0x7309886ee42Aa29a796A479A01Eef07a61c8F6Fd) |
| cAsset | `0x43d81618774059F0172b7B32c972271a6440003D` | [link](https://sepolia.etherscan.io/address/0x43d81618774059F0172b7B32c972271a6440003D) |
| AuctionFactory | `0x39536Ea5789538D7F76999e8BDE5679526F815Df` | [link](https://sepolia.etherscan.io/address/0x39536Ea5789538D7F76999e8BDE5679526F815Df) |
| Sample Auction | _pending — full lifecycle E2E on Sepolia not yet run, see `DECISIONS.md`_ | |
| Safe (Treasury) | _pending — not yet created on app.safe.global_ | |

> Full lifecycle logic (submitBid → finalize → claim → audit/rotate) is proven end-to-end with real Nox primitives against a local Docker-backed Nox stack (32/32 tests passing — see `DECISIONS.md`). The remaining Sepolia deployment steps are blocked on funding demo bidder wallets via faucet; this table will be completed once that finishes.

## Quick Start

### Prerequisites
- Node.js 22+
- Git
- Docker Desktop (only needed to run tests locally against Nox's local stack)
- ETH Sepolia (from a faucet) — only needed to deploy/interact on Sepolia

### Installation
```bash
git clone https://github.com/RAKASAMUD/nirliptha.git
cd nirliptha/contracts
npm install
```

### Run Tests (local, needs Docker)
```bash
docker ps  # confirm Docker daemon is running
npx hardhat test
```
The Nox Hardhat plugin spins up a local Docker Compose stack (handle gateway, KMS, ingestor, runner, MinIO, NATS) and injects `NoxCompute` into a local Hardhat node — no Sepolia ETH needed for this.

### Deploy (Sepolia)
```bash
cp .env.example .env
# edit .env: PRIVATE_KEY, SEPOLIA_RPC_URL, and 5 funded DEMO_INVESTOR_* addresses
npx hardhat run scripts/deploy-tokens.ts --network sepolia
npx hardhat run scripts/deploy-factory.ts --network sepolia
```

## Usage Guide

1. **Issuer** opens an auction via `AuctionFactory.createAuction(quantity, reservePrice, deadline, safeAddress)`, then escrows `cAsset` into the new instance and calls `confirmEscrow()`.
2. **Investor** encrypts `(Q, P)` client-side via the SDK and calls `submitBid(...)` — the deposit `Q×P` is locked in confidential `cUSD`.
3. After the deadline, **issuer** calls `finalize()` (computes allocations + marks the clearing price for reveal) then `completeSettlement(proof)` — `clearingPrice` becomes public, individual allocations stay encrypted.
4. **Every bidder** calls the same `claim()` — winners receive `cAsset` + any excess refund, losers receive a full refund. The function is identical for both, so an outside observer can't tell who won.
5. **Issuer** calls `withdrawToSafe()` to settle proceeds to the Safe treasury.
6. **Audit**: issuer calls `grantAuditView(bidder, auditor)` — the auditor can now decrypt that bidder's allocation with their own key. `rotateHandles()` re-randomizes every allocation handle; previously-granted auditors go blind to the new state (they still hold access to the pre-rotation handle value, but the contract no longer references it).

## Known Limitations

These are decisions recorded in `DECISIONS.md`, not hidden weaknesses:

- **Bidder identity is a pseudonymous wallet address** — vulnerable to chain analysis. A relayer for stronger anonymity is documented as future work, not built (see Non-Goals).
- **Confidential transfers never revert on insufficient balance** (Nox/ERC7984 design: `safeSub` silently moves 0 instead of reverting, to avoid leaking balance info via revert). `submitBid` handles this explicitly by tracking the *actual* transferred deposit and disqualifying under-funded bids in `finalize()`.
- **Auditor access isn't cryptographically revocable** in the strict sense — `rotateHandles()` mitigates by isolating future state behind a fresh ACL, but a previously-granted auditor retains access to the pre-rotation handle's value forever (it was already decrypted/decryptable).
- **`MAX_BIDS = 5`** for the demo, a gas-budget choice, not an architectural ceiling — M0 experiments verified the sorting/allocation algorithm stays gas-safe up to N≈50 locally.
- **cUSD is minted directly**, not wrapped from real USDC — wrap/unwrap was scoped out of the demo.
- **No KYC/eligibility gate** — out of scope for this hackathon build.

## Future Work
- Relayer for bidder anonymity
- KYC/eligibility gate (ERC-3643/T-REX)
- Pro-rata allocation at the marginal price (needs encrypted division)
- Secondary market
- Multi-round auctions
- Vesting (Sablier/Superfluid)

## Tech Stack
- Solidity ^0.8.35 + Hardhat 3 (ESM)
- Nox Protocol (TEE-based confidential computing)
- ERC-7984 (confidential fungible token standard)
- `@iexec-nox/handle` SDK
- `@iexec-nox/nox-confidential-contracts`
- Safe (Gnosis Safe, Sepolia) — treasury settlement

## License
MIT
