'use client';

import { useEffect, useState, useRef } from 'react';
import { Loader2, MapPin, RefreshCw, Maximize2, Minimize2 } from 'lucide-react';
import 'leaflet/dist/leaflet.css';
interface TherapistMarker {
  id: string;
  full_name: string;
  latitude: number;
  longitude: number;
  status: string;
  is_online: boolean;
  rating: number;
  avatar_url?: string;
  address?: string;
  province?: string;
  city?: string;
  district?: string;
  live_address?: string;
}

const getInitials = (name: string) => {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0) return '';
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
};

export default function TherapistMap() {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const [therapists, setTherapists] = useState<TherapistMarker[]>([]);
  const [loading, setLoading] = useState(true);
  const [mapReady, setMapReady] = useState(false);
  const [L, setL] = useState<any>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const fetchTherapists = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      const res = await fetch('/api/therapists?limit=200&is_active=true');
      const data = await res.json();
      const withLoc = (data.data || []).map((t: any) => {
        const loc = Array.isArray(t.therapist_locations)
          ? t.therapist_locations[0]
          : t.therapist_locations;

        if (!loc || !loc.latitude || !loc.longitude) return null;

        return {
          id: t.id,
          full_name: t.full_name,
          latitude: parseFloat(loc.latitude),
          longitude: parseFloat(loc.longitude),
          status: t.status,
          is_online: t.status === 'online',
          rating: t.rating || 0,
          avatar_url: t.avatar_url || '',
          address: t.address || '',
          province: t.province || '',
          city: t.city || '',
          district: t.district || '',
          live_address: loc.live_address || '',
        };
      }).filter(Boolean) as TherapistMarker[];
      console.log('TherapistMap: loaded therapists with locations:', withLoc);
      setTherapists(withLoc);
    } catch (error) {
      console.error('Error fetching therapists:', error);
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  useEffect(() => {
    fetchTherapists(true);
  }, []);

  // Dynamically load Leaflet on the client side
  useEffect(() => {
    import('leaflet').then((module) => {
      setL(module);
    }).catch((err) => {
      console.error('Failed to load Leaflet:', err);
    });
  }, []);

  // Initialize Map Instance
  useEffect(() => {
    if (!L || !mapRef.current || mapInstanceRef.current) return;

    const Leaflet = L.default || L;
    const map = Leaflet.map(mapRef.current).setView([-6.2, 106.8], 11);
    Leaflet.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap',
      maxZoom: 18,
    }).addTo(map);
    mapInstanceRef.current = map;
    setMapReady(true);

    setTimeout(() => map.invalidateSize(), 300);

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        setMapReady(false);
      }
    };
  }, [L]);

  // Trigger invalidateSize whenever isFullscreen toggles
  useEffect(() => {
    if (mapInstanceRef.current && mapReady) {
      setTimeout(() => {
        mapInstanceRef.current.invalidateSize();
        // Also re-center map correctly
        const bounds = therapists.map(t => [t.latitude, t.longitude]);
        if (bounds.length === 1) {
          mapInstanceRef.current.setView(bounds[0], 13);
        } else if (bounds.length > 1 && L) {
          try {
            const Leaflet = L.default || L;
            mapInstanceRef.current.fitBounds(Leaflet.latLngBounds(bounds.map(b => Leaflet.latLng(b[0], b[1]))), { padding: [50, 50], maxZoom: 14 });
          } catch (e) {
            console.warn(e);
          }
        }
      }, 150);
    }
  }, [isFullscreen, therapists, L, mapReady]);
  // Update Markers when Map is Ready or Therapists list updates
  useEffect(() => {
    if (!mapReady || !mapInstanceRef.current || !L) return;

    const Leaflet = L.default || L;

    markersRef.current.forEach(m => {
      try {
        mapInstanceRef.current.removeLayer(m);
      } catch (e) {
        console.warn('Failed to remove marker:', e);
      }
    });
    markersRef.current = [];

    const bounds: number[][] = [];

    therapists.forEach((t) => {
      const color = t.is_online ? '#22c55e' : '#6b7280';
      const statusColor = t.is_online ? '#22c55e' : '#94a3b8';
      const initials = getInitials(t.full_name);
      
      const avatarHtml = t.avatar_url
        ? `<img src="${t.avatar_url}" style="width:100%;height:100%;border-radius:50%;object-fit:cover;display:block;" />`
        : `<span style="font-weight:700;color:#ffffff;font-size:12px;font-family:inherit;letter-spacing:-0.5px;">${initials}</span>`;

      const icon = Leaflet.divIcon({
        html: `<div style="position:relative;width:36px;height:36px;border-radius:50%;background:#1e293b;border:2px solid white;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 10px rgba(0,0,0,0.3);user-select:none;">
          ${avatarHtml}
          <span style="position:absolute;bottom:0px;right:0px;width:10px;height:10px;border-radius:50%;background:${statusColor};border:2px solid white;box-shadow:0 1px 3px rgba(0,0,0,0.2);"></span>
        </div>`,
        className: 'custom-div-icon',
        iconSize: [36, 36],
        iconAnchor: [18, 36],
        popupAnchor: [0, -36],
      });

      const marker = Leaflet.marker([t.latitude, t.longitude], { icon }).addTo(mapInstanceRef.current);
      
      const liveAddrHtml = t.live_address 
        ? t.live_address 
        : `<i style="color:var(--text-muted);">Mencari alamat...</i>`;

      marker.bindPopup(`
        <div style="font-family:inherit;padding:4px;min-width:180px;max-width:240px;">
          <p style="font-weight:600;margin:0 0 4px;font-size:14px;color:var(--text-primary);">${t.full_name}</p>
          <p style="margin:0 0 4px;font-size:12px;color:var(--text-secondary);display:flex;align-items:center;">
            <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${color};margin-right:6px;"></span>
            ${t.is_online ? 'Online' : 'Offline'}
          </p>
          <p style="margin:0 0 4px;font-size:12px;color:var(--text-secondary);">⭐ ${t.rating.toFixed(1)}</p>
          <div id="popup-address-${t.id}" style="margin:4px 0 0;font-size:11px;color:var(--text-primary);border-top:1px solid var(--border);padding-top:4px;line-height:1.4;word-break:break-word;">
            📍 <strong>Lokasi Live:</strong><br/>${liveAddrHtml}
          </div>
        </div>
      `);

      marker.on('click', async () => {
        // Fetch live address from Nominatim
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${t.latitude}&lon=${t.longitude}`, {
            headers: {
              'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7',
              'User-Agent': 'KangMassageAdminDashboard/1.0'
            }
          });
          const data = await res.json();
          const liveAddress = data.display_name || 'Alamat live tidak ditemukan';
          
          // Update popup content dynamically (No KTP address display)
          marker.setPopupContent(`
            <div style="font-family:inherit;padding:4px;min-width:200px;max-width:260px;">
              <p style="font-weight:600;margin:0 0 4px;font-size:14px;color:var(--text-primary);">${t.full_name}</p>
              <p style="margin:0 0 4px;font-size:12px;color:var(--text-secondary);display:flex;align-items:center;">
                <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${color};margin-right:6px;"></span>
                ${t.is_online ? 'Online' : 'Offline'}
              </p>
              <p style="margin:0 0 4px;font-size:12px;color:var(--text-secondary);">⭐ ${t.rating.toFixed(1)}</p>
              <p style="margin:4px 0 0;font-size:11px;color:var(--text-primary);border-top:1px solid var(--border);padding-top:4px;line-height:1.4;word-break:break-word;">
                📍 <strong>Lokasi Live:</strong><br/>${liveAddress}
              </p>
            </div>
          `);
        } catch (err) {
          console.error('Reverse geocoding error:', err);
          marker.setPopupContent(`
            <div style="font-family:inherit;padding:4px;min-width:180px;max-width:240px;">
              <p style="font-weight:600;margin:0 0 4px;font-size:14px;color:var(--text-primary);">${t.full_name}</p>
              <p style="margin:0 0 4px;font-size:12px;color:var(--text-secondary);display:flex;align-items:center;">
                <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${color};margin-right:6px;"></span>
                ${t.is_online ? 'Online' : 'Offline'}
              </p>
              <p style="margin:0 0 4px;font-size:12px;color:var(--text-secondary);">⭐ ${t.rating.toFixed(1)}</p>
              <p style="margin:4px 0 0;font-size:11px;color:var(--text-primary);border-top:1px solid var(--border);padding-top:4px;line-height:1.4;word-break:break-word;">
                📍 <strong>Lokasi Live:</strong><br/><span style="color:var(--text-secondary);font-style:italic;">Gagal memuat alamat live</span>
              </p>
            </div>
          `);
        }
      });

      markersRef.current.push(marker);
      bounds.push([t.latitude, t.longitude]);
    });

    if (bounds.length === 1) {
      mapInstanceRef.current.setView(bounds[0], 13);
    } else if (bounds.length > 1) {
      try {
        mapInstanceRef.current.fitBounds(Leaflet.latLngBounds(bounds.map(b => Leaflet.latLng(b[0], b[1]))), { padding: [50, 50], maxZoom: 14 });
      } catch (e) {
        console.warn('Failed to fit bounds:', e);
        if (therapists.length > 0) {
          const first = therapists[0];
          mapInstanceRef.current.setView([first.latitude, first.longitude], 13);
        }
      }
    }
  }, [therapists, mapReady, L]);

  return (
    <div 
      className={isFullscreen 
        ? "fixed inset-0 z-[9999] bg-card p-6 flex flex-col h-screen rounded-none border-none" 
        : "glass-card p-6"
      }
    >
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="font-semibold text-text-primary flex items-center gap-2">
            <MapPin className="w-4 h-4 text-primary" />
            Peta Terapis
          </h2>
          <p className="text-text-muted text-xs mt-1">
            {loading
              ? 'Memuat data lokasi...'
              : `${therapists.filter(t => t.is_online).length} online dari ${therapists.length} terapis dengan lokasi`}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-3 text-xs text-text-muted mr-2">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500" /> Online</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-gray-500" /> Offline</span>
          </div>
          <button
            onClick={() => fetchTherapists(true)}
            disabled={loading}
            className="p-2 rounded-xl bg-muted hover:bg-opacity-80 text-text-secondary hover:text-text-primary transition-all duration-200 border border-ui-border flex items-center justify-center disabled:opacity-50"
            title="Segarkan Peta"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-2 rounded-xl bg-muted hover:bg-opacity-80 text-text-secondary hover:text-text-primary transition-all duration-200 border border-ui-border flex items-center justify-center"
            title={isFullscreen ? "Tampilan Normal" : "Tampilan Penuh"}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>
      <div 
        className="relative rounded-xl overflow-hidden flex-1" 
        style={isFullscreen ? { flexGrow: 1 } : { height: 380 }}
      >
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-card/80 z-[1000] rounded-xl">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        )}
        <div ref={mapRef} className="w-full h-full rounded-xl" />
      </div>
    </div>
  );
}
