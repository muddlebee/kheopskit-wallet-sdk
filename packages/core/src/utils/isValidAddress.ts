import { isEthereumAddress } from "./isEthereumAddress";
import { isSolanaAddress } from "./isSolanaAddress";
import { isSs58Address } from "./isSs58Address";

export const isValidAddress = (address: string): boolean => {
  // Ethereum addresses start with 0x
  if (address.startsWith("0x")) {
    return isEthereumAddress(address);
  }
  // Try SS58 (Polkadot) first, then Solana Base58
  return isSs58Address(address) || isSolanaAddress(address);
};
