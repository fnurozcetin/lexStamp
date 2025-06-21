export interface User {
  id: string;
  publicKey: string;
  credentialId: string;
}

export interface DocumentMetadata {
  id: string;
  hash: string;
  ipfsCid: string;
  creator: string;
  timestamp: number;
  fileName: string;
  fileSize: number;
  receiver?: string;
  status: 'pending' | 'signed' | 'verified' | 'rejected';
}

export interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: () => Promise<void>;
  logout: () => void;
  stellarAddress: string | null;
  connectWallet: (publicKey: string) => Promise<void>;
  isWalletConnected: boolean;
}

export interface IPFSUploadResult {
  cid: string;
  size: number;
}

export interface ContractCallResult {
  success: boolean;
  transactionId?: string;
  error?: string;
}