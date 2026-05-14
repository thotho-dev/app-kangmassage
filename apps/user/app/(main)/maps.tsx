import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, StatusBar, TextInput, Platform, BackHandler, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { ChevronLeft, MapPin, Search, Navigation } from 'lucide-react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';
import { useLocation } from '@/context/LocationContext';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withSpring, 
  withSequence,
  withTiming
} from 'react-native-reanimated';

const PURPLE = '#240080';
const TEXT_DARK = '#1A1A2E';
const TEXT_MUTED = '#6B7280';
const BORDER = '#EFEFEF';

export default function MapsScreen() {
  const router = useRouter();
  const { serviceId, from, sourceFrom } = useLocalSearchParams();
  const mapRef = useRef<MapView>(null);

  useFocusEffect(
    useCallback(() => {
      const backAction = () => {
        if (from === 'order') {
          router.replace({ pathname: '/(main)/order', params: { serviceId, from: sourceFrom as string } });
          return true;
        }
        router.replace({ pathname: '/(main)/home' });
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

  const pinTranslateY = useSharedValue(0);
  const animatedMarkerStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: pinTranslateY.value }],
  }));

  const bouncePin = () => {
    pinTranslateY.value = withSequence(
      withTiming(-20, { duration: 200 }),
      withSpring(0, { damping: 12, stiffness: 120 })
    );
  };

  const [region, setRegion] = useState({
    latitude: coords?.latitude || -6.1754,
    longitude: coords?.longitude || 106.8272,
    latitudeDelta: 0.01,
    longitudeDelta: 0.01,
  });

  const fetchSuggestions = async (text: string) => {
    setLocalAddress(text);
    if (text.length < 3) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

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
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      if (Array.isArray(data)) {
        setSuggestions(data);
        setShowSuggestions(true);
      }
    } catch (error) {
      console.error('Autocomplete error:', error);
      setShowSuggestions(false);
    }
  };

  const selectSuggestion = (item: any) => {
    const lat = parseFloat(item.lat);
    const lon = parseFloat(item.lon);
    const newRegion = {
      ...region,
      latitude: lat,
      longitude: lon,
    };
    setRegion(newRegion);
    mapRef.current?.animateToRegion(newRegion, 1000);
    setLocalAddress(item.display_name);
    setShowSuggestions(false);
  };

  useEffect(() => {
    if (coords) {
      setRegion({
        ...region,
        latitude: coords.latitude,
        longitude: coords.longitude,
      });
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
    mapRef.current?.animateToRegion(newRegion, 1000);

    // Update address for current location
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
        const newRegion = {
          ...region,
          latitude,
          longitude,
        };
        setRegion(newRegion);
        mapRef.current?.animateToRegion(newRegion, 1000);
      }
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      
      {/* Real Map View */}
      <View style={styles.mapContainer}>
        <MapView
          ref={mapRef}
          provider={PROVIDER_GOOGLE}
          style={styles.map}
          initialRegion={region}
          showsUserLocation={true}
          showsMyLocationButton={false}
          onRegionChangeComplete={async (r) => {
            setRegion(r);
            bouncePin();
            // Only update address if map is moved (not during manual typing search)
            try {
              const reverse = await Location.reverseGeocodeAsync({
                latitude: r.latitude,
                longitude: r.longitude,
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
                if (newAddr) {
                  setLocalAddress(newAddr);
                }
              }
            } catch (e) {}
          }}
        />
        
        {loading && (
          <View style={styles.loader}>
            <ActivityIndicator size="large" color={PURPLE} />
          </View>
        )}

        {/* Custom Premium Marker with Animation */}
        <Animated.View style={[styles.markerContainer, animatedMarkerStyle]} pointerEvents="none">
          <View style={styles.markerHead}>
            <View style={styles.markerDot} />
          </View>
          <View style={styles.markerTail} />
        </Animated.View>

        {/* Back Button Overlay */}
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <ChevronLeft size={24} color={TEXT_DARK} />
        </TouchableOpacity>

        {/* Search Overlay */}
        <View style={styles.searchOverlay}>
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

        {/* My Location Button */}
        <TouchableOpacity style={styles.myLocationBtn} onPress={goToMyLocation}>
          <Navigation size={20} color={PURPLE} />
        </TouchableOpacity>
      </View>

      {/* Address Details Bottom Sheet */}
      <View style={styles.bottomSheet}>
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
            // Navigate back specifically to Order screen with serviceId
            if (from === 'order') {
              router.push({ pathname: '/(main)/order', params: { serviceId, from: sourceFrom as string } });
            } else {
              router.push({ pathname: '/(main)/home' });
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
  markerContainer: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginLeft: -22,
    marginTop: -55,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  markerHead: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: PURPLE,
    borderWidth: 3,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  markerDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FFFFFF',
  },
  markerTail: {
    width: 0,
    height: 0,
    backgroundColor: 'transparent',
    borderStyle: 'solid',
    borderLeftWidth: 8,
    borderRightWidth: 8,
    borderTopWidth: 12,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: PURPLE,
    marginTop: -2,
  },
  backButton: {
    position: 'absolute',
    top: 50,
    left: 20,
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
    top: 110,
    left: 20,
    right: 20,
    zIndex: 20,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 15,
    height: 54,
    borderRadius: 15,
    elevation: 4,
    borderWidth: 1,
    borderColor: BORDER,
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: TEXT_DARK,
  },
  suggestionList: {
    backgroundColor: '#FFFFFF',
    borderRadius: 15,
    marginTop: 8,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: BORDER,
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
    fontSize: 13,
    fontFamily: 'Inter-Medium',
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
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: TEXT_DARK,
    marginBottom: 20,
  },
  addressCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    padding: 16,
    borderRadius: 18,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: BORDER,
  },
  addressIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#F3E8FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 15,
  },
  addressInfo: {
    flex: 1,
  },
  addressMain: {
    fontSize: 13,
    fontFamily: 'Inter-Bold',
    color: TEXT_MUTED,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  addressSub: {
    fontSize: 15,
    fontFamily: 'Inter-Medium',
    color: TEXT_DARK,
  },
  confirmBtn: {
    backgroundColor: PURPLE,
    height: 56,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
  },
  confirmBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: 'Inter-Bold',
  },
});

