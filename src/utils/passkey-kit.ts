"use client";
import { PasskeyKit, PasskeyServer } from "passkey-kit";

export const account = new PasskeyKit({
    rpcUrl: import.meta.env.VITE_PUBLIC_RPC_URL!,
    networkPassphrase:  import.meta.env.VITE_PUBLIC_NETWORK_PASSPHRASE!,
    walletWasmHash:  import.meta.env.VITE_PUBLIC_WALLET_WASM_HASH!,
    timeoutInSeconds: 30,
});

export const server = new PasskeyServer({
    rpcUrl:  import.meta.env.PUBLIC_RPC_URL!,
    launchtubeUrl:  import.meta.env.VITE_PUBLIC_LAUNCHTUBE_URL!,
    launchtubeJwt:  import.meta.env.VITE_PUBLIC_LAUNCHTUBE_JWT!,
});

console.log("ENV:", {
  rpc:  import.meta.env.VITE_PUBLIC_RPC_URL,
  wasm:  import.meta.env.VITE_PUBLIC_WALLET_WASM_HASH,
  contract:  import.meta.env.VITE_PUBLIC_WALLET_CONTRACT_ID,
});