//@ts-ignore
import { v4 as uuidv4 } from 'uuid';
import { handleSolanaRequest } from './chains/ethereumHandler';


const TAG = ' | METHODS | ';
// const DOMAIN_WHITE_LIST = [];

let isPopupOpen = false; // Flag to track popup state

const openPopup = function () {
    const tag = TAG + ' | openPopup | ';
    try {
        console.log(tag, 'Opening popup');
        chrome.windows.create(
            {
                url: chrome.runtime.getURL('popup/index.html'), // Adjust the URL to your popup file
                type: 'popup',
                width: 360,
                height: 900,
            },
            window => {
                if (chrome.runtime.lastError) {
                    console.error('Error creating popup:', chrome.runtime.lastError);
                    isPopupOpen = false;
                } else {
                    console.log('Popup window created:', window);
                }
            },
        );
    } catch (e) {
        console.error(tag, e);
    }
};

const requireApproval = async function (networkId, requestInfo, chain, method, params, KEEPKEY_WALLET) {
    const tag = TAG + ' | requireApproval | ';
    try {
        isPopupOpen = true;
        console.log(tag, 'networkId:', networkId);



        const event = {
            id: requestInfo.id || uuidv4(),
            networkId,
            chain,
            href: requestInfo.href,
            language: requestInfo.language,
            platform: requestInfo.platform,
            referrer: requestInfo.referrer,
            requestTime: requestInfo.requestTime,
            scriptSource: requestInfo.scriptSource,
            siteUrl: requestInfo.siteUrl,
            userAgent: requestInfo.userAgent,
            injectScriptVersion: requestInfo.version,
            requestInfo,
            type: method,
            request: params,
            status: 'request',
            timestamp: new Date().toISOString(),
        };
        console.log(tag, 'Requesting approval for event:', event);
        // const eventSaved = await requestStorage.addEvent(event);
        // if (eventSaved) {
        //     chrome.runtime.sendMessage({
        //         action: 'TRANSACTION_CONTEXT_UPDATED',
        //         id: event.id,
        //     });
        //     console.log(tag, 'Event saved:', event);
        // } else {
        //     throw new Error('Event not saved');
        // }
        openPopup();

        // Wait for user's decision and return the result
        return new Promise(resolve => {
            const listener = (message, sender, sendResponse) => {
                if (message.action === 'degen_sign_response' && message.response.eventId === event.id) {
                    console.log(tag, 'Received degen_sign_response for event:', message.response.eventId);
                    chrome.runtime.onMessage.removeListener(listener);
                    if (message.response.decision === 'accept') {
                        resolve({ success: true });
                    } else {
                        resolve({ success: false });
                    }
                }
            };
            chrome.runtime.onMessage.addListener(listener);
        });
    } catch (e) {
        console.error(tag, e);
        return { success: false }; // Return failure in case of error
    }
};

interface ProviderRpcError extends Error {
    code: number;
    data?: unknown;
}

export const createProviderRpcError = (code: number, message: string, data?: unknown): ProviderRpcError => {
    const error = new Error(message) as ProviderRpcError;
    error.code = code;
    if (data) error.data = data;
    return error;
};

export const handleWalletRequest = async (
    requestInfo: any,
    chain: string,
    method: string,
    params: any[],
    DEGEN_WALLET: any,
    ADDRESS: string,
): Promise<any> => {
    const tag = ' | handleWalletRequest | ';
    try {
        console.log(tag, 'id:', requestInfo.id);
        console.log(tag, 'chain:', chain);
        console.log(tag, 'params:', params);
        console.log(tag, 'requestInfo:', requestInfo);
        console.log(tag, 'DEGEN_WALLET:', DEGEN_WALLET);
        if (!chain) throw Error('Chain not provided!');
        if (!requestInfo) throw Error('Cannot validate request! Refusing to proceed.');

        switch (chain) {
            case 'solana': {
                return await handleSolanaRequest(method, params, requestInfo, ADDRESS, DEGEN_WALLET, requireApproval);
                break;
            }
            default: {
                console.log(tag, `Chain ${chain} not supported`);
                throw createProviderRpcError(4200, `Chain ${chain} not supported`);
            }
        }
    } catch (error) {
        console.error(tag, `Error processing method ${method}:`, error);
        if ((error as ProviderRpcError).code && (error as ProviderRpcError).message) {
            throw error;
        } else {
            throw createProviderRpcError(4000, `Unexpected error processing method ${method}`, error);
        }
    }
};
