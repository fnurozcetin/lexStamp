'use client';
import React, { useEffect, useState } from 'react';
import { Shield, Clock, FileText, Users } from 'lucide-react';
import Link from 'next/link'
import { account, server } from "../utils/passkey-kit";
import {useKeyIdStore} from '../store/keyId';
import {useContractIdStore} from '../store/contractId';
import { truncate } from "../utils/base";
import { useNavigate } from 'react-router-dom';

export default function LoginPage() {
    const [creating, setCreating] = useState(false)
    const navigate = useNavigate();
    const contractId = useContractIdStore((state) => state.contractId)
    const updateContractId = useContractIdStore((state) => state.setContractId)

    //const keyId = useKeyIdStore((state) => state.keyId)
    const updateKeyId = useKeyIdStore((state) => state.setKeyId)

    useEffect(() => {
        if (localStorage.hasOwnProperty("ssd:keyId")) {
            updateKeyId(localStorage.getItem("ssd:keyId")!)
        }

        return () => {

        };
    }, []);

    async function signUp() {
        setCreating(true);

        try {

            const { 
                keyIdBase64,
                contractId: cid,
                signedTx,
            } = await account.createWallet("Smart Stellar Demo", "Smart Stellar Demo User");

            await server.send(signedTx);

            updateKeyId(keyIdBase64);
            localStorage.setItem("ssd:keyId", keyIdBase64);

            updateContractId(cid)
        } finally {
            setCreating(false);
        }
    }

    async function login() {
        try {
            const { keyIdBase64, contractId: cid } = await account.connectWallet();
            if (!keyIdBase64 || !cid) {
                console.error("Invalid response from connectWallet:", { keyIdBase64, cid });
                throw new Error("connectWallet returned undefined keyIdBase64 or contractId");
            }
            console.log("keyIdBase64:", keyIdBase64);
            updateKeyId(keyIdBase64);
            localStorage.setItem("ssd:keyId", keyIdBase64);
            console.log("Contract ID:", cid);
            updateContractId(cid);
        } catch (error) {
            console.error("Error in login:", error);
            throw error;
        }
    }

    async function logout() {
        updateContractId('');

        Object.keys(localStorage).forEach((key) => {
            if (key.includes("ssd:")) {
                localStorage.removeItem(key);
            }
        });

        Object.keys(sessionStorage).forEach((key) => {
            if (key.includes("ssd:")) {
                sessionStorage.removeItem(key);
            }
        });

        location.reload();
    }

    const features = [
    { icon: Shield, title: 'Secure Authentication', description: 'Passkey-based login with military-grade security' },
    { icon: Clock, title: 'Immutable Timestamps', description: 'Blockchain-verified document timestamps' },
    { icon: FileText, title: 'Document Integrity', description: 'SHA-256 hashing ensures document authenticity' },
    { icon: Users, title: 'Collaborative Signing', description: 'Send documents for signature and verification' },
  ];

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center p-4">
            <div className="max-w-6xl mx-auto grid lg:grid-cols-2 gap-12 items-center">
                <div className="space-y-8">
                    <div className="text-center lg:text-left">
                        <div className="flex items-center justify-center lg:justify-start space-x-3 mb-6">
                        <FileText className="h-12 w-12 text-primary-600" />
                        <h1 className="text-4xl font-bold text-gray-900">LexStamp</h1>
                        </div>
                        <p className="text-xl text-gray-600 mb-8">
                        Secure document timestamping and digital signatures powered by blockchain technology
                        </p>
                    </div>
                    <div className="grid sm:grid-cols-2 gap-6">
                        {features.map((feature, index) => (
                        <div
                            key={index}
                            className="bg-white/60 backdrop-blur-sm p-6 rounded-xl border border-white/20 hover:bg-white/80 transition-all duration-300 animate-slide-up"
                            style={{ animationDelay: `${index * 100}ms` }}
                        >
                            <feature.icon className="h-8 w-8 text-primary-600 mb-3" />
                            <h3 className="font-semibold text-gray-900 mb-2">{feature.title}</h3>
                            <p className="text-sm text-gray-600">{feature.description}</p>
                        </div>
                        ))}
                    </div>
                </div>

                <div className="flex justify-center">
                    <div className="bg-white/80 backdrop-blur-md p-8 rounded-2xl shadow-xl border border-white/20 w-full max-w-md animate-fade-in">
                        <div className="text-center mb-8">
                        <h2 className="text-2xl font-bold text-gray-900 mb-2">
                            {contractId ? 'Connected Wallet' : 'Welcome to LexStamp'}
                        </h2>
                        <p className="text-gray-600">
                            {contractId
                            ? 'Your Stellar smart contract is active.'
                            : 'Sign in or create a passkey-based wallet to continue.'}
                        </p>
                        </div>

                        {contractId ? (
                        <>
                            <a
                            className="block text-blue-600 underline text-center mb-4 font-mono"
                            href={`https://stellar.expert/explorer/public/contract/${contractId}`}
                            target="_blank"
                            >
                            {truncate(contractId, 4)}
                            </a>
                            <button
                            className="w-full bg-red-500 text-white py-3 px-6 rounded-xl font-semibold hover:bg-red-600 transition-all duration-200"
                            onClick={logout}
                            >
                            Logout
                            </button>
                        </>
                        ) : (
                        <>
                            <div className="flex flex-col gap-4">
                            <button
                                className="w-full bg-gradient-to-r from-primary-600 to-secondary-600 text-white py-4 px-6 rounded-xl font-semibold hover:from-primary-700 hover:to-secondary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                                onClick={login}
                            >
                                Login
                            </button>
                            <button
                                className="w-full bg-gradient-to-r from-primary-600 to-secondary-600 text-white py-4 px-6 rounded-xl font-semibold hover:from-primary-700 hover:to-secondary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                                onClick={signUp}
                                disabled={creating}
                            >
                                {creating ? 'Creating...' : 'Create New Account'}
                            </button>
                            </div>
                        </>
                        )}

                        <div className="mt-6 text-center">
                        <p className="text-sm text-gray-500">
                            Secured by Passkeys & Stellar Smart Contracts
                        </p>
                        </div>
                    </div>
                    </div>
            </div>
        </div>    
    );
}