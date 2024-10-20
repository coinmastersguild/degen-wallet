import 'webextension-polyfill';
import { exampleThemeStorage } from '@extension/storage';
import SolanaLib from './wallet'; // Adjust the path as per your project structure
import { handleWalletRequest } from './methods';
// import * as bip39 from 'bip39';
// import { derivePath } from 'ed25519-hd-key';

// Example Theme Storage
exampleThemeStorage.get().then((theme) => {
  console.log('Theme:', theme);
}).catch((err) => {
  console.error('Error fetching theme:', err);
});

// Wallet Initialization

// let TEST_SEED = 'alcohol woman abuse must during monitor noble actual mixed trade anger aisle';
//
// // Generate seed buffer from mnemonic
// const seed = bip39.mnemonicToSeedSync(TEST_SEED);
//
// // Derive keypair using Solana derivation path
// const derivationPath = "m/44'/501'/0'/0'"; // Solana default derivation path used by Phantom
// const derivedSeed = derivePath(derivationPath, seed.toString('hex')).key;
//

// Initialize SolanaLib with the derived secret key
// const solanaWallet = SolanaLib.init({ secretKey: derivedSeed });

const solanaWallet = SolanaLib.init({});
const APP = solanaWallet;
let ADDRESS: string;

solanaWallet.getAddress().then((address: string) => {
  console.log('Solana Address:', address);
  ADDRESS = address;
}).catch((err: Error) => {
  console.error('Error loading Solana address:', err);
});

console.log('Background script loaded');
console.log("Edit 'chrome-extension/src/background/index.ts' and save to reload.");

// Provider Handling
chrome.runtime.onMessage.addListener((message: any, sender: any, sendResponse: any) => {
  (async () => {
    const tag = ' | chrome.runtime.onMessage | ';
    console.log(tag, 'Received message:', message);

    try {
      switch (message.type) {
        case 'WALLET_REQUEST': {
          const { requestInfo } = message;
          const { method, params, chain } = requestInfo;

          if (method) {
            try {
              const result = await handleWalletRequest(requestInfo, chain, method, params, APP, ADDRESS);
              sendResponse({ result });
            } catch (error: any) {
              sendResponse({ error: error.message });
            }
          } else {
            sendResponse({ error: 'Invalid request: missing method' });
          }
          break;
        }
        default: {
          sendResponse({ error: 'Invalid request: unknown type' });
          break;
        }
      }
    } catch (error: any) {
      console.error('Error handling message:', error);
      sendResponse({ error: error.message });
    }
  })();

  // Return true to indicate that the response will be sent asynchronously
  return true;
});
