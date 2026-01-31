'use client';

import Link from 'next/link';
import { Card, Button, Badge, Avatar } from '@/components/ui';
import { formatNumber, formatCurrency, formatNiche } from '@creatormatch/shared-utils';
import {
  SparklesIcon,
  ChevronRightIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';

export default function MatchesPage() {
  // Sample matches - in real app, fetch from API
  const campaigns = [
    {
      id: '1',
      title: 'Summer Food Festival Promo',
      matches: [
        {
          id: 'm1',
          overallScore: 92,
          creator: {
            id: 'c1',
            displayName: 'Sarah Johnson',
            city: 'Austin',
            state: 'TX',
            niches: ['food', 'lifestyle'],
            totalFollowers: 12500,
            avgEngagementRate: 4.2,
            baseRateCents: 15000,
          },
          matchReasoning: {
            strengths: [
              'Strong niche alignment with 2 matching categories',
              'Located within 25 miles of target area',
              'High engagement rate (4.2%)',
            ],
            considerations: [],
          },
        },
        {
          id: 'm2',
          overallScore: 85,
          creator: {
            id: 'c2',
            displayName: 'Mike Chen',
            city: 'Austin',
            state: 'TX',
            niches: ['food', 'fitness'],
            totalFollowers: 8200,
            avgEngagementRate: 5.8,
            baseRateCents: 10000,
          },
          matchReasoning: {
            strengths: [
              'Excellent engagement rate (5.8%)',
              'Within budget range',
            ],
            considerations: [
              'Follower count on lower end of range',
            ],
          },
        },
        {
          id: 'm3',
          overallScore: 78,
          creator: {
            id: 'c3',
            displayName: 'Emma Davis',
            city: 'Round Rock',
            state: 'TX',
            niches: ['food', 'parenting'],
            totalFollowers: 25000,
            avgEngagementRate: 3.1,
            baseRateCents: 25000,
          },
          matchReasoning: {
            strengths: [
              'Large follower count',
              'Good niche match',
            ],
            considerations: [
              "Creator's rates may exceed campaign budget",
            ],
          },
        },
      ],
    },
  ];

  const getScoreColor = (score: number) => {
    if (score >= 85) return 'text-green-600 bg-green-50';
    if (score >= 70) return 'text-blue-600 bg-blue-50';
    if (score >= 50) return 'text-yellow-600 bg-yellow-50';
    return 'text-red-600 bg-red-50';
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">AI Matches</h1>
        <p className="text-gray-600 mt-1">Creators matched to your campaigns by our algorithm</p>
      </div>

      {campaigns.length === 0 ? (
        <Card>
          <div className="p-12 text-center">
            <SparklesIcon className="h-12 w-12 mx-auto text-gray-300 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No matches yet</h3>
            <p className="text-gray-500 mb-6">
              Launch a campaign to see AI-powered creator matches
            </p>
            <Link href="/campaigns/new">
              <Button>Create Campaign</Button>
            </Link>
          </div>
        </Card>
      ) : (
        <div className="space-y-8">
          {campaigns.map((campaign) => (
            <div key={campaign.id}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">{campaign.title}</h2>
                <Link href={`/campaigns/${campaign.id}`}>
                  <Button variant="ghost" size="sm" rightIcon={<ChevronRightIcon className="h-4 w-4" />}>
                    View Campaign
                  </Button>
                </Link>
              </div>

              <div className="space-y-4">
                {campaign.matches.map((match) => (
                  <Card key={match.id} className="hover:border-primary-300 transition-colors">
                    <div className="p-6">
                      <div className="flex items-start gap-6">
                        {/* Match Score */}
                        <div className={`flex-shrink-0 w-16 h-16 rounded-full flex items-center justify-center ${getScoreColor(match.overallScore)}`}>
                          <span className="text-xl font-bold">{match.overallScore}</span>
                        </div>

                        {/* Creator Info */}
                        <div className="flex-1">
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-3">
                              <Avatar name={match.creator.displayName} size="lg" />
                              <div>
                                <Link
                                  href={`/creators/${match.creator.id}`}
                                  className="font-semibold text-gray-900 hover:text-primary-600"
                                >
                                  {match.creator.displayName}
                                </Link>
                                <p className="text-sm text-gray-500">
                                  {match.creator.city}, {match.creator.state}
                                </p>
                              </div>
                            </div>

                            <div className="flex gap-2">
                              <Button variant="outline" size="sm">
                                View Profile
                              </Button>
                              <Button size="sm">
                                Invite
                              </Button>
                            </div>
                          </div>

                          <div className="flex items-center gap-6 mt-4 text-sm">
                            <div>
                              <span className="text-gray-500">Followers:</span>{' '}
                              <span className="font-medium">{formatNumber(match.creator.totalFollowers)}</span>
                            </div>
                            <div>
                              <span className="text-gray-500">Engagement:</span>{' '}
                              <span className="font-medium">{match.creator.avgEngagementRate}%</span>
                            </div>
                            <div>
                              <span className="text-gray-500">Rate:</span>{' '}
                              <span className="font-medium">{formatCurrency(match.creator.baseRateCents)}</span>
                            </div>
                          </div>

                          <div className="flex flex-wrap gap-2 mt-3">
                            {match.creator.niches.map((niche) => (
                              <Badge key={niche} variant="default" size="sm">
                                {formatNiche(niche)}
                              </Badge>
                            ))}
                          </div>

                          {/* Match Reasoning */}
                          <div className="mt-4 pt-4 border-t border-gray-100">
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center">
                                  <CheckCircleIcon className="h-4 w-4 text-green-500 mr-1" />
                                  Strengths
                                </h4>
                                <ul className="text-sm text-gray-600 space-y-1">
                                  {match.matchReasoning.strengths.map((s, i) => (
                                    <li key={i}>• {s}</li>
                                  ))}
                                </ul>
                              </div>
                              {match.matchReasoning.considerations.length > 0 && (
                                <div>
                                  <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center">
                                    <ExclamationTriangleIcon className="h-4 w-4 text-yellow-500 mr-1" />
                                    Considerations
                                  </h4>
                                  <ul className="text-sm text-gray-600 space-y-1">
                                    {match.matchReasoning.considerations.map((c, i) => (
                                      <li key={i}>• {c}</li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
