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
          '@type': 'WebSite',
          '@id': 'https://taashbhatti.com/#website',
          'url': 'https://taashbhatti.com/',
          'name': 'Taash Bhatti',
          'alternateName': ['TaashBhatti', 'taashbhatti', 'Taash Bhatti Restaurant', 'TaashBhatti Restaurant'],
          'description': 'Official website of Taash Bhatti authentic woodfire & clay-oven restaurant.',
          'publisher': {
            '@id': 'https://taashbhatti.com/#brand'
          }
        },
        {
          '@type': ['Restaurant', 'FoodEstablishment', 'Organization'],
          '@id': 'https://taashbhatti.com/#brand',
          'name': 'Taash Bhatti',
          'alternateName': ['TaashBhatti', 'taashbhatti', 'Taash Bhatti Restaurant', 'TaashBhatti Restaurant'],
          'url': 'https://taashbhatti.com',
          'logo': 'https://taashbhatti.com/app-icon.png',
          'image': 'https://taashbhatti.com/app-icon.png',
          'slogan': 'Authentic Woodfire & Clay-Oven Restaurant, Dine-In & Delivery',
          'description': 'Taash Bhatti (also known as TaashBhatti) is an authentic woodfire and clay-oven dining restaurant brand specializing in slow-cooked clay handi dum feasts, charcoal tandoori platters, artisanal kebabs, and regional Mughlai delicacies. Taash Bhatti offers full-fledged table dine-in seating, counter takeaway, and insulated warm doorstep food delivery.',
          'knowsAbout': [
            'Authentic Woodfire Cooking',
            'Clay-Oven Tandoori Specialties',
            'Handi Dum Cooking',
            'Charcoal Kebabs',
            'Mughlai Dining',
            'Restaurant Table Dine-In Hospitality',
            'Doorstep Food Delivery'
          ],
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
