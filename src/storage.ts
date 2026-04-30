import { seedStore } from './seed'
import type {
  BlueWhaleStore,
  BusinessProposal,
  CreatorApplication,
  CreatorSocialAccount,
  OfferPreference,
  OperatorTask,
  OutreachStatus,
} from './types'

const STORAGE_KEY = 'blue-whale-yc-validation-store-v1'

const cloneStore = (store: BlueWhaleStore): BlueWhaleStore => JSON.parse(JSON.stringify(store)) as BlueWhaleStore

const withDefaults = (store: BlueWhaleStore): BlueWhaleStore => ({
  ...store,
  operator_tasks: store.operator_tasks ?? [],
  creator_offer_preferences: (store.creator_offer_preferences ?? []).map((preference) => ({
    ...preference,
    outreach_status: preference.outreach_status ?? 'interest_saved',
  })),
})

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
    return withDefaults(JSON.parse(raw) as BlueWhaleStore)
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

const makeTask = (
  type: OperatorTask['type'],
  creatorApplicationId: string,
  businessOfferId: string,
  notes?: string,
  businessProposalId?: string,
): OperatorTask => {
  const timestamp = nowIso()
  return {
    id: createId('task'),
    type,
    creator_application_id: creatorApplicationId,
    business_offer_id: businessOfferId,
    business_proposal_id: businessProposalId,
    status: 'open',
    notes,
    created_at: timestamp,
    updated_at: timestamp,
  }
}

const ensureTask = (
  store: BlueWhaleStore,
  type: OperatorTask['type'],
  creatorApplicationId: string,
  businessOfferId: string,
  notes?: string,
  businessProposalId?: string,
) => {
  const existing = store.operator_tasks.find(
    (task) =>
      task.type === type &&
      task.creator_application_id === creatorApplicationId &&
      task.business_offer_id === businessOfferId &&
      (!businessProposalId || task.business_proposal_id === businessProposalId),
  )

  if (existing) {
    existing.status = existing.status === 'done' ? 'done' : 'open'
    existing.notes = notes ?? existing.notes
    existing.updated_at = nowIso()
    return
  }

  store.operator_tasks.unshift(makeTask(type, creatorApplicationId, businessOfferId, notes, businessProposalId))
}

export const repository = {
  getStore: readStore,
  resetDemoData: () => {
    const seeded = cloneStore(seedStore)
    writeStore(seeded)
    return seeded
  },
  saveCreatorApplication: (application: CreatorApplication, accounts: CreatorSocialAccount[]) => {
    const store = readStore()
    store.creator_applications.unshift(application)
    store.creator_social_accounts.unshift(...accounts)
    const firstOffer = store.business_offers.find((offer) => offer.location === application.destination)
    ensureTask(store, 'review_creator', application.id, firstOffer?.id ?? 'no-offer-yet', 'New creator application ready for Blue Whale review.')
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
      existing.outreach_status = preference === 'interested' ? existing.outreach_status : 'not_available'
      existing.updated_at = timestamp
    } else {
      store.creator_offer_preferences.unshift({
        id: createId('pref'),
        creator_application_id: creatorApplicationId,
        business_offer_id: businessOfferId,
        preference,
        outreach_status: preference === 'interested' ? 'interest_saved' : 'not_available',
        created_at: timestamp,
        updated_at: timestamp,
      })
    }

    if (preference === 'interested') {
      ensureTask(store, 'contact_business', creatorApplicationId, businessOfferId, 'Creator marked this offer as interested.')
    }

    writeStore(store)
    return store
  },
  updatePreferenceStatus: (
    creatorApplicationId: string,
    businessOfferId: string,
    outreachStatus: OutreachStatus,
    operatorNotes?: string,
  ) => {
    const store = readStore()
    const timestamp = nowIso()
    const preference = store.creator_offer_preferences.find(
      (item) => item.creator_application_id === creatorApplicationId && item.business_offer_id === businessOfferId,
    )

    if (preference) {
      preference.outreach_status = outreachStatus
      preference.operator_notes = operatorNotes ?? preference.operator_notes
      preference.updated_at = timestamp
    }

    const task = store.operator_tasks.find(
      (item) => item.creator_application_id === creatorApplicationId && item.business_offer_id === businessOfferId && item.type === 'contact_business',
    )
    if (task) {
      task.status = outreachStatus === 'proposal_received' || outreachStatus === 'confirmed' || outreachStatus === 'not_available' ? 'done' : 'in_progress'
      task.notes = operatorNotes ?? task.notes
      task.updated_at = timestamp
    }

    writeStore(store)
    return store
  },
  updateOperatorNotes: (preferenceId: string, notes: string) => {
    const store = readStore()
    const preference = store.creator_offer_preferences.find((item) => item.id === preferenceId)
    if (preference) {
      preference.operator_notes = notes
      preference.updated_at = nowIso()
    }
    writeStore(store)
    return store
  },
  saveBusinessProposal: (proposal: BusinessProposal) => {
    const store = readStore()
    store.business_proposals.unshift(proposal)
    const preference = store.creator_offer_preferences.find(
      (item) => item.creator_application_id === proposal.creator_application_id && item.business_offer_id === proposal.business_offer_id,
    )
    if (preference) {
      preference.outreach_status = 'proposal_received'
      preference.updated_at = nowIso()
    }
    ensureTask(
      store,
      'deliver_proposal',
      proposal.creator_application_id,
      proposal.business_offer_id,
      'Proposal entered by Blue Whale operator.',
      proposal.id,
    )
    writeStore(store)
    return store
  },
}
