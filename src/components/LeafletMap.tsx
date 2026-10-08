/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';

export interface MapPoint {
  lat: number;
  lng: number;
  label?: string;
  type?: 'customer' | 'kitchen' | 'rider';
  geofenceRadiusKm?: number;
  heading?: number;
}

export interface LeafletMapProps {
  center: { lat: number; lng: number };
  zoom?: number;
  isDarkMode?: boolean;
  points?: MapPoint[];
  polylineCoords?: [number, number][];
  interactive?: boolean;
  draggableCustomerPin?: boolean;
  onPositionSelect?: (coords: { lat: number; lng: number }) => void;
  className?: string;
  style?: React.CSSProperties;
  showControls?: boolean;
  riderPosition?: { lat: number; lng: number; heading?: number };
}

export const LeafletMap: React.FC<LeafletMapProps> = ({
  center,
  zoom = 14,
  isDarkMode = false,
  points = [],
  polylineCoords = [],
  interactive = true,
  draggableCustomerPin = false,
  onPositionSelect,
  className = 'w-full h-full min-h-[180px]',
  style,
  showControls = true,
  riderPosition,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const polylineRef = useRef<L.Polyline | null>(null);
  const circlesLayerRef = useRef<L.LayerGroup | null>(null);

  // Initialize Leaflet Map
  useEffect(() => {
    if (!containerRef.current) return;

    // Clean up if already initialized on this DOM node
    if ((containerRef.current as any)._leaflet_id && mapRef.current) {
      mapRef.current.remove();
      mapRef.current = null;
    }

    const map = L.map(containerRef.current, {
      center: [center.lat, center.lng],
      zoom: zoom,
      zoomControl: false,
      attributionControl: false,
      dragging: interactive,
      touchZoom: interactive,
      doubleClickZoom: interactive,
      scrollWheelZoom: interactive ? 'center' : false,
    });

    mapRef.current = map;

    // Layer groups
    circlesLayerRef.current = L.layerGroup().addTo(map);
    markersLayerRef.current = L.layerGroup().addTo(map);

    // Click handler for location selection
    if (onPositionSelect) {
      map.on('click', (e: L.LeafletMouseEvent) => {
        onPositionSelect({ lat: e.latlng.lat, lng: e.latlng.lng });
      });
    }

    // Invalidate size after layout stabilization
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 200);

    return () => {
      clearTimeout(timer);
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // Update Tile Layer based on Dark / Light mode
  useEffect(() => {
    if (!mapRef.current) return;

    if (tileLayerRef.current) {
      tileLayerRef.current.remove();
    }

    // High quality, 100% key-free, open-source OpenStreetMap tile provider (no watermarks or API key demands)
    const tileUrl = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

    const tileLayer = L.tileLayer(tileUrl, {
      maxZoom: 19,
      subdomains: 'abc',
      attribution: '&copy; OpenStreetMap contributors',
    });

    tileLayer.addTo(mapRef.current);
    tileLayerRef.current = tileLayer;

    // Apply Taash Bhatti Signature Forest Green & Copper theme filter
    try {
      const container = mapRef.current.getContainer();
      if (container) {
        container.classList.add('leaflet-taash-theme');
        if (isDarkMode) {
          container.classList.add('leaflet-dark-tiles');
        } else {
          container.classList.remove('leaflet-dark-tiles');
        }
      }
    } catch (e) {}
  }, [isDarkMode]);

  // Update center & zoom smoothly
  useEffect(() => {
    if (!mapRef.current) return;
    const currentCenter = mapRef.current.getCenter();
    const dist = Math.sqrt(
      Math.pow(currentCenter.lat - center.lat, 2) + Math.pow(currentCenter.lng - center.lng, 2)
    );
    if (dist > 0.0001) {
      mapRef.current.panTo([center.lat, center.lng], { animate: true });
    }
  }, [center.lat, center.lng]);

  // Update Markers & Circles
  useEffect(() => {
    if (!mapRef.current || !markersLayerRef.current || !circlesLayerRef.current) return;

    markersLayerRef.current.clearLayers();
    circlesLayerRef.current.clearLayers();

    // Render provided points
    points.forEach((pt) => {
      let iconHtml = '';
      let iconSize: [number, number] = [36, 36];
      let iconAnchor: [number, number] = [18, 36];

      if (pt.type === 'kitchen') {
        iconHtml = `
          <div style="display:flex; flex-direction:column; align-items:center; transform:translateY(-8px);">
            <div style="background:#C06C38; color:#FAF8F5; font-size:9px; font-weight:800; padding:3px 9px; border-radius:9999px; white-space:nowrap; box-shadow:0 4px 14px rgba(192,108,56,0.45); border:1.8px solid #FAF8F5; display:flex; align-items:center; gap:4px; text-transform:uppercase; letter-spacing:0.5px;">
              <span>👨‍🍳</span>
              <span>${pt.label || 'Bhatti'}</span>
            </div>
            <div style="width:14px; height:14px; background:#C06C38; border:2.5px solid #FAF8F5; border-radius:50%; margin-top:2px; box-shadow:0 2px 8px rgba(0,0,0,0.5);"></div>
          </div>
        `;
        iconSize = [120, 48];
        iconAnchor = [60, 48];

        // Draw geofence circle in warm copper
        if (pt.geofenceRadiusKm && pt.geofenceRadiusKm > 0) {
          const circle = L.circle([pt.lat, pt.lng], {
            radius: pt.geofenceRadiusKm * 1000,
            color: '#C06C38',
            fillColor: '#C06C38',
            fillOpacity: 0.12,
            weight: 2,
            dashArray: '5, 6',
          });
          circle.addTo(circlesLayerRef.current!);
        }
      } else if (pt.type === 'rider') {
        const rotation = pt.heading || 0;
        iconHtml = `
          <div style="position:relative; width:44px; height:44px; display:flex; align-items:center; justify-center; transform:rotate(${rotation}deg);">
            <div style="position:absolute; inset:0; border-radius:50%; background:rgba(255,87,34,0.35); animation:ping 1.5s cubic-bezier(0,0,0.2,1) infinite;"></div>
            <div style="position:relative; width:36px; height:36px; background:#FF5722; border:2.5px solid #FFFFFF; border-radius:50%; display:flex; align-items:center; justify-content:center; box-shadow:0 4px 14px rgba(255,87,34,0.5);">
              <span style="font-size:18px; line-height:1;">🛵</span>
            </div>
          </div>
        `;
        iconSize = [44, 44];
        iconAnchor = [22, 22];
      } else {
        // Customer Delivery Pin in authentic Forest Green
        iconHtml = `
          <div style="display:flex; flex-direction:column; align-items:center; cursor:${draggableCustomerPin ? 'grab' : 'pointer'}; transform:translateY(-4px);">
            <div style="background:#143D27; color:#FAF8F5; font-size:9px; font-weight:800; padding:3px 9px; border-radius:9999px; white-space:nowrap; box-shadow:0 4px 12px rgba(20,61,39,0.5); border:1.8px solid #FAF8F5; text-transform:uppercase; letter-spacing:0.5px;">
              📍 ${pt.label || 'Your Location'}
            </div>
            <div style="width:16px; height:16px; background:#143D27; border:3px solid #FAF8F5; border-radius:50%; margin-top:2px; box-shadow:0 2px 8px rgba(0,0,0,0.5);"></div>
          </div>
        `;
        iconSize = [130, 48];
        iconAnchor = [65, 48];
      }

      const customIcon = L.divIcon({
        html: iconHtml,
        className: 'custom-leaflet-marker',
        iconSize,
        iconAnchor,
      });

      const marker = L.marker([pt.lat, pt.lng], {
        icon: customIcon,
        draggable: pt.type === 'customer' && draggableCustomerPin,
      });

      if (pt.type === 'customer' && draggableCustomerPin && onPositionSelect) {
        marker.on('dragend', (e) => {
          const latlng = (e.target as L.Marker).getLatLng();
          onPositionSelect({ lat: latlng.lat, lng: latlng.lng });
        });
      }

      marker.addTo(markersLayerRef.current!);
    });

    // Dedicated Rider Marker if passed separately
    if (riderPosition) {
      const rotation = riderPosition.heading || 0;
      const riderHtml = `
        <div style="position:relative; width:44px; height:44px; display:flex; align-items:center; justify-center; transform:rotate(${rotation}deg);">
          <div style="position:absolute; inset:0; border-radius:50%; background:rgba(255,87,34,0.35); animation:ping 1.5s cubic-bezier(0,0,0.2,1) infinite;"></div>
          <div style="position:relative; width:36px; height:36px; background:#FF5722; border:2.5px solid #FFFFFF; border-radius:50%; display:flex; align-items:center; justify-content:center; box-shadow:0 4px 14px rgba(255,87,34,0.5);">
            <span style="font-size:18px; line-height:1;">🛵</span>
          </div>
        </div>
      `;
      const riderIcon = L.divIcon({
        html: riderHtml,
        className: 'custom-leaflet-rider',
        iconSize: [44, 44],
        iconAnchor: [22, 22],
      });
      const riderMarker = L.marker([riderPosition.lat, riderPosition.lng], { icon: riderIcon });
      riderMarker.addTo(markersLayerRef.current!);
    }
  }, [points, draggableCustomerPin, riderPosition?.lat, riderPosition?.lng, riderPosition?.heading]);

  // Update Polyline in Signature Copper with dark shadow casing
  useEffect(() => {
    if (!mapRef.current) return;

    if (polylineRef.current) {
      polylineRef.current.remove();
      polylineRef.current = null;
    }

    if (polylineCoords && polylineCoords.length >= 2) {
      const line = L.polyline(polylineCoords, {
        color: '#C06C38', // Signature luminous copper
        weight: 6,
        opacity: 0.95,
        lineCap: 'round',
        lineJoin: 'round',
      });

      line.addTo(mapRef.current);
      polylineRef.current = line;
    }
  }, [polylineCoords]);

  // Recenter / Zoom Controls
  const handleZoomIn = () => {
    if (mapRef.current) mapRef.current.zoomIn();
  };

  const handleZoomOut = () => {
    if (mapRef.current) mapRef.current.zoomOut();
  };

  const handleRecenter = () => {
    if (mapRef.current) {
      mapRef.current.setView([center.lat, center.lng], zoom, { animate: true });
    }
  };

  return (
    <div className={`relative overflow-hidden ${className}`} style={style}>
      <div ref={containerRef} className="w-full h-full z-0 cursor-grab active:cursor-grabbing" />

      {/* Map Engine Badge */}
      <div className="absolute top-2.5 left-2.5 z-[1000] bg-black/80 backdrop-blur-md px-2 py-0.5 rounded-md text-[9px] font-mono text-emerald-300 border border-emerald-500/30 flex items-center gap-1.5 pointer-events-none shadow-md">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
        <span>LIVE MAP ENGINE (ACTIVE)</span>
      </div>

      {/* Floating Zoom & Recenter Controls */}
      {showControls && interactive && (
        <div className="absolute top-2.5 right-2.5 z-[1000] flex flex-col gap-1.5 bg-black/80 backdrop-blur-md p-1 rounded-xl border border-white/15 shadow-xl">
          <button
            type="button"
            onClick={handleZoomIn}
            title="Zoom In"
            className="w-7 h-7 bg-white/10 hover:bg-white/20 text-white rounded-lg flex items-center justify-center font-bold text-sm cursor-pointer active:scale-95 transition-all"
          >
            +
          </button>
          <button
            type="button"
            onClick={handleZoomOut}
            title="Zoom Out"
            className="w-7 h-7 bg-white/10 hover:bg-white/20 text-white rounded-lg flex items-center justify-center font-bold text-sm cursor-pointer active:scale-95 transition-all"
          >
            −
          </button>
          <button
            type="button"
            onClick={handleRecenter}
            title="Recenter"
            className="w-7 h-7 bg-blue-600/80 hover:bg-blue-600 text-white rounded-lg flex items-center justify-center text-xs cursor-pointer active:scale-95 transition-all"
          >
            🎯
          </button>
        </div>
      )}
    </div>
  );
};
