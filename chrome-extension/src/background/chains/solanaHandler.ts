export const SOLANA_SIGNING_METHODS = {
    SOLANA_SIGN_TRANSACTION: 'solana_signTransaction',
    SOLANA_SIGN_MESSAGE: 'solana_signMessage',
    SOLANA_SIGN_AND_SEND_TRANSACTION: 'solana_signAndSendTransaction',
    SOLANA_SIGN_ALL_TRANSACTIONS: 'solana_signAllTransactions',
};

const TAG = ' | solanaHandler | ';

import { Connection, Transaction } from '@solana/web3.js';


interface ProviderRpcError extends Error {
    code: number;
    data?: unknown;
}

export const createProviderRpcError = (
    code: number,
    message: string,
    data?: unknown
): ProviderRpcError => {
    const error = new Error(message) as ProviderRpcError;
    error.code = code;
    if (data) error.data = data;
    return error;
};

export const handleSolanaRequest = async (
    method: string,
    params: any[],
    requestInfo: any,
    ADDRESS: string,
    DEGEN_WALLET: any,
    requireApproval: (
        networkId: string,
        requestInfo: any,
        chain: any,
        method: string,
        params: any
    ) => Promise<void>,
    connection: Connection
): Promise<any> => {
    const tag = TAG + ' | handleSolanaRequest | ';
    console.log(tag, 'method:', method);
    console.log(tag, 'params:', params);

    switch (method) {
        case 'request_accounts':
        case 'connect': {
            // Return the connected address
            return [ADDRESS];
        }

        case 'disconnect': {
            // Handle disconnect request
            // For our handler, perhaps nothing to do
            return true;
        }

        case SOLANA_SIGNING_METHODS.SOLANA_SIGN_TRANSACTION: {
            const transactionData = params[0]; // Base64-encoded transaction

            await requireApproval('solana', requestInfo, 'solana', method, params);

            // Use DEGEN_WALLET to sign the transaction
            const signedTransactionResponse = await DEGEN_WALLET.signTransaction({
                transaction: transactionData,
            });

            // Return the signed transaction serialized as Base64
            return signedTransactionResponse.transaction;
        }

        case SOLANA_SIGNING_METHODS.SOLANA_SIGN_MESSAGE: {
            const message = params[0]; // String message

            await requireApproval('solana', requestInfo, 'solana', method, params);

            // Use DEGEN_WALLET to sign the message
            const signedMessageResponse = await DEGEN_WALLET.signMessage({
                message: message,
            });

            // Return the signature and publicKey
            return signedMessageResponse;
        }

        case SOLANA_SIGNING_METHODS.SOLANA_SIGN_AND_SEND_TRANSACTION: {
            const transactionData = params[0]; // Base64-encoded transaction

            await requireApproval('solana', requestInfo, 'solana', method, params);

            // Use DEGEN_WALLET to sign and send the transaction
            const signedTransactionResponse = await DEGEN_WALLET.signAndSendTransaction(
                {
                    transaction: transactionData,
                },
                'mainnet-beta' // Replace with appropriate chainId if necessary
            );

            // Return the transaction signature (txid)
            return signedTransactionResponse.signature;
        }

        case SOLANA_SIGNING_METHODS.SOLANA_SIGN_ALL_TRANSACTIONS: {
            const transactionsData = params[0]; // Array of Base64-encoded transactions

            await requireApproval('solana', requestInfo, 'solana', method, params);

            // Use DEGEN_WALLET to sign all transactions
            const signedTransactionsResponse = await DEGEN_WALLET.signAllTransactions({
                transactions: transactionsData,
            });

            // Return the array of signed transactions serialized as Base64
            return signedTransactionsResponse.transactions;
        }

        default: {
            console.log(tag, `Method ${method} not supported`);
            throw createProviderRpcError(4200, `Method ${method} not supported`);
        }
    }
};
