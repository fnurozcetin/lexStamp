import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { DocumentMetadata } from '../types';
import { getFromIPFS } from '../utils/ipfs';
import { ArrowLeft, FileText, User, Calendar, Hash, Globe, Download, Check, AlertCircle, Clock } from 'lucide-react';

const DocumentViewer: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [document, setDocument] = useState<DocumentMetadata | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDocument = async () => {
      if (!id) return;

      try {
        // In production, fetch document metadata from smart contract
        const mockDocument: DocumentMetadata = {
          id: id,
          hash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
          ipfsCid: 'QmTest' + id,
          creator: 'GCREATOR' + 'A'.repeat(49),
          timestamp: Date.now() - 86400000,
          fileName: 'Sample Document.pdf',
          fileSize: 245760,
          status: 'signed'
        };

        setDocument(mockDocument);

        // Fetch PDF from IPFS
        const blob = await getFromIPFS(mockDocument.ipfsCid);
        const url = URL.createObjectURL(blob);
        setPdfUrl(url);
      } catch (err) {
        setError('Failed to load document');
        
      }

      setIsLoading(false);
    };

    fetchDocument();

    return () => {
      setPdfUrl((prevUrl) => {
      if (prevUrl) URL.revokeObjectURL(prevUrl);
      return null;
    });
  };
}, [id]);

  const formatDate = (timestamp: number): string => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'signed':
        return <Check className="h-5 w-5 text-accent-600" />;
      case 'verified':
        return <Check className="h-5 w-5 text-green-600" />;
      case 'pending':
        return <Clock className="h-5 w-5 text-yellow-600" />;
      default:
        return <AlertCircle className="h-5 w-5 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'signed':
        return 'bg-accent-100 text-accent-800 border-accent-200';
      case 'verified':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const downloadDocument = () => {
    if (pdfUrl && document) {
      const link = window.document.createElement('a');
      link.href = pdfUrl;
      link.download = document.fileName;
      link.click();
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="w-8 h-8 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !document) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="h-16 w-16 text-red-400 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Document not found</h2>
        <p className="text-gray-600 mb-6">{error || 'The document you\'re looking for doesn\'t exist.'}</p>
        <Link
          to="/"
          className="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Home
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link
            to="/"
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{document.fileName}</h1>
            <p className="text-gray-600">Document viewer and verification</p>
          </div>
        </div>
        
        <button
          onClick={downloadDocument}
          className="flex items-center space-x-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
        >
          <Download className="h-4 w-4" />
          <span>Download</span>
        </button>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Document Viewer */}
        <div className="lg:col-span-2">
          <div className="bg-white/60 backdrop-blur-sm rounded-2xl border border-white/20 overflow-hidden">
            <div className="p-4 border-b border-gray-200">
              <h2 className="font-semibold text-gray-900">Document Preview</h2>
            </div>
            
            <div className="p-6">
              {pdfUrl ? (
                <iframe
                  src={pdfUrl}
                  className="w-full h-96 border border-gray-300 rounded-lg"
                  title="PDF Viewer"
                />
              ) : (
                <div className="flex items-center justify-center h-96 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="text-center">
                    <FileText className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500">Unable to preview document</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Document Metadata */}
        <div className="space-y-6">
          {/* Status */}
          <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
            <h3 className="font-semibold text-gray-900 mb-4">Status</h3>
            <div className={`flex items-center space-x-2 px-3 py-2 rounded-lg border ${getStatusColor(document.status)}`}>
              {getStatusIcon(document.status)}
              <span className="font-medium capitalize">{document.status}</span>
            </div>
          </div>

          {/* Document Info */}
          <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
            <h3 className="font-semibold text-gray-900 mb-4">Document Information</h3>
            
            <div className="space-y-4">
              <div className="flex items-start space-x-3">
                <User className="h-5 w-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-gray-700">Creator</p>
                  <p className="text-sm text-gray-600 font-mono break-all">
                    {document.creator}
                  </p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <Calendar className="h-5 w-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-gray-700">Created</p>
                  <p className="text-sm text-gray-600">
                    {formatDate(document.timestamp)}
                  </p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <FileText className="h-5 w-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-gray-700">File Size</p>
                  <p className="text-sm text-gray-600">
                    {formatFileSize(document.fileSize)}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Verification Details */}
          <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
            <h3 className="font-semibold text-gray-900 mb-4">Verification Details</h3>
            
            <div className="space-y-4">
              <div className="flex items-start space-x-3">
                <Hash className="h-5 w-5 text-gray-400 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-700">SHA-256 Hash</p>
                  <p className="text-xs text-gray-600 font-mono break-all">
                    {document.hash}
                  </p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <Globe className="h-5 w-5 text-gray-400 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-700">IPFS CID</p>
                  <p className="text-xs text-gray-600 font-mono break-all">
                    {document.ipfsCid}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DocumentViewer;