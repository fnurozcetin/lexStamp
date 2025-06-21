# LexStamp - Secure Document Timestamping dApp

A comprehensive document timestamping and digital signature application built with React, Stellar Soroban smart contracts, IPFS, and passkey authentication.

## Features

### 🔐 Security First
- **Passkey Authentication**: WebAuthn-based login for maximum security
- **Stellar Wallet Integration**: Connect with Freighter wallet
- **SHA-256 Hashing**: Client-side document hashing for privacy
- **Blockchain Timestamping**: Immutable timestamps on Stellar blockchain

### 📄 Document Management
- **Upload & Sign**: Drag-and-drop PDF upload with automated processing
- **Document Home**: View all your timestamped documents
- **Incoming Documents**: Receive and manage documents from others
- **Document Viewer**: Embedded PDF viewer with metadata display

### 🔗 Decentralized Storage
- **IPFS Integration**: Secure, distributed document storage
- **Privacy Preserving**: Only document hashes stored on-chain
- **Content Addressing**: Cryptographic verification of document integrity

### 🌟 User Experience
- **Responsive Design**: Works seamlessly on all devices
- **Real-time Status**: Live processing updates during uploads
- **Smooth Animations**: Polished UI with micro-interactions
- **Intuitive Navigation**: Clean, professional interface

## Technology Stack

### Frontend
- **React 18** with TypeScript
- **Tailwind CSS** for styling
- **React Router** for navigation
- **Lucide React** for icons
- **React Dropzone** for file uploads

### Blockchain
- **Stellar Soroban** smart contracts (Rust)
- **Stellar SDK** for blockchain interaction
- **Freighter Wallet** integration

### Storage & Security
- **IPFS** via Web3.Storage
- **CryptoJS** for SHA-256 hashing
- **WebAuthn** for passkey authentication

## Quick Start

### Prerequisites
- Node.js 18+
- npm or yarn
- Stellar Testnet account
- Freighter wallet extension

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd document-timestamp-dapp
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start development server**
   ```bash
   npm run dev
   ```

4. **Open in browser**
   Navigate to `http://localhost:5173`

### Smart Contract Deployment

1. **Install Soroban CLI**
   ```bash
   # Follow Stellar documentation for Soroban CLI setup
   ```

2. **Build contract**
   ```bash
   cargo build --target wasm32-unknown-unknown --release
   ```

3. **Deploy to testnet**
   ```bash
   soroban contract deploy --wasm target/wasm32-unknown-unknown/release/document_timestamp.wasm --network testnet
   ```

## Architecture

### Smart Contract Functions

- `store_document()` - Store document metadata on blockchain
- `get_documents_by_owner()` - Retrieve user's documents
- `get_documents_received_by()` - Get incoming documents
- `verify_document()` - Verify document integrity
- `get_document()` - Fetch specific document metadata

### Document Processing Flow

1. **Upload**: User drops PDF file
2. **Hash**: Generate SHA-256 hash client-side
3. **IPFS**: Upload document to distributed storage
4. **Blockchain**: Store metadata in Soroban contract
5. **Verification**: Document ready for sharing/signing

### Authentication Flow

1. **Passkey Login**: WebAuthn credential creation/verification
2. **Wallet Connection**: Freighter wallet integration
3. **Session Management**: Secure session storage
4. **Authorization**: Transaction signing with user keys

## Security Considerations

- Documents never stored on blockchain (only hashes)
- Client-side hashing preserves privacy
- Passkey authentication eliminates password risks
- IPFS provides censorship-resistant storage
- Smart contract ensures immutable timestamps

## Development

### Project Structure
```
src/
├── components/          # Reusable UI components
├── contexts/           # React contexts (Auth, etc.)
├── pages/              # Main application pages
├── types/              # TypeScript type definitions
├── utils/              # Utility functions
└── contracts/          # Soroban smart contracts
```

### Key Components
- `AuthProvider` - Authentication context and state
- `Layout` - Main application layout with navigation
- `Home` - Document overview and statistics
- `UploadPage` - Document upload and processing
- `IncomingPage` - Received documents management
- `DocumentViewer` - PDF display and verification

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT License - see LICENSE file for details

## Support

For questions or support, please open an issue on GitHub.