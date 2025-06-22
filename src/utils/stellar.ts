"use client";

import { PasskeyKit, PasskeyServer } from "passkey-kit";
import {
  Keypair,
  Networks,
  SorobanRpc,
  TransactionBuilder,
  Operation,
  Address,
  Contract,
  nativeToScVal,
  xdr,
  Transaction,
} from '@stellar/stellar-sdk';
import { ContractCallResult, DocumentMetadata } from '../types';
import { useKeyIdStore } from '../store/keyId';
import { useContractIdStore } from '../store/contractId';
import { useEffect } from 'react';

// Initialize PasskeyKit and PasskeyServer
export const account = new PasskeyKit({
  rpcUrl: import.meta.env.VITE_PUBLIC_RPC_URL!,
  networkPassphrase: import.meta.env.VITE_PUBLIC_NETWORK_PASSPHRASE!,
  walletWasmHash: import.meta.env.VITE_PUBLIC_WALLET_WASM_HASH!,
  timeoutInSeconds: 30,
});

export const server = new PasskeyServer({
  rpcUrl: import.meta.env.VITE_PUBLIC_RPC_URL!,
  launchtubeUrl: import.meta.env.VITE_PUBLIC_LAUNCHTUBE_URL!,
  launchtubeJwt: import.meta.env.VITE_PUBLIC_LAUNCHTUBE_JWT!,
});

const sorobanServer = new SorobanRpc.Server('https://soroban-testnet.stellar.org');
const NETWORK_PASSPHRASE = Networks.TESTNET;
const CONTRACT_ID = 'CDSE3HOHVIP2PPHPRPTMF5HGWCTGUXR4N2OBKGAQFC3HRPL2TMTDUVMN';

console.log("ENV:", {
  rpc: import.meta.env.VITE_PUBLIC_RPC_URL,
  wasm: import.meta.env.VITE_PUBLIC_WALLET_WASM_HASH,
  contract: import.meta.env.VITE_PUBLIC_WALLET_CONTRACT_ID,
});

// Function to connect wallet using PasskeyKit
export const connectStellarWallet = async (): Promise<string> => {
  try {
    const { keyIdBase64 } = await account.connectWallet();
    
    // Store keyId in localStorage and Zustand store
    const updateKeyId = useKeyIdStore.getState().setKeyId;
    updateKeyId(keyIdBase64);
    localStorage.setItem("ssd:keyId", keyIdBase64);

    return keyIdBase64; // Return the public key or keyId
  } catch (error) {
    console.error('Failed to connect to Passkey wallet:', error);
    // Fallback for demo purposes
    return 'GDEMO' + 'A'.repeat(51);
  }
};

// Function to call Soroban contract
export const callSorobanContract = async (
  contractAddress: string,
  method: string,
  params: any[],
  userPublicKey: string
): Promise<ContractCallResult> => {
  try {
    if (!contractAddress || contractAddress.length !== 56) {
      throw new Error(`Invalid contract ID: ${contractAddress}`);
    }

    const contract = new Contract(contractAddress);

    const stellarAccount = await sorobanServer.getAccount(userPublicKey);

    const tx = new TransactionBuilder(stellarAccount, {
      fee: '100000',
      networkPassphrase: NETWORK_PASSPHRASE,
    })
      .addOperation(contract.call(method, ...params.map((param) => nativeToScVal(param))))
      .setTimeout(30)
      .build();

    const xdrString = tx.toXDR();
    console.log('XDR String before signing:', xdrString);

    const sendResponse = await server.send(xdrString);
    console.log('Server send response:', sendResponse);

    if (sendResponse.status === 'PENDING' || sendResponse.status === 'DUPLICATE') {
      return {
        success: true,
        transactionId: sendResponse.hash,
      };
    } else {
      throw new Error(`Transaction failed with status: ${sendResponse.status}`);
    }
  } catch (error) {
    console.error('Contract call error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Contract call failed',
    };
  }
};

export const getDocumentsByOwner = async (ownerAddress: string): Promise<DocumentMetadata[]> => {
  const contract = new Contract(CONTRACT_ID);

  const { keyIdBase64 } = await account.connectWallet(); 
  let tempAccount;
  try {
    tempAccount = await sorobanServer.getAccount(keyIdBase64);
  } catch (error) {
    console.error('Failed to fetch temporary account:', error);
    return [];
  }

  const tx = new TransactionBuilder(tempAccount, {
    fee: '100000',
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(
      contract.call('get_documents_by_owner', nativeToScVal(new Address(ownerAddress), { type: 'address' }))
    )
    .setTimeout(30)
    .build();

  try {
    const simResponse = await sorobanServer.simulateTransaction(tx);
    if (SorobanRpc.Api.isSimulationError(simResponse)) {
      console.error('Simulation failed:', simResponse.error);
      return [];
    }

    if (!simResponse.result?.retval) {
      console.error('No result in simulation response');
      return [];
    }

    const raw = simResponse.result.retval;
    if (raw.switch().name !== 'scvVec') {
      console.error('Expected scvVec but got:', raw.switch().name);
      return [];
    }

    const documents: DocumentMetadata[] = raw.vec()!.map((docVal) => {
      const fields = docVal.map();
      const getField = (name: string) => fields?.find((f) => f.key().sym().toString() === name)?.val();

      const ipfsCidVal = getField('ipfs_cid');
      const hashVal = getField('hash');
      const creatorVal = getField('creator');
      const timestampVal = getField('timestamp');
      const signersVal = getField('signers');
      const signaturesVal = getField('signatures');
      const receiverVal = getField('receiver');

      if (!ipfsCidVal || !hashVal || !creatorVal || !timestampVal || !signersVal || !signaturesVal) {
        console.error('Missing required fields in document metadata');
        return {
          id: '',
          hash: '',
          ipfsCid: '',
          creator: '',
          timestamp: 0,
          receiver: undefined,
          signers: [],
          signatures: [],
          status: 'unsigned',
          fileName: '',
          fileSize: 0,
        };
      }

      const ipfsCid = Buffer.from(ipfsCidVal.bytes()).toString('utf-8');
      const hash = Buffer.from(hashVal.bytes()).toString('hex');
      const creator = creatorVal.address().toString();
      const timestamp = Number(timestampVal.u64()) * 1000;
      const signers = signersVal.vec()!.map((s) => s.address().toString());
      const signatures = signaturesVal.vec()!.map((s) => s.address().toString());
      const receiver = receiverVal?.switch().name === 'scvVoid' 
        ? undefined 
        : receiverVal?.address().toString();

      let status: "signed" | "pending" | "unsigned" | "verified";
      if (signers.length === signatures.length && signers.length > 0) {
        status = "signed";
      } else if (signatures.length > 0) {
        status = "pending";
      } else {
        status = "unsigned";
      }

      return {
        id: ipfsCid,
        hash,
        ipfsCid,
        creator,
        timestamp,
        receiver,
        signers,
        signatures,
        status,
        fileName: `Document_${ipfsCid.slice(0, 8)}`,
        fileSize: 0,
      };
    });

    return documents;
  } catch (error) {
    console.error('Error fetching documents:', error);
    return [];
  }
};

// Function to get documents received by
export const getDocumentsReceivedBy = async (receiverAddress: string): Promise<DocumentMetadata[]> => {
  const contract = new Contract(CONTRACT_ID);

  // Use PasskeyKit to get a temporary account for read-only operations
  const { keyIdBase64 } = await account.connectWallet(); // Temporary wallet for simulation
  let tempAccount;
  try {
    tempAccount = await sorobanServer.getAccount(keyIdBase64);
  } catch (error) {
    console.error('Failed to fetch temporary account:', error);
    return [];
  }

  const tx = new TransactionBuilder(tempAccount, {
    fee: '100000',
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(
      contract.call('get_documents_received_by', nativeToScVal(new Address(receiverAddress), { type: 'address' }))
    )
    .setTimeout(30)
    .build();

  try {
    const simResponse = await sorobanServer.simulateTransaction(tx);
    if (SorobanRpc.Api.isSimulationError(simResponse)) {
      console.error('Simulation failed:', simResponse.error);
      return [];
    }

    if (!simResponse.result?.retval) {
      console.error('No result in simulation response');
      return [];
    }

    const raw = simResponse.result.retval;
    if (raw.switch().name !== 'scvVec') {
      console.error('Expected scvVec but got:', raw.switch().name);
      return [];
    }

    const documents: DocumentMetadata[] = raw.vec()!.map((docVal) => {
      const fields = docVal.map();
      const getField = (name: string) => fields?.find((f) => f.key().sym().toString() === name)?.val();

      const ipfsCidVal = getField('ipfs_cid');
      const hashVal = getField('hash');
      const creatorVal = getField('creator');
      const timestampVal = getField('timestamp');
      const signersVal = getField('signers');
      const signaturesVal = getField('signatures');
      const receiverVal = getField('receiver');

      if (!ipfsCidVal || !hashVal || !creatorVal || !timestampVal || !signersVal || !signaturesVal) {
        console.error('Missing required fields in document metadata');
        return {
          id: '',
          hash: '',
          ipfsCid: '',
          creator: '',
          timestamp: 0,
          receiver: undefined,
          signers: [],
          signatures: [],
          status: 'unsigned',
          fileName: '',
          fileSize: 0,
        };
      }

      const ipfsCid = Buffer.from(ipfsCidVal.bytes()).toString('utf-8');
      const hash = Buffer.from(hashVal.bytes()).toString('hex');
      const creator = creatorVal.address().toString();
      const timestamp = Number(timestampVal.u64()) * 1000;
      const signers = signersVal.vec()!.map((s) => s.address().toString());
      const signatures = signaturesVal.vec()!.map((s) => s.address().toString());
      const receiver = receiverVal?.switch().name === 'scvVoid' 
        ? undefined 
        : receiverVal?.address().toString();

      let status: "signed" | "pending" | "unsigned" | "verified";
      if (signers.length === signatures.length && signers.length > 0) {
        status = "signed";
      } else if (signatures.length > 0) {
        status = "pending";
      } else {
        status = "unsigned";
      }

      return {
        id: ipfsCid,
        hash,
        ipfsCid,
        creator,
        timestamp,
        receiver,
        signers,
        signatures,
        status,
        fileName: `Document_${ipfsCid.slice(0, 8)}`,
        fileSize: 0,
      };
    });

    return documents;
  } catch (error) {
    console.error('Error fetching received documents:', error);
    return [];
  }
};