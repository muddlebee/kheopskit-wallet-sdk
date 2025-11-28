I'll walk you through the entire flow of how the wallet integration works in the Vite React example, from app startup to wallet interactions.

[3 tools called]

Now let me examine the Config component and Wagmi setup:

[2 tools called]

Perfect! Now I can walk you through the **complete flow** of how the wallet integration works in the Vite React example:

# 🚀 **Complete Wallet Integration Flow - Vite React Example**

## **Phase 1: App Initialization & Configuration**

### **1. Entry Point (`main.tsx`)**
```typescript
// main.tsx - Simple React app bootstrap
createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>
);
```

### **2. Configuration Management (`playgroundConfig.ts`)**
```typescript
// Configuration stored in localStorage for demo purposes
const demoConfigStore = createStore<PlaygroundConfig>("playground.config", {
  autoReconnect: true,
  platforms: ["polkadot"],     // ← Starts with Polkadot only
  walletConnect: true,         // ← WalletConnect enabled
  debug: true,
});

// Configuration transformation for Kheopskit
const getKheopskitConfig = (config: PlaygroundConfig) => {
  const networks = getNetworks(platforms); // ← Filters APPKIT_CHAINS

  return {
    ...config,
    walletConnect: config.walletConnect && networks ? {
      projectId: import.meta.env.VITE_WALLET_CONNECT_PROJECT_ID,
      metadata: {
        name: "Kheopskit Demo",
        description: "Kheopskit Demo",
        url: window.location.origin,
        icons: [],
      },
      networks, // ← Filtered chains based on enabled platforms
    } : undefined,
  };
};
```

**🔑 Key Flow:**
1. **Load config from localStorage** (persistent across sessions)
2. **Filter chains** based on enabled platforms
3. **Transform config** for Kheopskit consumption
4. **Provide WalletConnect** configuration if enabled

### **3. Provider Stack Setup (`App.tsx`)**
```typescript
export const App = () => {
  const { kheopskitConfig: config } = usePlaygroundConfig(); // ← Get dynamic config

  return (
    <KheopskitProvider config={config}>          {/* ← Core wallet provider */}
      <WagmiProvider config={wagmiConfig}>       {/* ← Ethereum integration */}
        <QueryClientProvider client={queryClient}> {/* ← React Query */}
          <AppContent />
        </QueryClientProvider>
      </WagmiProvider>
    </KheopskitProvider>
  );
};
```

**🔑 Provider Hierarchy:**
1. **KheopskitProvider** - Manages all wallet state (Polkadot + Ethereum)
2. **WagmiProvider** - Ethereum-specific functionality
3. **QueryClientProvider** - Async state management

### **4. Wagmi Configuration (`wagmi.ts`)**
```typescript
// Extract only Ethereum chains from APPKIT_CHAINS
const chains = APPKIT_CHAINS.filter(isEthereumNetwork).map(
  (network) => VIEM_CHAINS_BY_ID[Number(network.id)],
) as [Chain, ...Chain[]];

// Create transports for each chain
const transports = chains.reduce((acc, chain) => {
  acc[chain.id] = http();
  return acc;
}, {} as Record<number, ReturnType<typeof http>>);

export const wagmiConfig = createConfig({
  chains,
  transports,
});
```

**🔑 Wagmi Flow:**
1. **Filter Ethereum chains** from unified APPKIT_CHAINS
2. **Convert to Viem format** using VIEM_CHAINS_BY_ID mapping
3. **Create HTTP transports** for each chain
4. **Configure Wagmi** with chains and transports

## **Phase 2: Wallet Discovery & Connection**

### **5. Kheopskit Initialization (Behind the Scenes)**

When `KheopskitProvider` mounts, it triggers the core wallet discovery:

```typescript
// packages/core/src/api/kheopskit.ts
const getKheopskit$ = (config) => {
  return new Observable((subscriber) => {
    const wallets$ = getWallets$(config);    // ← Discover wallets
    
    const subscription = combineLatest({
      wallets: wallets$,
      accounts: getAccounts$(config, wallets$), // ← Get accounts from wallets
    })
    .pipe(map(({ wallets, accounts }) => ({ config, wallets, accounts })))
    .subscribe(subscriber);
  });
};
```

### **6. Wallet Discovery Process**

**For Polkadot:**
```typescript
// Discover browser extension wallets
const injectedWallets$ = getInjectedPolkadotWallets$();

// Create AppKit wallet if WalletConnect enabled
const appKitWallet$ = getAppKitWallets$(config)?.pipe(
  map(w => w.polkadot)
);

// Combine all Polkadot wallets
const polkadotWallets$ = combineLatest([injectedWallets$, appKitWallet$]);
```

**For Ethereum:**
```typescript
// Discover browser extension wallets + MetaMask
const injectedWallets$ = getInjectedEthereumWallets$();

// Create AppKit wallet for WalletConnect
const appKitWallet$ = getAppKitWallets$(config)?.pipe(
  map(w => w.ethereum)
);

// Combine all Ethereum wallets
const ethereumWallets$ = combineLatest([injectedWallets$, appKitWallet$]);
```

## **Phase 3: UI Components & User Interaction**

### **7. Configuration UI (`Config.tsx`)**
```typescript
const Platforms = () => {
  const { demoConfig, setPlatformEnabled } = usePlaygroundConfig();

  return (
    <div>
      <Checkbox
        checked={demoConfig.platforms?.includes("polkadot")}
        onCheckedChange={(checked) => {
          setPlatformEnabled("polkadot", checked);
          window.location.reload(); // ← Restart app with new config
        }}
      />
      <Checkbox
        checked={demoConfig.platforms?.includes("ethereum")}
        onCheckedChange={(checked) => {
          setPlatformEnabled("ethereum", checked);
          window.location.reload(); // ← Restart app with new config
        }}
      />
    </div>
  );
};
```

**🔑 Configuration Flow:**
1. **User toggles platform** (Polkadot/Ethereum)
2. **Update localStorage** config
3. **Reload page** to reinitialize with new config
4. **Provider re-discovers** wallets for enabled platforms

### **8. Wallet Management (`Wallets.tsx`)**
```typescript
export const Wallets = () => {
  const { wallets, accounts } = useWallets(); // ← Get all discovered wallets

  return (
    <Table>
      {wallets.map((wallet) => (
        <TableRow key={wallet.id}>
          <TableCell>{wallet.platform}</TableCell>
          <TableCell>{wallet.name}</TableCell>
          <TableCell>
            {accounts.filter(a => a.walletId === wallet.id).length}
          </TableCell>
          <TableCell>
            {wallet.isConnected ? (
              <Button onClick={wallet.disconnect}>Disconnect</Button>
            ) : (
              <Button onClick={wallet.connect}>Connect</Button>
            )}
          </TableCell>
        </TableRow>
      ))}
    </Table>
  );
};
```

**🔑 Wallet Interaction Flow:**
1. **Display discovered wallets** (browser extensions + WalletConnect)
2. **Show connection status** for each wallet
3. **Connect/Disconnect** buttons trigger wallet-specific flows
4. **Account count** shows how many accounts each wallet provides

### **9. Account Management (`Accounts.tsx`)**
```typescript
export const Accounts = () => {
  const { accounts } = useWallets(); // ← Get all connected accounts

  return (
    <Table>
      {accounts.map((account) => (
        <AccountRow key={account.id} account={account} />
      ))}
    </Table>
  );
};

const AccountRow = ({ account }) => (
  <TableRow>
    <TableCell>{account.platform}</TableCell>
    <TableCell>{account.walletName}</TableCell>
    <TableCell>{account.name}</TableCell>
    <TableCell>{account.address}</TableCell>
    <TableCell>
      <SignButton account={account} />
    </TableCell>
  </TableRow>
);
```

### **10. Cross-Platform Signing**
```typescript
const SignButton = ({ account }) => {
  const handleSign = async () => {
    const message = "Kheopskit rocks!";
    
    if (account.platform === "polkadot") {
      // Polkadot signing via polkadot-api
      const bytes = Binary.fromText(message).asBytes();
      const signature = await account.polkadotSigner.signBytes(bytes);
      const hexSignature = Binary.fromBytes(signature).asHex();
    } else if (account.platform === "ethereum") {
      // Ethereum signing via Viem
      const signature = await account.client.signMessage({
        message,
        account: account.address,
      });
    }
  };
};
```

### **11. Transaction Submission (`SubmitTx.tsx`)**
```typescript
const SubmitTx = () => {
  const { accounts } = useWallets();
  
  return (
    <div>
      {/* Network selector using APPKIT_CHAINS */}
      <Select>
        {APPKIT_CHAINS.map((network) => (
          <SelectItem key={network.id} value={network.id}>
            {network.name}
          </SelectItem>
        ))}
      </Select>
      
      {/* Account selector */}
      <Select>
        {accounts.map((account) => (
          <SelectItem key={account.id} value={account.id}>
            {account.platform} - {account.address}
          </SelectItem>
        ))}
      </Select>
      
      <Button onClick={handleSubmitTransaction}>
        Submit Transaction
      </Button>
    </div>
  );
};
```

### **12. Wagmi Integration (`Wagmi.tsx`)**
```typescript
const Wagmi = () => {
  const { accounts } = useWallets();        // ← Kheopskit accounts
  const { connectors, connect } = useConnect(); // ← Wagmi connectors
  const { address } = useAccount();         // ← Active Wagmi account

  return (
    <div>
      {/* Show all Wagmi connectors */}
      {connectors.map((connector) => (
        <Button onClick={() => connect({ connector })}>
          {connector.name}
        </Button>
      ))}
      
      {/* Show Kheopskit Ethereum accounts */}
      {accounts
        .filter(a => a.platform === "ethereum")
        .map(account => (
          <div key={account.id}>
            {account.walletName} - {account.address}
          </div>
        ))
      }
    </div>
  );
};
```

## **Phase 4: Data Flow & State Management**

### **13. Reactive State Updates**

```typescript
// RxJS-based reactive flow
Kheopskit Observable:
  config changes → wallet discovery → account fetching → UI updates

// React state synchronization
useSyncExternalStore(
  store.subscribe,    // ← Subscribe to Kheopskit observable
  store.getSnapshot   // ← Get current state
);
```

**🔑 State Flow:**
1. **Configuration changes** trigger wallet re-discovery
2. **Wallet connections** trigger account fetching
3. **Account updates** automatically propagate to all components
4. **UI stays in sync** with wallet state

### **14. AppKit Integration (Behind the Scenes)**

```typescript
// AppKit wallet creation
const appKit = createAppKit({
  projectId: walletConnect.projectId,
  networks: walletConnect.networks, // ← Your APPKIT_CHAINS
});

// Monitor connection status
appKit.subscribeProviders((providers) => {
  isPolkadotConnected: !!providers.polkadot,
  isEthereumConnected: !!providers.eip155,
});

// Create unified wallet objects
const polkadotWallet = {
  platform: "polkadot",
  type: "appKit",
  connect: () => appKit.open(),    // ← Opens WalletConnect modal
  disconnect: () => appKit.disconnect(),
  appKit, // ← Full AppKit instance for advanced usage
};
```

## **🎯 Complete Flow Summary**

### **Startup Flow:**
1. **Load config** from localStorage
2. **Initialize providers** (Kheopskit → Wagmi → React Query)
3. **Discover wallets** (browser extensions + WalletConnect)
4. **Auto-reconnect** if enabled
5. **Render UI** components

### **User Interaction Flow:**
1. **User toggles platform** → Page reload with new config
2. **User clicks connect** → Wallet-specific connection flow
3. **Wallet provides accounts** → Accounts appear in UI
4. **User signs message/transaction** → Platform-specific signing
5. **State updates** → All components re-render with new data

### **Key Benefits of This Architecture:**
- ✅ **Unified state management** across Polkadot & Ethereum
- ✅ **Automatic wallet discovery** and reconnection
- ✅ **Type-safe interactions** with full TypeScript support
- ✅ **Reactive UI updates** via RxJS observables
- ✅ **Cross-platform compatibility** with consistent API
- ✅ **Mobile wallet support** via WalletConnect/AppKit

This is a **production-ready pattern** that you can adapt for your own applications by simplifying the configuration management and removing the playground-specific features.