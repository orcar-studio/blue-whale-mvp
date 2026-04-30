export const DESTINATIONS = ['Jeju', 'Seoul', 'Busan', 'Gangneung'] as const
export const CATEGORIES = [
  'Hotel',
  'Rental Car',
  'Restaurant',
  'Cafe',
  'Beauty',
  'Activity',
  'Photo Shoot',
  'Shopping',
  'Connectivity',
] as const

export const CONTENT_TYPES = [
  'Instagram Reel',
  'Instagram Story',
  'YouTube Shorts',
  'TikTok',
  'Blog Post',
  'Photo Set',
] as const

export type Destination = (typeof DESTINATIONS)[number]
export type Category = (typeof CATEGORIES)[number]
export type ContentType = (typeof CONTENT_TYPES)[number]

export type ReviewStatus = 'Under Blue Whale Review' | 'Sent to Creator' | 'Creator Interested' | 'Creator Declined' | 'Confirmed'
export type OfferPreference = 'interested' | 'not_interested'
export type ContactPreference = 'blue_whale' | 'direct_ok'
export type SocialPlatform = 'Instagram' | 'TikTok' | 'YouTube' | 'Naver Blog'

export type CreatorApplication = {
  id: string
  nickname: string
  password: string
  destination: Destination
  start_date: string
  end_date: string
  categories: Category[]
  contact_instagram?: string
  contact_email?: string
  contact_phone?: string
  status: ReviewStatus
  created_at: string
  updated_at: string
}

export type CreatorSocialAccount = {
  id: string
  creator_application_id: string
  platform: SocialPlatform
  handle: string
  profile_url: string
  reviewed_followers?: number
  reviewed_average_views?: number
  reviewed_average_likes?: number
  created_at: string
}

export type BusinessOffer = {
  id: string
  login_id: string
  password: string
  location: Destination
  category: Category
  sponsorship_details: string
  desired_content_types: ContentType[]
  no_content_preference: boolean
  business_name: string
  image_url?: string
  reference_label?: string
  reference_url?: string
  address?: string
  website_or_social?: string
  short_description?: string
  contact_name?: string
  contact_email?: string
  contact_phone?: string
  contact_instagram?: string
  status: ReviewStatus
  created_at: string
  updated_at: string
}

export type CreatorOfferPreference = {
  id: string
  creator_application_id: string
  business_offer_id: string
  preference: OfferPreference
  created_at: string
  updated_at: string
}

export type BusinessProposal = {
  id: string
  business_offer_id: string
  creator_application_id: string
  title?: string
  provide_details: string
  proposal_message: string
  included_items?: string
  excluded_items?: string
  requested_content?: string
  available_dates?: string
  upload_deadline?: string
  contact_preference: ContactPreference
  status: ReviewStatus
  created_at: string
  updated_at: string
}

export type BlueWhaleStore = {
  creator_applications: CreatorApplication[]
  creator_social_accounts: CreatorSocialAccount[]
  business_offers: BusinessOffer[]
  creator_offer_preferences: CreatorOfferPreference[]
  business_proposals: BusinessProposal[]
}
