export const PLATFORM_FEE_PERCENT = 10;
export const BUSINESS_SUBSCRIPTION_PRICE_CENTS = 4900; // $49/mo
export const TRIAL_DAYS = 14;

export const MIN_FOLLOWERS = 1000;
export const MAX_FOLLOWERS = 50000;

export const DEFAULT_RADIUS_MILES = 25;
export const MAX_RADIUS_MILES = 500;

export const NICHE_LABELS: Record<string, string> = {
  food: 'Food & Dining',
  fashion: 'Fashion',
  beauty: 'Beauty & Skincare',
  fitness: 'Fitness & Health',
  travel: 'Travel',
  lifestyle: 'Lifestyle',
  tech: 'Technology',
  gaming: 'Gaming',
  parenting: 'Parenting & Family',
  pets: 'Pets & Animals',
  home_decor: 'Home & Decor',
  automotive: 'Automotive',
  entertainment: 'Entertainment',
  education: 'Education',
  other: 'Other',
};

export const NICHE_ICONS: Record<string, string> = {
  food: '🍽️',
  fashion: '👗',
  beauty: '💄',
  fitness: '💪',
  travel: '✈️',
  lifestyle: '🌟',
  tech: '💻',
  gaming: '🎮',
  parenting: '👶',
  pets: '🐾',
  home_decor: '🏠',
  automotive: '🚗',
  entertainment: '🎬',
  education: '📚',
  other: '📌',
};

export const CONTENT_TYPE_LABELS: Record<string, string> = {
  instagram_post: 'Instagram Post',
  instagram_story: 'Instagram Story',
  instagram_reel: 'Instagram Reel',
  tiktok_video: 'TikTok Video',
  youtube_video: 'YouTube Video',
  blog_post: 'Blog Post',
  other: 'Other',
};

export const DEAL_STATUS_COLORS: Record<string, string> = {
  pending: 'yellow',
  accepted: 'blue',
  in_progress: 'blue',
  content_submitted: 'purple',
  approved: 'green',
  completed: 'green',
  disputed: 'red',
  canceled: 'gray',
};

export const PAYMENT_STATUS_COLORS: Record<string, string> = {
  pending: 'yellow',
  processing: 'blue',
  completed: 'green',
  failed: 'red',
  refunded: 'gray',
};

export const MATCH_SCORE_THRESHOLDS = {
  excellent: 85,
  good: 70,
  fair: 50,
  poor: 0,
};

export const MATCH_WEIGHTS = {
  niche: 0.25,
  location: 0.2,
  engagement: 0.2,
  follower: 0.15,
  price: 0.1,
  availability: 0.05,
  history: 0.05,
};

export const API_ROUTES = {
  auth: {
    register: '/auth/register',
    login: '/auth/login',
    logout: '/auth/logout',
    refresh: '/auth/refresh',
    me: '/auth/me',
  },
  creators: {
    list: '/creators',
    get: (id: string) => `/creators/${id}`,
    portfolio: (id: string) => `/creators/${id}/portfolio`,
    socialAccounts: (id: string) => `/creators/${id}/social-accounts`,
    stripeOnboard: '/creators/me/stripe/onboard',
    stripeDashboard: '/creators/me/stripe/dashboard',
  },
  businesses: {
    get: (id: string) => `/businesses/${id}`,
    subscriptionCheckout: (id: string) => `/businesses/${id}/subscription/checkout`,
    subscription: (id: string) => `/businesses/${id}/subscription`,
  },
  campaigns: {
    list: '/campaigns',
    create: '/campaigns',
    get: (id: string) => `/campaigns/${id}`,
    launch: (id: string) => `/campaigns/${id}/launch`,
  },
  matches: {
    list: '/matches',
    forCampaign: (id: string) => `/matches/campaign/${id}`,
    calculate: (id: string) => `/matches/campaign/${id}/calculate`,
  },
  deals: {
    list: '/deals',
    create: '/deals',
    get: (id: string) => `/deals/${id}`,
    accept: (id: string) => `/deals/${id}/accept`,
    submit: (id: string) => `/deals/${id}/submit`,
    approve: (id: string) => `/deals/${id}/approve`,
    complete: (id: string) => `/deals/${id}/complete`,
  },
  conversations: {
    list: '/conversations',
    create: '/conversations',
    get: (id: string) => `/conversations/${id}`,
    messages: (id: string) => `/conversations/${id}/messages`,
  },
  payments: {
    createIntent: '/payments/create-intent',
    history: '/payments/history',
  },
};
