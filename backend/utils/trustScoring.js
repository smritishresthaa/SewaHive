const User = require('../models/User');
const Booking = require('../models/Booking');
const Review = require('../models/Review');

const BADGE_CRITERIA = {
  VERIFIED: {
    KYC_STATUS: 'approved',
    HAS_SKILL_PROOF: true
  },
  PRO: {
    MIN_RATING: 4.5,
    MIN_COMPLETED_JOBS: 50,
    MAX_CANCELLATION_RATE: 5, // 5%
    MAX_RESPONSE_TIME: 120, // 120 minutes (2 hours)
    MIN_ACCOUNT_AGE_DAYS: 90
  },
  TOP_RATED: {
    MIN_RATING: 4.8,
    MIN_COMPLETED_JOBS: 100,
    MAX_CANCELLATION_RATE: 2, // 2%
    MIN_REPEAT_CLIENT_PERCENTAGE: 50, // 50%
    MIN_ACCOUNT_AGE_DAYS: 180
  }
};

/**
 * Calculates metrics and assigns badges for a provider based on the 3-Tier System.
 * 
 * @param {string} providerId - The ID of the provider to update
 */
async function calculateProviderBadges(providerId) {
  try {
    const provider = await User.findById(providerId);
    if (!provider || provider.role !== 'provider') {
      console.log(`Provider not found or invalid role: ${providerId}`);
      return;
    }

    // --- 1. GATHER METRICS ---
    const bookings = await Booking.find({ provider: providerId });
    const completedBookings = bookings.filter(b => b.status === 'completed');
    const cancelledBookings = bookings.filter(b => ['cancelled', 'declined'].includes(b.status));
    const reviews = await Review.find({ provider: providerId });

    // Calculate Rating Quality
    let ratingQuality = 0;
    if (reviews.length > 0) {
      const totalRating = reviews.reduce((sum, r) => sum + r.rating, 0);
      ratingQuality = totalRating / reviews.length;
    } else if (process.env.NODE_ENV !== 'production' && provider.providerDetails?.metrics?.ratingQuality) {
       // DEV MODE FALLBACK: Use manually set metrics if no real data
       ratingQuality = provider.providerDetails.metrics.ratingQuality;
    }

    // Calculate Completed Jobs
    let completedJobs = completedBookings.length;
    if (completedJobs === 0 && process.env.NODE_ENV !== 'production' && provider.providerDetails?.metrics?.completedJobs) {
        completedJobs = provider.providerDetails.metrics.completedJobs;
    }

    // Calculate Response Speed (Mocked or from Provider details if tracked)
    let responseSpeed = provider.providerDetails?.metrics?.responseSpeed || 60; 

    // Calculate Account Age
    let accountAgeDays = (new Date() - new Date(provider.createdAt)) / (1000 * 60 * 60 * 24);
    
    // DEV MODE BYPASS FOR AGE
    if (process.env.NODE_ENV !== 'production' && accountAgeDays < 90) {
        accountAgeDays = 200; // Mock age > 180
    }

    // Calculate Cancellation Rate
    const totalBookingsCount = bookings.length;
    let cancellationRate = totalBookingsCount > 0 ? (cancelledBookings.length / totalBookingsCount) * 100 : 0;
    if (totalBookingsCount === 0 && process.env.NODE_ENV !== 'production' && provider.providerDetails?.metrics?.cancellationRate !== undefined) {
        cancellationRate = provider.providerDetails.metrics.cancellationRate;
    }

    // Calculate Repeat Client Percentage
    const clientCounts = {};
    completedBookings.forEach(b => {
      const clientId = b.user ? b.user.toString() : null; 
      if (clientId) {
        clientCounts[clientId] = (clientCounts[clientId] || 0) + 1;
      }
    });

    const uniqueClients = Object.keys(clientCounts).length;
    const repeatClientsCount = Object.values(clientCounts).filter(count => count > 1).length;
    let repeatClientPercentage = uniqueClients > 0 ? (repeatClientsCount / uniqueClients) * 100 : 0;
    
    if (uniqueClients === 0 && process.env.NODE_ENV !== 'production' && provider.providerDetails?.metrics?.repeatClients !== undefined) {
        repeatClientPercentage = provider.providerDetails.metrics.repeatClients;
    }

    console.log(`[DEBUG] Provider ${providerId}: Rating=${ratingQuality}, Jobs=${completedJobs}, Cancel=${cancellationRate}%, Resp=${responseSpeed}m, Repeat=${repeatClientPercentage}%, Age=${Math.round(accountAgeDays)}d`);

    // --- 2. ASSIGN BADGES (HIERARCHICAL) ---
    
    // --- 2. ASSIGN BADGES (HIERARCHICAL) ---
    const badges = new Set();
    const approvedCategories = provider.providerDetails?.approvedCategories || []; 

    // VERIFIED BADGE
    // Criteria: KYC Approved AND at least one approved skill category
    const isKycApproved = provider.kycStatus === 'approved';
    const hasSkillProof = (provider.providerDetails?.skills && provider.providerDetails.skills.length > 0) || approvedCategories.length > 0;
    
    if (isKycApproved && hasSkillProof) {
      badges.add('verified');
    }

    // PRO BADGE
    // Must be Verified first
    let isProEligible = false;
    if (badges.has('verified')) {
        isProEligible = 
        ratingQuality >= BADGE_CRITERIA.PRO.MIN_RATING &&
        completedJobs >= BADGE_CRITERIA.PRO.MIN_COMPLETED_JOBS &&
        cancellationRate <= BADGE_CRITERIA.PRO.MAX_CANCELLATION_RATE &&
        responseSpeed <= BADGE_CRITERIA.PRO.MAX_RESPONSE_TIME &&
        accountAgeDays >= BADGE_CRITERIA.PRO.MIN_ACCOUNT_AGE_DAYS;

        if (isProEligible) {
        badges.add('pro');
        }
    }

    // TOP RATED BADGE
    // Must be Pro first
    if (badges.has('pro')) {
        const isTopRatedEligible = 
        ratingQuality >= BADGE_CRITERIA.TOP_RATED.MIN_RATING &&
        completedJobs >= BADGE_CRITERIA.TOP_RATED.MIN_COMPLETED_JOBS &&
        cancellationRate <= BADGE_CRITERIA.TOP_RATED.MAX_CANCELLATION_RATE &&
        repeatClientPercentage >= BADGE_CRITERIA.TOP_RATED.MIN_REPEAT_CLIENT_PERCENTAGE &&
        accountAgeDays >= BADGE_CRITERIA.TOP_RATED.MIN_ACCOUNT_AGE_DAYS;

        if (isTopRatedEligible) {
        badges.add('top-rated');
        }
    }

    // --- 3. UPDATE PROVIDER ---
    // Update metrics and badges
    provider.providerDetails.metrics = {
      ...provider.providerDetails.metrics,
      ratingQuality,
      completedJobs,
      responseSpeed,
      cancellationRate,
      completionRate: 100 - cancellationRate,
      repeatClients: repeatClientPercentage 
    };
    
    provider.providerDetails.badges = Array.from(badges);
    
    await provider.save();
    console.log(`Updated badges for provider ${providerId}:`, Array.from(badges));
    return { badges: Array.from(badges), metrics: provider.providerDetails.metrics };

  } catch (error) {
    console.error(`Error calculating badges for ${providerId}:`, error);
  }
}

module.exports = {
  BADGE_CRITERIA,
  calculateProviderBadges
};
