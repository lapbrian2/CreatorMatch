import Link from 'next/link';
import { Button } from '@/components/ui';
import {
  MapPinIcon,
  SparklesIcon,
  CurrencyDollarIcon,
  UserGroupIcon,
  ChartBarIcon,
  ShieldCheckIcon,
} from '@heroicons/react/24/outline';

const features = [
  {
    name: 'Location-Based Discovery',
    description: 'Find creators in your area with our map-based search. Target influencers who resonate with your local community.',
    icon: MapPinIcon,
  },
  {
    name: 'AI-Powered Matching',
    description: 'Our smart algorithm matches you with the perfect creators based on niche, engagement, and audience fit.',
    icon: SparklesIcon,
  },
  {
    name: 'Simple Pricing',
    description: 'Free for creators. Businesses pay $49/mo plus a 10% transaction fee. No hidden costs.',
    icon: CurrencyDollarIcon,
  },
  {
    name: 'Micro-Influencer Focus',
    description: 'Connect with authentic creators who have 1K-50K engaged followers in your target market.',
    icon: UserGroupIcon,
  },
  {
    name: 'Performance Analytics',
    description: 'Track campaign performance with detailed metrics on reach, engagement, and ROI.',
    icon: ChartBarIcon,
  },
  {
    name: 'Secure Payments',
    description: 'Safe transactions with Stripe. Funds held until content is approved.',
    icon: ShieldCheckIcon,
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="absolute inset-x-0 top-0 z-50">
        <nav className="flex items-center justify-between p-6 lg:px-8">
          <div className="flex lg:flex-1">
            <Link href="/" className="flex items-center">
              <span className="text-2xl font-bold text-primary-600">CreatorMatch</span>
              <span className="text-2xl font-light text-gray-600 ml-1">Local</span>
            </Link>
          </div>
          <div className="flex items-center gap-x-4">
            <Link href="/login">
              <Button variant="ghost">Log in</Button>
            </Link>
            <Link href="/register/creator">
              <Button variant="primary">Get Started</Button>
            </Link>
          </div>
        </nav>
      </header>

      {/* Hero */}
      <div className="relative isolate pt-14">
        <div className="absolute inset-x-0 -top-40 -z-10 transform-gpu overflow-hidden blur-3xl sm:-top-80">
          <div
            className="relative left-[calc(50%-11rem)] aspect-[1155/678] w-[36.125rem] -translate-x-1/2 rotate-[30deg] bg-gradient-to-tr from-primary-200 to-secondary-200 opacity-30 sm:left-[calc(50%-30rem)] sm:w-[72.1875rem]"
            style={{
              clipPath:
                'polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)',
            }}
          />
        </div>

        <div className="py-24 sm:py-32 lg:pb-40">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <div className="mx-auto max-w-2xl text-center">
              <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-6xl">
                Connect Local Businesses with{' '}
                <span className="text-primary-600">Micro-Influencers</span>
              </h1>
              <p className="mt-6 text-lg leading-8 text-gray-600">
                The marketplace built for local collaboration. Find authentic creators with engaged local audiences to promote your business. No mega-influencers, just real community connections.
              </p>
              <div className="mt-10 flex items-center justify-center gap-x-6">
                <Link href="/register/business">
                  <Button size="lg" variant="primary">
                    I&apos;m a Business
                  </Button>
                </Link>
                <Link href="/register/creator">
                  <Button size="lg" variant="outline">
                    I&apos;m a Creator
                  </Button>
                </Link>
              </div>
            </div>

            {/* Stats */}
            <div className="mt-16 flex justify-center">
              <div className="grid grid-cols-3 gap-8 sm:gap-16 text-center">
                <div>
                  <div className="text-4xl font-bold text-primary-600">1K-50K</div>
                  <div className="text-sm text-gray-600 mt-1">Follower Sweet Spot</div>
                </div>
                <div>
                  <div className="text-4xl font-bold text-primary-600">25mi</div>
                  <div className="text-sm text-gray-600 mt-1">Default Search Radius</div>
                </div>
                <div>
                  <div className="text-4xl font-bold text-primary-600">10%</div>
                  <div className="text-sm text-gray-600 mt-1">Transaction Fee Only</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Features */}
      <div className="py-24 sm:py-32 bg-gray-50">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-2xl lg:text-center">
            <h2 className="text-base font-semibold leading-7 text-primary-600">
              Everything you need
            </h2>
            <p className="mt-2 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
              Built for local collaboration
            </p>
            <p className="mt-6 text-lg leading-8 text-gray-600">
              Major platforms focus on global brands and celebrity influencers. We focus on the local coffee shop that wants to work with a creator who has 5K local followers.
            </p>
          </div>
          <div className="mx-auto mt-16 max-w-2xl sm:mt-20 lg:mt-24 lg:max-w-none">
            <dl className="grid max-w-xl grid-cols-1 gap-x-8 gap-y-16 lg:max-w-none lg:grid-cols-3">
              {features.map((feature) => (
                <div key={feature.name} className="flex flex-col">
                  <dt className="flex items-center gap-x-3 text-base font-semibold leading-7 text-gray-900">
                    <feature.icon className="h-5 w-5 flex-none text-primary-600" />
                    {feature.name}
                  </dt>
                  <dd className="mt-4 flex flex-auto flex-col text-base leading-7 text-gray-600">
                    <p className="flex-auto">{feature.description}</p>
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </div>

      {/* CTA */}
      <div className="bg-primary-600">
        <div className="px-6 py-24 sm:px-6 sm:py-32 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Ready to grow your local presence?
            </h2>
            <p className="mx-auto mt-6 max-w-xl text-lg leading-8 text-primary-100">
              Join thousands of local businesses and creators already using CreatorMatch Local.
            </p>
            <div className="mt-10 flex items-center justify-center gap-x-6">
              <Link href="/register/business">
                <Button size="lg" className="bg-white text-primary-600 hover:bg-primary-50">
                  Start Free Trial
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gray-900">
        <div className="mx-auto max-w-7xl px-6 py-12 lg:px-8">
          <div className="flex justify-between items-center">
            <div className="flex items-center">
              <span className="text-xl font-bold text-white">CreatorMatch</span>
              <span className="text-xl font-light text-gray-400 ml-1">Local</span>
            </div>
            <p className="text-sm text-gray-400">
              &copy; {new Date().getFullYear()} CreatorMatch Local. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
