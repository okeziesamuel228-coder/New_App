(function(){
  const { AppConfig, UserSession, showConnect } = window.connect;
  const { openContractCall, callReadOnlyFunction, standardPrincipalCV, contractPrincipalCV, uintCV, noneCV } = window.transactions;
  const { StacksDevnet } = window.network;

  const log = (msg) => {
    const el = document.getElementById('log');
    el.textContent += `\n${msg}`;
  };

  const appConfig = new AppConfig(['store_write']);
  const userSession = new UserSession({ appConfig });

  const getNetwork = () => {
    const api = document.getElementById('api').value || 'http://127.0.0.1:3999';
    const net = new StacksDevnet({ url: api });
    return net;
  };

  const getContractIdent = (name) => {
    const deployer = document.getElementById('deployer').value.trim();
    if (!deployer) throw new Error('Enter deployer address');
    return { address: deployer, name };
  };

  document.getElementById('connect').onclick = () => {
    showConnect({
      appDetails: { name: 'Cool Liquidity Vault', icon: window.location.origin + '/favicon.ico' },
      userSession,
      onFinish: () => {
        const stxAddr = userSession.loadUserData()?.profile?.stxAddress?.testnet;
        document.getElementById('addr').textContent = stxAddr || 'connected';
      }
    });
  };

  async function call(name, functionName, args) {
    const net = getNetwork();
    const { address, name: contractName } = getContractIdent(name);
    await openContractCall({
      network: net,
      contractAddress: address,
      contractName,
      functionName,
      functionArgs: args,
      appDetails: { name: 'Cool Liquidity Vault', icon: window.location.origin + '/favicon.ico' },
      onFinish: data => log(`Tx submitted: ${data.txId}`),
      onCancel: () => log('Cancelled')
    });
  }

  document.getElementById('btn-init').onclick = async () => {
    try {
      const dx = BigInt(document.getElementById('dx0').value || '0');
      const dy = BigInt(document.getElementById('dy0').value || '0');
      await call('liquidity-vault', 'deposit-initial', [uintCV(dx), uintCV(dy)]);
    } catch (e) { log(e.message); }
  };

  document.getElementById('btn-deposit').onclick = async () => {
    try {
      const dx = BigInt(document.getElementById('dx').value || '0');
      const dy = BigInt(document.getElementById('dy').value || '0');
      await call('liquidity-vault', 'deposit-balanced', [uintCV(dx), uintCV(dy)]);
    } catch (e) { log(e.message); }
  };

  document.getElementById('btn-withdraw').onclick = async () => {
    try {
      const burn = BigInt(document.getElementById('burn').value || '0');
      await call('liquidity-vault', 'withdraw', [uintCV(burn)]);
    } catch (e) { log(e.message); }
  };
})();
