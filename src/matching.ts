import type { BlueWhaleStore, BusinessOffer, CreatorApplication } from './types'

export const getMatchingOffers = (store: BlueWhaleStore, creator: Pick<CreatorApplication, 'destination' | 'categories'>) =>
  store.business_offers.filter((offer) => offer.location === creator.destination && creator.categories.includes(offer.category))

export const getInterestedCreatorsForOffer = (store: BlueWhaleStore, offer: BusinessOffer) => {
  const interestedCreatorIds = new Set(
    store.creator_offer_preferences
      .filter((preference) => preference.business_offer_id === offer.id && preference.preference === 'interested')
      .map((preference) => preference.creator_application_id),
  )

  return store.creator_applications.filter((creator) => {
    return (
      interestedCreatorIds.has(creator.id) &&
      creator.destination === offer.location &&
      creator.categories.includes(offer.category)
    )
  })
}

export const getCreatorBundle = (store: BlueWhaleStore, creatorId: string) => ({
  application: store.creator_applications.find((creator) => creator.id === creatorId),
  socialAccounts: store.creator_social_accounts.filter((account) => account.creator_application_id === creatorId),
  preferences: store.creator_offer_preferences.filter((preference) => preference.creator_application_id === creatorId),
  proposals: store.business_proposals.filter((proposal) => proposal.creator_application_id === creatorId),
})

export const getBusinessBundle = (store: BlueWhaleStore, offerId: string) => ({
  offer: store.business_offers.find((offer) => offer.id === offerId),
  interestedCreators: store.business_offers.find((offer) => offer.id === offerId)
    ? getInterestedCreatorsForOffer(store, store.business_offers.find((offer) => offer.id === offerId)!)
    : [],
  proposals: store.business_proposals.filter((proposal) => proposal.business_offer_id === offerId),
})
