import { Clarinet, Tx, Chain, Account, types } from "https://deno.land/x/clarinet@v1.5.4/index.ts";

Clarinet.test({
  name: "Initial deposit mints shares equal to dx+dy and sets reserves",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get("deployer")!;
    const w1 = accounts.get("wallet_1")!;

    let block = chain.mineBlock([
      Tx.contractCall("token-a", "mint", [types.principal(w1.address), types.uint(1_000_000)], deployer.address),
      Tx.contractCall("token-b", "mint", [types.principal(w1.address), types.uint(1_000_000)], deployer.address),
      Tx.contractCall("liquidity-vault", "deposit-initial", [types.uint(1000), types.uint(2000)], w1.address),
    ]);

    block.receipts[2].result.expectOk().expectUint(3000);

    // check reserves via read-only
    let reserves = chain.callReadOnlyFn("liquidity-vault", "get-reserves", [], w1.address);
    reserves.result.expectTuple()["a"].expectUint(1000);
    reserves.result.expectTuple()["b"].expectUint(2000);

    let shares = chain.callReadOnlyFn("liquidity-vault", "get-shares-of", [types.principal(w1.address)], w1.address);
    shares.result.expectUint(3000);
  },
});

Clarinet.test({
  name: "Balanced deposit mints proportional shares",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get("deployer")!;
    const w1 = accounts.get("wallet_1")!;

    chain.mineBlock([
      Tx.contractCall("token-a", "mint", [types.principal(w1.address), types.uint(10_000)], deployer.address),
      Tx.contractCall("token-b", "mint", [types.principal(w1.address), types.uint(10_000)], deployer.address),
      Tx.contractCall("liquidity-vault", "deposit-initial", [types.uint(1000), types.uint(2000)], w1.address),
    ]);

    // ratio is 1:2 (a:b). deposit 500 a and 1000 b
    let block = chain.mineBlock([
      Tx.contractCall("liquidity-vault", "deposit-balanced", [types.uint(500), types.uint(1000)], w1.address),
    ]);
    block.receipts[0].result.expectOk().expectUint(1500);

    let shares = chain.callReadOnlyFn("liquidity-vault", "get-shares-of", [types.principal(w1.address)], w1.address);
    shares.result.expectUint(4500); // 3000 + 1500

    let reserves = chain.callReadOnlyFn("liquidity-vault", "get-reserves", [], w1.address);
    reserves.result.expectTuple()["a"].expectUint(1500);
    reserves.result.expectTuple()["b"].expectUint(3000);
  },
});

Clarinet.test({
  name: "Deposit-for credits recipient's shares and uses sender's funds",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get("deployer")!;
    const w1 = accounts.get("wallet_1")!;
    const w2 = accounts.get("wallet_2")!;

    chain.mineBlock([
      Tx.contractCall("token-a", "mint", [types.principal(w2.address), types.uint(10_000)], deployer.address),
      Tx.contractCall("token-b", "mint", [types.principal(w2.address), types.uint(10_000)], deployer.address),
      Tx.contractCall("liquidity-vault", "deposit-initial", [types.uint(1000), types.uint(1000)], w1.address),
    ]);

    // pool ratio 1:1 now; w2 deposits for w1
    let block = chain.mineBlock([
      Tx.contractCall("liquidity-vault", "deposit-for", [types.principal(w1.address), types.uint(250), types.uint(250)], w2.address),
    ]);
    block.receipts[0].result.expectOk().expectUint(250);

    let shares1 = chain.callReadOnlyFn("liquidity-vault", "get-shares-of", [types.principal(w1.address)], w1.address);
    shares1.result.expectUint(1250);

    let shares2 = chain.callReadOnlyFn("liquidity-vault", "get-shares-of", [types.principal(w2.address)], w2.address);
    shares2.result.expectUint(0);
  },
});

Clarinet.test({
  name: "Bad ratio is rejected",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get("deployer")!;
    const w1 = accounts.get("wallet_1")!;

    chain.mineBlock([
      Tx.contractCall("token-a", "mint", [types.principal(w1.address), types.uint(10_000)], deployer.address),
      Tx.contractCall("token-b", "mint", [types.principal(w1.address), types.uint(10_000)], deployer.address),
      Tx.contractCall("liquidity-vault", "deposit-initial", [types.uint(1000), types.uint(2000)], w1.address),
    ]);

    // try to deposit off-ratio: 100 a, 100 b (should be ~200 b)
    let block = chain.mineBlock([
      Tx.contractCall("liquidity-vault", "deposit-balanced", [types.uint(100), types.uint(100)], w1.address),
    ]);
    block.receipts[0].result.expectErr().expectUint(12);
  },
});

Clarinet.test({
  name: "Withdraw burns shares and returns proportional tokens",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get("deployer")!;
    const w1 = accounts.get("wallet_1")!;

    chain.mineBlock([
      Tx.contractCall("token-a", "mint", [types.principal(w1.address), types.uint(10_000)], deployer.address),
      Tx.contractCall("token-b", "mint", [types.principal(w1.address), types.uint(10_000)], deployer.address),
      Tx.contractCall("liquidity-vault", "deposit-initial", [types.uint(1000), types.uint(2000)], w1.address),
    ]);

    // withdraw half the shares
    let block = chain.mineBlock([
      Tx.contractCall("liquidity-vault", "withdraw", [types.uint(1500)], w1.address),
    ]);

    const res = block.receipts[0].result.expectOk().expectTuple();
    res["a"].expectUint(500);
    res["b"].expectUint(1000);

    let shares = chain.callReadOnlyFn("liquidity-vault", "get-shares-of", [types.principal(w1.address)], w1.address);
    shares.result.expectUint(1500);

    let reserves = chain.callReadOnlyFn("liquidity-vault", "get-reserves", [], w1.address);
    reserves.result.expectTuple()["a"].expectUint(500);
    reserves.result.expectTuple()["b"].expectUint(1000);
  },
});
