(function () {
  const TAG = ' | InjectedScript | ';
  const VERSION = '0.0.3';
  console.log('**** DEGEN Injection script ****:', VERSION);

  // Prevent multiple injections
  if (window.degenInjected) {
    return;
  }
  window.degenInjected = true;

  const SITE_URL = window.location.href;
  const SOURCE_INFO = {
    siteUrl: SITE_URL,
    scriptSource: 'DEGEN Extension',
    version: VERSION,
    injectedTime: new Date().toISOString(),
  };
  console.log('SOURCE_INFO:', SOURCE_INFO);

  let messageId = 0;
  const callbacks = {};
  const messageQueue = [];

  function processQueue(requestInfo, callback) {
    for (let i = 0; i < messageQueue.length; i++) {
      const queuedMessage = messageQueue[i];
      if (queuedMessage.id === requestInfo.id) {
        callback(null, queuedMessage.result);
        messageQueue.splice(i, 1);
        return true;
      }
    }
    return false;
  }

  function walletRequest(method, params = [], chain, callback) {
    const tag = TAG + ' | walletRequest | ';
    try {
      const requestId = ++messageId;
      const requestInfo = {
        id: requestId,
        method,
        params,
        chain,
        siteUrl: SOURCE_INFO.siteUrl,
        scriptSource: SOURCE_INFO.scriptSource,
        version: SOURCE_INFO.version,
        requestTime: new Date().toISOString(),
        referrer: document.referrer,
        href: window.location.href,
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        language: navigator.language,
      };

      callbacks[requestId] = { callback };

      window.postMessage(
          {
            source: 'degen-injected',
            type: 'WALLET_REQUEST',
            requestId,
            requestInfo,
          },
          '*',
      );

      processQueue(requestInfo, callback);
    } catch (error) {
      console.error(tag, `Error in walletRequest:`, error);
      callback(error);
    }
  }

  window.addEventListener('message', event => {
    const tag = TAG + ' | window.message | ';
    if (event.source !== window) return;
    if (event.data && event.data.source === 'degen-content' && event.data.type === 'WALLET_RESPONSE') {
      const { requestId, result, error } = event.data;
      const storedCallback = callbacks[requestId];
      if (storedCallback) {
        if (error) {
          storedCallback.callback(error);
        } else {
          storedCallback.callback(null, result);
        }
        delete callbacks[requestId];
      } else {
        console.warn(tag, 'No callback found for requestId:', requestId);
      }
    }
  });

  function sendRequestAsync(payload, param1, callback) {
    const tag = TAG + ' | sendRequestAsync | ';
    let chain = payload.chain || 'solana';

    if (typeof callback === 'function') {
      walletRequest(payload.method, payload.params, chain, (error, result) => {
        if (error) {
          callback(error);
        } else {
          callback(null, { id: payload.id, jsonrpc: '2.0', result });
        }
      });
    } else {
      console.error(tag, 'Callback is not a function:', callback);
    }
  }

  function sendRequestSync(payload, param1) {
    const tag = TAG + ' | sendRequestSync | ';
    let params = payload.params || param1;
    let method = payload.method || payload;
    let chain = payload.chain || 'solana';

    return {
      id: payload.id,
      jsonrpc: '2.0',
      result: walletRequest(method, params, chain, () => {}),
    };
  }

  function createWalletObject(chain) {
    console.log('Creating wallet object for chain:', chain);
    let wallet = {
      network: 'mainnet',
      publicKey: '4RHBMMWDJDz3PnAZe8Yn4xH1krSqapMdXKXjJQgnayyk',
      isDEGEN: true,
      isPhantom: true,
      isConnected: true,
      connect: () => {
        return new Promise((resolve, reject) => {
          try {
            // Simulate the connection process (replace with actual connection logic)
            wallet.isConnected = true;
            console.log('Connected to the wallet on chain:', chain);
            resolve(wallet);
          } catch (error) {
            console.error('Error connecting wallet:', error);
            reject(error);
          }
        });
      },
      request: ({ method, params }) => {
        return new Promise((resolve, reject) => {
          walletRequest(method, params, chain, (error, result) => {
            if (error) {
              reject(error);
            } else {
              resolve(result);
            }
          });
        });
      },
      send: (payload, param1, callback) => {
        if (!payload.chain) {
          payload.chain = chain;
        }
        return callback ? sendRequestAsync(payload, param1, callback) : sendRequestSync(payload, param1);
      },
      sendAsync: (payload, param1, callback) => {
        if (!payload.chain) {
          payload.chain = chain;
        }
        return sendRequestAsync(payload, param1, callback);
      },
      on: (event, handler) => {
        window.addEventListener(event, handler);
      },
      removeListener: (event, handler) => {
        window.removeEventListener(event, handler);
      },
      removeAllListeners: () => {
        // Implement as needed
      },
    };
    return wallet;
  }

  function announceProvider(solanaProvider) {
    const info = {
      uuid: '350670db-19fa-4704-a166-e52e178b59d4',
      name: 'DEGEN Client',
      icon: 'https://pioneers.dev/coins/degen.png',
      rdns: 'com.degen',
    };

    const announceEvent = new CustomEvent('eip6963:announceProvider', {
      detail: { info, provider: solanaProvider },
    });

    console.log(TAG, 'Dispatching provider event with correct detail:', announceEvent);
    window.dispatchEvent(announceEvent);
  }

  function mountWallet() {
    const tag = TAG + ' | window.wallet | ';

    // Create wallet objects for Solana
    const solana = createWalletObject('solana');

    const phantom = {
      solana: createWalletObject('solana'),
    };

    const degen = {
      solana: createWalletObject('solana'),
    };

    const handler = {
      get: function (target, prop, receiver) {
        return Reflect.get(target, prop, receiver);
      },
      set: function (target, prop, value) {
        return Reflect.set(target, prop, value);
      },
    };

    const proxySolana = new Proxy(solana, handler);
    const proxyDEGEN = new Proxy(degen, handler);

    const userOverrideSetting = true;
    if (userOverrideSetting) {
      if (typeof window.solana === 'undefined') {
        try {
          Object.defineProperty(window, 'solana', {
            value: proxySolana,
            writable: false,
            configurable: false,
          });
        } catch (e) {
          console.error('Failed to mount window.solana');
        }
      }
    }

    if (typeof window.phantom === 'undefined') {
      try {
        Object.defineProperty(window, 'phantom', {
          value: proxyDEGEN,
          writable: false,
          configurable: false,
        });
      } catch (e) {
        console.error('Failed to mount degen');
      }
    }

    if (typeof window.degen === 'undefined') {
      try {
        Object.defineProperty(window, 'degen', {
          value: proxyDEGEN,
          writable: false,
          configurable: false,
        });
      } catch (e) {
        console.error('Failed to mount degen');
      }
    }

    console.log(tag, 'window.solana and window.degen have been mounted');

    announceProvider(proxySolana);

    window.addEventListener('message', event => {
      const tag = TAG + ' | window.message | ';
      if (event.source !== window) return;
      if (event.data.type === 'ANNOUNCE_REQUEST') {
        console.log(tag, 'Received ANNOUNCE_REQUEST');
        announceProvider(proxySolana);
      }
    });
  }

  mountWallet();
  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    mountWallet();
  } else {
    document.addEventListener('DOMContentLoaded', mountWallet);
  }
})();
