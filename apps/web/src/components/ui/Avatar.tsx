'use client';

import { forwardRef } from 'react';
import Image from 'next/image';
import { cn, getInitials, getAvatarUrl } from '@/lib/utils';

interface AvatarProps {
  src?: string;
  name: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const Avatar = forwardRef<HTMLDivElement, AvatarProps>(
  ({ src, name, size = 'md', className }, ref) => {
    const sizes = {
      xs: 'h-6 w-6 text-xs',
      sm: 'h-8 w-8 text-sm',
      md: 'h-10 w-10 text-base',
      lg: 'h-12 w-12 text-lg',
      xl: 'h-16 w-16 text-xl',
    };

    const imageSizes = {
      xs: 24,
      sm: 32,
      md: 40,
      lg: 48,
      xl: 64,
    };

    const avatarUrl = getAvatarUrl(name, src);

    return (
      <div
        ref={ref}
        className={cn(
          'relative rounded-full overflow-hidden bg-gray-200 flex items-center justify-center',
          sizes[size],
          className
        )}
      >
        {avatarUrl ? (
          <Image
            src={avatarUrl}
            alt={name}
            width={imageSizes[size]}
            height={imageSizes[size]}
            className="object-cover w-full h-full"
          />
        ) : (
          <span className="font-medium text-gray-600">{getInitials(name)}</span>
        )}
      </div>
    );
  }
);

Avatar.displayName = 'Avatar';

export { Avatar };
export type { AvatarProps };
