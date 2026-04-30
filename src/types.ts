export const DESTINATIONS = ['Jeju', 'Seoul', 'Busan', 'Gangneung'] as const
export const CATEGORIES = ['Hotel', 'Rental Car', 'Restaurant', 'Cafe', 'Beauty', 'Activity', 'Photo Shoot', 'Connectivity'] as const
export const CONTENT_TYPES = ['Instagram Reel', 'Instagram Story', 'YouTube Shorts', 'TikTok', 'Blog Post', 'Photo Set'] as const

export type Destination = (typeof DESTINATIONS)[number]
export type Category = (typeof CATEGORIES)[number]
export type ContentType = (typeof CONTENT_TYPES)[number]

export type ApplicationStatus = 'new' | 'blue_whale_reviewing' | 'proposal_received' | 'confirmed'
export type OfferPreference = 'interested' | 'not_interested'
export type OutreachStatus =
  | 'interest_saved'
  | 'blue_whale_reviewing'
  | 'business_contacted'
  | 'business_replied'
  | 'proposal_received'
  | 'not_available'
  | 'confirmed'
export type ProposalStatus =
  | 'under_blue_whale_review'
  | 'proposal_received'
  | 'sent_to_creator'
  | 'creator_interested'
  | 'creator_declined'
  | 'confirmed'
export type ContactPreference = 'blue_whale' | 'direct_ok'
export type SourceType = 'seeded' | 'partner' | 'reference' | 'manual'
export type AvailabilityStatus = 'requestable' | 'partner_confirmed' | 'paused'
export type SocialPlatform = 'Instagram' | 'TikTok' | 'YouTube' | 'Naver Blog'
export type OperatorTaskType = 'contact_business' | 'review_creator' | 'deliver_proposal'
export type OperatorTaskStatus = 'open' | 'in_progress' | 'done' | 'blocked'

export type CreatorApplication = {
  id: string
  nickname: string
  password: string
  destination: Destination
  start_date: string
  end_date: string
  contact_instagram?: string
  contact_email?: string
  contact_phone?: string
  status: ApplicationStatus
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
  source_type: SourceType
  availability_status: AvailabilityStatus
  address?: string
  website_or_social?: string
  short_description?: string
  contact_name?: string
  contact_email?: string
  contact_phone?: string
  contact_instagram?: string
  status: 'active' | 'draft' | 'archived'
  created_at: string
  updated_at: string
}

export type CreatorOfferPreference = {
  id: string
  creator_application_id: string
  business_offer_id: string
  preference: OfferPreference
  outreach_status: OutreachStatus
  operator_notes?: string
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
  status: ProposalStatus
  created_at: string
  updated_at: string
}

export type OperatorTask = {
  id: string
  type: OperatorTaskType
  creator_application_id: string
  business_offer_id: string
  business_proposal_id?: string
  status: OperatorTaskStatus
  notes?: string
  created_at: string
  updated_at: string
}

export type BlueWhaleStore = {
  creator_applications: CreatorApplication[]
  creator_social_accounts: CreatorSocialAccount[]
  business_offers: BusinessOffer[]
  creator_offer_preferences: CreatorOfferPreference[]
  business_proposals: BusinessProposal[]
  operator_tasks: OperatorTask[]
}
