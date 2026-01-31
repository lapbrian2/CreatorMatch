'use client';

import Link from 'next/link';
import { Card, Button, Badge } from '@/components/ui';
import { formatCurrency, formatDate } from '@creatormatch/shared-utils';
import {
  PlusIcon,
  MegaphoneIcon,
  UserGroupIcon,
  CalendarIcon,
} from '@heroicons/react/24/outline';

const statusColors = {
  draft: 'default',
  active: 'success',
  paused: 'warning',
  completed: 'primary',
  canceled: 'error',
} as const;

export default function CampaignsPage() {
  // Sample campaigns - in real app, fetch from API
  const campaigns = [
    {
      id: '1',
      title: 'Summer Food Festival Promo',
      status: 'active',
      budgetCents: 50000,
      maxCreators: 5,
      acceptedCount: 3,
      startDate: '2024-06-01',
      endDate: '2024-06-30',
      targetNiches: ['food', 'lifestyle'],
    },
    {
      id: '2',
      title: 'New Menu Launch',
      status: 'draft',
      budgetCents: 25000,
      maxCreators: 3,
      acceptedCount: 0,
      startDate: '2024-07-15',
      endDate: '2024-08-15',
      targetNiches: ['food'],
    },
    {
      id: '3',
      title: 'Holiday Special Campaign',
      status: 'completed',
      budgetCents: 100000,
      maxCreators: 10,
      acceptedCount: 10,
      startDate: '2023-12-01',
      endDate: '2023-12-25',
      targetNiches: ['food', 'lifestyle', 'fashion'],
    },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Campaigns</h1>
          <p className="text-gray-600 mt-1">Manage your influencer marketing campaigns</p>
        </div>
        <Link href="/campaigns/new">
          <Button leftIcon={<PlusIcon className="h-5 w-5" />}>
            New Campaign
          </Button>
        </Link>
      </div>

      {campaigns.length === 0 ? (
        <Card>
          <div className="p-12 text-center">
            <MegaphoneIcon className="h-12 w-12 mx-auto text-gray-300 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No campaigns yet</h3>
            <p className="text-gray-500 mb-6">Create your first campaign to start finding creators</p>
            <Link href="/campaigns/new">
              <Button leftIcon={<PlusIcon className="h-5 w-5" />}>
                Create Campaign
              </Button>
            </Link>
          </div>
        </Card>
      ) : (
        <div className="space-y-4">
          {campaigns.map((campaign) => (
            <Link key={campaign.id} href={`/campaigns/${campaign.id}`}>
              <Card className="hover:border-primary-300 transition-colors cursor-pointer">
                <div className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900">
                          {campaign.title}
                        </h3>
                        <Badge variant={statusColors[campaign.status as keyof typeof statusColors]}>
                          {campaign.status.charAt(0).toUpperCase() + campaign.status.slice(1)}
                        </Badge>
                      </div>

                      <div className="flex items-center gap-6 text-sm text-gray-500">
                        <span className="flex items-center">
                          <UserGroupIcon className="h-4 w-4 mr-1" />
                          {campaign.acceptedCount}/{campaign.maxCreators} creators
                        </span>
                        <span className="flex items-center">
                          <CalendarIcon className="h-4 w-4 mr-1" />
                          {formatDate(campaign.startDate)} - {formatDate(campaign.endDate)}
                        </span>
                      </div>

                      <div className="flex flex-wrap gap-2 mt-3">
                        {campaign.targetNiches.map((niche) => (
                          <Badge key={niche} variant="default" size="sm">
                            {niche}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    <div className="text-right">
                      <p className="text-lg font-semibold text-gray-900">
                        {formatCurrency(campaign.budgetCents)}
                      </p>
                      <p className="text-sm text-gray-500">Budget</p>
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
