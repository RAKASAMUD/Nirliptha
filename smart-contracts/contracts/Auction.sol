
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.35;

import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IERC7984} from "@iexec-nox/nox-confidential-contracts/contracts/interfaces/IERC7984.sol";
import {Nox} from "@iexec-nox/nox-protocol-contracts/contracts/sdk/Nox.sol";
import {euint256, externalEuint256, ebool} from "encrypted-types/EncryptedTypes.sol";
import {AuctionTypes} from "./AuctionTypes.sol";

/// @title Auction — confidential sealed-bid uniform-price auction using Nox Protocol TEE
/// @notice Full lifecycle: AwaitingEscrow → Open → PendingReveal → Settled
///         Q and P are NEVER plaintext on-chain. Clearing price reveal is two-step:
///         finalize() marks the handle publicly decryptable, completeSettlement() consumes the
///         off-chain decrypted value + proof (Nox.publicDecrypt is NOT synchronous on-chain —
///         see ERC20ToERC7984WrapperBase._unwrap / finalizeUnwrap for the same pattern upstream).
contract Auction is ReentrancyGuard {
    using AuctionTypes for AuctionTypes.Status;

    // ============ Constants ============
    uint256 public constant MAX_BIDS = 5;
    uint256 public constant SCALE = 1_000_000; // 6 decimals, matches cUSD/cAsset decimals

    // ============ Immutable state ============
    address public immutable issuer;
    IERC7984 public immutable cUSD;
    IERC7984 public immutable cAsset;
    uint256 public immutable quantity;       // public: total cAsset tokens for sale
    uint256 public immutable reservePrice;  // public: minimum price per token (in SCALE units)
    uint256 public immutable deadline;      // public: unix timestamp bid window closes
    address public immutable safe;          // public: Gnosis Safe to receive settlement funds

    // ============ Mutable state ============
    AuctionTypes.Status public status;
    uint256 public clearingPrice;           // set in completeSettlement(), 0 until then
    euint256 private clearingPriceHandle;   // set in finalize(); consumed by completeSettlement()

    AuctionTypes.BidRecord[] public bids;
    mapping(address => uint256) public bidderIndex; // 1-indexed; 0 = not bid
    mapping(address => AuctionTypes.AllocationRecord) public allocations;

    // ============ Events ============
    event AuctionInitialized(address indexed issuer, uint256 quantity, uint256 reservePrice, uint256 deadline, address safe);
    event BidSubmitted(uint256 indexed bidIndex, address indexed bidder);
    event RevealRequested(); // clearingPriceHandle marked for public decryption; status -> PendingReveal
    event AuctionSettled(uint256 clearingPrice);
    event Claimed(address indexed bidder);
    event WithdrawnToSafe(address indexed safe);
    event AuditGranted(address indexed bidder, address indexed auditor);
    event HandlesRotated(uint256 timestamp);

    // ============ Modifiers ============
    modifier onlyIssuer() {
        require(msg.sender == issuer, "Not issuer");
        _;
    }
    modifier onlyOpen() {
        require(status == AuctionTypes.Status.Open, "Not open");
        _;
    }
    modifier onlyAwaitingEscrow() {
        require(status == AuctionTypes.Status.AwaitingEscrow, "Not awaiting escrow");
        _;
    }
    modifier onlyPendingReveal() {
        require(status == AuctionTypes.Status.PendingReveal, "Not pending reveal");
        _;
    }
    modifier onlySettled() {
        require(status == AuctionTypes.Status.Settled, "Not settled");
        _;
    }
    modifier afterDeadline() {
        require(block.timestamp > deadline, "Auction still open");
        _;
    }
    modifier beforeDeadline() {
        require(block.timestamp <= deadline, "Auction closed");
        _;
    }
    /// @notice No-op for this demo — a future KYC/eligibility gate (e.g. ERC-3643/T-REX
    ///         verification) would check msg.sender here. Left as an explicit extension point
    ///         per PRD §2 Non-Goals rather than a full implementation (out of scope for the demo).
    modifier onlyVerified() {
        _;
    }

    // ============ Constructor ============
    constructor(
        address _issuer,
        address _cUSD,
        address _cAsset,
        uint256 _quantity,
        uint256 _reservePrice,
        uint256 _deadline,
        address _safe
    ) {
        issuer = _issuer;
        cUSD = IERC7984(_cUSD);
        cAsset = IERC7984(_cAsset);
        quantity = _quantity;
        reservePrice = _reservePrice;
        deadline = _deadline;
        safe = _safe;
        status = AuctionTypes.Status.AwaitingEscrow;
        emit AuctionInitialized(_issuer, _quantity, _reservePrice, _deadline, _safe);
    }

    // ============ Task 2: Escrow confirm ============

    /// @notice Issuer calls after transferring cAsset into this contract.
    ///         Trust-based: we rely on issuer correctness for demo (Opsi X from plan).
    function confirmEscrow() external onlyIssuer onlyAwaitingEscrow {
        status = AuctionTypes.Status.Open;
    }

    // ============ Task 3: submitBid ============

    /// @notice Bidder submits encrypted quantity and price. Deposit (Q×P) locked in cUSD escrow.
    /// @dev    Bidder must call cUSD.setOperator(auctionAddr, deadline) before calling this.
    function submitBid(
        externalEuint256 encQ,
        bytes calldata proofQ,
        externalEuint256 encP,
        bytes calldata proofP
    ) external nonReentrant onlyOpen beforeDeadline onlyVerified {
        require(bids.length < MAX_BIDS, "Max bids reached");
        require(bidderIndex[msg.sender] == 0, "Already bid");

        euint256 handleQ = Nox.fromExternal(encQ, proofQ);
        euint256 handleP = Nox.fromExternal(encP, proofP);
        euint256 intendedDeposit = Nox.mul(handleQ, handleP);

        // Grant contract persistent ACL access — needed to reuse these handles in finalize().
        Nox.allowThis(handleQ);
        Nox.allowThis(handleP);
        Nox.allowThis(intendedDeposit);
        // Grant bidder view access to their own bid (optional convenience for FE self-check).
        Nox.allow(handleQ, msg.sender);
        Nox.allow(handleP, msg.sender);

        // Lock deposit in escrow. NOTE: confidentialTransferFrom NEVER reverts on insufficient
        // balance — ERC7984 uses Nox.safeSub internally and silently moves 0 if underfunded.
        // The RETURN VALUE is the amount actually moved; that's what we must record, not the
        // intended Q×P. Under-funded bids are disqualified later in finalize() via a paidFull gate.
        Nox.allowTransient(intendedDeposit, address(cUSD));
        euint256 actualDeposit = cUSD.confidentialTransferFrom(msg.sender, address(this), intendedDeposit);
        // CUSD/CAsset use ERC7984's OPTIMIZED primitives (_updateWithOptimizedPrimitives), which
        // only grant a TRANSIENT allow on the returned `transferred` handle to the immediate
        // caller (this contract) — never a persistent grant to the bidder. Without this explicit
        // allow, the bidder would have no way to ever verify what was actually deducted from them
        // (relevant precisely because under-funded bids move less than intended — KOREKSI 2).
        Nox.allowThis(actualDeposit);
        Nox.allow(actualDeposit, msg.sender);

        uint256 idx = bids.length;
        bids.push(AuctionTypes.BidRecord({
            bidder: msg.sender,
            bidIndex: idx,
            handleQ: handleQ,
            handleP: handleP,
            handleActualDeposit: actualDeposit,
            claimed: false
        }));
        bidderIndex[msg.sender] = idx + 1; // 1-indexed

        emit BidSubmitted(idx, msg.sender);
    }

    // ============ Task 4: finalize + completeSettlement ============

    /// @notice Finalize the auction: compute encrypted rank-sort, determine allocations,
    ///         and mark the clearing-price handle for public decryption.
    /// @dev    Nox.publicDecrypt is NOT synchronous on-chain — allowPublicDecryption only marks
    ///         a handle; the plaintext + proof are obtained off-chain afterwards (SDK
    ///         handleClient.publicDecrypt) and submitted via completeSettlement(). Status moves
    ///         to PendingReveal here, not Settled.
    function finalize() external onlyIssuer onlyOpen afterDeadline nonReentrant {
        uint256 N = bids.length;
        require(N > 0, "No bids");

        // --- Step A: Build encrypted sort keys ---
        // sortKey[i] = P_i * SCALE + (SCALE - 1 - bidIndex[i])
        // P dominates; tie-break by bidIndex (smaller index = higher sortKey = wins FCFS)
        euint256 encSCALE = Nox.toEuint256(SCALE);
        euint256 encScaleMinus1 = Nox.toEuint256(SCALE - 1);

        euint256[] memory sortKey = new euint256[](N);
        for (uint256 i = 0; i < N; i++) {
            euint256 pScaled = Nox.mul(bids[i].handleP, encSCALE);
            euint256 tieBreak = Nox.sub(encScaleMinus1, Nox.toEuint256(bids[i].bidIndex));
            sortKey[i] = Nox.add(pScaled, tieBreak);
            Nox.allowThis(sortKey[i]); // reused below within this same call — must be allowed
        }

        // --- Step B+C: Compute cumQ[i] = sum of Q_j for all j where sortKey[j] >= sortKey[i] ---
        // Including self. This gives us the cumulative quantity up to and including bid i in sorted order.
        euint256 encZero = Nox.toEuint256(0);
        euint256 encQTotal = Nox.toEuint256(quantity);
        euint256 encReserve = Nox.toEuint256(reservePrice);

        euint256[] memory cumQ = new euint256[](N);
        for (uint256 i = 0; i < N; i++) {
            cumQ[i] = bids[i].handleQ; // include self
            for (uint256 j = 0; j < N; j++) {
                if (j == i) continue;
                // j has strictly higher sortKey → j ranks above i → include j's Q in i's cumQ
                ebool jHigher = Nox.gt(sortKey[j], sortKey[i]);
                euint256 addend = Nox.select(jHigher, bids[j].handleQ, encZero);
                cumQ[i] = Nox.add(cumQ[i], addend);
            }
            Nox.allowThis(cumQ[i]);
        }

        // --- Step D: Compute allocations ---
        euint256[] memory alloc = new euint256[](N);
        for (uint256 i = 0; i < N; i++) {
            euint256 cumAbove = Nox.sub(cumQ[i], bids[i].handleQ); // cumQ excluding self

            // Full winner: cumQ[i] <= Q_total.
            // NOTE: Nox has no boolean AND primitive, so "partial winner" (cumQ[i] > Q_total AND
            // cumAbove < Q_total) is expressed via nested select instead of an explicit AND: when
            // winsFull is false we already know cumQ[i] > Q_total, so the false-branch only needs
            // to test cumAbove < Q_total to distinguish partial winner from loser.
            ebool winsFull = Nox.le(cumQ[i], encQTotal);
            euint256 partialAmount = Nox.sub(encQTotal, cumAbove);
            ebool isPartialWin = Nox.lt(cumAbove, encQTotal);
            euint256 loserOrPartial = Nox.select(isPartialWin, partialAmount, encZero);

            euint256 rawAlloc = Nox.select(winsFull, bids[i].handleQ, loserOrPartial);

            // Reserve price filter: zero out if P < reservePrice
            ebool aboveReserve = Nox.ge(bids[i].handleP, encReserve);
            euint256 gatedAlloc = Nox.select(aboveReserve, rawAlloc, encZero);

            // Anti-shill gate: confidentialTransferFrom in submitBid never reverts on
            // insufficient balance — an under-funded bidder still has a BidRecord with
            // handleActualDeposit < Q×P. Disqualify them here rather than relying on a revert
            // that ERC7984 will never give us.
            euint256 intendedDeposit = Nox.mul(bids[i].handleQ, bids[i].handleP);
            ebool paidFull = Nox.eq(bids[i].handleActualDeposit, intendedDeposit);
            alloc[i] = Nox.select(paidFull, gatedAlloc, encZero);

            Nox.allowThis(alloc[i]);
            Nox.allow(alloc[i], address(this));  // persistent ACL for contract (grantAuditView & rotateHandles)
            Nox.allow(alloc[i], bids[i].bidder); // bidder can view their own allocation

            allocations[bids[i].bidder] = AuctionTypes.AllocationRecord({
                handleQuantity: alloc[i],
                claimed: false
            });
        }

        // --- Step E: Find clearing price = min P among bids with alloc > 0 ---
        euint256 encMaxUint = Nox.toEuint256(type(uint128).max); // large sentinel
        euint256 minWinningP = encMaxUint;
        for (uint256 i = 0; i < N; i++) {
            ebool hasAlloc = Nox.gt(alloc[i], encZero);
            euint256 candidateP = Nox.select(hasAlloc, bids[i].handleP, encMaxUint);
            ebool isSmaller = Nox.lt(candidateP, minWinningP);
            minWinningP = Nox.select(isSmaller, candidateP, minWinningP);
        }
        Nox.allowThis(minWinningP);

        // --- Step F: Mark for reveal (does NOT decrypt here — see completeSettlement) ---
        Nox.allowPublicDecryption(minWinningP);
        clearingPriceHandle = minWinningP;
        status = AuctionTypes.Status.PendingReveal;
        emit RevealRequested();
    }

    /// @notice Consumes the off-chain decryption proof and settles the auction.
    /// @dev    Caller must have first fetched `decryptionProof` off-chain via the SDK's
    ///         handleClient.publicDecrypt(clearingPriceHandle) — the handle only becomes
    ///         decryptable by the gateway once finalize()'s allowPublicDecryption tx is mined.
    ///         Nox.publicDecrypt itself verifies the proof against clearingPriceHandle and
    ///         returns the trusted plaintext — no separate caller-supplied value is needed
    ///         (mirrors ERC20ToERC7984WrapperBase.finalizeUnwrap's single-param pattern).
    /// @param decryptionProof Proof from the Nox gateway, verified on-chain by Nox.publicDecrypt.
    function completeSettlement(bytes calldata decryptionProof) external onlyIssuer onlyPendingReveal {
        clearingPrice = Nox.publicDecrypt(clearingPriceHandle, decryptionProof);
        status = AuctionTypes.Status.Settled;
        emit AuctionSettled(clearingPrice);
    }

    /// @notice Exposes the clearing-price handle so the off-chain SDK can call
    ///         handleClient.publicDecrypt(handle) between finalize() and completeSettlement().
    function getClearingPriceHandle() external view onlyPendingReveal returns (euint256) {
        return clearingPriceHandle;
    }

    // ============ Task 5: claim + withdrawToSafe ============

    /// @notice Unified claim: winners receive cAsset allocation, all bidders get cUSD refund.
    ///         Indistinguishable externally — same function signature for winner and loser.
    function claim() external nonReentrant onlySettled {
        uint256 idx = bidderIndex[msg.sender];
        require(idx > 0, "No bid found");
        require(!allocations[msg.sender].claimed, "Already claimed");

        allocations[msg.sender].claimed = true;
        bids[idx - 1].claimed = true;

        euint256 allocHandle = allocations[msg.sender].handleQuantity;

        // Transfer cAsset allocation (0 for losers — ERC7984 handles zero transfer gracefully).
        // `allocHandle` was computed by THIS contract (in finalize()), so cAsset — which performs
        // the actual Nox.transfer() internally — has never been granted ACL rights to it. The
        // 2-arg confidentialTransfer's `Nox.isAllowed(amount, msg.sender)` check only verifies
        // THIS contract's own right to invoke the transfer; it does not grant cAsset itself
        // access to the handle. Same pattern as `Nox.allowTransient(intendedDeposit, address(cUSD))`
        // before confidentialTransferFrom in submitBid.
        Nox.allowTransient(allocHandle, address(cAsset));
        cAsset.confidentialTransfer(msg.sender, allocHandle);

        // Compute cUSD refund: actualDeposit - (alloc × clearingPrice). Using the ACTUAL locked
        // deposit (not intended Q×P) means an under-funded bidder — who was disqualified in
        // finalize() (alloc = 0) — gets back exactly what was actually taken, no more.
        euint256 encClearingPrice = Nox.toEuint256(clearingPrice);
        euint256 owed = Nox.mul(allocHandle, encClearingPrice);
        Nox.allowThis(owed); // must grant BEFORE reusing `owed` as an input to Nox.sub below —
                              // computing a handle does not implicitly grant the computer access to it
        euint256 depositHandle = bids[idx - 1].handleActualDeposit;
        euint256 refundAmount = Nox.sub(depositHandle, owed);
        Nox.allowThis(refundAmount);

        // Same reasoning as the cAsset transfer above: cUSD needs its own ACL grant on this
        // freshly-computed handle before it can use it internally.
        Nox.allowTransient(refundAmount, address(cUSD));
        cUSD.confidentialTransfer(msg.sender, refundAmount);

        emit Claimed(msg.sender);
    }

    /// @notice Issuer withdraws all remaining cUSD (settlement revenue) to Safe.
    ///         Call after all bidders have claimed.
    function withdrawToSafe() external nonReentrant onlyIssuer onlySettled {
        euint256 balance = cUSD.confidentialBalanceOf(address(this));
        Nox.allowThis(balance);
        cUSD.confidentialTransfer(safe, balance);
        emit WithdrawnToSafe(safe);
    }

    // ============ Task M3.1: grantAuditView + rotateHandles ============

    /// @notice Grants an auditor decryption access to a bidder's allocation handle.
    ///         The auditor can then call handleClient.decrypt(handle) off-chain with their own key.
    function grantAuditView(address bidder, address auditor) external onlyIssuer onlySettled {
        euint256 handle = allocations[bidder].handleQuantity;
        require(Nox.isInitialized(handle), "No allocation");
        Nox.allow(handle, auditor);
        emit AuditGranted(bidder, auditor);
    }

    /// @notice Re-randomizes every bidder's allocation handle with a fresh ACL: past auditors
    ///         (granted via grantAuditView) lose access to the NEW handle — they can still decrypt
    ///         the OLD handle value if they captured it before rotation, but the contract no longer
    ///         references it. Each bidder is re-granted access to their own new handle so they
    ///         remain able to view their own allocation after rotation.
    /// @dev    `Nox.add(oldHandle, 0)` produces a handle with the SAME plaintext value but a fresh
    ///         TEE-issued identifier — ACL is per-handle, not per-value, so the new handle starts
    ///         with an empty ACL until explicitly granted below.
    function rotateHandles() external onlyIssuer onlySettled {
        euint256 zero = Nox.toEuint256(0);
        uint256 N = bids.length;
        for (uint256 i = 0; i < N; i++) {
            address bidder = bids[i].bidder;
            euint256 oldHandle = allocations[bidder].handleQuantity;
            euint256 newHandle = Nox.add(oldHandle, zero);
            Nox.allowThis(newHandle);
            Nox.allow(newHandle, address(this));
            Nox.allow(newHandle, bidder);
            allocations[bidder].handleQuantity = newHandle;
        }
        emit HandlesRotated(block.timestamp);
    }
}
