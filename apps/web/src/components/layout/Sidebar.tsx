'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';
import { cn } from '@/lib/utils';
import {
  HomeIcon,
  MagnifyingGlassIcon,
  MegaphoneIcon,
  SparklesIcon,
  DocumentCheckIcon,
  ChatBubbleLeftRightIcon,
  Cog6ToothIcon,
  UserCircleIcon,
} from '@heroicons/react/24/outline';

const businessNavigation = [
  { name: 'Dashboard', href: '/dashboard', icon: HomeIcon },
  { name: 'Discover Creators', href: '/discover', icon: MagnifyingGlassIcon },
  { name: 'Campaigns', href: '/campaigns', icon: MegaphoneIcon },
  { name: 'Matches', href: '/matches', icon: SparklesIcon },
  { name: 'Deals', href: '/deals', icon: DocumentCheckIcon },
  { name: 'Messages', href: '/messages', icon: ChatBubbleLeftRightIcon },
];

const creatorNavigation = [
  { name: 'Dashboard', href: '/dashboard', icon: HomeIcon },
  { name: 'My Profile', href: '/profile', icon: UserCircleIcon },
  { name: 'Opportunities', href: '/opportunities', icon: SparklesIcon },
  { name: 'My Deals', href: '/deals', icon: DocumentCheckIcon },
  { name: 'Messages', href: '/messages', icon: ChatBubbleLeftRightIcon },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user } = useAuthStore();

  const navigation = user?.role === 'business' ? businessNavigation : creatorNavigation;

  return (
    <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:inset-y-0 lg:pt-16 bg-white border-r border-gray-200">
      <nav className="flex-1 px-4 py-6 space-y-1">
        {navigation.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/');

          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                'flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors',
                isActive
                  ? 'bg-primary-50 text-primary-700'
                  : 'text-gray-700 hover:bg-gray-100'
              )}
            >
              <item.icon
                className={cn(
                  'mr-3 h-5 w-5',
                  isActive ? 'text-primary-600' : 'text-gray-400'
                )}
              />
              {item.name}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-gray-200">
        <Link
          href="/settings"
          className="flex items-center px-3 py-2 text-sm font-medium text-gray-700 rounded-lg hover:bg-gray-100"
        >
          <Cog6ToothIcon className="mr-3 h-5 w-5 text-gray-400" />
          Settings
        </Link>
      </div>
    </aside>
  );
}
