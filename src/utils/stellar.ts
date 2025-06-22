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

const server = new SorobanRpc.Server('https://soroban-testnet.stellar.org');
const NETWORK_PASSPHRASE = Networks.TESTNET;
const CONTRACT_ID = 'CDSE3HOHVIP2PPHPRPTMF5HGWCTGUXR4N2OBKGAQFC3HRPL2TMTDUVMN';

export const connectStellarWallet = async (): Promise<string> => {
  if (typeof window !== 'undefined' && (window as any).freighter) {
    try {
      const publicKey = await (window as any).freighter.getPublicKey();
      return publicKey;
    } catch (error) {
      throw new Error('Failed to connect to Freighter wallet');
    }
  }
  return 'GDEMO' + 'A'.repeat(51);
};

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

    // Fetch the user's account (required for write operations)
    const account = await server.getAccount(userPublicKey);

    // Build the transaction
    const tx = new TransactionBuilder(account, {
      fee: '100000',
      networkPassphrase: NETWORK_PASSPHRASE,
    })
      .addOperation(contract.call(method, ...params.map((param) => nativeToScVal(param))))
      .setTimeout(30)
      .build();

    // Sign the transaction with Freighter
    if (typeof window !== 'undefined' && (window as any).freighter) {
      const xdrString = tx.toXDR();
      console.log('XDR String before signing:', xdrString); // Debug log
      const signedXDR = await (window as any).freighter.signTransaction(xdrString, NETWORK_PASSPHRASE);
      console.log('Signed XDR:', signedXDR); // Debug log
      const signedTx = TransactionBuilder.fromXDR(signedXDR, NETWORK_PASSPHRASE);
      const sendResponse = await server.sendTransaction(signedTx);

      if (sendResponse.status === 'PENDING' || sendResponse.status === 'DUPLICATE') {
        return {
          success: true,
          transactionId: sendResponse.hash,
        };
      } else {
        throw new Error(`Transaction failed with status: ${sendResponse.status}`);
      }
    } else {
      throw new Error('Freighter wallet not detected');
    }
  } catch (error) {
    console.error('Contract call error:', error); // Debug log
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Contract call failed',
    };
  }
};

export const getDocumentsByOwner = async (ownerAddress: string): Promise<DocumentMetadata[]> => {
  const contract = new Contract(CONTRACT_ID);
  const sourceKeypair = Keypair.random();
  let account;
  try {
    account = await server.getAccount(sourceKeypair.publicKey());
  } catch (error) {
    console.error('Failed to fetch account:', error);
    return [];
  }

  const tx = new TransactionBuilder(account, {
    fee: '100000',
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(
      contract.call('get_documents_by_owner', nativeToScVal(new Address(ownerAddress), { type: 'address' }))
    )
    .setTimeout(30)
    .build();

  try {
    const simResponse = await server.simulateTransaction(tx);
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
      const timestamp = Number(timestampVal.u64()) * 1000; // Convert to milliseconds
      const signers = signersVal.vec()!.map((s) => s.address().toString());
      const signatures = signaturesVal.vec()!.map((s) => s.address().toString());
      const receiver = receiverVal?.switch().name === 'scvVoid' 
        ? undefined 
        : receiverVal?.address().toString();

      // Derive status based on signatures
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
        fileName: `Document_${ipfsCid.slice(0, 8)}`, // Placeholder
        fileSize: 0, // Placeholder
      };
    });

    return documents;
  } catch (error) {
    console.error('Error fetching documents:', error);
    return [];
  }
};

export const getDocumentsReceivedBy = async (receiverAddress: string): Promise<DocumentMetadata[]> => {
  const contract = new Contract(CONTRACT_ID);
  const sourceKeypair = Keypair.random();
  let account;
  try {
    account = await server.getAccount(sourceKeypair.publicKey());
  } catch (error) {
    console.error('Failed to fetch account:', error);
    return [];
  }

  const tx = new TransactionBuilder(account, {
    fee: '100000',
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(
      contract.call('get_documents_received_by', nativeToScVal(new Address(receiverAddress), { type: 'address' }))
    )
    .setTimeout(30)
    .build();

  try {
    const simResponse = await server.simulateTransaction(tx);
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
        fileName: `Document_${ipfsCid.slice(0, 8)}`, // Placeholder
        fileSize: 0, // Placeholder
      };
    });

    return documents;
  } catch (error) {
    console.error('Error fetching received documents:', error);
    return [];
  }
};