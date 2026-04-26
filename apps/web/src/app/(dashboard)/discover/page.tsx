'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Card, Button, Badge, Avatar } from '@/components/ui';
import { useCreators } from '@/hooks/useCreators';
import { formatNumber, formatCurrency, formatNiche } from '@creatormatch/shared-utils';
import {
  MapIcon,
  ListBulletIcon,
  FunnelIcon,
  MapPinIcon,
} from '@heroicons/react/24/outline';
import { NicheCategory } from '@creatormatch/shared-types';

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || '';

const NICHES: NicheCategory[] = [
  'food', 'fashion', 'beauty', 'fitness', 'travel', 'lifestyle',
  'tech', 'gaming', 'parenting', 'pets', 'home_decor', 'other'
];

export default function DiscoverPage() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [viewMode, setViewMode] = useState<'map' | 'list'>('list');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    niches: [] as NicheCategory[],
    minFollowers: 1000,
    maxFollowers: 50000,
    radiusMiles: 25,
  });

  const { creators, loading, searchCreators } = useCreators();

  useEffect(() => {
    searchCreators(filters);
  }, [filters, searchCreators]);

  useEffect(() => {
    if (viewMode !== 'map' || !mapContainer.current || !MAPBOX_TOKEN) return;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/light-v11',
      center: [-98.5795, 39.8283], // Center of US
      zoom: 4,
      accessToken: MAPBOX_TOKEN,
    });

    map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

    // Add markers for creators
    creators.forEach((creator) => {
      if (creator.location) {
        const popup = new mapboxgl.Popup({ offset: 25 }).setHTML(`
          <div class="p-2">
            <strong>${creator.displayName}</strong>
            <p class="text-sm text-gray-600">${formatNumber(creator.totalFollowers)} followers</p>
          </div>
        `);

        new mapboxgl.Marker({ color: '#0ea5e9' })
          .setLngLat([creator.location.lng, creator.location.lat])
          .setPopup(popup)
          .addTo(map.current!);
      }
    });

    return () => {
      map.current?.remove();
    };
  }, [viewMode, creators]);

  const toggleNiche = (niche: NicheCategory) => {
    setFilters((prev) => ({
      ...prev,
      niches: prev.niches.includes(niche)
        ? prev.niches.filter((n) => n !== niche)
        : [...prev.niches, niche],
    }));
  };

  // Sample creators for demo
  const sampleCreators = [
    {
      id: '1',
      displayName: 'Sarah Johnson',
      city: 'Austin',
      state: 'TX',
      niches: ['food', 'lifestyle'] as NicheCategory[],
      totalFollowers: 12500,
      avgEngagementRate: 4.2,
      baseRateCents: 15000,
    },
    {
      id: '2',
      displayName: 'Mike Chen',
      city: 'Denver',
      state: 'CO',
      niches: ['fitness', 'lifestyle'] as NicheCategory[],
      totalFollowers: 8200,
      avgEngagementRate: 5.8,
      baseRateCents: 10000,
    },
    {
      id: '3',
      displayName: 'Emma Davis',
      city: 'Portland',
      state: 'OR',
      niches: ['fashion', 'beauty'] as NicheCategory[],
      totalFollowers: 25000,
      avgEngagementRate: 3.5,
      baseRateCents: 20000,
    },
  ];

  const displayCreators = creators.length > 0 ? creators : sampleCreators;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Discover Creators</h1>
          <p className="text-gray-600 mt-1">Find local creators for your campaigns</p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            leftIcon={<FunnelIcon className="h-4 w-4" />}
            onClick={() => setShowFilters(!showFilters)}
          >
            Filters
          </Button>

          <div className="flex border border-gray-300 rounded-lg overflow-hidden">
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 ${viewMode === 'list' ? 'bg-primary-50 text-primary-600' : 'text-gray-500 hover:bg-gray-50'}`}
            >
              <ListBulletIcon className="h-5 w-5" />
            </button>
            <button
              onClick={() => setViewMode('map')}
              className={`p-2 ${viewMode === 'map' ? 'bg-primary-50 text-primary-600' : 'text-gray-500 hover:bg-gray-50'}`}
            >
              <MapIcon className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>

      {showFilters && (
        <Card className="mb-6">
          <div className="p-4">
            <h3 className="font-medium text-gray-900 mb-3">Niches</h3>
            <div className="flex flex-wrap gap-2 mb-4">
              {NICHES.map((niche) => (
                <button
                  key={niche}
                  onClick={() => toggleNiche(niche)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                    filters.niches.includes(niche)
                      ? 'bg-primary-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {formatNiche(niche)}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Min Followers
                </label>
                <input
                  type="number"
                  value={filters.minFollowers}
                  onChange={(e) => setFilters((prev) => ({ ...prev, minFollowers: parseInt(e.target.value) || 0 }))}
                  className="input"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Max Followers
                </label>
                <input
                  type="number"
                  value={filters.maxFollowers}
                  onChange={(e) => setFilters((prev) => ({ ...prev, maxFollowers: parseInt(e.target.value) || 50000 }))}
                  className="input"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Radius (miles)
                </label>
                <input
                  type="number"
                  value={filters.radiusMiles}
                  onChange={(e) => setFilters((prev) => ({ ...prev, radiusMiles: parseInt(e.target.value) || 25 }))}
                  className="input"
                />
              </div>
            </div>
          </div>
        </Card>
      )}

      {viewMode === 'map' ? (
        <div
          ref={mapContainer}
          className="h-[600px] rounded-xl overflow-hidden border border-gray-200"
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {loading ? (
            Array.from({ length: 6 }).map((_, i) => (
              <Card key={i} className="animate-pulse">
                <div className="p-4">
                  <div className="flex items-center mb-4">
                    <div className="h-12 w-12 bg-gray-200 rounded-full" />
                    <div className="ml-3 flex-1">
                      <div className="h-4 bg-gray-200 rounded w-2/3 mb-2" />
                      <div className="h-3 bg-gray-200 rounded w-1/2" />
                    </div>
                  </div>
                  <div className="h-20 bg-gray-200 rounded mb-4" />
                  <div className="flex gap-2">
                    <div className="h-6 bg-gray-200 rounded-full w-16" />
                    <div className="h-6 bg-gray-200 rounded-full w-16" />
                  </div>
                </div>
              </Card>
            ))
          ) : (
            displayCreators.map((creator) => (
              <Link key={creator.id} href={`/creators/${creator.id}`}>
                <Card className="hover:border-primary-300 hover:shadow-md transition-all cursor-pointer h-full">
                  <div className="p-4">
                    <div className="flex items-center mb-4">
                      <Avatar name={creator.displayName} size="lg" />
                      <div className="ml-3">
                        <h3 className="font-semibold text-gray-900">{creator.displayName}</h3>
                        <p className="text-sm text-gray-500 flex items-center">
                          <MapPinIcon className="h-4 w-4 mr-1" />
                          {creator.city}, {creator.state}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div>
                        <p className="text-xs text-gray-500">Followers</p>
                        <p className="font-semibold">{formatNumber(creator.totalFollowers)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Engagement</p>
                        <p className="font-semibold">{creator.avgEngagementRate}%</p>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 mb-4">
                      {creator.niches.slice(0, 3).map((niche) => (
                        <Badge key={niche} variant="default" size="sm">
                          {formatNiche(niche)}
                        </Badge>
                      ))}
                    </div>

                    {creator.baseRateCents && (
                      <p className="text-sm text-gray-600">
                        Starting at <span className="font-semibold">{formatCurrency(creator.baseRateCents)}</span>
                      </p>
                    )}
                  </div>
                </Card>
              </Link>
            ))
          )}
        </div>
      )}
    </div>
  );
}
