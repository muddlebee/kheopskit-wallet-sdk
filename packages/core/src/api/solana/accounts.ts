import type {
  SolanaAccount,
  SolanaInjectedWallet,
  SolanaWallet,
} from "@/api/types";
import { getWalletAccountId } from "@/utils";
import { getCachedObservable$ } from "@/utils/getCachedObservable";
import type { WalletAccount as StandardWalletAccount } from "@wallet-standard/base";
import {
  Observable,
  combineLatest,
  distinctUntilChanged,
  map,
  of,
  shareReplay,
  switchMap,
} from "rxjs";

const getInjectedWalletAccounts$ = (
  wallet: SolanaInjectedWallet,
): Observable<SolanaAccount[]> => {
  if (!wallet.isConnected) return of([]);

  return getCachedObservable$(`accounts:solana:${wallet.id}`, () =>
    new Observable<SolanaAccount[]>((subscriber) => {
      const mapAccount = (account: StandardWalletAccount): SolanaAccount => {
        // Create signMessage function using the wallet's solana:signMessage feature
        const signMessage = async (message: Uint8Array): Promise<Uint8Array> => {
          // Check if wallet supports message signing
          if (!("solana:signMessage" in wallet.wallet.features)) {
            throw new Error(
              `Wallet ${wallet.name} does not support message signing`,
            );
          }

          // Get the signMessage feature
          const signMessageFeature = wallet.wallet.features["solana:signMessage"];

          if (!signMessageFeature) {
            throw new Error(
              `Wallet ${wallet.name} signMessage feature is not available`,
            );
          }

          if (!signMessageFeature.signMessage || typeof signMessageFeature.signMessage !== "function") {
            throw new Error(
              `Wallet ${wallet.name} signMessage method is not properly configured`,
            );
          }

          try {
            // Call signMessage with the account and message
            // The API is variadic: (...inputs) => Promise<outputs[]>
            // We pass a single input object and expect a single output in the array
            const results = await signMessageFeature.signMessage({
              account,
              message,
            });

            // Validate the result
            if (!Array.isArray(results) || results.length === 0) {
              throw new Error("Wallet returned empty signature result");
            }

            const result = results[0];
            if (!result || !result.signature) {
              throw new Error("Wallet returned invalid signature result");
            }

            // Return the signature as Uint8Array
            return new Uint8Array(result.signature);
          } catch (error) {
            // Re-throw with more context if it's not already an Error
            if (error instanceof Error) {
              throw error;
            }
            throw new Error(
              `Failed to sign message: ${String(error)}`,
            );
          }
        };

        // Create signAndSendTransaction function using the wallet's solana:signAndSendTransaction feature
        const signAndSendTransaction = async (
          transaction: Uint8Array,
          options?: { minContextSlot?: number }
        ): Promise<{ signature: Uint8Array }> => {
          // Check if wallet supports transaction signing
          if (!("solana:signAndSendTransaction" in wallet.wallet.features)) {
            throw new Error(
              `Wallet ${wallet.name} does not support transaction signing`,
            );
          }

          const signAndSendFeature = wallet.wallet.features["solana:signAndSendTransaction"];

          if (!signAndSendFeature) {
            throw new Error(
              `Wallet ${wallet.name} signAndSendTransaction feature is not available`,
            );
          }

          if (!signAndSendFeature.signAndSendTransaction || typeof signAndSendFeature.signAndSendTransaction !== "function") {
            throw new Error(
              `Wallet ${wallet.name} signAndSendTransaction method is not properly configured`,
            );
          }

          try {
            // Call signAndSendTransaction with the account and transaction
            // The API is variadic: (...inputs) => Promise<outputs[]>
            const results = await signAndSendFeature.signAndSendTransaction({
              account,
              transaction,
              chain: "solana:mainnet", // Default to mainnet, can be made configurable
              options: options ? { minContextSlot: options.minContextSlot } : undefined,
            });

            // Validate the result
            if (!Array.isArray(results) || results.length === 0) {
              throw new Error("Wallet returned empty transaction result");
            }

            const result = results[0];
            if (!result || !result.signature) {
              throw new Error("Wallet returned invalid transaction result");
            }

            // Return the signature as Uint8Array
            return { signature: new Uint8Array(result.signature) };
          } catch (error) {
            if (error instanceof Error) {
              throw error;
            }
            throw new Error(
              `Failed to sign and send transaction: ${String(error)}`,
            );
          }
        };

        // WalletAccount already provides address as base58 string and publicKey as bytes
        return {
          id: getWalletAccountId(wallet.id, account.address),
          platform: "solana",
          publicKey: new Uint8Array(account.publicKey),
          address: account.address,
          walletName: wallet.name,
          walletId: wallet.id,
          signMessage,
          signAndSendTransaction,
        };
      };

      const emitAccounts = () => {
        const accounts = wallet.wallet.accounts.map(mapAccount);
        subscriber.next(accounts);
      };

      // Emit initial accounts
      emitAccounts();

      // Subscribe to account changes via the standard:events feature
      const eventsFeature = wallet.wallet.features["standard:events"];
      let unsubscribeEvents: (() => void) | undefined;

      if (eventsFeature) {
        unsubscribeEvents = eventsFeature.on("change", (properties) => {
          if (properties.accounts) {
            emitAccounts();
          }
        });
      }

      return () => {
        if (unsubscribeEvents) {
          unsubscribeEvents();
        }
      };
    }).pipe(shareReplay({ refCount: true, bufferSize: 1 })),
  );
};

export const getSolanaAccounts$ = (solanaWallets$: Observable<SolanaWallet[]>) =>
  new Observable<SolanaAccount[]>((subscriber) => {
    const sub = solanaWallets$
      .pipe(
        map((wallets) => wallets.filter((w) => w.isConnected)),
        switchMap((wallets) => {
          if (!wallets.length) return of([]);

          // For MVP, we only have injected wallets
          const injectedWallets = wallets.filter((w) => w.type === "injected");

          return injectedWallets.length
            ? combineLatest(injectedWallets.map(getInjectedWalletAccounts$))
            : of([]);
        }),
        map((accounts) => accounts.flat()),
        distinctUntilChanged(isSameAccountsList),
      )
      .subscribe(subscriber);

    return () => {
      sub.unsubscribe();
    };
  }).pipe(shareReplay({ refCount: true, bufferSize: 1 }));

const isSameAccountsList = (a: SolanaAccount[], b: SolanaAccount[]) => {
  if (a.length !== b.length) return false;
  return a.every((account, i) => account.id === b[i]?.id);
};

