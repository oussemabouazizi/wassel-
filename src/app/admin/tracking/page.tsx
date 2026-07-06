'use client';

import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, RefreshCw, AlertTriangle, X, ChevronDown, Navigation, ExternalLink, Users, Wifi, WifiOff } from 'lucide-react';
import { Button, Card, Skeleton, EmptyState } from '@/components/ui';
import type { OnlineStatus } from '@/types';

interface DeliveryLocation {
  id: string;
  user_id: string;
  latitude: number;
  longitude: number;
  online_status: OnlineStatus;
  total_deliveries: number;
  rating: number;
  vehicle_type: string;
  profiles: { full_name: string; avatar_url: string | null } | null;
}

function MapComponent({ deliveries, selectedId }: { deliveries: DeliveryLocation[]; selectedId: string | null }) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<Map<string, any>>(new Map());

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    const init = async () => {
      const L = (await import('leaflet')).default;
      if (!document.getElementById('leaflet-css')) {
        const link = document.createElement('link');
        link.id = 'leaflet-css';
        link.rel = 'stylesheet';
        link.href = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.css';
        document.head.appendChild(link);
      }

      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
        iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
      });

      const map = L.map(mapRef.current!, {
        zoomControl: false,
        attributionControl: true,
      }).setView([36.8065, 10.1815], 13);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap',
        maxZoom: 19,
      }).addTo(map);

      L.control.zoom({ position: 'bottomright' }).addTo(map);
      mapInstanceRef.current = map;
    };

    init();

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!mapInstanceRef.current) return;

    const updateMarkers = async () => {
      const L = (await import('leaflet')).default;
      const map = mapInstanceRef.current;

      const onlineIcon = L.divIcon({
        className: 'custom-marker',
        html: `<div style="width:32px;height:32px;border-radius:50%;background:#22C55E;border:3px solid white;box-shadow:0 2px 12px rgba(34,197,94,0.5);display:flex;align-items:center;justify-content:center;animation:pulse 2s infinite;">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="white" xmlns="http://www.w3.org/2000/svg"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/></svg>
        </div>`,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      });

      const offlineIcon = L.divIcon({
        className: 'custom-marker',
        html: `<div style="width:28px;height:28px;border-radius:50%;background:#9CA3AF;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.2);opacity:0.7;"></div>`,
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      });

      const selectedIcon = L.divIcon({
        className: 'custom-marker',
        html: `<div style="width:40px;height:40px;border-radius:50%;background:#3B82F6;border:4px solid white;box-shadow:0 4px 20px rgba(59,130,246,0.6);display:flex;align-items:center;justify-content:center;">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="white" xmlns="http://www.w3.org/2000/svg"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/></svg>
        </div>`,
        iconSize: [40, 40],
        iconAnchor: [20, 20],
      });

      markersRef.current.forEach((marker) => map.removeLayer(marker));
      markersRef.current.clear();

      const bounds: L.LatLngExpression[] = [];

      deliveries.forEach((d) => {
        if (!d.latitude || !d.longitude) return;
        const icon = d.id === selectedId ? selectedIcon : d.online_status === 'online' ? onlineIcon : offlineIcon;

        const marker = L.marker([d.latitude, d.longitude], { icon })
          .addTo(map)
          .bindPopup(`
            <div style="min-width:180px;font-family:system-ui">
              <p style="font-weight:700;margin:0;font-size:14px">${d.profiles?.full_name || 'Delivery'}</p>
              <p style="font-size:12px;color:#666;margin:4px 0">${d.vehicle_type} · ${d.total_deliveries} deliveries</p>
              <p style="font-size:12px;margin:4px 0 0">
                <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${d.online_status === 'online' ? '#22C55E' : '#9CA3AF'};margin-right:4px"></span>
                ${d.online_status}
              </p>
              <a href="https://www.google.com/maps/dir/?api=1&destination=${d.latitude},${d.longitude}" target="_blank" rel="noopener noreferrer"
                style="display:inline-flex;align-items:center;gap:4px;margin-top:8px;padding:4px 10px;background:#3B82F6;color:white;border-radius:6px;font-size:12px;text-decoration:none;font-weight:500">
                Navigate
              </a>
            </div>
          `);

        markersRef.current.set(d.id, marker);
        bounds.push([d.latitude, d.longitude]);
      });

      if (bounds.length > 0) {
        map.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 });
      }
    };

    updateMarkers();
  }, [deliveries, selectedId]);

  return (
    <>
      <style>{`@keyframes pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.1); } }`}</style>
      <div ref={mapRef} className="w-full h-[500px]" />
    </>
  );
}

export default function AdminTrackingPage() {
  const [deliveries, setDeliveries] = useState<DeliveryLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [showMap, setShowMap] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'all' | 'online' | 'offline'>('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  useEffect(() => { setMapReady(true); }, []);

  const fetchDeliveries = useCallback(async () => {
    try {
      const { data, error: err } = await fetch('/api/delivery/location').then(r => r.json());
      if (err) throw new Error(err);
      setDeliveries(data || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDeliveries();
    const interval = setInterval(fetchDeliveries, 8000);
    return () => clearInterval(interval);
  }, [fetchDeliveries]);

  const filteredDeliveries = useMemo(() => {
    return deliveries.filter(d => {
      if (statusFilter === 'online') return d.online_status === 'online';
      if (statusFilter === 'offline') return d.online_status === 'offline';
      return true;
    });
  }, [deliveries, statusFilter]);

  const onlineCount = deliveries.filter(d => d.online_status === 'online').length;
  const offlineCount = deliveries.filter(d => d.online_status === 'offline').length;
  const totalCount = deliveries.length;

  const openInGoogleMaps = (d: DeliveryLocation) => {
    if (d.latitude && d.longitude) {
      window.open(`https://www.google.com/maps/dir/?api=1&destination=${d.latitude},${d.longitude}`, '_blank');
    }
  };

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <AlertTriangle className="w-12 h-12 text-[var(--color-error)] mb-4" />
        <p className="text-[var(--color-error)] font-medium">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">Live Tracking</h1>
          <p className="text-[var(--color-text-secondary)] mt-1">Track all delivery persons in real-time</p>
        </div>
        <Button variant="outline" onClick={fetchDeliveries}>
          <RefreshCw className="w-4 h-4" />
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
            <Wifi className="w-5 h-5 text-green-600 dark:text-green-400" />
          </div>
          <div>
            <p className="text-sm text-[var(--color-text-secondary)]">Online</p>
            <p className="text-xl font-bold text-green-600">{onlineCount}</p>
          </div>
        </Card>
        <Card className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
            <WifiOff className="w-5 h-5 text-red-600 dark:text-red-400" />
          </div>
          <div>
            <p className="text-sm text-[var(--color-text-secondary)]">Offline</p>
            <p className="text-xl font-bold text-red-600">{offlineCount}</p>
          </div>
        </Card>
        <Card className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
            <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <p className="text-sm text-[var(--color-text-secondary)]">Total</p>
            <p className="text-xl font-bold text-blue-600">{totalCount}</p>
          </div>
        </Card>
      </div>

      {!loading && deliveries.length > 0 && (
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative">
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-background)] text-sm font-medium text-[var(--color-text-primary)] hover:border-[var(--color-primary)] transition-colors min-w-[160px]"
            >
              <span className={`w-2 h-2 rounded-full ${statusFilter === 'online' ? 'bg-green-500' : statusFilter === 'offline' ? 'bg-red-500' : 'bg-blue-500'}`} />
              {statusFilter === 'all' ? 'All Delivery' : statusFilter === 'online' ? 'Online Only' : 'Offline Only'}
              <ChevronDown className={`w-4 h-4 ml-auto transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
            </button>
            {dropdownOpen && (
              <div className="absolute top-full left-0 mt-1 w-full bg-[var(--color-background)] border border-[var(--color-border)] rounded-xl shadow-lg z-50 overflow-hidden">
                {[
                  { value: 'all' as const, label: 'All Delivery', color: 'bg-blue-500', count: totalCount },
                  { value: 'online' as const, label: 'Online Only', color: 'bg-green-500', count: onlineCount },
                  { value: 'offline' as const, label: 'Offline Only', color: 'bg-red-500', count: offlineCount },
                ].map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => { setStatusFilter(opt.value); setDropdownOpen(false); }}
                    className={`w-full flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-[var(--color-surface)] transition-colors ${statusFilter === opt.value ? 'bg-[var(--color-primary)]/10 text-[var(--color-primary)] font-medium' : 'text-[var(--color-text-primary)]'}`}
                  >
                    <span className={`w-2 h-2 rounded-full ${opt.color}`} />
                    {opt.label}
                    <span className="ml-auto text-xs text-[var(--color-text-secondary)]">{opt.count}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <Button variant="outline" onClick={() => setShowMap(!showMap)}>
            {showMap ? 'Hide Map' : 'Show Map'}
          </Button>
        </div>
      )}

      {loading ? (
        <Skeleton className="h-96 w-full rounded-2xl" />
      ) : filteredDeliveries.length === 0 ? (
        <Card>
          <EmptyState
            icon={<MapPin className="w-8 h-8 text-[var(--color-text-secondary)]" />}
            title={statusFilter !== 'all' ? `No ${statusFilter} delivery persons` : "No delivery persons registered"}
            description={statusFilter !== 'all' ? "Try a different filter" : "Delivery persons will appear here when they register"}
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {showMap && (
            <div className="lg:col-span-2">
              <Card className="p-0 overflow-hidden relative">
                {mapReady && <MapComponent deliveries={filteredDeliveries} selectedId={selectedId} />}
                <button
                  onClick={() => setShowMap(false)}
                  className="absolute top-3 right-3 z-[1000] w-8 h-8 bg-white dark:bg-gray-800 rounded-full shadow-lg flex items-center justify-center hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors border border-[var(--color-border)]"
                >
                  <X className="w-4 h-4 text-[var(--color-text-primary)]" />
                </button>
              </Card>
            </div>
          )}

          <div className={`${showMap ? 'lg:col-span-1' : 'lg:col-span-3'} space-y-2 max-h-[600px] overflow-y-auto`}>
            <AnimatePresence>
              {filteredDeliveries.map((d, i) => {
                const isSelected = selectedId === d.id;
                const hasLocation = d.latitude && d.longitude;
                return (
                  <motion.div
                    key={d.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ delay: i * 0.03 }}
                    onClick={() => setSelectedId(isSelected ? null : d.id)}
                    className={`p-3 rounded-xl border cursor-pointer transition-all ${
                      isSelected
                        ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/5 shadow-md'
                        : 'border-[var(--color-border)] bg-[var(--color-background)] hover:border-[var(--color-primary)]/50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-3 h-3 rounded-full flex-shrink-0 ${
                        d.online_status === 'online' ? 'bg-green-500 animate-pulse' :
                        d.online_status === 'busy' ? 'bg-yellow-500' : 'bg-gray-400'
                      }`} />

                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm text-[var(--color-text-primary)] truncate">
                          {d.profiles?.full_name || 'Delivery'}
                        </p>
                        <p className="text-xs text-[var(--color-text-secondary)]">
                          {d.vehicle_type} · {d.total_deliveries} deliveries · {d.rating?.toFixed(1) || '0.0'}★
                        </p>
                      </div>

                      <div className="flex items-center gap-1">
                        {hasLocation && (
                          <button
                            onClick={(e) => { e.stopPropagation(); openInGoogleMaps(d); }}
                            className="p-2 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
                            title="Open in Google Maps"
                          >
                            <Navigation className="w-4 h-4 text-blue-600" />
                          </button>
                        )}
                        {hasLocation && (
                          <button
                            onClick={(e) => { e.stopPropagation(); setSelectedId(d.id); }}
                            className="p-2 rounded-lg hover:bg-[var(--color-primary)]/10 transition-colors"
                            title="Show on map"
                          >
                            <MapPin className="w-4 h-4 text-[var(--color-primary)]" />
                          </button>
                        )}
                      </div>
                    </div>

                    <AnimatePresence>
                      {isSelected && hasLocation && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="mt-3 pt-3 border-t border-[var(--color-border)]">
                            <p className="text-xs text-[var(--color-text-secondary)] mb-2">
                              {d.latitude.toFixed(6)}, {d.longitude.toFixed(6)}
                            </p>
                            <button
                              onClick={(e) => { e.stopPropagation(); openInGoogleMaps(d); }}
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 transition-colors"
                            >
                              <ExternalLink className="w-3 h-3" />
                              Open in Google Maps
                            </button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        </div>
      )}
    </div>
  );
}
