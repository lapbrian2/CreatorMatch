import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Create sample users and profiles
  const password = await bcrypt.hash('Password123', 12);

  // Business user
  const businessUser = await prisma.user.upsert({
    where: { email: 'business@example.com' },
    update: {},
    create: {
      email: 'business@example.com',
      passwordHash: password,
      role: 'business',
      firstName: 'John',
      lastName: 'Smith',
      emailVerified: true,
      businessProfile: {
        create: {
          businessName: 'Local Eats Co',
          businessType: 'Restaurant',
          description: 'Farm-to-table restaurant in downtown Austin serving locally sourced cuisine.',
          city: 'Austin',
          state: 'TX',
          zipCode: '78701',
          latitude: 30.2672,
          longitude: -97.7431,
          targetNiches: ['food', 'lifestyle'],
          preferredFollowerMin: 1000,
          preferredFollowerMax: 50000,
          websiteUrl: 'https://localeats.example.com',
          subscriptionStatus: 'active',
          subscriptionPlan: 'basic',
        },
      },
      notifications: {
        create: {},
      },
    },
  });

  // Creator users
  const creators = [
    {
      email: 'sarah@example.com',
      firstName: 'Sarah',
      lastName: 'Johnson',
      displayName: 'Sarah Johnson',
      headline: 'Food & Lifestyle Content Creator',
      bio: 'Austin-based food blogger and lifestyle content creator. I love discovering hidden gems in my city!',
      city: 'Austin',
      state: 'TX',
      latitude: 30.2849,
      longitude: -97.7341,
      niches: ['food', 'lifestyle', 'travel'],
      totalFollowers: 12500,
      avgEngagementRate: 4.2,
      baseRateCents: 15000,
    },
    {
      email: 'mike@example.com',
      firstName: 'Mike',
      lastName: 'Chen',
      displayName: 'Mike Chen',
      headline: 'Fitness & Food Enthusiast',
      bio: 'Denver-based fitness coach and foodie. Sharing healthy recipes and workout tips.',
      city: 'Denver',
      state: 'CO',
      latitude: 39.7392,
      longitude: -104.9903,
      niches: ['fitness', 'food', 'lifestyle'],
      totalFollowers: 8200,
      avgEngagementRate: 5.8,
      baseRateCents: 10000,
    },
    {
      email: 'emma@example.com',
      firstName: 'Emma',
      lastName: 'Davis',
      displayName: 'Emma Davis',
      headline: 'Fashion & Beauty Creator',
      bio: 'Portland fashion blogger sharing sustainable style tips and local boutique finds.',
      city: 'Portland',
      state: 'OR',
      latitude: 45.5152,
      longitude: -122.6784,
      niches: ['fashion', 'beauty', 'lifestyle'],
      totalFollowers: 25000,
      avgEngagementRate: 3.5,
      baseRateCents: 20000,
    },
    {
      email: 'alex@example.com',
      firstName: 'Alex',
      lastName: 'Rivera',
      displayName: 'Alex Rivera',
      headline: 'Tech & Gaming Content Creator',
      bio: 'Seattle tech enthusiast reviewing the latest gadgets and games.',
      city: 'Seattle',
      state: 'WA',
      latitude: 47.6062,
      longitude: -122.3321,
      niches: ['tech', 'gaming', 'lifestyle'],
      totalFollowers: 18000,
      avgEngagementRate: 4.8,
      baseRateCents: 18000,
    },
    {
      email: 'lisa@example.com',
      firstName: 'Lisa',
      lastName: 'Park',
      displayName: 'Lisa Park',
      headline: 'Parenting & Lifestyle Blogger',
      bio: 'Austin mom sharing parenting tips, family-friendly restaurants, and local activities.',
      city: 'Austin',
      state: 'TX',
      latitude: 30.3074,
      longitude: -97.7559,
      niches: ['parenting', 'food', 'lifestyle'],
      totalFollowers: 15000,
      avgEngagementRate: 6.2,
      baseRateCents: 12000,
    },
  ];

  for (const creator of creators) {
    await prisma.user.upsert({
      where: { email: creator.email },
      update: {},
      create: {
        email: creator.email,
        passwordHash: password,
        role: 'creator',
        firstName: creator.firstName,
        lastName: creator.lastName,
        emailVerified: true,
        creatorProfile: {
          create: {
            displayName: creator.displayName,
            headline: creator.headline,
            bio: creator.bio,
            city: creator.city,
            state: creator.state,
            latitude: creator.latitude,
            longitude: creator.longitude,
            niches: creator.niches as any,
            totalFollowers: creator.totalFollowers,
            avgEngagementRate: creator.avgEngagementRate,
            baseRateCents: creator.baseRateCents,
            isAvailable: true,
            isVerified: true,
            profileCompleteness: 85,
          },
        },
        notifications: {
          create: {},
        },
      },
    });
  }

  // Create a sample campaign
  const business = await prisma.businessProfile.findFirst({
    where: { userId: businessUser.id },
  });

  if (business) {
    await prisma.campaign.upsert({
      where: { id: '00000000-0000-0000-0000-000000000001' },
      update: {},
      create: {
        id: '00000000-0000-0000-0000-000000000001',
        businessId: business.id,
        title: 'Summer Food Festival Promo',
        description: 'Promote our participation in the Austin Summer Food Festival with authentic content showcasing our dishes.',
        objective: 'Increase awareness and drive foot traffic during the festival weekend.',
        requiredContentTypes: ['instagram_post', 'instagram_story'],
        requiredDeliverables: [
          { type: 'instagram_post', quantity: 2, description: 'Feature our signature dishes' },
          { type: 'instagram_story', quantity: 3, description: 'Behind-the-scenes at the festival' },
        ],
        targetNiches: ['food', 'lifestyle'],
        minFollowers: 5000,
        maxFollowers: 50000,
        minEngagementRate: 3.0,
        targetLatitude: 30.2672,
        targetLongitude: -97.7431,
        targetRadiusMiles: 30,
        budgetCents: 50000,
        paymentPerCreatorCents: 15000,
        maxCreators: 3,
        status: 'active',
      },
    });
  }

  console.log('Database seeded successfully!');
  console.log('');
  console.log('Test accounts:');
  console.log('  Business: business@example.com / Password123');
  console.log('  Creator:  sarah@example.com / Password123');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
