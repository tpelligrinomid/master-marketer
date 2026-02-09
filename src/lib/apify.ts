import { ApifyClient } from "apify-client";
import {
  LinkedInCompanyData,
  LinkedInPost,
  LinkedInAd,
  GoogleAd,
} from "../types/research-intelligence";

/**
 * Scrape LinkedIn company profile via Apify.
 */
export async function scrapeLinkedInCompany(
  linkedinHandle: string,
  apiKey: string
): Promise<LinkedInCompanyData> {
  const client = new ApifyClient({ token: apiKey });

  const profileUrl = linkedinHandle.startsWith("http")
    ? linkedinHandle
    : `https://www.linkedin.com/${linkedinHandle}`;

  // Actor ID 3rgDeYgLhr6XrVnjs — same as MiD Offers (proven working)
  const run = await client.actor("3rgDeYgLhr6XrVnjs").call(
    { urls: [profileUrl] },
    { timeout: 120 }
  );

  const { items } = await client.dataset(run.defaultDatasetId).listItems();
  const item = items[0] as Record<string, unknown> | undefined;

  if (!item) {
    return { name: linkedinHandle };
  }

  const recentPosts: LinkedInPost[] = [];
  if (Array.isArray(item.posts)) {
    for (const post of item.posts.slice(0, 10)) {
      const p = post as Record<string, unknown>;
      recentPosts.push({
        text: p.text as string | undefined,
        likes: p.likes as number | undefined,
        comments: p.comments as number | undefined,
        shares: p.shares as number | undefined,
        posted_at: p.postedAt as string | undefined,
      });
    }
  }

  return {
    name: (item.name as string) || (item.companyName as string) || linkedinHandle,
    description: (item.description as string) || (item.about as string) || undefined,
    followers: (item.followersCount as number) || (item.followers as number) || undefined,
    employee_count: (item.employeeCount as string) || (item.employees as string) || (item.staffCount as string) || undefined,
    specialties: item.specialties as string[] | undefined,
    headquarters: item.headquarters as string | undefined,
    industry: item.industry as string | undefined,
    website: item.website as string | undefined,
    founded: item.founded as string | undefined,
    recent_posts: recentPosts,
  };
}

/**
 * Scrape LinkedIn Ad Library for a company's ads via Apify.
 */
export async function scrapeLinkedInAds(
  companyName: string,
  apiKey: string
): Promise<LinkedInAd[]> {
  const client = new ApifyClient({ token: apiKey });

  const adLibraryUrl = `https://www.linkedin.com/ad-library/search?accountOwner=${encodeURIComponent(companyName)}`;

  const run = await client
    .actor("silva95gustavo/linkedin-ad-library-scraper")
    .call({
      startUrls: [{ url: adLibraryUrl }],
      resultsLimit: 20,
      proxyConfiguration: { useApifyProxy: true },
    });

  const { items } = await client.dataset(run.defaultDatasetId).listItems();

  return items.map((item) => {
    const ad = item as Record<string, unknown>;
    return {
      ad_id: ad.adId as string | undefined,
      advertiser_name: ad.advertiserName as string | undefined,
      headline: ad.headline as string | undefined,
      body: ad.body as string | undefined,
      cta: ad.callToAction as string | undefined,
      image_url: ad.imageUrl as string | undefined,
      landing_page_url: ad.landingPageUrl as string | undefined,
      start_date: ad.startDate as string | undefined,
      impressions: ad.impressions as string | undefined,
    };
  });
}

/**
 * Scrape Google Ads Transparency Center for a company's ads via Apify.
 */
export async function scrapeGoogleAds(
  companyName: string,
  apiKey: string
): Promise<GoogleAd[]> {
  const client = new ApifyClient({ token: apiKey });

  const run = await client
    .actor("xtech/google-ad-transparency-scraper")
    .call({
      searchInputs: [companyName],
      mode: "FULL",
    });

  const { items } = await client.dataset(run.defaultDatasetId).listItems();

  return items.map((item) => {
    const ad = item as Record<string, unknown>;
    return {
      ad_id: ad.adId as string | undefined,
      advertiser_name: ad.advertiserName as string | undefined,
      headline: ad.headline as string | undefined,
      description: ad.description as string | undefined,
      image_url: ad.imageUrl as string | undefined,
      landing_page_url: ad.landingPageUrl as string | undefined,
      format: ad.format as string | undefined,
      first_shown: ad.firstShown as string | undefined,
      last_shown: ad.lastShown as string | undefined,
      region: ad.region as string | undefined,
    };
  });
}
