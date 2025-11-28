import { GithubIcon } from "@/assets/GithubIcon";
import { Button } from "@/components/ui/button";
import { Toaster } from "@/components/ui/sonner";
import { WalletConnectorModal } from "@/components/WalletConnectorModal";
import { usePlaygroundConfig } from "@/lib/config/playgroundConfig";
import { wagmiConfig } from "@/lib/wagmi";
import { KheopskitProvider } from "@kheopskit/react";
import { WagmiProvider } from "wagmi";
import { Accounts } from "./blocks/Accounts";
import { Config } from "./blocks/Config";
import { SubmitTx } from "./blocks/SubmitTx";
import { Wallets } from "./blocks/Wallets";

export const App = () => {
  // IMPORTANT on your app, kheopskit's config should be hardcoded
  const { kheopskitConfig: config } = usePlaygroundConfig();

  return (
    <KheopskitProvider config={config}>
      <WagmiProvider config={wagmiConfig}>
        <AppContent />
        <Toaster />
      </WagmiProvider>
    </KheopskitProvider>
  );
};

const AppContent = () => (
  <div className="container mx-auto flex flex-col gap-8 items-center p-8 max-w-3xl">
    <div className="text-center space-y-2">
      <h1 className="text-3xl font-bold">Kheopskit Playground</h1>
      <div className="text-sm text-muted-foreground">
        Library for connecting dapps to multiple platforms & wallets
      </div>
    </div>
    <Config />
    <Wallets />
    <Accounts />
    <SubmitTx />
    <WalletConnectorModal />
    <Footer />
  </div>
);

const Footer = () => (
  <div>
    <Button asChild variant="ghost">
      <a href="https://github.com/0xKheops/kheopskit-alpha">
        <GithubIcon className="fill-white" />
        Github
      </a>
    </Button>
  </div>
);
