#![no_std]
use soroban_sdk::{contract, contractimpl, contracttype, symbol_short, Env, Address, Bytes, Vec, log};

#[derive(Clone, Debug, Eq, PartialEq)]
#[contracttype]
pub struct DocumentMetadata {
    pub hash: Bytes,
    pub ipfs_cid: Bytes,
    pub creator: Address,
    pub timestamp: u64,
    pub receiver: Option<Address>,
    pub signers: Vec<Address>,
    pub signatures: Vec<Address>,
    pub nft_minted: bool,
}

#[derive(Clone, Debug, Eq, PartialEq)]
#[contracttype]
pub enum DataKey {
    Document(Bytes),
    OwnerDocs(Address),
    ReceiverDocs(Address),
}

#[contract]
pub struct DocumentTimestampContract;

#[contractimpl]
impl DocumentTimestampContract {
    pub fn store_document(
        env: Env,
        hash: Bytes,
        ipfs_cid: Bytes,
        creator: Address,
        receiver: Option<Address>,
        signers: Vec<Address>,
    ) -> bool {
        creator.require_auth();
        let timestamp = env.ledger().timestamp();

        let mut metadata = DocumentMetadata {
            hash: hash.clone(),
            ipfs_cid: ipfs_cid.clone(),
            creator: creator.clone(),
            timestamp,
            receiver: receiver.clone(),
            signers: signers.clone(),
            signatures: Vec::new(&env),
            nft_minted: false,
        };

        let doc_key = DataKey::Document(ipfs_cid.clone());
        env.storage().persistent().set(&doc_key, &metadata);

        let creator_key = DataKey::OwnerDocs(creator.clone());
        let mut creator_docs: Vec<Bytes> = env.storage()
            .persistent()
            .get(&creator_key)
            .unwrap_or(Vec::new(&env));
        creator_docs.push_back(ipfs_cid.clone());
        env.storage().persistent().set(&creator_key, &creator_docs);

        if let Some(receiver_addr) = receiver {
            let receiver_key = DataKey::ReceiverDocs(receiver_addr.clone());
            let mut receiver_docs: Vec<Bytes> = env.storage()
                .persistent()
                .get(&receiver_key)
                .unwrap_or(Vec::new(&env));
            receiver_docs.push_back(ipfs_cid.clone());
            env.storage().persistent().set(&receiver_key, &receiver_docs);
        }

        if signers.len() == 0 && !metadata.nft_minted {
            Self::mint_nft(&env, ipfs_cid.clone(), creator.clone());
            metadata.nft_minted = true;
            env.storage().persistent().set(&doc_key, &metadata);
        }

        log!(&env, "Document stored: creator={}, cid={}", creator, ipfs_cid);
        true
    }

    pub fn sign_document(env: Env, ipfs_cid: Bytes, signer: Address) {
        signer.require_auth();

        let doc_key = DataKey::Document(ipfs_cid.clone());
        let mut metadata: DocumentMetadata = env.storage().persistent().get(&doc_key).expect("Document not found");

        if !metadata.signers.contains(&signer) {
            panic!("Signer not authorized");
        }

        if metadata.signatures.contains(&signer) {
            panic!("Already signed");
        }

        metadata.signatures.push_back(signer.clone());

        let all_signed = metadata.signers.len() == metadata.signatures.len();
        if all_signed && !metadata.nft_minted {
            Self::mint_nft(&env, ipfs_cid.clone(), metadata.creator.clone());
            metadata.nft_minted = true;
        }

        env.storage().persistent().set(&doc_key, &metadata);
        log!(&env, "Signer {} signed document {}", signer, ipfs_cid);
    }

    fn mint_nft(env: &Env, cid: Bytes, to: Address) {
        let nft_contract_id = env.get_contract_id_from_name(&symbol_short!("nft"));
        let client = NftContractClient::new(env, &nft_contract_id);
        client.mint(&to, &cid);
    }

    pub fn get_document(env: Env, ipfs_cid: Bytes) -> Option<DocumentMetadata> {
        let key = DataKey::Document(ipfs_cid);
        env.storage().persistent().get(&key)
    }

    pub fn verify_document(env: Env, ipfs_cid: Bytes, provided_hash: Bytes) -> bool {
        if let Some(metadata) = Self::get_document(env, ipfs_cid) {
            metadata.hash == provided_hash
        } else {
            false
        }
    }

    pub fn get_documents_by_owner(env: Env, owner: Address) -> Vec<DocumentMetadata> {
        let key = DataKey::OwnerDocs(owner);
        let cids: Vec<Bytes> = env.storage()
            .persistent()
            .get(&key)
            .unwrap_or(Vec::new(&env));

        let mut documents = Vec::new(&env);
        for cid in cids.iter() {
            if let Some(doc) = Self::get_document(env.clone(), cid.clone()) {
                documents.push_back(doc);
            }
        }
        documents
    }

    pub fn get_documents_received_by(env: Env, receiver: Address) -> Vec<DocumentMetadata> {
        let key = DataKey::ReceiverDocs(receiver);
        let cids: Vec<Bytes> = env.storage()
            .persistent()
            .get(&key)
            .unwrap_or(Vec::new(&env));

        let mut documents = Vec::new(&env);
        for cid in cids.iter() {
            if let Some(doc) = Self::get_document(env.clone(), cid.clone()) {
                documents.push_back(doc);
            }
        }
        documents
    }

    pub fn get_document_count(env: Env, owner: Address) -> u32 {
        let key = DataKey::OwnerDocs(owner);
        let cids: Vec<Bytes> = env.storage()
            .persistent()
            .get(&key)
            .unwrap_or(Vec::new(&env));
        cids.len()
    }
}

use soroban_sdk::contractimport;

#[contractimport(name = "nft")]
pub mod nft_contract {
    pub fn mint(env: &soroban_sdk::Env, to: &soroban_sdk::Address, token_id: &soroban_sdk::Bytes);
}

#[contracttype]
pub enum ConfigKey {
    NftContractId,
}

pub fn set_nft_contract_id(env: Env, contract_id: Bytes) {
    env.storage().persistent().set(&ConfigKey::NftContractId, &contract_id);
}

fn mint_nft(env: &Env, cid: Bytes, to: Address) {
    let contract_id: Bytes = env.storage().persistent()
        .get(&ConfigKey::NftContractId)
        .expect("NFT contract not set");

    let nft_contract_id = soroban_sdk::BytesN::try_from(contract_id).unwrap();
    let client = NftContractClient::new(env, &nft_contract_id);
    client.mint(&to, &cid);
}
