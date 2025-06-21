import React, { useState, useEffect } from 'react';
import { Wallet, Shield, ArrowRight } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { getAddress, isConnected, requestAccess } from '@stellar/freighter-api';

const WalletConnectionPage: React.FC = () => {
  const { connectWallet, isWalletConnected, isLoading } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState('');

  useEffect(() => {
    if (isWalletConnected && !isLoading) {
      // Passkey sayfasına yönlendir
      navigate('/login');
    }
  }, [isWalletConnected, isLoading, navigate]);

  const handleConnectWallet = async () => {
    setError('');
    try {
      console.log('Freighter API kontrol ediliyor...');
      console.log('typeof getAddress:', typeof getAddress);
      console.log('typeof isConnected:', typeof isConnected);

      // Freighter API fonksiyonlarının varlığını kontrol et (window.freighter yerine)
      if (typeof getAddress !== 'function' || typeof isConnected !== 'function') {
        throw new Error('Freighter API bulunamadı. Lütfen Freighter wallet uzantısını kurun ve sayfayı yenileyin.');
      }

      // Freighter wallet bağlantısını kontrol et
      console.log('isConnected() çağrılıyor...');
      const connected = await isConnected();
      console.log('Freighter bağlantı durumu:', connected);
      
      if (!connected) {
        throw new Error('Freighter wallet bağlı değil. Lütfen Freighter\'ı açın ve bir Stellar hesabı seçin.');
      }

      // Adres bilgisini al - Freighter API bazen zaman aşımına uğrar, retry mekanizması ekleyelim
      console.log('Adres alınıyor...');
      let addressResult;
      
      try {
        // İlk olarak erişim izni iste
        console.log('Freighter erişim izni isteniyor...');
        await requestAccess();
        
        // Sonra adresi al
        addressResult = await Promise.race([
          getAddress(),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Adres alma zaman aşımına uğradı')), 10000)
          )
        ]);
      } catch (timeoutError) {
        console.log('İlk deneme başarısız, hata:', timeoutError);
        console.log('Tekrar deneniyor...');
        // İkinci deneme - sadece getAddress
        try {
          addressResult = await getAddress();
        } catch (secondError) {
          console.log('İkinci deneme de başarısız, hata:', secondError);
          console.log('requestAccess tekrar deneniyor...');
          // Üçüncü deneme - requestAccess tekrar
          await requestAccess();
          addressResult = await getAddress();
        }
      }

      console.log('Ham adres sonucu:', addressResult);
      console.log('Adres sonucu tipi:', typeof addressResult);

      if (!addressResult) {
        throw new Error('Freighter\'dan adres alınamadı. Freighter\'da bir hesap seçildiğinden emin olun.');
      }

      let address: string;

      // Freighter API'den gelen farklı format türlerini handle et
      if (typeof addressResult === 'string') {
        address = addressResult;
      } else if (addressResult && typeof addressResult === 'object') {
        console.log('Obje içeriği:', JSON.stringify(addressResult, null, 2));
        // Eğer obje ise, olası alanları kontrol et
        address = (addressResult as any).address || 
                 (addressResult as any).publicKey || 
                 (addressResult as any).stellarAddress ||
                 (addressResult as any).key ||
                 (addressResult as any).accountId;
      } else {
        throw new Error('Freighter\'dan beklenmeyen adres formatı alındı: ${typeof addressResult}');
      }

      console.log('İşlenmiş adres:', address);

      // Adres validasyonu - Stellar adresleri G ile başlar ve 56 karakter uzunluğundadır
      if (!address || typeof address !== 'string') {
        throw new Error('Freighter\'dan geçerli bir adres alınamadı. Lütfen Freighter\'da hesap seçildiğinden emin olun.');
      }

      const trimmedAddress = address.trim();
      
      if (!trimmedAddress.startsWith('G') || trimmedAddress.length !== 56) {
        throw new Error('Geçersiz Stellar adresi: "${trimmedAddress}". Stellar adresleri G ile başlamalı ve 56 karakter uzunluğunda olmalıdır.');
      }

      // Wallet bağlantısını gerçekleştir
      console.log('Cüzdan bağlanıyor, adres:', trimmedAddress);
      await connectWallet(trimmedAddress);
      
    } catch (error) {
      console.error('Cüzdan bağlantısı başarısız:', error);
      if (error instanceof Error) {
        setError(error.message);
      } else {
        setError('Bilinmeyen bir hata nedeniyle cüzdan bağlantısı başarısız oldu.');
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white/80 backdrop-blur-md p-8 rounded-2xl shadow-xl border border-white/20 w-full max-w-md">
        <div className="text-center mb-8">
          <Wallet className="h-16 w-16 text-primary-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Cüzdanınızı Bağlayın</h2>
          <p className="text-gray-600">Devam etmek için Stellar cüzdanınızı Freighter ile bağlayın</p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-600 text-center">{error}</p>
          </div>
        )}

        <div className="space-y-4 mb-6">
          <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
            <Shield className="h-5 w-5 text-green-600" />
            <span className="text-sm text-gray-700">Güvenli Stellar ağ bağlantısı</span>
          </div>
          <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
            <Shield className="h-5 w-5 text-green-600" />
            <span className="text-sm text-gray-700">Anahtarlarınız, kontrolünüz</span>
          </div>
        </div>

        <button
          onClick={handleConnectWallet}
          disabled={isLoading}
          className="w-full bg-gradient-to-r from-primary-600 to-secondary-600 text-white py-4 px-6 rounded-xl font-semibold hover:from-primary-700 hover:to-secondary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 flex items-center justify-center space-x-2"
        >
          {isLoading ? (
            <div className="flex items-center justify-center space-x-2">
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <span>Bağlanıyor...</span>
            </div>
          ) : (
            <>
              <Wallet className="h-5 w-5" />
              <span>Freighter ile Bağlan</span>
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </button>

        <div className="mt-4 text-center">
          <p className="text-sm text-gray-500">
            Freighter cüzdan uzantısı gereklidir
          </p>
          <a 
            href="https://freighter.app/" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-xs text-primary-600 hover:text-primary-700 underline mt-1 inline-block"
          >
            Freighter'ı indir
          </a>
        </div>
      </div>
    </div>
  );
};

export default WalletConnectionPage;