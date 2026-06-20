import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, StatusBar, TextInput, BackHandler, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft, MapPin, Search, Navigation } from 'lucide-react-native';
import { WebView } from 'react-native-webview';
import * as Location from 'expo-location';
import { useLocation } from '@/context/LocationContext';
import { Asset } from 'expo-asset';
import * as FileSystem from 'expo-file-system';

const PURPLE = '#240080';
const TEXT_DARK = '#1A1A2E';
const TEXT_MUTED = '#6B7280';
const BORDER = '#EFEFEF';

const LEAFLET_HTML = (lat: number, lng: number, pinUri: string) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body, html, #map { width: 100%; height: 100%; }
    .leaflet-control-zoom { display: none; }
    .leaflet-control-attribution { display: none !important; }
    #centerPin {
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -100%);
      z-index: 9999;
      pointer-events: none;
      transition: transform 0.2s ease-out, filter 0.2s ease-out;
      filter: drop-shadow(0 4px 6px rgba(0,0,0,0.3));
    }
    #centerPin.lifted {
      transform: translate(-50%, -130%);
      filter: drop-shadow(0 8px 16px rgba(36,0,128,0.4));
      transition: transform 0.15s ease-out, filter 0.15s ease-out;
    }
    #centerPin.dropping {
      animation: drop 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
    }
    @keyframes drop {
      0% { transform: translate(-50%, -130%); filter: drop-shadow(0 8px 16px rgba(36,0,128,0.4)); }
      60% { transform: translate(-50%, -95%); filter: drop-shadow(0 4px 6px rgba(0,0,0,0.3)); }
      80% { transform: translate(-50%, -105%); }
      100% { transform: translate(-50%, -100%); filter: drop-shadow(0 4px 6px rgba(0,0,0,0.3)); }
    }
    #centerPin img {
      width: 48px;
      height: 48px;
      object-fit: contain;
    }
    #centerPin .pin-leg {
      width: 3px;
      height: 14px;
      background: #FF6B2C;
      margin: -2px auto 0;
      border-radius: 2px;
    }
  </style>
</head>
<body>
  <div id="map"></div>
  <div id="centerPin">
    <img src="${pinUri}" alt="pin" />
    <div class="pin-leg"></div>
  </div>
  <script>
    var map = L.map('map', {
      zoomControl: false,
      attributionControl: false
    }).setView([${lat}, ${lng}], 16);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19
    }).addTo(map);

    var pin = document.getElementById('centerPin');

    map.on('movestart', function() {
      pin.classList.remove('dropping');
      pin.classList.add('lifted');
    });

    map.on('moveend', function() {
      var center = map.getCenter();
      pin.classList.remove('lifted');
      pin.classList.add('dropping');
      window.ReactNativeWebView.postMessage(JSON.stringify({
        type: 'move',
        lat: center.lat,
        lng: center.lng
      }));
    });

    window.updatePosition = function(lat, lng) {
      map.setView([lat, lng], map.getZoom());
      pin.classList.remove('lifted');
      pin.classList.remove('dropping');
      void pin.offsetHeight;
      pin.classList.add('dropping');
    };
  </script>
</body>
</html>
`;

export default function MapsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { serviceId, from, sourceFrom } = useLocalSearchParams();
  const webViewRef = useRef<WebView>(null);
  const [pinUri, setPinUri] = useState('');

  useEffect(() => {
    (async () => {
      const asset = Asset.fromModule(require('@/assets/icon-app-user.png'));
      await asset.downloadAsync();
      const b64 = await FileSystem.readAsStringAsync(asset.uri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      setPinUri(`data:image/png;base64,${b64}`);
    })();
  }, []);

  useFocusEffect(
    useCallback(() => {
      const backAction = () => {
        if (from === 'order') {
          router.replace({ pathname: '/order', params: { serviceId, from: sourceFrom as string } });
          return true;
        }
        router.replace({ pathname: '/home' });
        return true;
      };

      const backHandler = BackHandler.addEventListener(
        'hardwareBackPress',
        backAction
      );

      return () => backHandler.remove();
    }, [from, sourceFrom, serviceId])
  );

  const { address, setAddress, coords, setCoords } = useLocation();
  const [localAddress, setLocalAddress] = useState(address);
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const [region, setRegion] = useState({
    latitude: coords?.latitude || -6.1754,
    longitude: coords?.longitude || 106.8272,
    latitudeDelta: 0.01,
    longitudeDelta: 0.01,
  });

  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  const fetchSuggestions = (text: string) => {
    setLocalAddress(text);
    if (text.length < 3) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(async () => {
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(text)}&format=json&limit=5&countrycodes=id`,
          {
            headers: {
              'User-Agent': 'KangMassageUserApp/1.0',
              'Accept-Language': 'id-ID'
            }
          }
        );
        
        if (!response.ok) {
          setSuggestions([]);
          setShowSuggestions(false);
          return;
        }

        const data = await response.json();
        if (Array.isArray(data) && data.length > 0) {
          setSuggestions(data);
          setShowSuggestions(true);
        } else {
          setSuggestions([]);
          setShowSuggestions(false);
        }
      } catch (error) {
        setSuggestions([]);
        setShowSuggestions(false);
      }
    }, 600);
  };

  const selectSuggestion = (item: any) => {
    const lat = parseFloat(item.lat);
    const lon = parseFloat(item.lon);
    setRegion(prev => ({ ...prev, latitude: lat, longitude: lon }));
    webViewRef.current?.postMessage(JSON.stringify({ type: 'update', lat, lng: lon }));
    setLocalAddress(item.display_name);
    setShowSuggestions(false);
  };

  useEffect(() => {
    if (coords) {
      const newRegion = {
        ...region,
        latitude: coords.latitude,
        longitude: coords.longitude,
      };
      setRegion(newRegion);
      webViewRef.current?.postMessage(JSON.stringify({ type: 'update', lat: coords.latitude, lng: coords.longitude }));
    }
  }, []);

  const goToMyLocation = async () => {
    let { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') return;

    let location = await Location.getCurrentPositionAsync({});
    const newRegion = {
      ...region,
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
    };
    setRegion(newRegion);
    webViewRef.current?.postMessage(JSON.stringify({ type: 'update', lat: location.coords.latitude, lng: location.coords.longitude }));

    const reverse = await Location.reverseGeocodeAsync({
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
    });
    if (reverse.length > 0) {
      const item = reverse[0];
      const addressParts = [
        item.street,
        item.name,
        item.subregion,
        item.city,
        item.region
      ].filter(Boolean);
      setLocalAddress(addressParts.join(', '));
    }
  };

  const handleSearch = async () => {
    if (!localAddress) return;
    setLoading(true);
    try {
      const result = await Location.geocodeAsync(localAddress);
      if (result.length > 0) {
        const { latitude, longitude } = result[0];
        setRegion(prev => ({ ...prev, latitude, longitude }));
        webViewRef.current?.postMessage(JSON.stringify({ type: 'update', lat: latitude, lng: longitude }));
      }
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setLoading(false);
    }
  };

  const onMessage = async (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'move') {
        setRegion(prev => ({ ...prev, latitude: data.lat, longitude: data.lng }));

        try {
          const reverse = await Location.reverseGeocodeAsync({
            latitude: data.lat,
            longitude: data.lng,
          });
          if (reverse.length > 0) {
            const item = reverse[0];
            const addressParts = [
              item.street,
              item.name,
              item.subregion,
              item.city,
              item.region
            ].filter(Boolean);
            const newAddr = addressParts.join(', ');
            if (newAddr) setLocalAddress(newAddr);
          }
        } catch (e) {}
      }
    } catch (e) {}
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      
      <View style={styles.mapContainer}>
        {pinUri ? (
          <WebView
            ref={webViewRef}
            source={{ html: LEAFLET_HTML(region.latitude, region.longitude, pinUri) }}
            style={styles.map}
            onMessage={onMessage}
            javaScriptEnabled={true}
            domStorageEnabled={true}
          />
        ) : (
          <View style={[styles.map, { backgroundColor: '#F5F5F7', alignItems: 'center', justifyContent: 'center' }]}>
            <ActivityIndicator size="large" color={PURPLE} />
          </View>
        )}

        {loading && (
          <View style={styles.loader}>
            <ActivityIndicator size="large" color={PURPLE} />
          </View>
        )}

        <TouchableOpacity style={[styles.backButton, { top: insets.top + 10 }]} onPress={() => router.back()}>
          <ChevronLeft size={24} color={TEXT_DARK} />
        </TouchableOpacity>

        <View style={[styles.searchOverlay, { top: insets.top + 10 }]}>
          <View style={styles.searchBar}>
            <Search size={18} color={TEXT_MUTED} />
            <TextInput 
              style={styles.searchInput}
              placeholder="Cari lokasi pijat..."
              value={localAddress}
              onChangeText={fetchSuggestions}
              onSubmitEditing={handleSearch}
              returnKeyType="search"
              onFocus={() => {
                if (suggestions.length > 0) setShowSuggestions(true);
              }}
            />
          </View>

          {showSuggestions && suggestions.length > 0 && (
            <View style={styles.suggestionList}>
              {suggestions.map((item, index) => (
                <TouchableOpacity 
                  key={index}
                  style={[styles.suggestionItem, index === suggestions.length - 1 && { borderBottomWidth: 0 }]}
                  onPress={() => selectSuggestion(item)}
                >
                  <MapPin size={16} color={TEXT_MUTED} style={{ marginRight: 12 }} />
                  <Text style={styles.suggestionText} numberOfLines={2}>
                    {item.display_name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        <TouchableOpacity style={styles.myLocationBtn} onPress={goToMyLocation}>
          <Navigation size={20} color={PURPLE} />
        </TouchableOpacity>
      </View>

      <View style={[styles.bottomSheet, { paddingBottom: 24 + insets.bottom }]}>
        <View style={styles.handle} />
        <Text style={styles.sheetTitle}>Konfirmasi Lokasi</Text>
        
        <View style={styles.addressCard}>
          <View style={styles.addressIconBox}>
             <MapPin size={20} color={PURPLE} />
          </View>
          <View style={styles.addressInfo}>
            <Text style={styles.addressMain}>Lokasi Terpilih</Text>
            <Text style={styles.addressSub}>{localAddress}</Text>
          </View>
        </View>

        <TouchableOpacity 
          style={styles.confirmBtn}
          onPress={() => {
            setAddress(localAddress);
            setCoords({ latitude: region.latitude, longitude: region.longitude });
            if (from === 'order') {
              router.push({ pathname: '/order', params: { serviceId, from: sourceFrom as string } });
            } else {
              router.push({ pathname: '/home' });
            }
          }}
        >
          <Text style={styles.confirmBtnText}>Gunakan Lokasi Ini</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  mapContainer: {
    flex: 1,
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  loader: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 15,
  },
  backButton: {
    position: 'absolute',
    left: 16,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    zIndex: 20,
  },
  searchOverlay: {
    position: 'absolute',
    left: 70,
    right: 16,
    zIndex: 50,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    height: 44,
    borderRadius: 22,
    elevation: 4,
    borderWidth: 1,
    borderColor: BORDER,
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 13,
    fontFamily: 'PlusJakartaSans-Medium',
    color: TEXT_DARK,
  },
  suggestionList: {
    backgroundColor: '#FFFFFF',
    borderRadius: 15,
    marginTop: 8,
    elevation: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    borderWidth: 1,
    borderColor: BORDER,
    zIndex: 100,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  suggestionText: {
    flex: 1,
    fontSize: 12,
    fontFamily: 'PlusJakartaSans-Medium',
    color: TEXT_DARK,
  },
  myLocationBtn: {
    position: 'absolute',
    bottom: 300,
    right: 20,
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    zIndex: 20,
  },
  bottomSheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    padding: 24,
    paddingTop: 12,
    paddingBottom: 40,
    elevation: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    zIndex: 30,
  },
  handle: {
    width: 40,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#E0E0E0',
    alignSelf: 'center',
    marginBottom: 20,
  },
  sheetTitle: {
    fontSize: 16,
    fontFamily: 'PlusJakartaSans-Bold',
    color: TEXT_DARK,
    marginBottom: 16,
  },
  addressCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    padding: 14,
    borderRadius: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: BORDER,
  },
  addressIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#F3E8FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  addressInfo: {
    flex: 1,
  },
  addressMain: {
    fontSize: 11,
    fontFamily: 'PlusJakartaSans-Bold',
    color: TEXT_MUTED,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  addressSub: {
    fontSize: 13,
    fontFamily: 'PlusJakartaSans-Medium',
    color: TEXT_DARK,
  },
  confirmBtn: {
    backgroundColor: PURPLE,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
  },
  confirmBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: 'PlusJakartaSans-Bold',
  },
});
