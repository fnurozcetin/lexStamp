import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { DocumentMetadata } from '../types';
import { getDocumentsReceivedBy } from '../utils/stellar';
import { Link } from 'react-router-dom';
import { Inbox, FileText, Calendar, User, Eye, Check, X, Clock } from 'lucide-react';

const IncomingPage: React.FC = () => {
  const { user } = useAuth();
  const [documents, setDocuments] = useState<DocumentMetadata[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchDocuments = async () => {
      if (user?.publicKey) {
        try {
          const docs = await getDocumentsReceivedBy(user.publicKey);
          setDocuments(docs);
        } catch (error) {
          console.error('Failed to fetch incoming documents:', error);
        }
      }
      setIsLoading(false);
    };

    fetchDocuments();
  }, [user]);

  const handleAction = async (documentId: string, action: 'acknowledge' | 'reject') => {
    try {
      // In production, call smart contract to update document status
      setDocuments(prev => prev.map(doc => 
        doc.id === documentId 
          ? { ...doc, status: action === 'acknowledge' ? 'signed' : 'rejected' }
          : doc
      ));
    } catch (error) {
      console.error(`Failed to ${action} document:`, error);
    }
  };

  const formatDate = (timestamp: number): string => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'signed':
        return 'bg-accent-100 text-accent-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'signed':
        return <Check className="h-4 w-4 text-accent-600" />;
      case 'rejected':
        return <X className="h-4 w-4 text-red-600" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-600" />;
      default:
        return null;
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="w-8 h-8 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-8 border border-white/20">
        <div className="flex items-center space-x-3 mb-4">
          <Inbox className="h-8 w-8 text-primary-600" />
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Incoming Documents</h1>
            <p className="text-gray-600">Documents sent to you for review and signature</p>
          </div>
        </div>
        
        {documents.length > 0 && (
          <div className="grid md:grid-cols-3 gap-4 mt-6">
            <div className="bg-white/40 p-4 rounded-lg">
              <p className="text-2xl font-bold text-gray-900">{documents.length}</p>
              <p className="text-gray-600">Total Received</p>
            </div>
            <div className="bg-white/40 p-4 rounded-lg">
              <p className="text-2xl font-bold text-gray-900">
                {documents.filter(d => d.status === 'pending').length}
              </p>
              <p className="text-gray-600">Pending Review</p>
            </div>
            <div className="bg-white/40 p-4 rounded-lg">
              <p className="text-2xl font-bold text-gray-900">
                {documents.filter(d => d.status === 'signed').length}
              </p>
              <p className="text-gray-600">Acknowledged</p>
            </div>
          </div>
        )}
      </div>

      {/* Documents List */}
      <div className="bg-white/60 backdrop-blur-sm rounded-2xl border border-white/20 overflow-hidden">
        {documents.length === 0 ? (
          <div className="p-12 text-center">
            <Inbox className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No incoming documents</h3>
            <p className="text-gray-500">Documents sent to you will appear here</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {documents.map((doc) => (
              <div key={doc.id} className="p-6 hover:bg-white/40 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <FileText className="h-8 w-8 text-primary-600" />
                    <div>
                      <h3 className="font-semibold text-gray-900">{doc.fileName}</h3>
                      <div className="flex items-center space-x-4 mt-1 text-sm text-gray-500">
                        <div className="flex items-center space-x-1">
                          <User className="h-4 w-4" />
                          <span>From: {doc.creator.substring(0, 8)}...</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Calendar className="h-4 w-4" />
                          <span>{formatDate(doc.timestamp)}</span>
                        </div>
                        <span>{formatFileSize(doc.fileSize)}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    <div className={`flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(doc.status)}`}>
                      {getStatusIcon(doc.status)}
                      <span className="capitalize">{doc.status}</span>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Link
                        to={`/document/${doc.id}`}
                        className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                        title="View document"
                      >
                        <Eye className="h-4 w-4" />
                      </Link>
                      
                      {doc.status === 'pending' && (
                        <>
                          <button
                            onClick={() => handleAction(doc.id, 'acknowledge')}
                            className="p-2 text-accent-600 hover:text-accent-700 hover:bg-accent-50 rounded-lg transition-colors"
                            title="Acknowledge"
                          >
                            <Check className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleAction(doc.id, 'reject')}
                            className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                            title="Reject"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default IncomingPage;