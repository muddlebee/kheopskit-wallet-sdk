import { store } from "@/api/store";
import type { KheopskitConfig, SolanaInjectedWallet, SolanaWallet } from "@/api/types";
import { type WalletId, getWalletId } from "@/utils/WalletId";
import { type WalletAdapterCompatibleStandardWallet, isWalletAdapterCompatibleStandardWallet } from "@solana/wallet-adapter-base";
import { getWallets } from "@wallet-standard/app";
import {
    BehaviorSubject,
    Observable,
    combineLatest,
    map,
    shareReplay,
} from "rxjs";

// Observable that emits compatible Solana wallets detected via Wallet Standard
const standardWallets$ = new Observable<WalletAdapterCompatibleStandardWallet[]>((subscriber) => {
    const { get, on } = getWallets();

    const getCompatibleWallets = (): WalletAdapterCompatibleStandardWallet[] =>
        get().filter(isWalletAdapterCompatibleStandardWallet);

    // Emit initial wallets
    subscriber.next(getCompatibleWallets());

    // Subscribe to new wallet registrations
    const unsubscribeRegister = on("register", () => {
        subscriber.next(getCompatibleWallets());
    });

    // Subscribe to wallet unregistrations
    const unsubscribeUnregister = on("unregister", () => {
        subscriber.next(getCompatibleWallets());
    });

    return () => {
        unsubscribeRegister();
        unsubscribeUnregister();
    };
}).pipe(shareReplay({ refCount: true, bufferSize: 1 }));

const solanaInjectedWallets$ = new Observable<SolanaInjectedWallet[]>(
    (subscriber) => {
        const enabledWalletIds$ = new BehaviorSubject<Set<WalletId>>(new Set());

        const connectWallet = async (walletId: WalletId, wallet: WalletAdapterCompatibleStandardWallet) => {
            if (enabledWalletIds$.value.has(walletId))
                throw new Error(`Wallet ${walletId} already connected`);

            // Call connect on the wallet using the standard:connect feature
            await wallet.features["standard:connect"].connect();

            const newSet = new Set(enabledWalletIds$.value);
            newSet.add(walletId);
            enabledWalletIds$.next(newSet);

            store.addEnabledWalletId(walletId);
        };

        const disconnectWallet = async (walletId: WalletId, wallet: WalletAdapterCompatibleStandardWallet) => {
            if (!enabledWalletIds$.value.has(walletId))
                throw new Error(`Wallet ${walletId} is not connected`);

            // Call disconnect if the wallet supports it (standard:disconnect is optional)
            if ("standard:disconnect" in wallet.features) {
                const disconnectFeature = wallet.features["standard:disconnect"] as { disconnect: () => Promise<void> };
                await disconnectFeature.disconnect();
            }

            const newSet = new Set(enabledWalletIds$.value);
            newSet.delete(walletId);
            enabledWalletIds$.next(newSet);

            store.removeEnabledWalletId(walletId);
        };

        const sub = combineLatest([standardWallets$, enabledWalletIds$])
            .pipe(
                map(([wallets, enabledWalletIds]) => {
                    return wallets.map((wallet): SolanaInjectedWallet => {
                        const walletId = getWalletId("solana", wallet.name);

                        return {
                            platform: "solana",
                            type: "injected",
                            id: walletId,
                            name: wallet.name,
                            icon: wallet.icon || "",
                            wallet,
                            isConnected: enabledWalletIds.has(walletId),
                            connect: () => connectWallet(walletId, wallet),
                            disconnect: () => disconnectWallet(walletId, wallet),
                        };
                    });
                }),
            )
            .subscribe(subscriber);

        return () => {
            sub.unsubscribe();
        };
    },
).pipe(shareReplay({ refCount: true, bufferSize: 1 }));

export const getSolanaWallets$ = (_config: KheopskitConfig) => {
    // For MVP, we only support injected wallets (no AppKit/WalletConnect)
    return new Observable<SolanaWallet[]>((subscriber) => {
        const subscription = solanaInjectedWallets$.subscribe(subscriber);

        return () => {
            subscription.unsubscribe();
        };
    }).pipe(shareReplay({ refCount: true, bufferSize: 1 }));
};

