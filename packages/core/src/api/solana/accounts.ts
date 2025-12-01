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
        // WalletAccount already provides address as base58 string and publicKey as bytes
        return {
          id: getWalletAccountId(wallet.id, account.address),
          platform: "solana",
          publicKey: new Uint8Array(account.publicKey),
          address: account.address,
          walletName: wallet.name,
          walletId: wallet.id,
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

