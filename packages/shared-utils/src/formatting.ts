export function formatCurrency(cents: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(cents / 100);
}

export function formatNumber(num: number): string {
  if (num >= 1_000_000) {
    return `${(num / 1_000_000).toFixed(1)}M`;
  }
  if (num >= 1_000) {
    return `${(num / 1_000).toFixed(1)}K`;
  }
  return num.toString();
}

export function formatEngagementRate(rate: number): string {
  return `${rate.toFixed(2)}%`;
}

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(new Date(date));
}

export function formatDateTime(date: string | Date): string {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(date));
}

export function formatRelativeTime(date: string | Date): string {
  const now = new Date();
  const then = new Date(date);
  const diffMs = now.getTime() - then.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return formatDate(date);
}

export function formatLocation(city?: string, state?: string): string {
  if (city && state) return `${city}, ${state}`;
  if (city) return city;
  if (state) return state;
  return '';
}

export function formatDistance(miles: number): string {
  if (miles < 1) {
    return `${Math.round(miles * 5280)} ft`;
  }
  return `${miles.toFixed(1)} mi`;
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3) + '...';
}

export function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
}

export function formatNiche(niche: string): string {
  return niche
    .split('_')
    .map((word) => capitalize(word))
    .join(' ');
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export function formatPlatform(platform: string): string {
  const platforms: Record<string, string> = {
    instagram: 'Instagram',
    tiktok: 'TikTok',
    youtube: 'YouTube',
    instagram_post: 'Instagram Post',
    instagram_story: 'Instagram Story',
    instagram_reel: 'Instagram Reel',
    tiktok_video: 'TikTok Video',
    youtube_video: 'YouTube Video',
    blog_post: 'Blog Post',
  };
  return platforms[platform] || capitalize(platform);
}

export function formatDealStatus(status: string): string {
  const statuses: Record<string, string> = {
    pending: 'Pending',
    accepted: 'Accepted',
    in_progress: 'In Progress',
    content_submitted: 'Content Submitted',
    approved: 'Approved',
    completed: 'Completed',
    disputed: 'Disputed',
    canceled: 'Canceled',
  };
  return statuses[status] || capitalize(status);
}

export function formatPaymentStatus(status: string): string {
  const statuses: Record<string, string> = {
    pending: 'Pending',
    processing: 'Processing',
    completed: 'Paid',
    failed: 'Failed',
    refunded: 'Refunded',
  };
  return statuses[status] || capitalize(status);
}
