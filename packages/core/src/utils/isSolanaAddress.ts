import { isAddress } from "@solana/addresses";

export const isSolanaAddress = (address: string): boolean => {
  try {
    return isAddress(address);
  } catch {
    return false;
  }
};

