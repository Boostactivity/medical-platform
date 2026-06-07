/**
 * Carte interactive des agences — différenciant vitrine n°1
 * (90 % des PSAD français n'en ont pas, cf. research/06).
 *
 * Leaflet + OpenStreetMap (pas de clé API, RGPD-friendly : tuiles OSM,
 * aucun tracker tiers). Données via /public/agencies (subset anonyme).
 * État vide honnête si aucune agence géolocalisée.
 */

import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapPin, Phone } from 'lucide-react';
import { apiPublic } from '../../utils/api';

// Fix icônes Leaflet sous bundler (chemins d'assets cassés par défaut)
const markerIcon = L.divIcon({
  className: '',
  html: `<div style="
    width: 34px; height: 34px; border-radius: 50% 50% 50% 0;
    background: #007AFF; transform: rotate(-45deg);
    border: 3px solid #FFFFFF; box-shadow: 0 2px 8px rgba(0,0,0,.25);
    display: flex; align-items: center; justify-content: center;">
    <div style="width: 10px; height: 10px; border-radius: 50%; background: #FFFFFF;"></div>
  </div>`,
  iconSize: [34, 34],
  iconAnchor: [17, 34],
  popupAnchor: [0, -34],
});

export interface PublicAgency {
  id: string;
  name: string;
  address: string | null;
  city: string | null;
  postal_code: string | null;
  phone: string | null;
  lat: number | null;
  lng: number | null;
}

// Centre France métropolitaine
const FRANCE_CENTER: [number, number] = [46.6, 2.4];

export function AgencyMap() {
  const [agencies, setAgencies] = useState<PublicAgency[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    apiPublic('/public/agencies')
      .then((data) => {
        if (!cancelled) setAgencies((data.agencies ?? []).filter((a: PublicAgency) => a.lat != null && a.lng != null));
      })
      .catch(() => {
        /* pas d'agences publiées → état vide */
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div className="h-[420px] rounded-2xl bg-[#F2F0EB] animate-pulse flex items-center justify-center">
        <MapPin className="w-8 h-8 text-[#A8A49C]" />
      </div>
    );
  }

  if (agencies.length === 0) {
    return (
      <div className="h-[420px] rounded-2xl bg-[#F2F0EB] flex flex-col items-center justify-center text-center px-6">
        <MapPin className="w-10 h-10 text-[#007AFF] mb-3" />
        <p className="text-[#1A1A1A] font-medium mb-1">Nos agences arrivent bientôt sur la carte</p>
        <p className="text-[#5C5C5C] text-sm max-w-sm">
          Contactez-nous pour connaître l'agence la plus proche de chez vous.
        </p>
      </div>
    );
  }

  const center: [number, number] =
    agencies.length === 1 ? [agencies[0].lat!, agencies[0].lng!] : FRANCE_CENTER;

  return (
    <div className="rounded-2xl overflow-hidden shadow-sm border border-[#E8E5DE]" aria-label="Carte de nos agences">
      <MapContainer
        center={center}
        zoom={agencies.length === 1 ? 11 : 6}
        scrollWheelZoom={false}
        style={{ height: 420, width: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {agencies.map((a) => (
          <Marker key={a.id} position={[a.lat!, a.lng!]} icon={markerIcon}>
            <Popup>
              <div style={{ fontFamily: 'Inter, sans-serif', minWidth: 180 }}>
                <strong style={{ fontSize: 15 }}>{a.name}</strong>
                {(a.address || a.city) && (
                  <p style={{ margin: '6px 0 0', fontSize: 13, color: '#5C5C5C' }}>
                    {a.address}
                    {a.address && <br />}
                    {[a.postal_code, a.city].filter(Boolean).join(' ')}
                  </p>
                )}
                {a.phone && (
                  <p style={{ margin: '6px 0 0', fontSize: 13 }}>
                    <a href={`tel:${a.phone.replace(/\s/g, '')}`} style={{ color: '#007AFF' }}>
                      {a.phone}
                    </a>
                  </p>
                )}
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
