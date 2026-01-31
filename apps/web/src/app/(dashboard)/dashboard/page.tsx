'use client';

import Link from 'next/link';
import { useAuthStore } from '@/stores/authStore';
import { Card, CardContent, Button } from '@/components/ui';
import {
  UserGroupIcon,
  MegaphoneIcon,
  DocumentCheckIcon,
  CurrencyDollarIcon,
  ArrowTrendingUpIcon,
  PlusIcon,
} from '@heroicons/react/24/outline';

export default function DashboardPage() {
  const { user } = useAuthStore();
  const isBusiness = user?.role === 'business';

  const businessStats = [
    { name: 'Active Campaigns', value: '3', icon: MegaphoneIcon, href: '/campaigns' },
    { name: 'Pending Deals', value: '5', icon: DocumentCheckIcon, href: '/deals' },
    { name: 'Creators Matched', value: '24', icon: UserGroupIcon, href: '/matches' },
    { name: 'Total Spent', value: '$1,250', icon: CurrencyDollarIcon, href: '/deals' },
  ];

  const creatorStats = [
    { name: 'New Opportunities', value: '8', icon: MegaphoneIcon, href: '/opportunities' },
    { name: 'Active Deals', value: '2', icon: DocumentCheckIcon, href: '/deals' },
    { name: 'Total Earned', value: '$850', icon: CurrencyDollarIcon, href: '/deals' },
    { name: 'Profile Views', value: '156', icon: ArrowTrendingUpIcon, href: '/profile' },
  ];

  const stats = isBusiness ? businessStats : creatorStats;

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Welcome back, {user?.firstName || 'there'}!
          </h1>
          <p className="text-gray-600 mt-1">
            {isBusiness
              ? "Here's what's happening with your campaigns."
              : "Here's what's happening with your creator profile."}
          </p>
        </div>
        {isBusiness && (
          <Link href="/campaigns/new">
            <Button leftIcon={<PlusIcon className="h-5 w-5" />}>
              New Campaign
            </Button>
          </Link>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat) => (
          <Link key={stat.name} href={stat.href}>
            <Card className="hover:border-primary-300 transition-colors cursor-pointer">
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-primary-50 rounded-lg">
                    <stat.icon className="h-6 w-6 text-primary-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">{stat.name}</p>
                    <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardContent className="p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              {isBusiness ? 'Recent Matches' : 'Recent Opportunities'}
            </h2>
            <div className="text-center py-8 text-gray-500">
              <UserGroupIcon className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>No {isBusiness ? 'matches' : 'opportunities'} yet</p>
              <p className="text-sm mt-1">
                {isBusiness
                  ? 'Create a campaign to start finding creators'
                  : 'Complete your profile to get matched with businesses'}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Recent Activity
            </h2>
            <div className="text-center py-8 text-gray-500">
              <DocumentCheckIcon className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>No recent activity</p>
              <p className="text-sm mt-1">Your recent deals and messages will appear here</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
