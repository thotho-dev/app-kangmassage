import React, { createContext, useContext, useState, useEffect } from 'react';
import * as Location from 'expo-location';

interface LocationContextType {
  address: string;
  coords: { latitude: number; longitude: number } | null;
  setAddress: (address: string) => void;
  setCoords: (coords: { latitude: number; longitude: number }) => void;
  isLoading: boolean;
  refreshLocation: () => Promise<void>;
}

const LocationContext = createContext<LocationContextType | undefined>(undefined);

export const LocationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [address, setAddress] = useState('Mencari lokasi...');
  const [coords, setCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshLocation = async () => {
    setIsLoading(true);
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setAddress('Izin lokasi ditolak');
        setIsLoading(false);
        return;
      }

      let location = await Location.getCurrentPositionAsync({});
      const newCoords = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      };
      setCoords(newCoords);

      const reverse = await Location.reverseGeocodeAsync(newCoords);
      if (reverse.length > 0) {
        const item = reverse[0];
        // Membangun alamat yang lebih lengkap agar validasi wilayah voucher lebih akurat
        const addressParts = [
          item.street,
          item.name,
          item.subregion, // Biasanya berisi "Jakarta Barat", "Jakarta Selatan", dll
          item.city,
          item.region
        ].filter(Boolean);
        
        setAddress(addressParts.join(', '));
      }
    } catch (error) {
      console.error('Error fetching location:', error);
      setAddress('Gagal mendapatkan lokasi');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshLocation();
  }, []);

  return (
    <LocationContext.Provider value={{ 
      address, 
      coords, 
      setAddress, 
      setCoords, 
      isLoading, 
      refreshLocation 
    }}>
      {children}
    </LocationContext.Provider>
  );
};

export const useLocation = () => {
  const context = useContext(LocationContext);
  if (context === undefined) {
    throw new Error('useLocation must be used within a LocationProvider');
  }
  return context;
};
