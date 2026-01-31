import { prisma } from '../config/database';
import { stripe, STRIPE_CONFIG } from '../config/stripe';
import { AppError, ErrorCodes } from '../utils/response';
import { UpdateBusinessInput, SubscriptionCheckoutInput } from '../validators/business.validator';
import { BusinessProfile } from '@creatormatch/shared-types';

export class BusinessService {
  async getById(id: string): Promise<BusinessProfile> {
    const business = await prisma.businessProfile.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            email: true,
          },
        },
      },
    });

    if (!business) {
      throw new AppError(ErrorCodes.NOT_FOUND, 'Business not found', 404);
    }

    return this.formatBusiness(business);
  }

  async getByUserId(userId: string): Promise<BusinessProfile> {
    const business = await prisma.businessProfile.findUnique({
      where: { userId },
    });

    if (!business) {
      throw new AppError(ErrorCodes.NOT_FOUND, 'Business profile not found', 404);
    }

    return this.formatBusiness(business);
  }

  async update(userId: string, input: UpdateBusinessInput): Promise<BusinessProfile> {
    const business = await prisma.businessProfile.findUnique({
      where: { userId },
    });

    if (!business) {
      throw new AppError(ErrorCodes.NOT_FOUND, 'Business profile not found', 404);
    }

    const updated = await prisma.businessProfile.update({
      where: { userId },
      data: input,
    });

    return this.formatBusiness(updated);
  }

  async createSubscriptionCheckout(
    userId: string,
    input: SubscriptionCheckoutInput
  ): Promise<{ checkoutUrl: string }> {
    const business = await prisma.businessProfile.findUnique({
      where: { userId },
      include: { user: true },
    });

    if (!business) {
      throw new AppError(ErrorCodes.NOT_FOUND, 'Business profile not found', 404);
    }

    // Create or get Stripe customer
    let customerId = business.stripeCustomerId;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: business.user.email,
        name: business.businessName,
        metadata: {
          businessId: business.id,
          userId: business.userId,
        },
      });
      customerId = customer.id;

      await prisma.businessProfile.update({
        where: { id: business.id },
        data: { stripeCustomerId: customerId },
      });
    }

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: STRIPE_CONFIG.basicPlanPriceId,
          quantity: 1,
        },
      ],
      subscription_data: {
        trial_period_days: STRIPE_CONFIG.trialDays,
        metadata: {
          businessId: business.id,
        },
      },
      success_url: input.successUrl,
      cancel_url: input.cancelUrl,
    });

    if (!session.url) {
      throw new AppError(ErrorCodes.STRIPE_ERROR, 'Failed to create checkout session', 500);
    }

    return { checkoutUrl: session.url };
  }

  async getSubscription(userId: string): Promise<{
    status: string | null;
    plan: string | null;
    currentPeriodEnd: string | null;
    cancelAtPeriodEnd: boolean;
  }> {
    const business = await prisma.businessProfile.findUnique({
      where: { userId },
    });

    if (!business) {
      throw new AppError(ErrorCodes.NOT_FOUND, 'Business profile not found', 404);
    }

    if (!business.stripeSubscriptionId) {
      return {
        status: null,
        plan: null,
        currentPeriodEnd: null,
        cancelAtPeriodEnd: false,
      };
    }

    const subscription = await stripe.subscriptions.retrieve(business.stripeSubscriptionId);

    return {
      status: subscription.status,
      plan: business.subscriptionPlan,
      currentPeriodEnd: new Date(subscription.current_period_end * 1000).toISOString(),
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
    };
  }

  async cancelSubscription(userId: string): Promise<void> {
    const business = await prisma.businessProfile.findUnique({
      where: { userId },
    });

    if (!business) {
      throw new AppError(ErrorCodes.NOT_FOUND, 'Business profile not found', 404);
    }

    if (!business.stripeSubscriptionId) {
      throw new AppError(ErrorCodes.NOT_FOUND, 'No active subscription', 404);
    }

    await stripe.subscriptions.update(business.stripeSubscriptionId, {
      cancel_at_period_end: true,
    });

    await prisma.businessProfile.update({
      where: { id: business.id },
      data: { subscriptionStatus: 'canceled' },
    });
  }

  async resumeSubscription(userId: string): Promise<void> {
    const business = await prisma.businessProfile.findUnique({
      where: { userId },
    });

    if (!business) {
      throw new AppError(ErrorCodes.NOT_FOUND, 'Business profile not found', 404);
    }

    if (!business.stripeSubscriptionId) {
      throw new AppError(ErrorCodes.NOT_FOUND, 'No subscription to resume', 404);
    }

    await stripe.subscriptions.update(business.stripeSubscriptionId, {
      cancel_at_period_end: false,
    });

    await prisma.businessProfile.update({
      where: { id: business.id },
      data: { subscriptionStatus: 'active' },
    });
  }

  async hasActiveSubscription(userId: string): Promise<boolean> {
    const business = await prisma.businessProfile.findUnique({
      where: { userId },
    });

    if (!business) return false;

    return (
      business.subscriptionStatus === 'active' ||
      business.subscriptionStatus === 'trialing'
    );
  }

  private formatBusiness(business: any): BusinessProfile {
    return {
      id: business.id,
      userId: business.userId,
      businessName: business.businessName,
      businessType: business.businessType || undefined,
      description: business.description || undefined,
      logoUrl: business.logoUrl || undefined,
      coverImageUrl: business.coverImageUrl || undefined,
      location:
        business.latitude && business.longitude
          ? { lat: business.latitude, lng: business.longitude }
          : undefined,
      addressLine1: business.addressLine1 || undefined,
      addressLine2: business.addressLine2 || undefined,
      city: business.city || undefined,
      state: business.state || undefined,
      country: business.country,
      zipCode: business.zipCode || undefined,
      targetNiches: business.targetNiches,
      preferredFollowerMin: business.preferredFollowerMin || undefined,
      preferredFollowerMax: business.preferredFollowerMax || undefined,
      preferredEngagementMin: business.preferredEngagementMin || undefined,
      websiteUrl: business.websiteUrl || undefined,
      instagramUrl: business.instagramUrl || undefined,
      contactEmail: business.contactEmail || undefined,
      contactPhone: business.contactPhone || undefined,
      stripeCustomerId: business.stripeCustomerId || undefined,
      stripeSubscriptionId: business.stripeSubscriptionId || undefined,
      subscriptionStatus: business.subscriptionStatus || undefined,
      subscriptionPlan: business.subscriptionPlan || undefined,
      subscriptionStartedAt: business.subscriptionStartedAt?.toISOString(),
      subscriptionEndsAt: business.subscriptionEndsAt?.toISOString(),
      trialEndsAt: business.trialEndsAt?.toISOString(),
      activeCampaignsCount: business.activeCampaignsCount,
      completedDealsCount: business.completedDealsCount,
      totalSpentCents: Number(business.totalSpentCents),
      isVerified: business.isVerified,
      createdAt: business.createdAt.toISOString(),
      updatedAt: business.updatedAt.toISOString(),
    };
  }
}

export const businessService = new BusinessService();
