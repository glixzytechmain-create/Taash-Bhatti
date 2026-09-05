import React, { useEffect, useRef, useState, useMemo } from 'react';
import {
  Navigation,
  Compass,
  Radio,
  Zap,
  Home,
  Utensils,
  Maximize2,
  RotateCcw,
  MapPin,
  CheckCircle,
  Phone,
  ShieldCheck,
  AlertTriangle,
  MessageSquare,
  Volume2,
  Bike,
  Activity,
  Layers,
  BatteryCharging,
  Eye,
  RefreshCw,
  UserCheck,
  XCircle,
  Sparkles,
  Send,
  Star,
  ThumbsUp,
  X,
  CloudRain
} from 'lucide-react';
import RainEffect from './RainEffect';
import {
  loadGoogleMaps,
  DARK_MAP_STYLE,
  LIGHT_MAP_STYLE,
  calculateBearing,
  calculateHaversineDistanceKm,
} from '../lib/googleMaps';
import { ChatMessage, OrderDeliveryRating } from '../types';

interface InAppDeliveryMapProps {
  acceptedByKitchenId?: string;
  kitchenName?: string;
  kitchenAddress?: string;
  kitchenLat?: number;
  kitchenLng?: number;
  customerAddress?: string;
  customerLat?: number;
  customerLng?: number;
  customerName?: string;
  customerPhone?: string;
  riderName?: string;
  riderPhone?: string;
  riderVehicleNumber?: string;
  riderRating?: number;
  riderLat?: number;
  riderLng?: number;
  riderLastUpdated?: string;
  riderStatus?: string;
  orderStatus?: string;
  orderId?: string;
  isRiderView?: boolean;
  isAdminView?: boolean;
  isTakeaway?: boolean;
  onEnableGps?: () => void;
  gpsActive?: boolean;
  estimatedMinutes?: string;
  chatMessages?: ChatMessage[];
  onSendMessage?: (text: string) => void;
  deliveryRating?: OrderDeliveryRating;
  onRateDelivery?: (rating: number, tags: string[], feedback: string) => void;
  // Rider Action Callbacks
  onRiderStatusChange?: (newStatus: string) => void;
  onCallCustomer?: () => void;
  onCallRider?: () => void;
  // Fleet data for Admin View
  allActiveOrders?: any[];
  allRiders?: any[];
  onSelectRiderOrOrder?: (item: any) => void;
  isRaining?: boolean;
}

export default function InAppDeliveryMap({
  acceptedByKitchenId = "",
  kitchenName = "",
  kitchenAddress = "",
  kitchenLat,
  kitchenLng,
  customerAddress = "",
  customerLat,
  customerLng,
  customerName = "",
  customerPhone = "",
  riderName,
  riderPhone,
  riderVehicleNumber,
  riderRating,
  riderStatus,
  orderStatus = 'sent',
  orderId = '',
  riderLat,
  riderLng,
  riderLastUpdated,
  isRiderView = false,
  isAdminView = false,
  isTakeaway = false,
  onEnableGps,
  gpsActive = false,
  estimatedMinutes,
  chatMessages = [],
  onSendMessage,
  deliveryRating,
  onRateDelivery,
  onRiderStatusChange,
  onCallCustomer,
  onCallRider,
  allActiveOrders = [],
  allRiders = [],
  onSelectRiderOrOrder,
  isRaining = false,
}: InAppDeliveryMapProps) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const googleMapRef = useRef<google.maps.Map | null>(null);
  const directionsServiceRef = useRef<google.maps.DirectionsService | null>(null);
  const directionsRendererRef = useRef<google.maps.DirectionsRenderer | null>(null);

  // Custom Overlay / Marker Refs
  const kitchenMarkerRef = useRef<google.maps.Marker | null>(null);
  const customerMarkerRef = useRef<google.maps.Marker | null>(null);
  const riderMarkerRef = useRef<google.maps.Marker | null>(null);
  const polylineRef = useRef<google.maps.Polyline | null>(null);
  const casingPolylineRef = useRef<google.maps.Polyline | null>(null);
  const routeDurationMarkerRef = useRef<google.maps.Marker | null>(null);
  const isUserPanningRef = useRef<boolean>(false);
  const lastRoutedPosRef = useRef<{ lat: number; lng: number; targetLat: number; targetLng: number } | null>(null);
  const lastBoundsSignatureRef = useRef<string>('');

  // Admin Fleet Markers Ref
  const fleetMarkersRef = useRef<google.maps.Marker[]>([]);

  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [liveDistanceKm, setLiveDistanceKm] = useState<number>(2.4);
  const [liveEtaMinutes, setLiveEtaMinutes] = useState<string>('12-15 Mins');
  const [selectedFleetItem, setSelectedFleetItem] = useState<any | null>(null);
  const [cameraMode, setCameraMode] = useState<'fit' | 'rider'>('fit');
  const [userHasPanned, setUserHasPanned] = useState<boolean>(false);
  const [isNavigating, setIsNavigating] = useState<boolean>(false);

  // Takeaway Live Device GPS Permission State
  const [deviceGpsCoords, setDeviceGpsCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [gpsPermissionState, setGpsPermissionState] = useState<'prompt' | 'granted' | 'denied' | 'requesting'>('prompt');

  // Turn-by-Turn Navigation Steps from Google Directions API
  const [navigationSteps, setNavigationSteps] = useState<{ instruction: string; distance: string }[]>([]);

  // Geocoded Coordinates State - Strictly reflects the true destination address
  const [customerCoords, setCustomerCoords] = useState<{ lat: number; lng: number }>(() => {
    // If customerLat is passed and is NOT the old generic default (26.1209), use it
    if (
      customerLat &&
      customerLng &&
      !isNaN(customerLat) &&
      !isNaN(customerLng) &&
      customerLat !== 0 &&
      Math.abs(customerLat - 26.1209) > 0.0001
    ) {
      return { lat: customerLat, lng: customerLng };
    }
    // Fallback seed until geocoder resolves the exact destination string
    return { lat: 26.1209, lng: 85.3647 };
  });
  const [geocodedCustomerAddress, setGeocodedCustomerAddress] = useState<string>('');
  const [kitchenCoords, setKitchenCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [geocodedKitchenAddress, setGeocodedKitchenAddress] = useState<string>('');

  // Geofenced Arrival Alert state for rider
  const [geofenceNotice, setGeofenceNotice] = useState<string | null>(null);

  // Live Chat Drawer State
  const [showChatModal, setShowChatModal] = useState(false);
  const [inputMsg, setInputMsg] = useState('');

  // Rating Modal State
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [selectedStars, setSelectedStars] = useState(5);
  const [selectedTags, setSelectedTags] = useState<string[]>(['⚡ Super Fast', '🍱 Hot & Fresh']);
  const [ratingNote, setRatingNote] = useState('');

  const currentStatus = (orderStatus || riderStatus || 'sent').toLowerCase();

  // Clean Customer Address Memo - Exact delivery address entered by user
  const cleanCustomerAddress = useMemo(() => {
    if (!customerAddress || customerAddress.trim() === '') {
      return 'Customer Delivery Address';
    }
    return customerAddress.trim();
  }, [customerAddress]);

  // STAGE CHECK: Kitchen is accepted ONLY if a specific kitchen has explicitly accepted the order
  const isKitchenAccepted = isRiderView || isAdminView || Boolean(
    (acceptedByKitchenId && acceptedByKitchenId.trim() !== '') ||
    (currentStatus.includes('cooking') ||
      currentStatus.includes('preparing') ||
      currentStatus.includes('kitchen_accepted') ||
      currentStatus.includes('ready_for_pickup') ||
      currentStatus.includes('prepared') ||
      currentStatus.includes('out_for_delivery') ||
      currentStatus.includes('delivering') ||
      currentStatus.includes('picked_up') ||
      currentStatus.includes('delivered'))
  );

  // RIDER ASSIGNED CHECK: True ONLY when rider name is provided and valid
  const isRiderAssigned = Boolean(
    riderName &&
    riderName.trim() !== '' &&
    riderName !== 'Delivery Captain' &&
    riderName !== 'Delivery Partner' &&
    riderName !== 'Unassigned Rider' &&
    riderName !== 'Searching...'
  );

  // Check if Rider is actively sharing live location (online) vs offline
  const isRiderLiveOnline = useMemo(() => {
    if (isRiderView) return true;
    if (!isRiderAssigned) return false;
    if (!riderLat || !riderLng || isNaN(riderLat) || isNaN(riderLng) || riderLat === 0) return false;

    // Check freshness of rider timestamp if provided - only show if active live GPS ping within last 5 minutes
    if (riderLastUpdated) {
      try {
        const lastUpdatedDate = new Date(riderLastUpdated);
        if (!isNaN(lastUpdatedDate.getTime())) {
          const diffMinutes = (Date.now() - lastUpdatedDate.getTime()) / (1000 * 60);
          return diffMinutes <= 5; // Live if pinged within last 5 minutes
        }
      } catch (e) {
        return false;
      }
    }
    return false;
  }, [isRiderView, isRiderAssigned, riderLat, riderLng, riderLastUpdated]);

  // Voluntary device location handler for Takeaway orders only
  const requestDeviceLocation = () => {
    if (typeof window === 'undefined' || !navigator.geolocation) {
      setGpsPermissionState('denied');
      return;
    }
    setGpsPermissionState('requesting');
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coords = { lat: position.coords.latitude, lng: position.coords.longitude };
        setDeviceGpsCoords(coords);
        if (isTakeaway) {
          setCustomerCoords(coords);
        }
        setGpsPermissionState('granted');
      },
      (err) => {
        console.warn('Geolocation permission notice:', err);
        setGpsPermissionState('denied');
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 }
    );
  };

  // Accurate Rider Position using real device coordinates or Kitchen location
  const getRiderPosition = (): { lat: number; lng: number } => {
    if (riderLat && riderLng && !isNaN(riderLat) && !isNaN(riderLng) && riderLat !== 0) {
      return { lat: riderLat, lng: riderLng };
    }
    if (kitchenCoords && kitchenCoords.lat && kitchenCoords.lng) {
      return kitchenCoords;
    }
    return customerCoords;
  };

  const currentRiderPos = getRiderPosition();

  // Load Google Maps SDK
  useEffect(() => {
    let isMounted = true;
    loadGoogleMaps()
      .then((gMaps) => {
        if (!isMounted || !mapContainerRef.current) return;

        if (!googleMapRef.current) {
          const map = new gMaps.Map(mapContainerRef.current, {
            center: customerCoords,
            zoom: 14,
            styles: isDarkMode ? DARK_MAP_STYLE : LIGHT_MAP_STYLE,
            disableDefaultUI: true,
            zoomControl: false,
            mapTypeControl: false,
            streetViewControl: false,
            fullscreenControl: false,
          });

          googleMapRef.current = map;

          // Allow free panning and scrolling without aggressive auto-snapping
          map.addListener('dragstart', () => {
            isUserPanningRef.current = true;
            setUserHasPanned(true);
          });

          directionsServiceRef.current = new gMaps.DirectionsService();
          directionsRendererRef.current = new gMaps.DirectionsRenderer({
            map,
            suppressMarkers: true,
            suppressPolylines: true,
          });

          setMapLoaded(true);
        }
      })
      .catch((err) => {
        console.warn("Failed to load Google Maps SDK:", err);
        setMapError("Google Maps API Loading Error. Check internet connection.");
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // Toggle Dark/Light Map Style
  useEffect(() => {
    if (googleMapRef.current && window.google?.maps) {
      googleMapRef.current.setOptions({
        styles: isDarkMode ? DARK_MAP_STYLE : LIGHT_MAP_STYLE,
      });
    }
  }, [isDarkMode]);

  // Dynamic Geocoding for Customer Submitted Address & Accepted Kitchen Location
  useEffect(() => {
    // 1. Customer Location: Prioritize explicit non-default GPS coordinates if available, but ALWAYS geocode the real address string
    const hasCustomNonDefaultPin = (
      customerLat &&
      customerLng &&
      !isNaN(customerLat) &&
      !isNaN(customerLng) &&
      customerLat !== 0 &&
      Math.abs(customerLat - 26.1209) > 0.0001
    );

    if (hasCustomNonDefaultPin) {
      const explicitCoords = { lat: customerLat!, lng: customerLng! };
      setCustomerCoords(explicitCoords);
      setGeocodedCustomerAddress(cleanCustomerAddress);
      if (customerMarkerRef.current) {
        customerMarkerRef.current.setPosition(explicitCoords);
      }
    }

    if (mapLoaded && window.google?.maps && cleanCustomerAddress && cleanCustomerAddress.trim() !== '' && cleanCustomerAddress !== 'Customer Delivery Address') {
      const geocoder = new window.google.maps.Geocoder();
      // Strip bracketed perks or notes like (🎁 Unlocked Perks: ...) or (Self-Pickup...)
      const cleanedStr = cleanCustomerAddress.replace(/\s*\([^)]*\)/g, '').trim();

      const runGeocode = (query: string, onFail?: () => void) => {
        geocoder.geocode({ address: query }, (results, status) => {
          if (status === 'OK' && results && results[0]) {
            const loc = results[0].geometry.location;
            const resolvedCoords = { lat: loc.lat(), lng: loc.lng() };
            setCustomerCoords(resolvedCoords);
            setGeocodedCustomerAddress(results[0].formatted_address || cleanCustomerAddress);
            if (customerMarkerRef.current) {
              customerMarkerRef.current.setPosition(resolvedCoords);
            }
            if (googleMapRef.current && !isUserPanningRef.current && !userHasPanned) {
              googleMapRef.current.panTo(resolvedCoords);
            }
          } else if (onFail) {
            onFail();
          }
        });
      };

      const primaryQuery = cleanedStr.toLowerCase().includes('bihar') || cleanedStr.toLowerCase().includes('muzaffarpur')
        ? cleanedStr
        : `${cleanedStr}, Muzaffarpur, Bihar, India`;

      runGeocode(primaryQuery, () => {
        // Fallback retry: If address has a plus code prefix like '39VV+G8V, Anand Nagar...', strip plus code and geocode locality
        const parts = cleanedStr.split(',');
        if (parts.length > 1 && parts[0].includes('+')) {
          const localityQuery = `${parts.slice(1).join(',')}, Bihar, India`.trim();
          runGeocode(localityQuery);
        }
      });
    }

    // 2. Geocode Accepted Kitchen Address ONLY IF Kitchen is Accepted
    if (isKitchenAccepted) {
      if (kitchenLat && kitchenLng && !isNaN(kitchenLat) && kitchenLat !== 0) {
        setKitchenCoords({ lat: kitchenLat, lng: kitchenLng });
        setGeocodedKitchenAddress(kitchenAddress || '');
      } else if (mapLoaded && window.google?.maps && kitchenAddress && kitchenAddress.trim() !== '') {
        const geocoder = new window.google.maps.Geocoder();
        const kQuery = kitchenAddress.toLowerCase().includes('bihar') || kitchenAddress.toLowerCase().includes('muzaffarpur')
          ? kitchenAddress
          : `${kitchenAddress}, Muzaffarpur, Bihar, India`;

        geocoder.geocode({ address: kQuery }, (results, status) => {
          if (status === 'OK' && results && results[0]) {
            const loc = results[0].geometry.location;
            setKitchenCoords({ lat: loc.lat(), lng: loc.lng() });
            setGeocodedKitchenAddress(results[0].formatted_address || kitchenAddress);
          }
        });
      }
    } else {
      setKitchenCoords(null);
    }
  }, [mapLoaded, customerAddress, cleanCustomerAddress, customerLat, customerLng, kitchenAddress, kitchenLat, kitchenLng, isKitchenAccepted, userHasPanned]);

  // Render & Update Custom Branded Markers & Route Polylines
  useEffect(() => {
    if (!mapLoaded || !googleMapRef.current || !window.google?.maps) return;

    const map = googleMapRef.current;
    const gMaps = window.google.maps;

    // A. CUSTOMER / USER MARKER (GEOCODED ADDRESS OR LIVE DEVICE GPS FOR TAKEAWAY)
    if (!customerMarkerRef.current) {
      const isLiveGps = isTakeaway && gpsPermissionState === 'granted';
      const markerSvg = isTakeaway ? `
        <svg xmlns="http://www.w3.org/2000/svg" width="52" height="52" viewBox="0 0 52 52">
          <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="5" stdDeviation="5" flood-color="#0284C7" flood-opacity="0.7"/>
          </filter>
          <g filter="url(#shadow)">
            <circle cx="26" cy="26" r="22" fill="#0284C7" stroke="#FFFFFF" stroke-width="3.5"/>
            <circle cx="26" cy="26" r="10" fill="#BAE6FD"/>
            <circle cx="26" cy="26" r="5" fill="#FFFFFF"/>
          </g>
        </svg>
      ` : `
        <svg xmlns="http://www.w3.org/2000/svg" width="52" height="52" viewBox="0 0 52 52">
          <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="5" stdDeviation="5" flood-color="#EA580C" flood-opacity="0.6"/>
          </filter>
          <g filter="url(#shadow)">
            <circle cx="26" cy="26" r="22" fill="#EA580C" stroke="#FFFFFF" stroke-width="3"/>
            <path d="M16 28 L26 18 L36 28 V36 H16 Z" fill="#FEF08A"/>
          </g>
        </svg>
      `;

      const customerMarker = new gMaps.Marker({
        position: customerCoords,
        map,
        title: isTakeaway ? `Your Starting Location (${isLiveGps ? 'Live Device GPS' : 'Address'})` : `${customerName || 'User'} - ${cleanCustomerAddress}`,
        icon: {
          url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(markerSvg),
          scaledSize: new gMaps.Size(52, 52),
          anchor: new gMaps.Point(26, 26),
        },
      });
      customerMarkerRef.current = customerMarker;
    } else {
      customerMarkerRef.current.setPosition(customerCoords);
      customerMarkerRef.current.setMap(map);
    }

    // B. IF KITCHEN HAS NOT ACCEPTED YET -> REMOVE KITCHEN PIN & ROUTE!
    if (!isKitchenAccepted || !kitchenCoords) {
      if (kitchenMarkerRef.current) {
        kitchenMarkerRef.current.setMap(null);
        kitchenMarkerRef.current = null;
      }
      if (riderMarkerRef.current) {
        riderMarkerRef.current.setMap(null);
        riderMarkerRef.current = null;
      }
      if (directionsRendererRef.current) {
        directionsRendererRef.current.setDirections({ routes: [] } as any);
      }
      if (polylineRef.current) {
        polylineRef.current.setMap(null);
        polylineRef.current = null;
      }
      if (casingPolylineRef.current) {
        casingPolylineRef.current.setMap(null);
        casingPolylineRef.current = null;
      }
      if (routeDurationMarkerRef.current) {
        routeDurationMarkerRef.current.setMap(null);
        routeDurationMarkerRef.current = null;
      }

      // Smooth auto-adjust camera directly onto Customer Address
      if (!isUserPanningRef.current && !userHasPanned) {
        map.panTo(customerCoords);
        if ((map.getZoom() || 14) < 14 || (map.getZoom() || 14) > 16) {
          map.setZoom(15);
        }
      }
      return;
    }

    // C. IF KITCHEN IS ACCEPTED:
    // 1. ACCEPTED KITCHEN / OUTLET MARKER
    if (!kitchenMarkerRef.current) {
      const kitchenMarker = new gMaps.Marker({
        position: kitchenCoords,
        map,
        title: isTakeaway ? `Takeaway Pickup Counter: ${kitchenName}` : (kitchenName || "Accepted Kitchen"),
        icon: {
          url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
            <svg xmlns="http://www.w3.org/2000/svg" width="52" height="52" viewBox="0 0 52 52">
              <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx="0" dy="4" stdDeviation="4" flood-color="#000" flood-opacity="0.5"/>
              </filter>
              <g filter="url(#shadow)">
                <rect x="6" y="6" width="40" height="40" rx="12" fill="${isTakeaway ? '#059669' : '#B45309'}" stroke="#FFFFFF" stroke-width="3"/>
                <text x="26" y="31" font-size="22" text-anchor="middle" dominant-baseline="central">${isTakeaway ? '🏬' : '🏪'}</text>
              </g>
            </svg>
          `),
          scaledSize: new gMaps.Size(52, 52),
          anchor: new gMaps.Point(26, 26),
        },
      });
      kitchenMarkerRef.current = kitchenMarker;
    } else {
      kitchenMarkerRef.current.setPosition(kitchenCoords);
      kitchenMarkerRef.current.setMap(map);
    }

    // 2. RIDER MOTORBIKE MARKER (ONLY IF DELIVERY MODE AND RIDER IS ACTUALLY ASSIGNED AND ACTUALLY LIVE ONLINE)
    const shouldShowRiderMarker = !isTakeaway && isRiderAssigned && isRiderLiveOnline;
    if (shouldShowRiderMarker) {
      if (!riderMarkerRef.current) {
        const riderMarker = new gMaps.Marker({
          position: currentRiderPos,
          map,
          title: `${riderName} ${riderVehicleNumber ? `(${riderVehicleNumber})` : ''} • Live GPS`,
          icon: {
            url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
              <svg xmlns="http://www.w3.org/2000/svg" width="56" height="56" viewBox="0 0 56 56">
                <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
                  <feDropShadow dx="0" dy="6" stdDeviation="6" flood-color="#047857" flood-opacity="0.6"/>
                </filter>
                <g filter="url(#shadow)">
                  <circle cx="28" cy="28" r="24" fill="#10B981" stroke="#FFFFFF" stroke-width="3"/>
                  <text x="28" y="31" font-size="26" text-anchor="middle" dominant-baseline="central">🛵</text>
                </g>
              </svg>
            `),
            scaledSize: new gMaps.Size(56, 56),
            anchor: new gMaps.Point(28, 28),
          },
        });
        riderMarkerRef.current = riderMarker;
      } else {
        riderMarkerRef.current.setPosition(currentRiderPos);
        riderMarkerRef.current.setMap(map);
      }
    } else if (riderMarkerRef.current) {
      riderMarkerRef.current.setMap(null);
      riderMarkerRef.current = null;
    }

    // 3. GOOGLE DIRECTIONS ROUTE CALCULATION WITH ROAD-FOLLOWING POLYLINE
    if (directionsServiceRef.current && directionsRendererRef.current) {
      const isHeadingToKitchen = isRiderView && (
        riderStatus === 'en_route_kitchen' ||
        riderStatus === 'arrived_kitchen' ||
        riderStatus === 'accepted' ||
        currentStatus.includes('en_route_kitchen') ||
        (!currentStatus.includes('out_for_delivery') && !currentStatus.includes('delivered') && !currentStatus.includes('picked_up'))
      );

      const routeOrigin = isTakeaway
        ? customerCoords
        : (isRiderAssigned && isRiderLiveOnline && riderMarkerRef.current ? currentRiderPos : (kitchenCoords || { lat: 26.1209, lng: 85.3647 }));

      const routeDestination = isTakeaway 
        ? (kitchenCoords || { lat: 26.1209, lng: 85.3647 })
        : ((isHeadingToKitchen && kitchenCoords) ? kitchenCoords : customerCoords);

      const distMoved = lastRoutedPosRef.current ? calculateHaversineDistanceKm(
        routeOrigin.lat,
        routeOrigin.lng,
        lastRoutedPosRef.current.lat,
        lastRoutedPosRef.current.lng
      ) : 999;

      const targetChanged = !lastRoutedPosRef.current ||
        lastRoutedPosRef.current.targetLat !== routeDestination.lat ||
        lastRoutedPosRef.current.targetLng !== routeDestination.lng;

      if (distMoved > 0.03 || targetChanged) {
        lastRoutedPosRef.current = {
          lat: routeOrigin.lat,
          lng: routeOrigin.lng,
          targetLat: routeDestination.lat,
          targetLng: routeDestination.lng,
        };

        directionsServiceRef.current.route(
          {
            origin: routeOrigin,
            destination: routeDestination,
            travelMode: gMaps.TravelMode.DRIVING,
          },
          (result, status) => {
            if (status === gMaps.DirectionsStatus.OK && result && result.routes && result.routes[0]) {
              const routeObj = result.routes[0];
              const routeLeg = routeObj.legs[0];
              const overviewPath = routeObj.overview_path || [];

              if (overviewPath.length > 0) {
                // Outer dark casing line following true turn-by-turn road geometry
                if (!casingPolylineRef.current) {
                  casingPolylineRef.current = new gMaps.Polyline({
                    path: overviewPath,
                    geodesic: true,
                    strokeColor: '#0D47A1',
                    strokeOpacity: 0.85,
                    strokeWeight: 10,
                    map,
                  });
                } else {
                  casingPolylineRef.current.setPath(overviewPath);
                  casingPolylineRef.current.setMap(map);
                }

                // Google Maps Royal Blue main path line following true turn-by-turn road geometry
                if (!polylineRef.current) {
                  polylineRef.current = new gMaps.Polyline({
                    path: overviewPath,
                    geodesic: true,
                    strokeColor: '#1A73E8',
                    strokeOpacity: 1.0,
                    strokeWeight: 6,
                    map,
                  });
                } else {
                  polylineRef.current.setPath(overviewPath);
                  polylineRef.current.setMap(map);
                }

                // Route duration badge (e.g. "11 min") anchored at midpoint of route polyline
                const midIndex = Math.floor(overviewPath.length / 2);
                const midPt = overviewPath[midIndex];
                if (midPt) {
                  const durationText = routeLeg?.duration_in_traffic?.text || routeLeg?.duration?.text || '11 min';
                  const durationSvg = `
                    <svg xmlns="http://www.w3.org/2000/svg" width="96" height="38" viewBox="0 0 96 38">
                      <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
                        <feDropShadow dx="0" dy="2" stdDeviation="3" flood-color="#000" flood-opacity="0.5"/>
                      </filter>
                      <g filter="url(#shadow)">
                        <rect x="3" y="3" width="90" height="32" rx="16" fill="#1A73E8" stroke="#FFFFFF" stroke-width="2.5"/>
                        <text x="48" y="19" font-family="system-ui, -apple-system, sans-serif" font-size="13" font-weight="800" fill="#FFFFFF" text-anchor="middle" dominant-baseline="central">${durationText}</text>
                      </g>
                    </svg>
                  `;

                  if (!routeDurationMarkerRef.current) {
                    routeDurationMarkerRef.current = new gMaps.Marker({
                      position: midPt,
                      map,
                      title: durationText,
                      icon: {
                        url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(durationSvg),
                        scaledSize: new gMaps.Size(96, 38),
                        anchor: new gMaps.Point(48, 19),
                      },
                      zIndex: 9999,
                    });
                  } else {
                    routeDurationMarkerRef.current.setPosition(midPt);
                    routeDurationMarkerRef.current.setIcon({
                      url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(durationSvg),
                      scaledSize: new gMaps.Size(96, 38),
                      anchor: new gMaps.Point(48, 19),
                    });
                    routeDurationMarkerRef.current.setMap(map);
                  }
                }
              }

              if (routeLeg) {
                if (routeLeg.distance?.text) {
                  const numKm = parseFloat(routeLeg.distance.text.replace(/[^0-9.]/g, '')) || 2.4;
                  setLiveDistanceKm(numKm);
                }
                if (routeLeg.duration_in_traffic?.text || routeLeg.duration?.text) {
                  setLiveEtaMinutes(routeLeg.duration_in_traffic?.text || routeLeg.duration?.text || '12 Mins');
                }
                if (routeLeg.steps && routeLeg.steps.length > 0) {
                  const cleanSteps = routeLeg.steps.map((s: any) => ({
                    instruction: s.instructions ? s.instructions.replace(/<[^>]*>/g, '') : 'Proceed along route',
                    distance: s.distance?.text || '',
                  }));
                  setNavigationSteps(cleanSteps);
                }
              }
            } else {
              // If directions call failed, clear polylines so no straight displacement line is rendered
              if (casingPolylineRef.current) casingPolylineRef.current.setPath([]);
              if (polylineRef.current) polylineRef.current.setPath([]);
              if (routeDurationMarkerRef.current) routeDurationMarkerRef.current.setMap(null);
            }
          }
        );
      }
    }

    // 4. AUTOMATIC GEOFENCED ARRIVAL DETECTION (ONLY IF KITCHEN ACCEPTED AND RIDER IS LIVE ONLINE)
    if (!isTakeaway && isKitchenAccepted && isRiderAssigned && isRiderLiveOnline && riderLat && riderLng && riderLat !== 0) {
      const distToCustomer = calculateHaversineDistanceKm(
        currentRiderPos.lat,
        currentRiderPos.lng,
        customerCoords.lat,
        customerCoords.lng
      );

      const distToKitchen = kitchenCoords ? calculateHaversineDistanceKm(
        currentRiderPos.lat,
        currentRiderPos.lng,
        kitchenCoords.lat,
        kitchenCoords.lng
      ) : 999;

      if (distToKitchen < 0.15 && !currentStatus.includes('delivered') && !currentStatus.includes('out_for_delivery') && !currentStatus.includes('delivering')) {
        setGeofenceNotice(`🏢 Rider detected within 150m of ${kitchenName || 'Kitchen'}!`);
      } else if (distToCustomer < 0.20 && !currentStatus.includes('delivered')) {
        setGeofenceNotice("📍 Rider detected within 200m of Customer Delivery Address!");
      } else {
        setGeofenceNotice(null);
      }
    } else {
      setGeofenceNotice(null);
    }

    // 5. CAMERA & VIEWPORT AUTO-ADJUSTMENT (SMOOTH TRANSITIONS)
    if (!isUserPanningRef.current && !userHasPanned) {
      if (isRiderView && cameraMode === 'rider') {
        const isHeadingToKitchen = (
          riderStatus === 'en_route_kitchen' ||
          riderStatus === 'arrived_kitchen' ||
          riderStatus === 'accepted' ||
          currentStatus.includes('en_route_kitchen') ||
          (!currentStatus.includes('out_for_delivery') && !currentStatus.includes('delivered') && !currentStatus.includes('picked_up'))
        );
        const targetDestination = (isHeadingToKitchen && kitchenCoords) ? kitchenCoords : customerCoords;

        map.panTo(currentRiderPos);
        if (isNavigating) {
          if ((map.getZoom() || 14) < 17) {
            map.setZoom(18);
          }
          const headingAngle = calculateBearing(
            currentRiderPos.lat,
            currentRiderPos.lng,
            targetDestination.lat,
            targetDestination.lng
          );
          try {
            if (typeof (map as any).setHeading === 'function') {
              (map as any).setHeading(headingAngle);
            }
            if (typeof (map as any).setTilt === 'function') {
              (map as any).setTilt(45);
            }
          } catch (e) {}
        }
      } else {
        // Customer / Fit Overview Mode: Smooth Auto-adjusting bounds
        try {
          if (typeof (map as any).setTilt === 'function') (map as any).setTilt(0);
          if (typeof (map as any).setHeading === 'function') (map as any).setHeading(0);
        } catch (e) {}

        const bounds = new gMaps.LatLngBounds();
        bounds.extend(customerCoords);

        if (kitchenCoords) {
          bounds.extend(kitchenCoords);
        }

        // If rider has joined and is active, ensure both customer address and delivery partner are in frame
        if (!isTakeaway && isRiderAssigned && riderMarkerRef.current) {
          bounds.extend(currentRiderPos);
        }

        // Coarse signature to prevent aggressive micro-jitter re-fitting
        const cLat = (customerCoords?.lat && !isNaN(customerCoords.lat)) ? customerCoords.lat.toFixed(4) : '26.1209';
        const cLng = (customerCoords?.lng && !isNaN(customerCoords.lng)) ? customerCoords.lng.toFixed(4) : '85.3647';
        const kLat = (kitchenCoords?.lat && !isNaN(kitchenCoords.lat)) ? kitchenCoords.lat.toFixed(4) : '26.1158';
        const kLng = (kitchenCoords?.lng && !isNaN(kitchenCoords.lng)) ? kitchenCoords.lng.toFixed(4) : '85.3912';
        const rLat = (currentRiderPos?.lat && !isNaN(currentRiderPos.lat)) ? currentRiderPos.lat.toFixed(3) : '26.1158';
        const rLng = (currentRiderPos?.lng && !isNaN(currentRiderPos.lng)) ? currentRiderPos.lng.toFixed(3) : '85.3912';

        const signature = !isKitchenAccepted
          ? `unaccepted_${cLat}_${cLng}`
          : isTakeaway
          ? `takeaway_${cLat}_${cLng}_${kLat}_${kLng}`
          : isRiderAssigned
          ? `rider_${cLat}_${cLng}_${rLat}_${rLng}_${isKitchenAccepted}`
          : `accepted_${cLat}_${cLng}_${kLat}_${kLng}`;

        if (lastBoundsSignatureRef.current !== signature) {
          lastBoundsSignatureRef.current = signature;
          map.fitBounds(bounds, { top: 60, bottom: 65, left: 60, right: 60 });
        }
      }
    }

  }, [mapLoaded, customerCoords, kitchenCoords, isKitchenAccepted, isRiderAssigned, isRiderLiveOnline, currentRiderPos, riderLat, riderLng, kitchenName, currentStatus, cameraMode, isNavigating, isTakeaway, userHasPanned, gpsPermissionState]);

  // Render Admin Fleet Markers
  useEffect(() => {
    if (!isAdminView || !mapLoaded || !googleMapRef.current || !window.google?.maps) return;

    const map = googleMapRef.current;
    const gMaps = window.google.maps;

    fleetMarkersRef.current.forEach((m) => m.setMap(null));
    fleetMarkersRef.current = [];

    // Filter only genuine, active items with real non-zero GPS coordinates
    const items = [...allActiveOrders, ...allRiders].filter((item) => {
      const lat = item.lat || item.riderLat;
      const lng = item.lng || item.riderLng;
      return typeof lat === 'number' && typeof lng === 'number' && !isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0;
    });

    items.forEach((item, idx) => {
      const lat = item.lat || item.riderLat;
      const lng = item.lng || item.riderLng;

      let pinColor = '#EAB308';
      if (item.status === 'out_for_delivery' || item.status === 'picked_up') pinColor = '#3B82F6';
      else if (item.status === 'arriving' || item.status === 'nearby') pinColor = '#F97316';
      else if (item.status === 'delivered') pinColor = '#10B981';
      else if (item.status === 'cancelled') pinColor = '#EF4444';

      const fleetMarker = new gMaps.Marker({
        position: { lat, lng },
        map,
        title: item.name || item.id || `Rider #${idx + 1}`,
        icon: {
          url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
            <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 36 36">
              <circle cx="18" cy="18" r="14" fill="${pinColor}" stroke="#FFFFFF" stroke-width="2.5"/>
              <text x="18" y="21" font-size="14" font-weight="bold" fill="#000" text-anchor="middle">🛵</text>
            </svg>
          `),
          scaledSize: new gMaps.Size(36, 36),
          anchor: new gMaps.Point(18, 18),
        },
      });

      fleetMarker.addListener('click', () => {
        setSelectedFleetItem(item);
        if (onSelectRiderOrOrder) onSelectRiderOrOrder(item);
      });

      fleetMarkersRef.current.push(fleetMarker);
    });
  }, [isAdminView, mapLoaded, allActiveOrders, allRiders]);

  const handleRecenter = () => {
    if (!googleMapRef.current || !window.google?.maps) return;
    isUserPanningRef.current = false;
    setUserHasPanned(false);
    lastBoundsSignatureRef.current = '';

    const map = googleMapRef.current;
    const gMaps = window.google.maps;

    if (!isRiderView) {
      try {
        if (typeof (map as any).setTilt === 'function') (map as any).setTilt(0);
        if (typeof (map as any).setHeading === 'function') (map as any).setHeading(0);
      } catch (e) {}
    }

    if (!isKitchenAccepted || !kitchenCoords) {
      map.panTo(customerCoords);
      map.setZoom(15);
      return;
    }

    const bounds = new gMaps.LatLngBounds();
    bounds.extend(customerCoords);
    if (kitchenCoords) {
      bounds.extend(kitchenCoords);
    }
    if (!isTakeaway && isRiderAssigned && riderMarkerRef.current) {
      bounds.extend(currentRiderPos);
    }
    map.fitBounds(bounds, { top: 60, bottom: 65, left: 60, right: 60 });
  };

  const handleSendChatText = (textToSend?: string) => {
    const text = textToSend || inputMsg;
    if (!text.trim()) return;
    if (onSendMessage) {
      onSendMessage(text.trim());
    }
    setInputMsg('');
  };

  const handleToggleTag = (tag: string) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter(t => t !== tag));
    } else {
      setSelectedTags([...selectedTags, tag]);
    }
  };

  const handleConfirmRating = () => {
    if (onRateDelivery) {
      onRateDelivery(selectedStars, selectedTags, ratingNote);
    }
    setShowRatingModal(false);
  };

  const getStatusBadge = () => {
    if (isTakeaway) {
      return { label: '🛍️ TAKEAWAY — SELF PICKUP ROUTE', bg: 'bg-emerald-950/90 border-emerald-400 text-emerald-200 font-extrabold' };
    }
    if (currentStatus.includes('delivered')) {
      return { label: '✓ DELIVERED TO HOME', bg: 'bg-emerald-950/90 border-emerald-400 text-emerald-200' };
    }
    if (currentStatus.includes('arriving') || currentStatus.includes('nearby')) {
      return { label: '🛵 RIDER NEARBY (ARRIVING)', bg: 'bg-amber-950/90 border-amber-400 text-amber-200' };
    }
    if (currentStatus.includes('out_for_delivery') || currentStatus.includes('picked_up') || currentStatus.includes('heading')) {
      return { label: '🚀 EN ROUTE TO HOME', bg: 'bg-indigo-950/90 border-indigo-400 text-indigo-200' };
    }
    if (currentStatus.includes('cooking') || currentStatus.includes('preparing')) {
      return { label: '🍳 CHEF COOKING AT KITCHEN', bg: 'bg-amber-950/90 border-amber-500/60 text-amber-300' };
    }
    if (isKitchenAccepted) {
      return { label: `🏪 KITCHEN ACCEPTED (${kitchenName || 'Partner Kitchen'})`, bg: 'bg-amber-900/90 border-amber-400 text-amber-100' };
    }
    return { label: '⏳ TRANSMITTED — AWAITING KITCHEN ACCEPTANCE', bg: 'bg-amber-950/90 border-amber-500/80 text-amber-200 animate-pulse' };
  };

  const badgeInfo = getStatusBadge();

  return (
    <div className="bg-[#0B0F14] border border-white/10 rounded-3xl p-4 sm:p-5 shadow-2xl relative overflow-hidden text-white font-sans transition-all">
      {/* Background Subtle Gradient Glows */}
      <div className="absolute -top-24 -left-24 w-56 h-56 bg-amber-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -right-24 w-56 h-56 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top Header Controls Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/10 mb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-400/40 text-amber-400 flex items-center justify-center font-bold text-xs shadow-inner">
            <Compass className="w-5 h-5 animate-spin text-amber-400" style={{ animationDuration: '10s' }} />
          </div>
          <div>
            <h4 className="text-xs font-black uppercase text-white tracking-wider flex items-center gap-2">
              <span>{isAdminView ? 'UBER FLEET LIVE MAP' : isTakeaway ? 'TAASH BHATTI SELF-PICKUP ROUTE MAP' : 'TAASH BHATTI LIVE DELIVERY MAP'}</span>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            </h4>
            <p className="text-[10px] text-amber-400/90 font-mono truncate max-w-xs">
              {isTakeaway
                ? (isKitchenAccepted
                    ? `📍 Pickup Counter: ${kitchenName}${kitchenAddress ? ` (${kitchenAddress})` : ''}`
                    : '🔍 Order Transmitted — Waiting for Kitchen Acceptance')
                : (isKitchenAccepted
                    ? `📍 Accepted Kitchen: ${kitchenName}`
                    : '🔍 Order Transmitted — Waiting for Kitchen Acceptance')}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Status Badge */}
          <span className={`text-[10px] font-black uppercase px-3 py-1.5 rounded-xl border shadow-sm ${badgeInfo.bg}`}>
            {badgeInfo.label}
          </span>

          {/* Theme Toggle Button */}
          <button
            type="button"
            onClick={() => setIsDarkMode(!isDarkMode)}
            className="px-2.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-xs font-bold text-gray-200 transition-all cursor-pointer"
            title="Toggle Map Style"
          >
            {isDarkMode ? '☀️ Light' : '🌙 Dark'}
          </button>

          {/* Chat with Rider Toggle Button */}
          {!isAdminView && (
            <button
              type="button"
              onClick={() => setShowChatModal(true)}
              className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-brand-charcoal border border-amber-300 text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer shadow-md"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Message Rider</span>
              {chatMessages.length > 0 && (
                <span className="w-4 h-4 rounded-full bg-red-600 text-white text-[9px] font-bold flex items-center justify-center ml-0.5">
                  {chatMessages.length}
                </span>
              )}
            </button>
          )}

          {/* Rider Mandatory GPS Switch */}
          {isRiderView && onEnableGps && (
            <button
              type="button"
              onClick={onEnableGps}
              className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase flex items-center gap-1.5 transition-all cursor-pointer border ${
                gpsActive
                  ? 'bg-emerald-500 text-brand-charcoal border-emerald-400 shadow-md shadow-emerald-500/20'
                  : 'bg-red-500 text-white border-red-400 animate-pulse'
              }`}
            >
              <Radio className={`w-3.5 h-3.5 ${gpsActive ? 'animate-pulse' : ''}`} />
              <span>{gpsActive ? 'GPS Telemetry Active' : 'Enable Mandatory GPS'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Takeaway Location Permission Request Banner */}
      {isTakeaway && gpsPermissionState !== 'granted' && (
        <div className="mb-3 p-3 rounded-2xl bg-amber-950/90 border border-amber-400 text-amber-200 text-xs font-bold flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 shadow-xl animate-fade-in">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-400 flex items-center justify-center text-amber-400 shrink-0 font-bold">
              📍
            </div>
            <div>
              <span className="text-[10px] text-amber-400 font-black uppercase tracking-wider block">
                Outlet Guidance Ready
              </span>
              <span className="text-white font-medium text-xs block">
                Enable device location so we can guide you directly to the {kitchenName || 'pickup outlet'}.
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={requestDeviceLocation}
            className="w-full sm:w-auto px-4 py-2 bg-amber-500 hover:bg-amber-400 text-brand-charcoal font-black rounded-xl text-xs shrink-0 cursor-pointer shadow transition-all active:scale-95 flex items-center justify-center gap-1.5"
          >
            <Navigation className="w-3.5 h-3.5 fill-current" />
            <span>{gpsPermissionState === 'requesting' ? 'Requesting GPS...' : 'Allow Device Location'}</span>
          </button>
        </div>
      )}

      {/* Geofence Notice Alert */}
      {geofenceNotice && (
        <div className="mb-3 p-3 rounded-2xl bg-emerald-950/90 border border-emerald-400 text-emerald-200 text-xs font-bold flex items-center gap-2.5 animate-pulse">
          <Zap className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{geofenceNotice}</span>
        </div>
      )}

      {/* Turn-by-Turn Directions Guidance Banner (Only for active rider or active navigation) */}
      {(isRiderView || isNavigating) && navigationSteps.length > 0 && isKitchenAccepted && (
        <div className="mb-3 p-3 rounded-2xl bg-[#1A120B] border border-[#CB6D22]/60 text-amber-200 text-xs font-mono shadow-xl flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-[#CB6D22]/20 border border-[#CB6D22] text-[#CB6D22] flex items-center justify-center shrink-0 font-bold text-base shadow-sm">
              🧭
            </div>
            <div className="truncate">
              <span className="text-[9px] text-[#CB6D22] font-black uppercase tracking-wider block">
                Route Guidance • Live Directions
              </span>
              <span className="text-white font-semibold truncate block">
                {navigationSteps[0]?.instruction} {navigationSteps[0]?.distance ? `(${navigationSteps[0]?.distance})` : ''}
              </span>
            </div>
          </div>
          <span className="text-[10px] bg-[#CB6D22]/20 border border-[#CB6D22]/50 text-[#CB6D22] px-2.5 py-1 rounded-xl font-black shrink-0">
            {navigationSteps.length} Steps Remaining
          </span>
        </div>
      )}

      {/* Raining Mode Delivery Delay Notice (only active once the kitchen has accepted the order) */}
      {isRaining && isKitchenAccepted && (
        <div className="bg-gradient-to-r from-sky-950/90 via-blue-950/95 to-slate-950/90 border-2 border-sky-400/60 rounded-2xl p-3 sm:p-3.5 my-2 shadow-xl flex items-start gap-3 relative overflow-hidden animate-in fade-in duration-200">
          <div className="w-9 h-9 rounded-xl bg-sky-500/20 border border-sky-400/40 flex items-center justify-center text-lg shrink-0 shadow-inner">
            🌧️
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-[9px] font-black uppercase tracking-widest bg-sky-400/20 text-sky-200 border border-sky-400/30 px-2 py-0.5 rounded-full flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-ping" />
                Live Weather Alert
              </span>
              <span className="text-[10px] text-sky-300 font-mono font-bold truncate">
                {kitchenName ? `Branch: ${kitchenName}` : 'Kitchen Zone'}
              </span>
            </div>
            <h5 className="font-black text-xs text-white uppercase tracking-wider">
              It's raining so we may take some time to deliver
            </h5>
            <p className="text-[11px] text-sky-200/90 font-medium mt-0.5 leading-relaxed">
              Active rainfall detected near our kitchen. Riders are navigating cautiously with waterproof bags to deliver your meal hot and safe.
            </p>
          </div>
        </div>
      )}

      {/* Interactive Google Map Canvas */}
      <div className="relative w-full h-80 sm:h-96 bg-[#121820] rounded-2xl border border-white/10 overflow-hidden shadow-inner my-2">
        <div ref={mapContainerRef} className="w-full h-full z-0 cursor-grab active:cursor-grabbing" />

        {/* Currently Raining Animation & Floating Radar Badge (Only after kitchen acceptance) */}
        {isRaining && isKitchenAccepted && (
          <>
            <RainEffect density="medium" speed={1.1} showSplashes={true} showMist={true} />
            <div className="absolute top-3 left-3 z-10 bg-blue-950/90 backdrop-blur-md border border-sky-400/50 text-sky-200 px-3 py-1.5 rounded-xl shadow-xl flex items-center gap-2 text-[10px] font-black pointer-events-none">
              <CloudRain className="w-3.5 h-3.5 text-sky-400 animate-bounce" />
              <span>🌧️ Live Rain Mode Active</span>
            </div>
          </>
        )}

        {mapError && (
          <div className="absolute inset-0 bg-[#0F1419]/90 flex items-center justify-center p-6 text-center z-20">
            <div className="max-w-md space-y-3">
              <AlertTriangle className="w-10 h-10 text-amber-400 mx-auto" />
              <p className="text-xs text-amber-200 font-bold">{mapError}</p>
            </div>
          </div>
        )}

        {/* Floating Map Action Buttons */}
        <div className="absolute top-3 right-3 z-10 flex flex-col gap-1.5 bg-black/85 backdrop-blur-md border border-white/15 p-1.5 rounded-2xl shadow-2xl">
          {/* Rider Mode Controls */}
          {isRiderView ? (
            <>
              <button
                type="button"
                onClick={() => {
                  setCameraMode('rider');
                  if (googleMapRef.current && window.google?.maps) {
                    googleMapRef.current.panTo(currentRiderPos);
                    googleMapRef.current.setZoom(17);
                    const isHeadingToKitchen = (
                      riderStatus === 'en_route_kitchen' ||
                      riderStatus === 'arrived_kitchen' ||
                      riderStatus === 'accepted' ||
                      currentStatus.includes('en_route_kitchen') ||
                      (!currentStatus.includes('out_for_delivery') && !currentStatus.includes('delivered') && !currentStatus.includes('picked_up'))
                    );
                    const targetDest = (isHeadingToKitchen && kitchenCoords) ? kitchenCoords : customerCoords;
                    const headingAngle = calculateBearing(
                      currentRiderPos.lat,
                      currentRiderPos.lng,
                      targetDest.lat,
                      targetDest.lng
                    );
                    if (typeof (googleMapRef.current as any).setHeading === 'function') {
                      (googleMapRef.current as any).setHeading(headingAngle);
                    }
                    if (typeof (googleMapRef.current as any).setTilt === 'function') {
                      (googleMapRef.current as any).setTilt(45);
                    }
                  }
                }}
                title="Focus Rider Location (Driver Cam Mode)"
                className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all cursor-pointer border active:scale-95 ${
                  cameraMode === 'rider'
                    ? 'bg-emerald-500 text-brand-charcoal border-emerald-400 font-bold shadow-lg shadow-emerald-500/30'
                    : 'bg-white/10 hover:bg-white/20 text-white border-white/10'
                }`}
              >
                <Navigation className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={() => {
                  setCameraMode('fit');
                  handleRecenter();
                }}
                title="Fit Full Route Overview"
                className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all cursor-pointer border active:scale-95 ${
                  cameraMode === 'fit'
                    ? 'bg-amber-500 text-brand-charcoal border-amber-400 font-bold shadow-lg shadow-amber-500/30'
                    : 'bg-white/10 hover:bg-white/20 text-white border-white/10'
                }`}
              >
                <Maximize2 className="w-4 h-4" />
              </button>
            </>
          ) : (
            /* Customer Mode: Single Recenter Button */
            <button
              type="button"
              onClick={handleRecenter}
              title="Recenter Map View"
              className="w-9 h-9 rounded-xl bg-blue-600 hover:bg-blue-500 text-white flex items-center justify-center transition-all cursor-pointer border border-blue-400 active:scale-95 shadow-md"
            >
              <Navigation className="w-4 h-4 fill-white" />
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              if (googleMapRef.current) {
                if (typeof (googleMapRef.current as any).setHeading === 'function') {
                  (googleMapRef.current as any).setHeading(0);
                }
                if (typeof (googleMapRef.current as any).setTilt === 'function') {
                  (googleMapRef.current as any).setTilt(0);
                }
              }
            }}
            title="Reset Compass (North Up)"
            className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all cursor-pointer border border-white/10 active:scale-95"
          >
            <Compass className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => googleMapRef.current?.setZoom((googleMapRef.current.getZoom() || 14) + 1)}
            title="Zoom In"
            className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all cursor-pointer border border-white/10 active:scale-95 font-bold text-lg"
          >
            +
          </button>
          <button
            type="button"
            onClick={() => googleMapRef.current?.setZoom((googleMapRef.current.getZoom() || 14) - 1)}
            title="Zoom Out"
            className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all cursor-pointer border border-white/10 active:scale-95 font-bold text-lg"
          >
            −
          </button>
        </div>

        {/* Floating Recenter Button when user has manually panned */}
        {userHasPanned && (
          <button
            type="button"
            onClick={handleRecenter}
            className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 bg-[#1A73E8] hover:bg-blue-600 text-white font-extrabold text-xs py-2.5 px-5 rounded-full shadow-2xl flex items-center gap-2 border-2 border-white cursor-pointer active:scale-95 transition-all animate-bounce"
          >
            <Navigation className="w-4 h-4 fill-current" />
            <span>Recenter Map</span>
          </button>
        )}

        {/* Legend Bar */}
        {!isNavigating && (
          <div className="absolute top-3 left-3 z-10 bg-black/85 backdrop-blur-md border border-white/15 px-3 py-1.5 rounded-xl shadow-xl flex items-center gap-3 text-[10px] font-mono">
            <div className="flex items-center gap-1.5">
              <Home className="w-3.5 h-3.5 text-orange-400" />
              <span className="text-gray-200 font-bold">
                {isTakeaway ? (gpsPermissionState === 'granted' ? '📍 You (Live GPS)' : '📍 Your Starting Pin') : 'Customer Delivery Pin'}
              </span>
            </div>
            {isKitchenAccepted ? (
              <>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 bg-amber-500 rounded-full inline-block" />
                  <span className="text-amber-300 font-bold">{kitchenName || 'Kitchen'}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3.5 h-1.5 bg-[#1A73E8] rounded-full inline-block shadow-[0_0_8px_#1A73E8]" />
                  <span className="text-[#1A73E8] font-black">Google Route</span>
                </div>
              </>
            ) : (
              <div className="flex items-center gap-1.5 text-amber-400 animate-pulse">
                <Compass className="w-3 h-3 animate-spin" />
                <span>Awaiting Kitchen Accept</span>
              </div>
            )}
          </div>
        )}

        {/* Top Turn-by-Turn Navigation Instruction Header (Only during active navigation) */}
        {isNavigating && isRiderView && (
          <div className="absolute top-3 left-3 right-3 sm:left-1/2 sm:-translate-x-1/2 sm:w-[480px] z-30 bg-[#005751] text-white p-3.5 rounded-2xl shadow-2xl border-2 border-teal-300/60 flex items-center justify-between gap-3 animate-in fade-in slide-in-from-top duration-300">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-11 h-11 bg-white text-[#005751] rounded-xl flex items-center justify-center shrink-0 shadow-md">
                <Navigation className="w-6 h-6 fill-current" />
              </div>
              <div className="min-w-0">
                <div className="text-[10px] uppercase font-mono tracking-wider text-teal-200 font-bold">
                  Active Turn-by-Turn Navigation ({(Number.isFinite(liveDistanceKm) ? liveDistanceKm : 2.4).toFixed(1)} km)
                </div>
                <div className="font-extrabold text-sm text-white truncate">
                  {navigationSteps[0]?.instruction || `Head towards ${kitchenName || 'Destination'}`}
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setIsNavigating(false);
                if ('speechSynthesis' in window) {
                  window.speechSynthesis.cancel();
                }
              }}
              className="bg-black/40 hover:bg-black/60 text-white font-bold px-3 py-2 rounded-xl text-xs border border-white/20 transition-all shrink-0 cursor-pointer active:scale-95"
              title="Exit Navigation Mode"
            >
              Exit
            </button>
          </div>
        )}

        {/* Live Route HUD Overlay Card */}
        {isKitchenAccepted ? (
          <div className="absolute bottom-3 left-3 right-3 bg-black/90 backdrop-blur-md rounded-2xl p-3 border border-white/15 flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] z-10 shadow-2xl">
            <div className="flex items-center gap-2 min-w-0 w-full sm:w-auto">
              <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0 font-bold">
                <Zap className="w-4 h-4" />
              </div>
              <div className="truncate">
                <span className="text-gray-400 text-[9px] block uppercase font-mono">
                  {isTakeaway ? 'Outlet Route & Distance' : 'Traffic-Aware Route'}
                </span>
                <span className="font-mono text-white font-bold truncate block">
                  {(Number.isFinite(liveDistanceKm) ? liveDistanceKm : 2.4).toFixed(1)} km {isTakeaway ? 'to' : 'from'} {kitchenName || 'Kitchen'}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end shrink-0">
              <div className="flex items-center gap-2 font-mono shrink-0">
                <span className="text-gray-400 text-[10px] hidden sm:inline">ESTIMATED ETA:</span>
                <span className="bg-gradient-to-r from-amber-500 to-emerald-500 text-brand-charcoal font-black border border-amber-400 px-3 py-1.5 rounded-xl text-[11px] uppercase shadow-md">
                  {estimatedMinutes || liveEtaMinutes}
                </span>
              </div>

              {/* RIDER-ONLY: Google Maps Navigation "Start" / "Cancel Nav" */}
              {isRiderView && (
                !isNavigating ? (
                  <button
                    type="button"
                    onClick={() => {
                      setIsNavigating(true);
                      isUserPanningRef.current = false;
                      setUserHasPanned(false);
                      setCameraMode('rider');
                      if (onEnableGps) onEnableGps();

                      if ('speechSynthesis' in window) {
                        try {
                          window.speechSynthesis.cancel();
                          const firstStep = navigationSteps[0]?.instruction || `Head towards ${kitchenName || 'Destination'}`;
                          const utterance = new SpeechSynthesisUtterance(`Starting navigation. ${firstStep}`);
                          utterance.rate = 1.0;
                          window.speechSynthesis.speak(utterance);
                        } catch (e) {
                          console.warn('Speech synthesis error:', e);
                        }
                      }

                      if (googleMapRef.current && window.google?.maps) {
                        const startPos = currentRiderPos;
                        googleMapRef.current.panTo(startPos);
                        googleMapRef.current.setZoom(18);
                        const isHeadingToKitchen = (
                          riderStatus === 'en_route_kitchen' ||
                          riderStatus === 'arrived_kitchen' ||
                          riderStatus === 'accepted' ||
                          currentStatus.includes('en_route_kitchen') ||
                          (!currentStatus.includes('out_for_delivery') && !currentStatus.includes('delivered') && !currentStatus.includes('picked_up'))
                        );
                        const targetDest = (isHeadingToKitchen && kitchenCoords) ? kitchenCoords : customerCoords;
                        const headingAngle = calculateBearing(
                          startPos.lat,
                          startPos.lng,
                          targetDest.lat,
                          targetDest.lng
                        );
                        try {
                          if (typeof (googleMapRef.current as any).setHeading === 'function') {
                            (googleMapRef.current as any).setHeading(headingAngle);
                          }
                          if (typeof (googleMapRef.current as any).setTilt === 'function') {
                            (googleMapRef.current as any).setTilt(45);
                          }
                        } catch (e) {}
                      }
                    }}
                    className="bg-[#007A78] hover:bg-[#005F5D] active:scale-95 text-white font-black px-4 py-2 rounded-full shadow-lg flex items-center gap-1.5 border-2 border-teal-300 transition-all cursor-pointer text-xs"
                    title="Start Turn-by-Turn Navigation with Road Polyline"
                  >
                    <Navigation className="w-4 h-4 fill-white animate-pulse" />
                    <span>Start</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setIsNavigating(false);
                      if ('speechSynthesis' in window) {
                        try {
                          window.speechSynthesis.cancel();
                        } catch (e) {}
                      }
                      if (googleMapRef.current) {
                        try {
                          if (typeof (googleMapRef.current as any).setTilt === 'function') {
                            (googleMapRef.current as any).setTilt(0);
                          }
                          if (typeof (googleMapRef.current as any).setHeading === 'function') {
                            (googleMapRef.current as any).setHeading(0);
                          }
                        } catch (e) {}
                      }
                    }}
                    className="bg-rose-600 hover:bg-rose-700 active:scale-95 text-white font-black px-4 py-2 rounded-full shadow-lg flex items-center gap-1.5 border-2 border-rose-300 transition-all cursor-pointer text-xs"
                    title="Cancel / Stop Active Navigation Mode"
                  >
                    <XCircle className="w-4 h-4 text-white" />
                    <span>Cancel Nav</span>
                  </button>
                )
              )}

              {/* CUSTOMER HUD: Clean Recenter Button */}
              {!isRiderView && (
                <button
                  type="button"
                  onClick={handleRecenter}
                  className="bg-blue-600 hover:bg-blue-500 active:scale-95 text-white font-bold px-3.5 py-2 rounded-xl shadow-lg flex items-center gap-1.5 border border-blue-400 transition-all cursor-pointer text-xs"
                  title="Recenter Map View"
                >
                  <Navigation className="w-3.5 h-3.5 fill-white" />
                  <span>Recenter</span>
                </button>
              )}

              {/* External Google Maps App Launcher for Takeaways & Riders */}
              {(isRiderView || isTakeaway) && (
                <a
                  href={
                    isTakeaway
                      ? `https://www.google.com/maps/dir/?api=1&origin=${customerCoords.lat},${customerCoords.lng}&destination=${(kitchenCoords || { lat: 26.1209, lng: 85.3647 }).lat},${(kitchenCoords || { lat: 26.1209, lng: 85.3647 }).lng}&travelmode=driving`
                      : `https://www.google.com/maps/dir/?api=1&origin=${currentRiderPos.lat},${currentRiderPos.lng}&destination=${customerCoords.lat},${customerCoords.lng}&travelmode=two_wheeler`
                  }
                  target="_blank"
                  rel="noreferrer"
                  className="bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-bold px-3 py-2 rounded-xl shadow-lg flex items-center gap-1 border border-emerald-400 transition-all text-[11px]"
                  title="Open directly in Google Maps Mobile App"
                >
                  <MapPin className="w-3.5 h-3.5" />
                  <span>{isTakeaway ? 'Outlet in Maps' : 'Open App'}</span>
                </a>
              )}
            </div>
          </div>
        ) : (
          <div className="absolute bottom-3 left-3 right-3 bg-[#0D1218]/95 backdrop-blur-md rounded-2xl p-3.5 border border-amber-500/40 text-xs z-10 shadow-2xl flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-400/50 flex items-center justify-center text-amber-400 shrink-0 font-bold">
                <Radio className="w-5 h-5 animate-pulse text-amber-400" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-amber-400 font-black uppercase text-[10px] tracking-wider">Transmitting Order to Nearby Kitchens</span>
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                </div>
                <p className="text-[10px] text-gray-300 font-mono truncate">
                  {isTakeaway
                    ? `📍 User Starting Pin: ${geocodedCustomerAddress || cleanCustomerAddress}`
                    : `📍 Verified Delivery Pin: ${geocodedCustomerAddress || cleanCustomerAddress}`}
                </p>
                <p className="text-[9px] text-amber-300/80 font-mono mt-0.5">
                  Kitchen location & route line will render as soon as a kitchen accepts.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleRecenter}
              className="bg-blue-600 hover:bg-blue-500 active:scale-95 text-white font-bold px-3 py-1.5 rounded-xl shadow-md flex items-center gap-1 border border-blue-400 transition-all cursor-pointer text-xs shrink-0"
              title="Recenter on Address"
            >
              <Navigation className="w-3 h-3 fill-white" />
              <span>Recenter</span>
            </button>
          </div>
        )}
      </div>

      {/* RIDER CONSOLE ACTIONS (If Rider View) */}
      {isRiderView && (
        <div className="mt-4 bg-[#131A22] border border-emerald-500/30 p-4 rounded-2xl space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase text-amber-400 tracking-wider">
              🛵 Rider Turn-by-Turn Action Console
            </span>
            <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded border border-emerald-800">
              Active Rider: {riderName}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <button
              type="button"
              onClick={() => onRiderStatusChange && onRiderStatusChange('accepted')}
              className="py-2.5 px-3 bg-blue-600 hover:bg-blue-500 text-white text-xs font-extrabold rounded-xl shadow-md transition-all cursor-pointer flex items-center justify-center gap-1.5"
            >
              <CheckCircle className="w-3.5 h-3.5" />
              <span>Accept Order</span>
            </button>

            <button
              type="button"
              onClick={() => onRiderStatusChange && onRiderStatusChange('arrived_kitchen')}
              className="py-2.5 px-3 bg-amber-600 hover:bg-amber-500 text-white text-xs font-extrabold rounded-xl shadow-md transition-all cursor-pointer flex items-center justify-center gap-1.5"
            >
              <Utensils className="w-3.5 h-3.5" />
              <span>At Restaurant</span>
            </button>

            <button
              type="button"
              onClick={() => onRiderStatusChange && onRiderStatusChange('meal_collected')}
              className="py-2.5 px-3 bg-purple-600 hover:bg-purple-500 text-white text-xs font-extrabold rounded-xl shadow-md transition-all cursor-pointer flex items-center justify-center gap-1.5"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Meal Collected</span>
            </button>

            <button
              type="button"
              onClick={() => onRiderStatusChange && onRiderStatusChange('picked_up')}
              className="py-2.5 px-3 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-extrabold rounded-xl shadow-md transition-all cursor-pointer flex items-center justify-center gap-1.5"
            >
              <Navigation className="w-3.5 h-3.5" />
              <span>Left Kitchen</span>
            </button>
          </div>

          <div className="flex items-center gap-2 pt-2 border-t border-white/10">
            {onCallCustomer && (
              <button
                type="button"
                onClick={onCallCustomer}
                className="flex-1 py-2 bg-white/10 hover:bg-white/20 text-white text-xs font-bold rounded-xl border border-white/15 flex items-center justify-center gap-2 cursor-pointer"
              >
                <Phone className="w-3.5 h-3.5 text-amber-400" />
                <span>Call Customer ({customerName})</span>
              </button>
            )}
            <a
              href={`https://www.google.com/maps/dir/?api=1&destination=${customerCoords.lat},${customerCoords.lng}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 py-2 bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-300 text-xs font-bold rounded-xl border border-emerald-500/40 flex items-center justify-center gap-2 cursor-pointer"
            >
              <Navigation className="w-3.5 h-3.5 text-emerald-400" />
              <span>Google Maps Turn Navigation</span>
            </a>
          </div>
        </div>
      )}

      {/* ADMIN FLEET SIDE DRAWER (If Admin View and Rider Selected) */}
      {isAdminView && selectedFleetItem && (
        <div className="mt-4 bg-[#131A22] border border-amber-500/40 p-4 rounded-2xl space-y-3 animate-fade-in">
          <div className="flex items-center justify-between border-b border-white/10 pb-2">
            <div className="flex items-center gap-2">
              <Bike className="w-5 h-5 text-amber-400" />
              <h4 className="text-xs font-black uppercase text-white">
                Fleet Telemetry Details: {selectedFleetItem.name || selectedFleetItem.id}
              </h4>
            </div>
            <button
              type="button"
              onClick={() => setSelectedFleetItem(null)}
              className="text-gray-400 hover:text-white text-xs font-bold px-2 py-0.5 rounded bg-white/10"
            >
              ✕
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="bg-black/40 p-2.5 rounded-xl border border-white/10">
              <span className="text-gray-400 text-[10px] block">Vehicle</span>
              <span className="font-bold text-white">{selectedFleetItem.vehicleNumber || 'BR-06-EV-9921'}</span>
            </div>
            <div className="bg-black/40 p-2.5 rounded-xl border border-white/10">
              <span className="text-gray-400 text-[10px] block">Status</span>
              <span className="font-bold text-emerald-400 uppercase">{selectedFleetItem.status || 'Active'}</span>
            </div>
            <div className="bg-black/40 p-2.5 rounded-xl border border-white/10">
              <span className="text-gray-400 text-[10px] block">Battery %</span>
              <span className="font-bold text-amber-400">88% Charged</span>
            </div>
            <div className="bg-black/40 p-2.5 rounded-xl border border-white/10">
              <span className="text-gray-400 text-[10px] block">Current Speed</span>
              <span className="font-bold text-indigo-300">28 km/h</span>
            </div>
          </div>
        </div>
      )}

      {/* CUSTOMER BOTTOM TRACKING CARD */}
      {!isRiderView && !isAdminView && (
        <div className="mt-3 bg-[#131A22] border border-amber-500/30 p-4 rounded-2xl space-y-3 text-xs">
          {isTakeaway ? (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-400/40 text-emerald-400 flex items-center justify-center font-bold">
                  🛍️
                </div>
                <div>
                  <span className="text-[10px] font-black uppercase text-emerald-400 tracking-wider block">
                    Self-Pickup Takeaway Order
                  </span>
                  <p className="text-white font-extrabold text-xs">
                    {isKitchenAccepted
                      ? `${kitchenName}${kitchenAddress ? ` (${kitchenAddress})` : ''}`
                      : 'Awaiting Kitchen Acceptance...'}
                  </p>
                </div>
              </div>
              <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-400/40 px-2.5 py-1 rounded-xl font-black shrink-0">
                Counter Pickup
              </span>
            </div>
          ) : isRiderAssigned ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-400/40 text-amber-400 flex items-center justify-center font-bold relative">
                    🛵
                    {isRiderLiveOnline && (
                      <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-black animate-pulse" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-black uppercase text-amber-400 tracking-wider block">
                        Assigned Delivery Captain
                      </span>
                      {isRiderLiveOnline ? (
                        <span className="text-[9px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 px-1.5 py-0.2 rounded-md font-bold flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                          Live Tracking
                        </span>
                      ) : (
                        <span className="text-[9px] bg-red-500/20 text-red-300 border border-red-500/40 px-1.5 py-0.2 rounded-md font-bold flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
                          Rider went offline
                        </span>
                      )}
                    </div>
                    <p className="text-white font-extrabold text-xs">
                      {riderName} {riderRating ? `• ★ ${riderRating}` : ''} {riderVehicleNumber ? `(${riderVehicleNumber})` : ''}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowChatModal(true)}
                    className="px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40"
                  >
                    <MessageSquare className="w-3.5 h-3.5 text-amber-400" />
                    <span>Message</span>
                  </button>

                  {(riderPhone || onCallRider) && (
                    <button
                      type="button"
                      onClick={() => {
                        if (onCallRider) onCallRider();
                        else if (riderPhone) window.location.href = `tel:${riderPhone}`;
                      }}
                      className="p-2.5 rounded-xl bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-300 border border-emerald-500/40 transition-all cursor-pointer"
                      title="Call Rider"
                    >
                      <Phone className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              {!isRiderLiveOnline && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-1.5 flex items-center justify-between text-[10px] text-red-200">
                  <span className="flex items-center gap-1.5">
                    <span>⚠️ Rider GPS currently unavailable or went offline.</span>
                  </span>
                  <span className="text-gray-400">Position will resume when online</span>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center font-bold">
                  ⏳
                </div>
                <div>
                  <span className="text-[10px] font-black uppercase text-amber-400 tracking-wider block">
                    Rider Assignment In Progress
                  </span>
                  <p className="text-gray-300 font-medium text-xs">
                    {isKitchenAccepted
                      ? `Kitchen (${kitchenName}) is preparing your order. A delivery captain will be dispatched shortly.`
                      : 'Transmitting order to nearby kitchens. Delivery partner will be assigned upon kitchen acceptance.'}
                  </p>
                </div>
              </div>
              <span className="text-[10px] bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2.5 py-1 rounded-xl font-bold shrink-0">
                Awaiting Rider
              </span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
            {isTakeaway ? (
              <>
                <div className="p-2.5 bg-black/40 rounded-xl border border-white/10 flex items-center gap-2">
                  <span className="text-orange-400 font-bold">📍 User Starting Point:</span>
                  <span className="font-extrabold text-white truncate">{geocodedCustomerAddress || cleanCustomerAddress}</span>
                </div>
                <div className="p-2.5 bg-black/40 rounded-xl border border-white/10 flex items-center gap-2">
                  <span className="text-emerald-400 font-bold">🏪 Pickup Destination:</span>
                  <span className="font-extrabold text-white truncate">
                    {isKitchenAccepted
                      ? `${kitchenName}${kitchenAddress ? ` (${kitchenAddress})` : ''}`
                      : 'Awaiting Kitchen Acceptance...'}
                  </span>
                </div>
              </>
            ) : (
              <>
                <div className="p-2.5 bg-black/40 rounded-xl border border-white/10 flex items-center gap-2">
                  <span className="text-amber-400 font-bold">🏪 Kitchen:</span>
                  <span className="font-extrabold text-white truncate">{isKitchenAccepted ? kitchenName : 'Awaiting Acceptance...'}</span>
                </div>
                <div className="p-2.5 bg-black/40 rounded-xl border border-white/10 flex items-center gap-2">
                  <span className="text-emerald-400 font-bold">📍 Destination:</span>
                  <span className="font-extrabold text-white truncate">{geocodedCustomerAddress || cleanCustomerAddress}</span>
                </div>
              </>
            )}
          </div>

          {/* RATING BUTTON IF DELIVERED */}
          {currentStatus.includes('delivered') && (
            <div className="pt-2 border-t border-white/10">
              {deliveryRating ? (
                <div className="p-3 bg-emerald-950/80 border border-emerald-500/50 rounded-xl flex items-center justify-between text-emerald-200 font-bold">
                  <div className="flex items-center gap-2">
                    <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                    <span>You Rated: {deliveryRating.rating}/5 Stars</span>
                  </div>
                  <span className="text-[10px] text-emerald-300 font-mono">Thank you!</span>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowRatingModal(true)}
                  className="w-full py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-brand-charcoal font-black uppercase text-xs rounded-xl shadow-lg transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  <Star className="w-4 h-4 fill-brand-charcoal" />
                  <span>Rate Delivery Experience</span>
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* CUSTOMER-RIDER LIVE CHAT MODAL */}
      {showChatModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#121820] border-2 border-amber-500/80 rounded-3xl p-5 max-w-md w-full shadow-2xl space-y-4 text-white">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-amber-500/20 border border-amber-400 text-amber-400 flex items-center justify-center font-bold">
                  {isRiderView ? '👤' : '🛵'}
                </div>
                <div>
                  <h3 className="text-xs font-black uppercase tracking-wider text-white">
                    {isRiderView ? 'Live Chat with Customer' : `Live Chat with Rider (${riderName})`}
                  </h3>
                  <p className="text-[10px] text-emerald-400 font-mono">Order #{orderId} • Connected</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowChatModal(false)}
                className="w-8 h-8 rounded-xl bg-white/10 hover:bg-white/20 text-gray-300 flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* If order is delivered or cancelled, chat is disabled */}
            {(currentStatus.includes('delivered') || currentStatus.includes('cancelled')) ? (
              <div className="p-4 rounded-2xl bg-red-950/40 border border-red-500/30 text-red-300 text-xs text-center font-bold font-mono space-y-1">
                <span className="block text-sm">🔒 CHAT SESSION CLOSED</span>
                <p className="text-[10px] text-gray-400 font-sans font-normal">
                  Order has been {currentStatus.includes('delivered') ? 'delivered' : 'cancelled'}. Live customer-rider chat is now disabled.
                </p>
              </div>
            ) : (!isRiderView && !(isRiderView || currentStatus.includes('out_for_delivery') || currentStatus.includes('dispatched') || riderStatus === 'out_for_delivery' || riderStatus === 'en_route')) ? (
              <div className="p-4 rounded-2xl bg-amber-950/60 border-2 border-amber-500/40 text-amber-200 text-xs text-center font-bold font-mono space-y-2">
                <div className="flex items-center justify-center gap-2">
                  <span className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-400 text-amber-300 flex items-center justify-center font-black text-sm">
                    🛵🔒
                  </span>
                  <span className="text-sm font-black text-amber-300">RIDER STILL AT KITCHEN</span>
                </div>
                <p className="text-[11px] text-gray-300 font-sans font-medium leading-relaxed">
                  Messaging your delivery captain will unlock as soon as your order is picked up and your rider departs from the kitchen branch en route to your location.
                </p>
              </div>
            ) : (
              /* Template Quick Messages */
              <div className="space-y-1.5">
                <span className="text-[10px] font-black uppercase text-gray-400 tracking-wider block">
                  QUICK TEMPLATE MESSAGES:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {(isRiderView ? [
                    "On my way to pick up! 🍳",
                    "Order collected! En route to your address 🛵",
                    "Reached your location, please come down 📍",
                    "Near your building gate 🏢",
                    "Please share the 4-digit OTP 🔑",
                  ] : [
                    "Don't ring doorbell 🤫",
                    "Leave at gate/door 🚪",
                    "Call when you arrive 📞",
                    "Please bring extra cutlery 🍴",
                    "I am on the 2nd floor 🏢",
                  ]).map((tmpl, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleSendChatText(tmpl)}
                      className="text-[11px] font-bold bg-white/10 hover:bg-amber-500 hover:text-brand-charcoal border border-white/15 px-2.5 py-1.5 rounded-xl transition-all cursor-pointer"
                    >
                      {tmpl}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Message Thread History */}
            <div className="bg-[#090D12] border border-white/10 rounded-2xl p-3 h-48 overflow-y-auto space-y-2 text-xs font-sans">
              {chatMessages.length === 0 ? (
                <div className="text-center text-gray-500 pt-16 text-xs font-mono">
                  No messages yet. Pick a template or type below!
                </div>
              ) : (
                chatMessages.map((msg) => {
                  const isMine = isRiderView ? msg.sender === 'rider' : msg.sender === 'customer';
                  return (
                    <div
                      key={msg.id}
                      className={`flex flex-col ${isMine ? 'items-end' : 'items-start'}`}
                    >
                      <div
                        className={`max-w-[80%] p-2.5 rounded-2xl text-xs font-semibold leading-relaxed ${
                          isMine
                            ? 'bg-amber-500 text-brand-charcoal rounded-br-none'
                            : 'bg-emerald-700 text-white rounded-bl-none'
                        }`}
                      >
                        <span className="text-[9px] font-black uppercase block opacity-70 mb-0.5">
                          {isMine ? (isRiderView ? 'You (Rider)' : 'You (Customer)') : (isRiderView ? 'Customer' : `Rider (${riderName})`)}
                        </span>
                        {msg.text}
                      </div>
                      <span className="text-[9px] text-gray-500 font-mono mt-0.5 px-1">{msg.timestamp}</span>
                    </div>
                  );
                })
              )}
            </div>

            {/* Custom Input (Only enabled if active & rider left kitchen) */}
            {(!currentStatus.includes('delivered') && !currentStatus.includes('cancelled') && (isRiderView || (currentStatus.includes('out_for_delivery') || currentStatus.includes('dispatched') || riderStatus === 'out_for_delivery' || riderStatus === 'en_route'))) && (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={inputMsg}
                  onChange={(e) => setInputMsg(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendChatText()}
                  placeholder={isRiderView ? "Type message for customer..." : "Type custom note for rider..."}
                  className="flex-1 bg-[#090D12] border border-white/20 rounded-2xl px-3.5 py-2.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-amber-400"
                />
                <button
                  type="button"
                  onClick={() => handleSendChatText()}
                  className="px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-brand-charcoal font-black text-xs rounded-2xl transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Send</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* DELIVERY RATING MODAL */}
      {showRatingModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#121820] border-2 border-amber-500/80 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-5 text-white">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div>
                <h3 className="text-sm font-black uppercase tracking-wider text-white">
                  Rate Your Delivery Experience
                </h3>
                <p className="text-[10px] text-gray-400 font-mono">Order #{orderId} • Delivered</p>
              </div>
              <button
                type="button"
                onClick={() => setShowRatingModal(false)}
                className="w-8 h-8 rounded-xl bg-white/10 hover:bg-white/20 text-gray-300 flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Stars Selector */}
            <div className="text-center space-y-2">
              <span className="text-xs font-extrabold text-amber-400 uppercase tracking-widest block">
                How was the delivery service?
              </span>
              <div className="flex items-center justify-center gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setSelectedStars(star)}
                    className="p-1 transition-transform hover:scale-125 cursor-pointer"
                  >
                    <Star
                      className={`w-8 h-8 ${
                        star <= selectedStars ? 'text-amber-400 fill-amber-400' : 'text-gray-600'
                      }`}
                    />
                  </button>
                ))}
              </div>
            </div>

            {/* Feedback Tags */}
            <div className="space-y-1.5">
              <span className="text-[10px] font-black uppercase text-gray-400 tracking-wider block">
                SELECT HIGHLIGHTS:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {[
                  '⚡ Super Fast Delivery',
                  '🍱 Hot & Fresh Packing',
                  '👨‍🍳 Polite Rider',
                  '📍 Perfect Address Navigation',
                  '✨ Great Hygiene Standards',
                ].map((tag) => {
                  const isSel = selectedTags.includes(tag);
                  return (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => handleToggleTag(tag)}
                      className={`text-xs font-bold px-3 py-1.5 rounded-xl border transition-all cursor-pointer ${
                        isSel
                          ? 'bg-amber-500 text-brand-charcoal border-amber-300'
                          : 'bg-white/10 text-gray-300 border-white/15'
                      }`}
                    >
                      {tag}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Feedback Note Input */}
            <div className="space-y-1">
              <span className="text-[10px] font-black uppercase text-gray-400 tracking-wider block">
                ADDITIONAL NOTE (OPTIONAL):
              </span>
              <textarea
                value={ratingNote}
                onChange={(e) => setRatingNote(e.target.value)}
                placeholder="Tell us what you loved about this delivery..."
                className="w-full bg-[#090D12] border border-white/20 rounded-2xl p-3 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-amber-400 h-20 resize-none"
              />
            </div>

            <button
              type="button"
              onClick={handleConfirmRating}
              className="w-full py-3.5 bg-emerald-500 hover:bg-emerald-400 text-brand-charcoal font-black uppercase text-xs rounded-2xl shadow-xl transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <ThumbsUp className="w-4 h-4" />
              <span>Submit Delivery Rating</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

