---
name: Solana Wallet Integration MVP
overview: ""
todos:
  - id: 4ee30e90-00cf-4eda-bcbe-1cebadd7699f
    content: Update barrel exports (utils/index.ts, api/solana/index.ts)
    status: pending
---

# Solana Wallet Integration MVP

## Dependencies to Install

````bash
pnpm add @solana/kit @solana/addresses @wallet-standard/app @wallet-standard/base @solana/wallet-adapter-base @solana/wallet-standard-wallet-adapter-base -F @kheopskit/core
```

## Files to Create/Modify

### 1. Update Types ([packages/core/src/api/types.ts](packages/core/src/api/types.ts))

Add Solana wallet and account types following the existing Polkadot/Ethereum pattern:

```typescript
import type { Wallet as StandardWallet } from "@wallet-standard/base";

export type SolanaInjectedWallet = {
  id: WalletId;
  platform: "solana";
  type: "injected";
  wallet: StandardWallet;
  name: string;
  icon: string;
  isConnected: boolean;
  connect: () => Promise<void>;
  disconnect: () => void;
};

export type SolanaWallet = SolanaInjectedWallet;

export type SolanaAccount = {
  id: WalletAccountId;
  platform: "solana";
  publicKey: Uint8Array;
  address: string;
  walletName: string;
  walletId: string;
};
```

Update union types: `Wallet`, `WalletAccount`, `WalletPlatform`.

### 2. Create Solana Address Validator ([packages/core/src/utils/isSolanaAddress.ts](packages/core/src/utils/isSolanaAddress.ts))

```typescript
import { isAddress } from "@solana/addresses";

export const isSolanaAddress = (address: string): boolean => {
  try {
    return isAddress(address);
  } catch {
    return false;
  }
};
```

### 3. Update Platform Validator ([packages/core/src/utils/isWalletPlatform.ts](packages/core/src/utils/isWalletPlatform.ts))

Add `"solana"` to the platforms array.

### 4. Update Address Validator ([packages/core/src/utils/isValidAddress.ts](packages/core/src/utils/isValidAddress.ts))

Add Solana address validation logic using Base58 detection.

### 5. Create Solana Wallet Detection ([packages/core/src/api/solana/wallets.ts](packages/core/src/api/solana/wallets.ts))

Detect injected wallets using `@wallet-standard/app`:

```typescript
import { getWallets } from "@wallet-standard/app";
import { isWalletAdapterCompatibleStandardWallet } from "@solana/wallet-standard-wallet-adapter-base";
```

Follow the pattern from [packages/core/src/api/ethereum/wallets.ts](packages/core/src/api/ethereum/wallets.ts):

- Create `solanaInjectedWallets$` observable
- Track connected state with `BehaviorSubject<Set<WalletId>>`
- Export `getSolanaWallets$` function

### 6. Create Solana Account Extraction ([packages/core/src/api/solana/accounts.ts](packages/core/src/api/solana/accounts.ts))

Extract accounts from connected wallets following [packages/core/src/api/ethereum/accounts.ts](packages/core/src/api/ethereum/accounts.ts):

- `getInjectedWalletAccounts$` - get accounts from connected wallet
- `getSolanaAccounts$` - combine all wallet accounts

### 7. Update Main Wallets Aggregator ([packages/core/src/api/wallets.ts](packages/core/src/api/wallets.ts))

Add switch case for `"solana"` platform that returns `getSolanaWallets$(config)`.

### 8. Update Main Accounts Aggregator ([packages/core/src/api/accounts.ts](packages/core/src/api/accounts.ts))

Add switch case for `"solana"` platform that returns `getSolanaAccounts$()`.

### 9. Export New Utils ([packages/core/src/utils/index.ts](packages/core/src/utils/index.ts))

Export `isSolanaAddress` from the utils barrel file.

### 10. Create Solana Index ([packages/core/src/api/solana/index.ts](packages/core/src/api/solana/index.ts))

Export wallets and accounts from barrel file.

## Implementation Order



````