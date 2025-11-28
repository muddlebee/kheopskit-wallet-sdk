import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Card } from "@/components/ui/card";
import { useWallets } from "@kheopskit/react";
import { shortenAddress } from "@/lib/shortenAddress";
import { Wallet, Check } from "lucide-react";
import { toast } from "sonner";
import { Binary } from "polkadot-api";

export const WalletConnectorModal = () => {
    const { wallets, accounts } = useWallets();
    const [isOpen, setIsOpen] = useState(false);
    const [selectedAccount, setSelectedAccount] = useState<string | null>(null);

    const connectedWallets = wallets.filter(wallet => wallet.isConnected);
    const hasConnectedWallets = connectedWallets.length > 0;

    const handleWalletConnect = async (wallet: any) => {
        try {
            await wallet.connect();
            toast.success(`${wallet.name} connected successfully!`);
        } catch (error) {
            toast.error(`Failed to connect ${wallet.name}: ${(error as Error).message}`);
        }
    };

    const handleWalletDisconnect = (wallet: any) => {
        wallet.disconnect();
        toast.success(`${wallet.name} disconnected`);
    };

    const handleSignMessage = async (account: any) => {
        const message = "Hello from Kheopskit!";

        try {
            if (account.platform === "polkadot") {
                const bytes = Binary.fromText(message).asBytes();
                const signature = await account.polkadotSigner.signBytes(bytes);
                const hexSignature = Binary.fromBytes(signature).asHex();
                toast.success(`Signature: ${hexSignature.slice(0, 20)}...`);
            } else if (account.platform === "ethereum") {
                const signature = await account.client.signMessage({
                    message,
                    account: account.address,
                });
                toast.success(`Signature: ${signature.slice(0, 20)}...`);
            }
        } catch (error) {
            toast.error(`Signing failed: ${(error as Error).message}`);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button className="fixed top-4 right-4 z-40">
                    {hasConnectedWallets ? (
                        <div className="flex items-center gap-2">
                            <Check className="h-4 w-4" />
                            {connectedWallets.length} Connected
                        </div>
                    ) : (
                        <div className="flex items-center gap-2">
                            <Wallet className="h-4 w-4" />
                            Connect Wallet
                        </div>
                    )}
                </Button>
            </DialogTrigger>

            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>Wallet Connection</DialogTitle>
                    <DialogDescription>
                        Connect your wallet to interact with the dapp
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                    {/* Available Wallets */}
                    <div>
                        <h3 className="text-sm font-medium mb-2">Available Wallets</h3>
                        <div className="space-y-2">
                            {wallets.map((wallet) => (
                                <Card key={wallet.id} className="p-3">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            {wallet.icon && (
                                                <img
                                                    src={wallet.icon}
                                                    alt={wallet.name}
                                                    className="w-6 h-6 rounded"
                                                />
                                            )}
                                            <div>
                                                <div className="font-medium">{wallet.name}</div>
                                                <div className="text-xs text-muted-foreground">
                                                    {wallet.platform}
                                                </div>
                                            </div>
                                        </div>
                                        <Button
                                            size="sm"
                                            variant={wallet.isConnected ? "destructive" : "default"}
                                            onClick={() =>
                                                wallet.isConnected
                                                    ? handleWalletDisconnect(wallet)
                                                    : handleWalletConnect(wallet)
                                            }
                                        >
                                            {wallet.isConnected ? "Disconnect" : "Connect"}
                                        </Button>
                                    </div>
                                </Card>
                            ))}
                        </div>
                    </div>

                    {/* Connected Accounts */}
                    {accounts.length > 0 && (
                        <div>
                            <h3 className="text-sm font-medium mb-2">Connected Accounts</h3>
                            <div className="space-y-2 max-h-40 overflow-y-auto">
                                {accounts.map((account) => (
                                    <Card
                                        key={account.id}
                                        className={`p-3 cursor-pointer transition-colors ${selectedAccount === account.id
                                            ? 'ring-2 ring-primary'
                                            : 'hover:bg-muted/50'
                                            }`}
                                        onClick={() => setSelectedAccount(account.id)}
                                    >
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <div className="font-medium text-sm">
                                                    {account.platform === "polkadot" ? account.name : "Account"}
                                                </div>
                                                <div className="text-xs text-muted-foreground font-mono">
                                                    {shortenAddress(account.address)}
                                                </div>
                                                <div className="text-xs text-muted-foreground">
                                                    {account.walletName} • {account.platform}
                                                </div>
                                            </div>
                                            {selectedAccount === account.id && (
                                                <div className="text-primary">
                                                    <Check className="h-4 w-4" />
                                                </div>
                                            )}
                                        </div>
                                    </Card>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Sign Message */}
                    {selectedAccount && (
                        <div>
                            <h3 className="text-sm font-medium mb-2">Actions</h3>
                            <Button
                                onClick={() => {
                                    const account = accounts.find(a => a.id === selectedAccount);
                                    if (account) handleSignMessage(account);
                                }}
                                className="w-full"
                            >
                                Sign Test Message
                            </Button>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
};
