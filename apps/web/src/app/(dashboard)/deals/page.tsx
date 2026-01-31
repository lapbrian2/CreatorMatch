'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Card, Badge, Avatar } from '@/components/ui';
import { formatCurrency, formatDate, formatDealStatus } from '@creatormatch/shared-utils';
import { DealStatus } from '@creatormatch/shared-types';
import { DocumentCheckIcon } from '@heroicons/react/24/outline';

const statusColors: Record<DealStatus, 'default' | 'primary' | 'success' | 'warning' | 'error'> = {
  pending: 'warning',
  accepted: 'primary',
  in_progress: 'primary',
  content_submitted: 'secondary' as any,
  approved: 'success',
  completed: 'success',
  disputed: 'error',
  canceled: 'error',
};

const TABS: { key: string; label: string; statuses: DealStatus[] }[] = [
  { key: 'active', label: 'Active', statuses: ['pending', 'accepted', 'in_progress', 'content_submitted', 'approved'] },
  { key: 'completed', label: 'Completed', statuses: ['completed'] },
  { key: 'canceled', label: 'Canceled', statuses: ['canceled', 'disputed'] },
];

export default function DealsPage() {
  const [activeTab, setActiveTab] = useState('active');

  // Sample deals - in real app, fetch from API
  const allDeals = [
    {
      id: '1',
      status: 'in_progress' as DealStatus,
      agreedAmountCents: 25000,
      proposedAt: '2024-01-15',
      campaign: { title: 'Summer Food Festival Promo' },
      creator: { displayName: 'Sarah Johnson' },
      business: { businessName: 'Local Eats Co' },
      deliverables: [
        { type: 'instagram_post', quantity: 2 },
        { type: 'instagram_story', quantity: 3 },
      ],
    },
    {
      id: '2',
      status: 'pending' as DealStatus,
      agreedAmountCents: 15000,
      proposedAt: '2024-01-20',
      campaign: { title: 'New Restaurant Opening' },
      creator: { displayName: 'Mike Chen' },
      business: { businessName: 'Sunset Bistro' },
      deliverables: [
        { type: 'instagram_reel', quantity: 1 },
      ],
    },
    {
      id: '3',
      status: 'completed' as DealStatus,
      agreedAmountCents: 50000,
      proposedAt: '2023-12-01',
      campaign: { title: 'Holiday Special' },
      creator: { displayName: 'Emma Davis' },
      business: { businessName: 'Winter Cafe' },
      deliverables: [
        { type: 'instagram_post', quantity: 3 },
        { type: 'tiktok_video', quantity: 2 },
      ],
    },
  ];

  const currentTab = TABS.find((t) => t.key === activeTab)!;
  const deals = allDeals.filter((d) => currentTab.statuses.includes(d.status));

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Deals</h1>
        <p className="text-gray-600 mt-1">Manage your collaborations</p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="flex -mb-px space-x-8">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.key
                  ? 'border-primary-600 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {deals.length === 0 ? (
        <Card>
          <div className="p-12 text-center">
            <DocumentCheckIcon className="h-12 w-12 mx-auto text-gray-300 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No deals yet</h3>
            <p className="text-gray-500">
              {activeTab === 'active'
                ? 'Your active deals will appear here'
                : activeTab === 'completed'
                ? 'Completed deals will appear here'
                : 'Canceled deals will appear here'}
            </p>
          </div>
        </Card>
      ) : (
        <div className="space-y-4">
          {deals.map((deal) => (
            <Link key={deal.id} href={`/deals/${deal.id}`}>
              <Card className="hover:border-primary-300 transition-colors cursor-pointer">
                <div className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      <Avatar name={deal.creator.displayName} size="lg" />

                      <div>
                        <div className="flex items-center gap-3 mb-1">
                          <h3 className="font-semibold text-gray-900">
                            {deal.creator.displayName}
                          </h3>
                          <Badge variant={statusColors[deal.status]}>
                            {formatDealStatus(deal.status)}
                          </Badge>
                        </div>

                        <p className="text-sm text-gray-600 mb-2">
                          {deal.campaign.title}
                        </p>

                        <div className="flex items-center gap-4 text-sm text-gray-500">
                          <span>
                            {deal.deliverables.map((d) => `${d.quantity} ${d.type.replace('_', ' ')}`).join(', ')}
                          </span>
                          <span>Started {formatDate(deal.proposedAt)}</span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <p className="text-lg font-semibold text-gray-900">
                        {formatCurrency(deal.agreedAmountCents)}
                      </p>
                      <p className="text-sm text-gray-500">Deal value</p>
                    </div>
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
