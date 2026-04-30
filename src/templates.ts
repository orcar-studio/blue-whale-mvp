import type { Category } from './types'

export const sponsorshipTemplates: Record<Category, string> = {
  Hotel: '1-night stay, breakfast included, weekends excluded',
  'Rental Car': '48-hour rental car, insurance included, fuel excluded',
  Restaurant: 'Meal for 2, signature menu included, alcohol excluded',
  Beauty: '1 beauty treatment or service, appointment time to be discussed',
  Cafe: 'Cafe set for 2, signature drinks included',
  Activity: 'Experience pass for 2, reservation required',
  'Photo Shoot': '30-minute photo shoot, 10 edited photos included',
  Connectivity: 'Travel eSIM data plan, activation guide included',
}

export const fallbackBusinessDescription = (businessName: string, category: Category, details: string) => {
  const name = businessName.trim() || `Local ${category} partner`
  const offer = details.trim() || sponsorshipTemplates[category]

  return `${name} offers a creator-friendly ${category.toLowerCase()} sponsorship in the area. The offer includes ${offer.toLowerCase()}, with final visit details coordinated by Blue Whale.`
}
