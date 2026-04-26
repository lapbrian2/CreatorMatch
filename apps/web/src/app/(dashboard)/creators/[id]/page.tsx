'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { Card, Button, Badge, Avatar } from '@/components/ui';
import { formatNumber, formatCurrency, formatNiche, formatEngagementRate } from '@creatormatch/shared-utils';
import {
  MapPinIcon,
  GlobeAltIcon,
  StarIcon,
  ChatBubbleLeftIcon,
  DocumentTextIcon,
} from '@heroicons/react/24/outline';
import { NicheCategory } from '@creatormatch/shared-types';

export default function CreatorProfilePage() {
  const params = useParams();
  const [activeTab, setActiveTab] = useState<'portfolio' | 'reviews'>('portfolio');

  // Sample creator data - in real app, fetch from API
  const creator = {
    id: params.id as string,
    displayName: 'Sarah Johnson',
    headline: 'Food & Lifestyle Content Creator',
    bio: 'Austin-based food blogger and lifestyle content creator. I love discovering hidden gems in my city and sharing authentic experiences with my followers. Passionate about supporting local businesses!',
    city: 'Austin',
    state: 'TX',
    niches: ['food', 'lifestyle', 'travel'] as NicheCategory[],
    totalFollowers: 12500,
    avgEngagementRate: 4.2,
    avgRating: 4.8,
    reviewCount: 15,
    completedDealsCount: 23,
    baseRateCents: 15000,
    ratePerPostCents: 20000,
    ratePerStoryCents: 5000,
    websiteUrl: 'https://sarahjohnson.com',
    isVerified: true,
    socialAccounts: [
      { platform: 'instagram', username: 'sarahjfood', followersCount: 10000, engagementRate: 4.5 },
      { platform: 'tiktok', username: 'sarahjcooks', followersCount: 2500, engagementRate: 6.2 },
    ],
    portfolioItems: [
      { id: '1', title: 'Local Coffee Shop Feature', mediaUrl: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085', likesCount: 1250, platform: 'instagram' },
      { id: '2', title: 'New Restaurant Review', mediaUrl: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0', likesCount: 980, platform: 'instagram' },
      { id: '3', title: 'Weekend Brunch Spot', mediaUrl: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836', likesCount: 1450, platform: 'instagram' },
    ],
  };

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <Card className="mb-6">
        <div className="p-6">
          <div className="flex flex-col md:flex-row md:items-start gap-6">
            <Avatar name={creator.displayName} size="xl" />

            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h1 className="text-2xl font-bold text-gray-900">{creator.displayName}</h1>
                {creator.isVerified && (
                  <Badge variant="primary" size="sm">Verified</Badge>
                )}
              </div>

              <p className="text-gray-600 mb-2">{creator.headline}</p>

              <div className="flex items-center gap-4 text-sm text-gray-500 mb-4">
                <span className="flex items-center">
                  <MapPinIcon className="h-4 w-4 mr-1" />
                  {creator.city}, {creator.state}
                </span>
                {creator.websiteUrl && (
                  <a
                    href={creator.websiteUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center hover:text-primary-600"
                  >
                    <GlobeAltIcon className="h-4 w-4 mr-1" />
                    Website
                  </a>
                )}
              </div>

              <div className="flex flex-wrap gap-2">
                {creator.niches.map((niche) => (
                  <Badge key={niche} variant="secondary">
                    {formatNiche(niche)}
                  </Badge>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <Button leftIcon={<DocumentTextIcon className="h-5 w-5" />}>
                Propose Deal
              </Button>
              <Button variant="outline" leftIcon={<ChatBubbleLeftIcon className="h-5 w-5" />}>
                Message
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <div className="p-4 text-center">
            <p className="text-2xl font-bold text-gray-900">{formatNumber(creator.totalFollowers)}</p>
            <p className="text-sm text-gray-500">Total Followers</p>
          </div>
        </Card>
        <Card>
          <div className="p-4 text-center">
            <p className="text-2xl font-bold text-gray-900">{formatEngagementRate(creator.avgEngagementRate)}</p>
            <p className="text-sm text-gray-500">Engagement Rate</p>
          </div>
        </Card>
        <Card>
          <div className="p-4 text-center">
            <p className="text-2xl font-bold text-gray-900 flex items-center justify-center">
              <StarIcon className="h-5 w-5 text-yellow-400 mr-1" />
              {creator.avgRating.toFixed(1)}
            </p>
            <p className="text-sm text-gray-500">{creator.reviewCount} Reviews</p>
          </div>
        </Card>
        <Card>
          <div className="p-4 text-center">
            <p className="text-2xl font-bold text-gray-900">{creator.completedDealsCount}</p>
            <p className="text-sm text-gray-500">Completed Deals</p>
          </div>
        </Card>
      </div>

      {/* Bio & Rates */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <Card className="md:col-span-2">
          <div className="p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-3">About</h2>
            <p className="text-gray-600">{creator.bio}</p>

            <h3 className="text-md font-semibold text-gray-900 mt-6 mb-3">Social Platforms</h3>
            <div className="space-y-3">
              {creator.socialAccounts.map((account) => (
                <div key={account.platform} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center">
                    <span className="font-medium capitalize">{account.platform}</span>
                    <span className="text-gray-500 ml-2">@{account.username}</span>
                  </div>
                  <div className="text-right">
                    <span className="font-medium">{formatNumber(account.followersCount)}</span>
                    <span className="text-gray-500 ml-2">{account.engagementRate}% eng.</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Card>

        <Card>
          <div className="p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Rates</h2>
            <div className="space-y-4">
              <div className="flex justify-between">
                <span className="text-gray-600">Base Rate</span>
                <span className="font-semibold">{formatCurrency(creator.baseRateCents)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Per Post</span>
                <span className="font-semibold">{formatCurrency(creator.ratePerPostCents)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Per Story</span>
                <span className="font-semibold">{formatCurrency(creator.ratePerStoryCents)}</span>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Portfolio & Reviews Tabs */}
      <Card>
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px">
            <button
              onClick={() => setActiveTab('portfolio')}
              className={`px-6 py-4 text-sm font-medium border-b-2 ${
                activeTab === 'portfolio'
                  ? 'border-primary-600 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Portfolio ({creator.portfolioItems.length})
            </button>
            <button
              onClick={() => setActiveTab('reviews')}
              className={`px-6 py-4 text-sm font-medium border-b-2 ${
                activeTab === 'reviews'
                  ? 'border-primary-600 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Reviews ({creator.reviewCount})
            </button>
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'portfolio' ? (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {creator.portfolioItems.map((item) => (
                <div key={item.id} className="relative group">
                  <img
                    src={item.mediaUrl}
                    alt={item.title}
                    className="w-full h-48 object-cover rounded-lg"
                  />
                  <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all rounded-lg flex items-end p-3">
                    <div className="text-white opacity-0 group-hover:opacity-100 transition-opacity">
                      <p className="font-medium">{item.title}</p>
                      <p className="text-sm">{formatNumber(item.likesCount)} likes</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <StarIcon className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>Reviews will appear here</p>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
