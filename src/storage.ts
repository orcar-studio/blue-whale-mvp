import { seedStore } from './seed'
import type {
  BlueWhaleStore,
  BusinessOffer,
  BusinessProposal,
  CreatorApplication,
  CreatorOfferPreference,
  CreatorSocialAccount,
  OfferPreference,
} from './types'

const STORAGE_KEY = 'blue-whale-mvp-store-v2'

const cloneStore = (store: BlueWhaleStore): BlueWhaleStore => JSON.parse(JSON.stringify(store)) as BlueWhaleStore

const readStore = (): BlueWhaleStore => {
  if (typeof window === 'undefined') {
    return cloneStore(seedStore)
  }

  const raw = window.localStorage.getItem(STORAGE_KEY)

  if (!raw) {
    const seeded = cloneStore(seedStore)
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(seeded))
    return seeded
  }

  try {
    return JSON.parse(raw) as BlueWhaleStore
  } catch {
    const seeded = cloneStore(seedStore)
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(seeded))
    return seeded
  }
}

const writeStore = (store: BlueWhaleStore) => {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store))
}

export const createId = (prefix: string) => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return `${prefix}-${crypto.randomUUID()}`
  }

  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

export const nowIso = () => new Date().toISOString()

export const repository = {
  getStore: readStore,
  resetDemoData: () => {
    const seeded = cloneStore(seedStore)
    writeStore(seeded)
    return seeded
  },
  saveCreatorApplication: (
    application: CreatorApplication,
    accounts: CreatorSocialAccount[],
    preferences: CreatorOfferPreference[],
  ) => {
    const store = readStore()
    store.creator_applications.unshift(application)
    store.creator_social_accounts.unshift(...accounts)
    store.creator_offer_preferences.unshift(...preferences)
    writeStore(store)
    return store
  },
  saveBusinessOffer: (offer: BusinessOffer) => {
    const store = readStore()
    store.business_offers.unshift(offer)
    writeStore(store)
    return store
  },
  upsertCreatorOfferPreference: (creatorApplicationId: string, businessOfferId: string, preference: OfferPreference) => {
    const store = readStore()
    const timestamp = nowIso()
    const existing = store.creator_offer_preferences.find(
      (item) => item.creator_application_id === creatorApplicationId && item.business_offer_id === businessOfferId,
    )

    if (existing) {
      existing.preference = preference
      existing.updated_at = timestamp
    } else {
      store.creator_offer_preferences.unshift({
        id: createId('pref'),
        creator_application_id: creatorApplicationId,
        business_offer_id: businessOfferId,
        preference,
        created_at: timestamp,
        updated_at: timestamp,
      })
    }

    writeStore(store)
    return store
  },
  saveBusinessProposal: (proposal: BusinessProposal) => {
    const store = readStore()
    store.business_proposals.unshift(proposal)
    writeStore(store)
    return store
  },
}
