import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { useAuth } from '../contexts/AuthContext';
import { generateSHA256 } from '../utils/crypto';
import { uploadToIPFS } from '../utils/ipfs';
import { callSorobanContract } from '../utils/stellar';
import { Upload, FileText, Check, AlertCircle, Hash, Globe, Send } from 'lucide-react';

interface UploadStep {
  id: string;
  name: string;
  status: 'pending' | 'processing' | 'completed' | 'error';
}

const UploadPage: React.FC = () => {
  const { user, isWalletConnected } = useAuth();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [receiver, setReceiver] = useState('');
  const [steps, setSteps] = useState<UploadStep[]>([
    { id: 'hash', name: 'Generate SHA-256 Hash', status: 'pending' },
    { id: 'ipfs', name: 'Upload to IPFS', status: 'pending' },
    { id: 'contract', name: 'Store on Blockchain', status: 'pending' },
  ]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [documentHash, setDocumentHash] = useState('');
  const [ipfsCid, setIpfsCid] = useState('');

  const updateStepStatus = (stepId: string, status: UploadStep['status']) => {
    setSteps(prev => prev.map(step => 
      step.id === stepId ? { ...step, status } : step
    ));
  };

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file && file.type === 'application/pdf') {
      setSelectedFile(file);
      // Reset steps
      setSteps(prev => prev.map(step => ({ ...step, status: 'pending' })));
      setDocumentHash('');
      setIpfsCid('');
    } else {
      alert('Please upload a PDF file');
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf']
    },
    maxFiles: 1
  });

  const processDocument = async () => {
    if (!selectedFile || !user?.publicKey || !isWalletConnected) return;

    setIsProcessing(true);

    try {
      // Step 1: Generate hash
      updateStepStatus('hash', 'processing');
      const hash = await generateSHA256(selectedFile);
      setDocumentHash(hash);
      updateStepStatus('hash', 'completed');

      // Step 2: Upload to IPFS
      updateStepStatus('ipfs', 'processing');
      const { cid } = await uploadToIPFS(selectedFile);
      setIpfsCid(cid);
      updateStepStatus('ipfs', 'completed');

      // Step 3: Call smart contract
      updateStepStatus('contract', 'processing');
      const result = await callSorobanContract(
        'CONTRACT_ADDRESS', // Replace with actual contract address
        'store_document',
        [hash, cid, user.publicKey, receiver || null],
        user.publicKey
      );

      if (result.success) {
        updateStepStatus('contract', 'completed');
      } else {
        updateStepStatus('contract', 'error');
        throw new Error(result.error || 'Contract call failed');
      }

    } catch (error) {
      console.error('Processing failed:', error);
      // Mark current processing step as error
      const currentStep = steps.find(step => step.status === 'processing');
      if (currentStep) {
        updateStepStatus(currentStep.id, 'error');
      }
    }

    setIsProcessing(false);
  };

  const getStepIcon = (step: UploadStep) => {
    switch (step.status) {
      case 'completed':
        return <Check className="h-5 w-5 text-accent-600" />;
      case 'processing':
        return <div className="w-5 h-5 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />;
      case 'error':
        return <AlertCircle className="h-5 w-5 text-red-600" />;
      default:
        return <div className="w-5 h-5 rounded-full border-2 border-gray-300" />;
    }
  };

  const getStepStatusColor = (status: UploadStep['status']) => {
    switch (status) {
      case 'completed':
        return 'text-accent-600';
      case 'processing':
        return 'text-primary-600';
      case 'error':
        return 'text-red-600';
      default:
        return 'text-gray-500';
    }
  };

  const allStepsCompleted = steps.every(step => step.status === 'completed');

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-8 border border-white/20">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Upload & Sign Document</h1>
        <p className="text-gray-600">Securely timestamp and sign your documents on the blockchain</p>
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Upload Section */}
        <div className="space-y-6">
          <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Document Upload</h2>
            
            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-200 ${
                isDragActive
                  ? 'border-primary-400 bg-primary-50'
                  : selectedFile
                  ? 'border-accent-400 bg-accent-50'
                  : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
              }`}
            >
              <input {...getInputProps()} />
              {selectedFile ? (
                <div className="space-y-3">
                  <FileText className="h-12 w-12 text-accent-600 mx-auto" />
                  <div>
                    <p className="font-semibold text-gray-900">{selectedFile.name}</p>
                    <p className="text-sm text-gray-500">
                      {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <Upload className="h-12 w-12 text-gray-400 mx-auto" />
                  <div>
                    <p className="text-lg font-medium text-gray-900">
                      {isDragActive ? 'Drop the PDF here' : 'Drag & drop your PDF'}
                    </p>
                    <p className="text-gray-500">or click to select a file</p>
                  </div>
                </div>
              )}
            </div>

            {selectedFile && (
              <div className="mt-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Send to (optional)
                  </label>
                  <input
                    type="text"
                    value={receiver}
                    onChange={(e) => setReceiver(e.target.value)}
                    placeholder="Enter Stellar address (optional)"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Leave empty to sign for yourself only
                  </p>
                </div>

                <button
                  onClick={processDocument}
                  disabled={!isWalletConnected || isProcessing}
                  className="w-full bg-gradient-to-r from-primary-600 to-secondary-600 text-white py-3 px-6 rounded-xl font-semibold hover:from-primary-700 hover:to-secondary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                >
                  {isProcessing ? (
                    <div className="flex items-center justify-center space-x-2">
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Processing...</span>
                    </div>
                  ) : !isWalletConnected ? (
                    'Connect Wallet First'
                  ) : (
                    'Sign and Save Document'
                  )}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Process Status */}
        <div className="space-y-6">
          <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Processing Status</h2>
            
            <div className="space-y-4">
              {steps.map((step, index) => (
                <div key={step.id} className="flex items-center space-x-3">
                  {getStepIcon(step)}
                  <div className="flex-1">
                    <p className={`font-medium ${getStepStatusColor(step.status)}`}>
                      {step.name}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {allStepsCompleted && (
              <div className="mt-6 p-4 bg-accent-50 border border-accent-200 rounded-lg">
                <div className="flex items-center space-x-2">
                  <Check className="h-5 w-5 text-accent-600" />
                  <span className="font-semibold text-accent-800">Document successfully processed!</span>
                </div>
              </div>
            )}
          </div>

          {/* Document Details */}
          {(documentHash || ipfsCid) && (
            <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Document Details</h3>
              
              <div className="space-y-3">
                {documentHash && (
                  <div className="flex items-start space-x-3">
                    <Hash className="h-5 w-5 text-gray-400 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-700">SHA-256 Hash</p>
                      <p className="text-xs text-gray-500 font-mono break-all">{documentHash}</p>
                    </div>
                  </div>
                )}
                
                {ipfsCid && (
                  <div className="flex items-start space-x-3">
                    <Globe className="h-5 w-5 text-gray-400 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-700">IPFS CID</p>
                      <p className="text-xs text-gray-500 font-mono break-all">{ipfsCid}</p>
                    </div>
                  </div>
                )}
                
                {receiver && (
                  <div className="flex items-start space-x-3">
                    <Send className="h-5 w-5 text-gray-400 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-700">Sent to</p>
                      <p className="text-xs text-gray-500 font-mono break-all">{receiver}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default UploadPage;