# Cool Liquidity Vault — Documentary

This project implements a unique, two‑token liquidity vault built in Clarity, complete with a comprehensive test suite and two UI versions (an initial functional UI and a redesigned v2 focusing on UX). It showcases a small but complete product loop: protocol smart contracts, tests, and real user interactions.

## What makes it unique
- Balanced, two‑token vault with LP shares
- A set of deposit flows:
  - deposit-initial: initialize the pool with the first liquidity
  - deposit-balanced: add liquidity while maintaining pool ratio
  - deposit-for: add liquidity on behalf of another principal
- Withdraw to redeem proportional amounts
- UI v1 (functional minimal) and UI v2 (redesigned, with live pool guidance)

These go beyond a trivial read-only call or a single UI button and constitute meaningful, test‑covered functionality.

## Contract overview
- contracts/token-a.clar and contracts/token-b.clar
  - Minimal SIP‑010-like fungible tokens for local testing.
  - Functions: mint, transfer, get-balance, get-total-supply.
- contracts/liquidity-vault.clar
  - Tracks reserves for token A and B and total LP shares.
  - Functions:
    - deposit-initial(dx, dy): first liquidity provider sets baseline ratio; mints shares = dx+dy
    - deposit-balanced(dx, dy): requires deposits match the existing ratio (±1%); mints shares proportionally
    - deposit-for(recipient, dx, dy): same as balanced deposit but credits shares to the recipient
    - withdraw(burn): burns LP shares and returns proportional amounts of A and B
  - Read‑only helpers: get-reserves, get-total-shares, get-shares-of

## Tests (Clarinet)
Located in tests/deposit_test.ts, covering:
- Initial deposit setup and accounting
- Balanced deposits minting expected shares
- deposit-for credits recipient
- Off‑ratio deposits are rejected
- Withdraw burns shares and returns tokens proportionally

### Running tests
1. Install Clarinet if needed: https://docs.hiro.so/clarity/clarinet
2. From the project root, run:
   - clarinet test

## UIs
Two static UIs are provided:
- ui-v1: Minimal functional UI to connect and call deposit/withdraw
- ui-v2: Redesigned UI showing live reserves, suggesting dy for a chosen dx, and supporting deposit‑for

### Using the UIs (with Clarinet devnet)
1. Start Clarinet devnet in another terminal:
   - clarinet integrate
   - Note the Devnet API endpoint (default http://127.0.0.1:3999) and the deployer address shown by Clarinet.
2. Serve the UI files (for example):
   - python3 -m http.server 8080
   - Then navigate to http://localhost:8080/ui-v2/ (or ui-v1)
3. In the UI:
   - Paste the deployer address into the Deployer field.
   - Keep API as http://127.0.0.1:3999 (unless you chose a different port).
   - Connect wallet (Hiro Wallet). Ensure your wallet is set to Devnet.
   - Use Deposit Initial to seed the pool.
   - Use Deposit Balanced for subsequent deposits (v2 can suggest dy from ratio).
   - Use Withdraw to redeem LP shares.

Tip: Before deposits, mint test tokens to the wallet principals using Clarinet console or by adding mint transactions in tests/fixtures.

## Architecture summary
- Vault does not perform swaps; it focuses on ratio‑guided dual‑asset deposits and proportional redemptions.
- Shares are internal accounting units (no separate FT minted), which simplifies UX and accounting for this demo.
- The ratio check enforces near‑balanced deposits while allowing 1% tolerance.

## Future enhancements
- Real SIP‑010 FTs with metadata and proper ownership controls for minting (these tokens are intentionally permissive for local tests).
- Single‑sided “zap” deposit with on‑chain quote and fee.
- Emit events for deposits/withdrawals to enhance indexer UX.
- Production-ready UI with balances, allowance flows, and transaction history.

## How to customize
- Tweak tolerance in liquidity-vault.clar (ratio-within function) to allow tighter or looser balance requirements.
- Switch token-a/token-b implementations with your real SIP‑010 tokens and update Clarinet.toml accordingly.
- Extend tests with additional edge cases (e.g., rounding behavior) and multiple users.
