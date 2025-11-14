(function(){
  const { AppConfig, UserSession, showConnect } = window.connect;
  const { openContractCall, callReadOnlyFunction, uintCV, principalCV, standardPrincipalCV } = window.transactions;
  const { StacksDevnet } = window.network;

  const S = sel => document.querySelector(sel);
  const L = msg => (S('#log').textContent += `\n${msg}`);

  const appConfig = new AppConfig(['store_write']);
  const userSession = new UserSession({ appConfig });

  const net = () => new StacksDevnet({ url: S('#api').value || 'http://127.0.0.1:3999' });
  const contract = (name) => ({ address: S('#deployer').value.trim(), name });

  S('#connect').onclick = () => showConnect({
    appDetails: { name: 'Cool Liquidity Vault v2', icon: window.location.origin + '/favicon.ico' },
    userSession,
    onFinish: () => {
      const stxAddr = userSession.loadUserData()?.profile?.stxAddress?.testnet;
      S('#addr').textContent = stxAddr || 'connected';
    },
  });

  async function ro(name, fn, args) {
    const c = contract(name);
    const res = await callReadOnlyFunction({
      network: net(),
      contractAddress: c.address,
      contractName: c.name,
      functionName: fn,
      functionArgs: args,
      senderAddress: S('#deployer').value.trim() || ''
    });
    return res;
  }

  async function call(name, fn, args) {
    const c = contract(name);
    await openContractCall({
      network: net(),
      contractAddress: c.address,
      contractName: c.name,
      functionName: fn,
      functionArgs: args,
      appDetails: { name: 'Cool Liquidity Vault v2', icon: window.location.origin + '/favicon.ico' },
      onFinish: data => L(`Tx: ${data.txId}`),
      onCancel: () => L('Cancelled'),
    });
  }

  async function refresh() {
    try {
      const res = await ro('liquidity-vault', 'get-reserves', []);
      const ts = await ro('liquidity-vault', 'get-total-shares', []);
      const a = res.value?.value?.a?.value || 0n;
      const b = res.value?.value?.b?.value || 0n;
      const t = ts.value?.value || 0n;
      S('#pool').textContent = `reserves: A=${a} B=${b} | total shares: ${t}`;
      S('#hint').textContent = a > 0n ? `Hint: dy ≈ dx * B/A to maintain ratio` : 'Initialize the pool with deposit-initial.';
    } catch (e) { L(e.message); }
  }

  S('#refresh').onclick = refresh;
  S('#calc').onclick = async () => {
    try {
      const dx = BigInt(S('#dx').value || '0');
      const res = await ro('liquidity-vault', 'get-reserves', []);
      const a = res.value?.value?.a?.value || 0n;
      const b = res.value?.value?.b?.value || 0n;
      if (a === 0n) { S('#note').textContent = 'Pool not initialized.'; return; }
      const dy = (dx * b) / a;
      S('#dy').value = dy.toString();
      S('#note').textContent = `Suggested dy: ${dy}`;
    } catch (e) { L(e.message); }
  };

  S('#init').onclick = async () => {
    const dx = BigInt(S('#dx').value || '0');
    const dy = BigInt(S('#dy').value || '0');
    await call('liquidity-vault', 'deposit-initial', [uintCV(dx), uintCV(dy)]);
  };

  S('#deposit').onclick = async () => {
    const dx = BigInt(S('#dx').value || '0');
    const dy = BigInt(S('#dy').value || '0');
    await call('liquidity-vault', 'deposit-balanced', [uintCV(dx), uintCV(dy)]);
  };

  S('#depositFor').onclick = async () => {
    const dx = BigInt(S('#dx').value || '0');
    const dy = BigInt(S('#dy').value || '0');
    const rcpt = S('#rcpt').value.trim();
    if (!rcpt) { S('#note').textContent = 'Enter recipient principal'; return; }
    await call('liquidity-vault', 'deposit-for', [standardPrincipalCV(rcpt), uintCV(dx), uintCV(dy)]);
  };

  S('#withdraw').onclick = async () => {
    const burn = BigInt(S('#burn').value || '0');
    await call('liquidity-vault', 'withdraw', [uintCV(burn)]);
  };

  // initial
  refresh();
})();
