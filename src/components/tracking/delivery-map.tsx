'use client';

import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { createClient } from '@/lib/supabase/client';
import type { DeliveryPerson } from '@/types';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

interface DeliveryMapProps {
  orderLat: number;
  orderLng: number;
  storeLat: number;
  storeLng: number;
  deliveryPersonId: string | null;
}

const createIcon = (color: string) =>
  L.divIcon({
    className: 'custom-marker',
    html: `<div style="
      width:24px;height:24px;border-radius:50%;
      background:${color};border:3px solid white;
      box-shadow:0 2px 6px rgba(0,0,0,0.3);
    "></div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });

const storeIcon = createIcon('#FF6B00');
const customerIcon = createIcon('#22C55E');
const deliveryIcon = createIcon('#3B82F6');

export default function DeliveryMap({
  orderLat,
  orderLng,
  storeLat,
  storeLng,
  deliveryPersonId,
}: DeliveryMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersRef = useRef<{ store: L.Marker; customer: L.Marker; delivery: L.Marker | null } | null>(null);
  const lineRef = useRef<L.Polyline | null>(null);
  const [deliveryPos, setDeliveryPos] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    const map = L.map(mapRef.current, {
      zoomControl: false,
      attributionControl: true,
    }).setView([orderLat, orderLng], 13);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map);

    L.control.zoom({ position: 'bottomright' }).addTo(map);

    const storeMarker = L.marker([storeLat, storeLng], { icon: storeIcon })
      .addTo(map)
      .bindPopup('Store');

    const customerMarker = L.marker([orderLat, orderLng], { icon: customerIcon })
      .addTo(map)
      .bindPopup('Delivery location');

    markersRef.current = { store: storeMarker, customer: customerMarker, delivery: null };
    mapInstanceRef.current = map;

    const bounds = L.latLngBounds([
      [storeLat, storeLng],
      [orderLat, orderLng],
    ]);
    map.fitBounds(bounds, { padding: [40, 40] });

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, [orderLat, orderLng, storeLat, storeLng]);

  useEffect(() => {
    if (!deliveryPersonId) return;

    const supabase = createClient();

    const fetchPosition = async () => {
      const { data } = await supabase
        .from('delivery_persons')
        .select('latitude, longitude')
        .eq('id', deliveryPersonId)
        .single();

      if (data?.latitude && data?.longitude) {
        setDeliveryPos({ lat: data.latitude, lng: data.longitude });
      }
    };

    fetchPosition();

    const channel = supabase
      .channel(`delivery-location-${deliveryPersonId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'delivery_persons',
          filter: `id=eq.${deliveryPersonId}`,
        },
        (payload) => {
          const updated = payload.new as DeliveryPerson;
          if (updated.latitude && updated.longitude) {
            setDeliveryPos({ lat: updated.latitude, lng: updated.longitude });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [deliveryPersonId]);

  useEffect(() => {
    if (!mapInstanceRef.current || !markersRef.current || !deliveryPos) return;

    const map = mapInstanceRef.current;
    const { store, customer } = markersRef.current;

    if (markersRef.current.delivery) {
      markersRef.current.delivery.setLatLng([deliveryPos.lat, deliveryPos.lng]);
    } else {
      const marker = L.marker([deliveryPos.lat, deliveryPos.lng], { icon: deliveryIcon })
        .addTo(map)
        .bindPopup('Delivery person');
      markersRef.current.delivery = marker;
    }

    if (lineRef.current) {
      lineRef.current.setLatLngs([
        [deliveryPos.lat, deliveryPos.lng],
        [orderLat, orderLng],
      ]);
    } else {
      lineRef.current = L.polyline(
        [
          [deliveryPos.lat, deliveryPos.lng],
          [orderLat, orderLng],
        ],
        { color: '#3B82F6', weight: 3, dashArray: '8, 8', opacity: 0.7 }
      ).addTo(map);
    }

    const allPoints: L.LatLngExpression[] = [
      [storeLat, storeLng],
      [orderLat, orderLng],
      [deliveryPos.lat, deliveryPos.lng],
    ];
    map.fitBounds(L.latLngBounds(allPoints), { padding: [40, 40] });
  }, [deliveryPos, orderLat, orderLng, storeLat, storeLng]);

  return (
    <div
      ref={mapRef}
      className="w-full h-64 sm:h-80 md:h-96 rounded-2xl overflow-hidden border border-[var(--color-border)]"
    />
  );
}
