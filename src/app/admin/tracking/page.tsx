'use client';

import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import { MapPin, RefreshCw, Bike, AlertTriangle } from 'lucide-react';
import { Button, Card, Badge, Skeleton, EmptyState } from '@/components/ui';
import { createClient } from '@/lib/supabase/client';
import type { DeliveryPerson, OnlineStatus } from '@/types';

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

function MapComponent({ deliveries }: { deliveries: DeliveryLocation[] }) {
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
        html: `<div style="width:28px;height:28px;border-radius:50%;background:#22C55E;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="white" xmlns="http://www.w3.org/2000/svg"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/></svg>
        </div>`,
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      });

      const busyIcon = L.divIcon({
        className: 'custom-marker',
        html: `<div style="width:28px;height:28px;border-radius:50%;background:#F59E0B;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3);"></div>`,
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      });

      markersRef.current.forEach((marker) => map.removeLayer(marker));
      markersRef.current.clear();

      const bounds: L.LatLngExpression[] = [];

      deliveries.forEach((d) => {
        if (!d.latitude || !d.longitude) return;
        const icon = d.online_status === 'online' ? onlineIcon : busyIcon;

        const marker = L.marker([d.latitude, d.longitude], { icon })
          .addTo(map)
          .bindPopup(`
            <div style="min-width:160px">
              <p style="font-weight:600;margin:0">${d.profiles?.full_name || 'Delivery'}</p>
              <p style="font-size:12px;color:#666;margin:2px 0">${d.vehicle_type} &middot; ${d.total_deliveries} deliveries</p>
              <p style="font-size:12px;margin:0">
                <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${d.online_status === 'online' ? '#22C55E' : '#F59E0B'};margin-right:4px"></span>
                ${d.online_status}
              </p>
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
  }, [deliveries]);

  return <div ref={mapRef} className="w-full h-[500px]" />;
}

export default function AdminTrackingPage() {
  const [deliveries, setDeliveries] = useState<DeliveryLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mapReady, setMapReady] = useState(false);

  useEffect(() => { setMapReady(true); }, []);

  const fetchDeliveries = useCallback(async () => {
    try {
      const supabase = createClient();
      const { data, error: err } = await supabase
        .from('delivery_persons')
        .select('*');

      if (err) throw err;

      const persons = data || [];
      const userIds = persons.map((p: any) => p.user_id);
      const { data: profiles } = userIds.length > 0
        ? await supabase.from('profiles').select('id, full_name, avatar_url').in('id', userIds)
        : { data: [] };

      const profileMap = new Map((profiles || []).map((p: any) => [p.id, p]));
      const merged = persons.map((p: any) => ({
        ...p,
        profiles: profileMap.get(p.user_id) || { full_name: 'Delivery', avatar_url: null },
      }));

      setDeliveries(merged as unknown as DeliveryLocation[]);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDeliveries();
    const interval = setInterval(fetchDeliveries, 10000);
    return () => clearInterval(interval);
  }, [fetchDeliveries]);

  const onlineCount = deliveries.filter(d => d.online_status === 'online').length;
  const busyCount = deliveries.filter(d => d.online_status === 'busy').length;

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
          <p className="text-[var(--color-text-secondary)] mt-1">Real-time delivery person locations</p>
        </div>
        <Button variant="outline" onClick={fetchDeliveries}>
          <RefreshCw className="w-4 h-4" />
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
            <Bike className="w-5 h-5 text-green-600 dark:text-green-400" />
          </div>
          <div>
            <p className="text-sm text-[var(--color-text-secondary)]">Online</p>
            <p className="text-xl font-bold text-green-600">{onlineCount}</p>
          </div>
        </Card>
        <Card className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center">
            <Bike className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
          </div>
          <div>
            <p className="text-sm text-[var(--color-text-secondary)]">Busy</p>
            <p className="text-xl font-bold text-yellow-600">{busyCount}</p>
          </div>
        </Card>
        <Card className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
            <MapPin className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <p className="text-sm text-[var(--color-text-secondary)]">Total</p>
            <p className="text-xl font-bold text-blue-600">{deliveries.length}</p>
          </div>
        </Card>
      </div>

      {loading ? (
        <Skeleton className="h-96 w-full rounded-2xl" />
      ) : deliveries.length === 0 ? (
        <Card>
          <EmptyState
            icon={<MapPin className="w-8 h-8 text-[var(--color-text-secondary)]" />}
            title="No delivery persons registered"
            description="Delivery persons will appear here when they register"
          />
        </Card>
      ) : (
        <Card className="p-0 overflow-hidden">
          {mapReady && <MapComponent deliveries={deliveries} />}
        </Card>
      )}
    </div>
  );
}
