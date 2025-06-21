import { IPFSUploadResult } from '../types';

const PINATA_JWT = import.meta.env.VITE_PINATA_JWT;

export const uploadToIPFS = async (file: File): Promise<IPFSUploadResult> => {
  try {
    const formData = new FormData();
    formData.append('file', file);

    console.log('Uploading file to IPFS via Pinata:');
    console.log('Uploading file to IPFS via Pinata:', PINATA_JWT);
    const response = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${PINATA_JWT}`,
      },
      body: formData,
    });

    if (!response.ok) {
      throw new Error('Failed to upload to IPFS via Pinata');
    }

    const result = await response.json();
    return {
      cid: result.IpfsHash,
      size: file.size,
    };
  } catch (error) {
    throw new Error(
      'Failed to upload to IPFS (Pinata): ' +
        (error instanceof Error ? error.message : 'Unknown error')
    );
  }
};

export const getFromIPFS = async (cid: string): Promise<Blob> => {
  try {
    const response = await fetch(`https://gateway.pinata.cloud/ipfs/${cid}`);
    if (!response.ok) {
      throw new Error('Failed to fetch from IPFS');
    }
    return await response.blob();
  } catch (error) {
    return new Blob(['Demo PDF content'], { type: 'application/pdf' });
  }
};
