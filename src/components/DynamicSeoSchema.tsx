/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect } from 'react';
import { Kitchen } from '../types';

interface DynamicSeoSchemaProps {
  allKitchens: Kitchen[];
}

/**
 * Dynamically generates and syncs Google Restaurant JSON-LD Structured Data
 * across all active Taash Bhatti branches without hardcoding fixed locations.
 * Automatically expands whenever new Bhattis are added or updated in Firestore.
 */
export const DynamicSeoSchema: React.FC<DynamicSeoSchemaProps> = ({ allKitchens }) => {
  useEffect(() => {
    const activeKitchens = allKitchens.filter(k => k.isActive !== false);
    if (activeKitchens.length === 0) return;

    const schemaId = 'taash-bhatti-dynamic-schema';
    let scriptEl = document.getElementById(schemaId) as HTMLScriptElement | null;

    if (!scriptEl) {
      scriptEl = document.createElement('script');
      scriptEl.id = schemaId;
      scriptEl.type = 'application/ld+json';
      document.head.appendChild(scriptEl);
    }

    const branchesSchema = activeKitchens.map(k => ({
      '@type': 'Restaurant',
      '@id': `https://taashbhatti.com/#bhatti-${k.id}`,
      'name': k.name,
      'image': k.image || 'https://taashbhatti.com/app-icon.png',
      'telephone': k.phone || '+91-9876543210',
      'address': {
        '@type': 'PostalAddress',
        'streetAddress': k.address,
        'addressLocality': k.city || k.area || 'Muzaffarpur',
        'addressRegion': 'Bihar',
        'addressCountry': 'IN'
      },
      'geo': {
        '@type': 'GeoCoordinates',
        'latitude': k.lat,
        'longitude': k.lng
      },
      'servesCuisine': ['North Indian', 'Tandoori', 'Clay-Oven Feasts', 'Biryani', 'Mughlai'],
      'priceRange': '₹₹',
      'acceptsReservations': k.hasDineIn !== false ? 'True' : 'False',
      'openingHoursSpecification': [
        {
          '@type': 'OpeningHoursSpecification',
          'dayOfWeek': [
            'Monday',
            'Tuesday',
            'Wednesday',
            'Thursday',
            'Friday',
            'Saturday',
            'Sunday'
          ],
          'opens': '11:00',
          'closes': '23:30'
        }
      ],
      'potentialAction': [
        {
          '@type': 'ReserveAction',
          'result': {
            '@type': 'FoodEstablishmentReservation',
            'name': `Table Dine-In Reservation at ${k.name}`
          }
        },
        {
          '@type': 'OrderAction',
          'deliveryMethod': [
            'http://purl.org/goodrelations/v1#DeliveryModePickUp',
            'http://purl.org/goodrelations/v1#DeliveryModeOwnFleet'
          ]
        }
      ]
    }));

    const fullStructuredData = {
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'Restaurant',
          '@id': 'https://taashbhatti.com/#brand',
          'name': 'Taash Bhatti',
          'alternateName': 'Taash Bhatti Authentic Woodfire Restaurant & Feasts',
          'url': 'https://taashbhatti.com',
          'logo': 'https://taashbhatti.com/app-icon.png',
          'image': 'https://taashbhatti.com/app-icon.png',
          'description': 'Authentic woodfire clay-oven restaurant chain offering royal handi dum feasts, charcoal kebabs, tandoori specialties, full dine-in table service, takeaway, and warm doorstep delivery across all restaurant locations.',
          'servesCuisine': ['North Indian', 'Tandoori', 'Mughlai', 'Biryani', 'Clay Oven Specialities'],
          'priceRange': '₹₹',
          'acceptsReservations': 'True',
          'hasMenu': 'https://taashbhatti.com/#menu',
          'department': branchesSchema
        }
      ]
    };

    scriptEl.textContent = JSON.stringify(fullStructuredData, null, 2);

    return () => {
      // Keep schema persistent for crawlers
    };
  }, [allKitchens]);

  return null;
};

export default DynamicSeoSchema;
