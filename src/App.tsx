import { type FormEvent, type ReactNode, useMemo, useState } from 'react'
import {
  ArrowLeft,
  ArrowRight,
  BriefcaseBusiness,
  Check,
  ClipboardList,
  ExternalLink,
  Eye,
  MessageSquarePlus,
  RefreshCw,
  Send,
  Sparkles,
  X,
} from 'lucide-react'
import './App.css'
import { getBusinessBundle, getCreatorBundle, getInterestedCreatorsForOffer, getMarketOffers } from './matching'
import { parseSocialProfile, type ParsedSocialAccount } from './social'
import { createId, nowIso, repository } from './storage'
import {
  CATEGORIES,
  DESTINATIONS,
  type BusinessOffer,
  type BusinessProposal,
  type ContactPreference,
  type CreatorApplication,
  type CreatorOfferPreference,
  type CreatorSocialAccount,
  type Destination,
  type OfferPreference,
  type OutreachStatus,
} from './types'

type View = 'home' | 'creator-flow' | 'creator-market' | 'creator-check' | 'business-home' | 'business-check' | 'operator' | 'proposal-flow'

type CreatorDraft = {
  destination?: Destination
  startDate: string
  endDate: string
  socialAccounts: ParsedSocialAccount[]
  contactInstagram: string
  contactEmail: string
  contactPhone: string
  nickname: string
  password: string
}

type ProposalDraft = {
  title: string
  provideDetails: string
  proposalMessage: string
  includedItems: string
  excludedItems: string
  requestedContent: string
  availableDates: string
  uploadDeadline: string
  contactPreference: ContactPreference
}

const creatorSteps = ['Destination', 'Dates', 'Social', 'Contact', 'Login']

const emptyCreatorDraft = (): CreatorDraft => ({
  startDate: '',
  endDate: '',
  socialAccounts: [],
  contactInstagram: '',
  contactEmail: '',
  contactPhone: '',
  nickname: '',
  password: '',
})

const emptyProposalDraft = (): ProposalDraft => ({
  title: '',
  provideDetails: '',
  proposalMessage: '',
  includedItems: '',
  excludedItems: '',
  requestedContent: '',
  availableDates: '',
  uploadDeadline: '',
  contactPreference: 'blue_whale',
})

const trimOptional = (value: string) => value.trim() || undefined
const passwordValid = (value: string) => value.length >= 4 && value.length <= 12

const outreachLabels: Record<OutreachStatus, string> = {
  interest_saved: 'Interest saved',
  blue_whale_reviewing: 'Blue Whale reviewing',
  business_contacted: 'Business contacted',
  business_replied: 'Business replied',
  proposal_received: 'Proposal received',
  not_available: 'Not available',
  confirmed: 'Confirmed',
}

const offerStatusLabel = (offer: BusinessOffer) => {
  if (offer.availability_status === 'partner_confirmed') return 'Partner confirmed'
  if (offer.source_type === 'reference') return 'Blue Whale review'
  return 'Available to request'
}

function App() {
  const [store, setStore] = useState(repository.getStore)
  const [view, setView] = useState<View>('home')
  const [creatorStep, setCreatorStep] = useState(0)
  const [creatorDraft, setCreatorDraft] = useState<CreatorDraft>(emptyCreatorDraft)
  const [lastCreatorId, setLastCreatorId] = useState<string | null>(null)
  const [lookupCreator, setLookupCreator] = useState({ nickname: '', password: '', error: '', id: '' })
  const [lookupBusiness, setLookupBusiness] = useState({ loginId: '', password: '', error: '', id: '' })
  const [selectedProposal, setSelectedProposal] = useState<{ offerId: string; creatorId: string } | null>(null)
  const [proposalDraft, setProposalDraft] = useState<ProposalDraft>(emptyProposalDraft)
  const [formError, setFormError] = useState('')
  const [socialInput, setSocialInput] = useState('')

  const showHome = () => {
    setFormError('')
    setView('home')
  }

  const resetDemoData = () => {
    setStore(repository.resetDemoData())
    setCreatorDraft(emptyCreatorDraft())
    setLookupCreator({ nickname: '', password: '', error: '', id: '' })
    setLookupBusiness({ loginId: '', password: '', error: '', id: '' })
    setLastCreatorId(null)
    setSelectedProposal(null)
    setProposalDraft(emptyProposalDraft())
    setFormError('')
    setView('home')
  }

  const startCreatorFlow = () => {
    setCreatorDraft(emptyCreatorDraft())
    setSocialInput('')
    setCreatorStep(0)
    setFormError('')
    setView('creator-flow')
  }

  const addSocialAccount = () => {
    const parsed = parseSocialProfile(socialInput)
    if (!parsed) {
      setFormError('Paste a valid Instagram, TikTok, YouTube, or Naver Blog profile link.')
      return
    }

    setCreatorDraft((draft) => ({
      ...draft,
      socialAccounts: draft.socialAccounts.some((account) => account.profile_url === parsed.profile_url)
        ? draft.socialAccounts
        : [...draft.socialAccounts, parsed],
    }))
    setSocialInput('')
    setFormError('')
  }

  const validateCreatorStep = (step = creatorStep) => {
    if (step === 0 && !creatorDraft.destination) return 'Choose your destination.'
    if (step === 1 && (!creatorDraft.startDate || !creatorDraft.endDate)) return 'Add both start and end dates.'
    if (step === 1 && creatorDraft.endDate < creatorDraft.startDate) return 'End date must be after the start date.'
    if (step === 2 && creatorDraft.socialAccounts.length === 0) return 'Add at least one valid social profile link.'
    if (step === 4 && !creatorDraft.nickname.trim()) return 'Create a nickname.'
    if (step === 4 && !passwordValid(creatorDraft.password)) return 'Password must be 4-12 characters.'
    return ''
  }

  const nextCreatorStep = () => {
    const error = validateCreatorStep()
    if (error) {
      setFormError(error)
      return
    }
    setFormError('')
    setCreatorStep((step) => Math.min(step + 1, creatorSteps.length - 1))
  }

  const previousCreatorStep = () => {
    setFormError('')
    if (creatorStep === 0) {
      showHome()
      return
    }
    setCreatorStep((step) => step - 1)
  }

  const submitCreatorApplication = () => {
    const error = validateCreatorStep(4)
    if (error || !creatorDraft.destination) {
      setFormError(error || 'Choose your destination.')
      return
    }

    const timestamp = nowIso()
    const applicationId = createId('creator')
    const application: CreatorApplication = {
      id: applicationId,
      nickname: creatorDraft.nickname.trim(),
      password: creatorDraft.password,
      destination: creatorDraft.destination,
      start_date: creatorDraft.startDate,
      end_date: creatorDraft.endDate,
      contact_instagram: trimOptional(creatorDraft.contactInstagram),
      contact_email: trimOptional(creatorDraft.contactEmail),
      contact_phone: trimOptional(creatorDraft.contactPhone),
      status: 'new',
      created_at: timestamp,
      updated_at: timestamp,
    }
    const accounts: CreatorSocialAccount[] = creatorDraft.socialAccounts.map((account) => ({
      ...account,
      id: createId('social'),
      creator_application_id: applicationId,
      created_at: timestamp,
    }))

    setStore(repository.saveCreatorApplication(application, accounts))
    setLastCreatorId(applicationId)
    setView('creator-market')
  }

  const updateCreatorInterest = (creatorId: string, offerId: string, preference: OfferPreference) => {
    setStore(repository.upsertCreatorOfferPreference(creatorId, offerId, preference))
  }

  const updateOutreachStatus = (creatorId: string, offerId: string, status: OutreachStatus, notes?: string) => {
    setStore(repository.updatePreferenceStatus(creatorId, offerId, status, notes))
  }

  const updateOperatorNotes = (preferenceId: string, notes: string) => {
    setStore(repository.updateOperatorNotes(preferenceId, notes))
  }

  const handleCreatorLookup = (event: FormEvent) => {
    event.preventDefault()
    const match = store.creator_applications.find(
      (application) =>
        application.nickname.toLowerCase() === lookupCreator.nickname.trim().toLowerCase() &&
        application.password === lookupCreator.password,
    )

    setLookupCreator((lookup) => ({
      ...lookup,
      id: match?.id ?? '',
      error: match ? '' : 'No application matched that nickname and password.',
    }))
  }

  const handleBusinessLookup = (event: FormEvent) => {
    event.preventDefault()
    const match = store.business_offers.find(
      (offer) => offer.login_id.toLowerCase() === lookupBusiness.loginId.trim().toLowerCase() && offer.password === lookupBusiness.password,
    )

    setLookupBusiness((lookup) => ({
      ...lookup,
      id: match?.id ?? '',
      error: match ? '' : 'No offer matched that ID and password.',
    }))
  }

  const beginProposal = (offerId: string, creatorId: string) => {
    setSelectedProposal({ offerId, creatorId })
    setProposalDraft(emptyProposalDraft())
    setFormError('')
    setView('proposal-flow')
  }

  const submitProposal = () => {
    if (!selectedProposal) {
      setView('operator')
      return
    }
    if (!proposalDraft.provideDetails.trim() || !proposalDraft.proposalMessage.trim()) {
      setFormError('What the business will provide and the proposal message are required.')
      return
    }

    const timestamp = nowIso()
    const proposal: BusinessProposal = {
      id: createId('proposal'),
      business_offer_id: selectedProposal.offerId,
      creator_application_id: selectedProposal.creatorId,
      title: trimOptional(proposalDraft.title),
      provide_details: proposalDraft.provideDetails.trim(),
      proposal_message: proposalDraft.proposalMessage.trim(),
      included_items: trimOptional(proposalDraft.includedItems),
      excluded_items: trimOptional(proposalDraft.excludedItems),
      requested_content: trimOptional(proposalDraft.requestedContent),
      available_dates: trimOptional(proposalDraft.availableDates),
      upload_deadline: trimOptional(proposalDraft.uploadDeadline),
      contact_preference: proposalDraft.contactPreference,
      status: 'proposal_received',
      created_at: timestamp,
      updated_at: timestamp,
    }

    setStore(repository.saveBusinessProposal(proposal))
    setSelectedProposal(null)
    setProposalDraft(emptyProposalDraft())
    setView('operator')
  }

  if (view === 'creator-flow') {
    return (
      <FlowShell step={creatorStep} steps={creatorSteps} error={formError} onBack={previousCreatorStep} onHome={showHome}>
        <CreatorStep
          step={creatorStep}
          draft={creatorDraft}
          socialInput={socialInput}
          setSocialInput={setSocialInput}
          setDraft={setCreatorDraft}
          addSocialAccount={addSocialAccount}
          onNext={nextCreatorStep}
          onSubmit={submitCreatorApplication}
        />
      </FlowShell>
    )
  }

  if (view === 'creator-market' && lastCreatorId) {
    return <CreatorMarket store={store} creatorId={lastCreatorId} onHome={showHome} onInterest={updateCreatorInterest} />
  }

  if (view === 'creator-check') {
    const bundle = lookupCreator.id ? getCreatorBundle(store, lookupCreator.id) : null
    return (
      <LookupLayout title="Check My Application" helper="Use the nickname and password you created after applying." onHome={showHome} aside={<DemoCredentials type="creator" />}>
        <form className="lookup-form" onSubmit={handleCreatorLookup}>
          <TextInput label="Nickname" value={lookupCreator.nickname} onChange={(nickname) => setLookupCreator((lookup) => ({ ...lookup, nickname }))} />
          <TextInput label="Password" type="password" value={lookupCreator.password} onChange={(password) => setLookupCreator((lookup) => ({ ...lookup, password }))} />
          {lookupCreator.error && <p className="error">{lookupCreator.error}</p>}
          <button className="primary-button" type="submit">
            <Eye size={18} />
            View Application
          </button>
        </form>
        {bundle?.application && (
          <>
            <button
              className="secondary-button"
              type="button"
              onClick={() => {
                setLastCreatorId(bundle.application!.id)
                setView('creator-market')
              }}
            >
              <Sparkles size={18} />
              Browse Sponsorship Market
            </button>
            <CreatorSummary store={store} creatorId={bundle.application.id} />
          </>
        )}
      </LookupLayout>
    )
  }

  if (view === 'business-home') {
    return (
      <BusinessHome
        onHome={showHome}
        onCheck={() => {
          setLookupBusiness({ loginId: '', password: '', error: '', id: '' })
          setView('business-check')
        }}
        onOperator={() => setView('operator')}
      />
    )
  }

  if (view === 'business-check') {
    const offer = lookupBusiness.id ? store.business_offers.find((item) => item.id === lookupBusiness.id) : null
    return (
      <LookupLayout title="Check My Offer" helper="Business self-serve is intentionally light in this MVP. Seeded partners can check lead demand here." onHome={() => setView('business-home')} aside={<DemoCredentials type="business" />}>
        <form className="lookup-form" onSubmit={handleBusinessLookup}>
          <TextInput label="Login ID" value={lookupBusiness.loginId} onChange={(loginId) => setLookupBusiness((lookup) => ({ ...lookup, loginId }))} />
          <TextInput label="Password" type="password" value={lookupBusiness.password} onChange={(password) => setLookupBusiness((lookup) => ({ ...lookup, password }))} />
          {lookupBusiness.error && <p className="error">{lookupBusiness.error}</p>}
          <button className="primary-button" type="submit">
            <Eye size={18} />
            View Offer
          </button>
        </form>
        {offer && <BusinessSummary offer={offer} store={store} />}
      </LookupLayout>
    )
  }

  if (view === 'operator') {
    return (
      <OperatorView
        store={store}
        onHome={showHome}
        onStatus={updateOutreachStatus}
        onNotes={updateOperatorNotes}
        onProposal={beginProposal}
      />
    )
  }

  if (view === 'proposal-flow') {
    const creator = selectedProposal ? store.creator_applications.find((item) => item.id === selectedProposal.creatorId) : undefined
    const offer = selectedProposal ? store.business_offers.find((item) => item.id === selectedProposal.offerId) : undefined
    return (
      <FlowShell step={0} steps={['Proposal']} error={formError} onBack={() => setView('operator')} onHome={showHome}>
        <section className="step-panel">
          <p className="eyebrow">Proposal entry</p>
          <h1>Create a proposal through Blue Whale.</h1>
          <p className="helper">
            {offer?.business_name ?? 'This business'} can respond to {creator?.nickname ?? 'this creator'} without direct chat. The proposal appears in the creator status page.
          </p>
          <div className="form-grid">
            <TextInput label="Proposal title (optional)" value={proposalDraft.title} onChange={(title) => setProposalDraft((draft) => ({ ...draft, title }))} />
            <TextArea label="What business will provide" value={proposalDraft.provideDetails} onChange={(provideDetails) => setProposalDraft((draft) => ({ ...draft, provideDetails }))} />
            <TextArea label="Proposal message" value={proposalDraft.proposalMessage} onChange={(proposalMessage) => setProposalDraft((draft) => ({ ...draft, proposalMessage }))} />
            <TextInput label="Included items (optional)" value={proposalDraft.includedItems} onChange={(includedItems) => setProposalDraft((draft) => ({ ...draft, includedItems }))} />
            <TextInput label="Excluded items (optional)" value={proposalDraft.excludedItems} onChange={(excludedItems) => setProposalDraft((draft) => ({ ...draft, excludedItems }))} />
            <TextInput label="Requested content (optional)" value={proposalDraft.requestedContent} onChange={(requestedContent) => setProposalDraft((draft) => ({ ...draft, requestedContent }))} />
            <TextInput label="Available dates (optional)" value={proposalDraft.availableDates} onChange={(availableDates) => setProposalDraft((draft) => ({ ...draft, availableDates }))} />
            <TextInput label="Upload deadline (optional)" value={proposalDraft.uploadDeadline} onChange={(uploadDeadline) => setProposalDraft((draft) => ({ ...draft, uploadDeadline }))} />
          </div>
          <Segmented
            options={[
              { label: 'Send through Blue Whale', value: 'blue_whale' },
              { label: 'Direct contact ok', value: 'direct_ok' },
            ]}
            value={proposalDraft.contactPreference}
            onChange={(contactPreference) => setProposalDraft((draft) => ({ ...draft, contactPreference }))}
          />
          <button className="primary-button" type="button" onClick={submitProposal}>
            <Send size={18} />
            Save Proposal
          </button>
        </section>
      </FlowShell>
    )
  }

  return (
    <main className="home">
      <TopBar
        right={
          <>
            <button
              className="ghost-button"
              type="button"
              onClick={() => {
                setLookupCreator({ nickname: '', password: '', error: '', id: '' })
                setView('creator-check')
              }}
            >
              <Eye size={18} />
              Check My Application
            </button>
          </>
        }
      />
      <section className="hero-section">
        <div className="hero-copy">
          <p className="eyebrow">Blue Whale MVP</p>
          <h1>Going to Jeju soon? Browse sponsorship offers before your trip.</h1>
          <p className="subtitle">
            Tell Blue Whale your travel dates and social profile. Then browse hotels, rental cars, local food, beauty services, activities, and travel essentials you can request.
          </p>
          <button className="primary-button large" type="button" onClick={startCreatorFlow}>
            <Sparkles size={20} />
            Browse Sponsorships for My Trip
          </button>
          <p className="promise">Businesses send proposals first through Blue Whale. Interest is reviewed, not guaranteed.</p>
        </div>
      </section>
      <section className="entry-strip">
        <button className="secondary-button" type="button" onClick={() => setView('business-home')}>
          <BriefcaseBusiness size={18} />
          For Businesses
        </button>
        <button className="ghost-button" type="button" onClick={() => setView('operator')}>
          <ClipboardList size={18} />
          Operator View
        </button>
        <button className="ghost-button" type="button" onClick={resetDemoData}>
          <RefreshCw size={18} />
          Reset Demo Data
        </button>
      </section>
      <section className="offer-showcase" aria-label="Available sponsorship examples">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Available to request</p>
            <h2>Browse real-looking offer types without implying a guaranteed sponsorship.</h2>
          </div>
          <p className="helper small">Blue Whale will ask the business to review your trip when you mark an offer as interested.</p>
        </div>
        <div className="showcase-grid">
          <ShowcaseCard image="https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?auto=format&fit=crop&w=1200&q=80" kicker="Jeju stay" title="Ocean-view stays and villas" large />
          <ShowcaseCard image="https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&w=900&q=80" kicker="Rental car" title="Contactless Jeju car support" />
          <ShowcaseCard image="https://commons.wikimedia.org/wiki/Special:FilePath/Jeju_gogi_noodle.jpg?width=900" kicker="Local food" title="Jeju gogi-guksu and restaurants" />
          <ShowcaseCard image="https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?auto=format&fit=crop&w=900&q=80" kicker="K-beauty" title="Beauty studios and clinics" />
          <ShowcaseCard image="https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=900&q=80" kicker="Travel essentials" title="eSIM and connectivity packs" />
          <ShowcaseCard image="https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=900&q=80" kicker="Activity" title="Photo shoots and island routes" />
        </div>
      </section>
    </main>
  )
}

function CreatorStep({
  step,
  draft,
  socialInput,
  setSocialInput,
  setDraft,
  addSocialAccount,
  onNext,
  onSubmit,
}: {
  step: number
  draft: CreatorDraft
  socialInput: string
  setSocialInput: (value: string) => void
  setDraft: React.Dispatch<React.SetStateAction<CreatorDraft>>
  addSocialAccount: () => void
  onNext: () => void
  onSubmit: () => void
}) {
  if (step === 0) {
    return (
      <StepPanel title="Where are you traveling?">
        <OptionGrid values={DESTINATIONS} selected={draft.destination ? [draft.destination] : []} onToggle={(destination) => setDraft((item) => ({ ...item, destination }))} />
        <NextButton label="Continue" onClick={onNext} />
      </StepPanel>
    )
  }

  if (step === 1) {
    return (
      <StepPanel title="When is your trip?">
        <div className="two-column">
          <TextInput label="Start date" type="date" value={draft.startDate} onChange={(startDate) => setDraft((item) => ({ ...item, startDate }))} />
          <TextInput label="End date" type="date" value={draft.endDate} onChange={(endDate) => setDraft((item) => ({ ...item, endDate }))} />
        </div>
        <NextButton label="Continue" onClick={onNext} />
      </StepPanel>
    )
  }

  if (step === 2) {
    return (
      <StepPanel
        title="Add the social profile you want Blue Whale to review."
        helper="You don’t need to enter followers or views. Blue Whale will review your profile link."
      >
        <div className="inline-form">
          <TextInput label="Social profile link" value={socialInput} onChange={setSocialInput} placeholder="https://instagram.com/yourhandle" />
          <button className="secondary-button inline-button" type="button" onClick={addSocialAccount}>
            <Sparkles size={18} />
            Add Profile
          </button>
        </div>
        <p className="helper small">Supported: Instagram, TikTok, YouTube handle/channel, and Naver Blog.</p>
        <AccountList accounts={draft.socialAccounts} onRemove={(url) => setDraft((item) => ({ ...item, socialAccounts: item.socialAccounts.filter((account) => account.profile_url !== url) }))} />
        <NextButton label="Continue" onClick={onNext} />
      </StepPanel>
    )
  }

  if (step === 3) {
    return (
      <StepPanel title="Where should Blue Whale contact you?" helper="Optional, but recommended. Businesses won’t contact you directly by default.">
        <div className="form-grid">
          <TextInput label="Instagram DM (optional)" value={draft.contactInstagram} onChange={(contactInstagram) => setDraft((item) => ({ ...item, contactInstagram }))} />
          <TextInput label="Email (optional)" value={draft.contactEmail} onChange={(contactEmail) => setDraft((item) => ({ ...item, contactEmail }))} />
          <TextInput label="Phone / KakaoTalk (optional)" value={draft.contactPhone} onChange={(contactPhone) => setDraft((item) => ({ ...item, contactPhone }))} />
        </div>
        <NextButton label="Continue" onClick={onNext} />
      </StepPanel>
    )
  }

  return (
    <StepPanel title="Create login info to check your application later.">
      <div className="form-grid">
        <TextInput label="Nickname" value={draft.nickname} onChange={(nickname) => setDraft((item) => ({ ...item, nickname }))} />
        <TextInput label="Password" type="password" value={draft.password} onChange={(password) => setDraft((item) => ({ ...item, password }))} />
      </div>
      <p className="helper small">Password must be 4-12 characters. This is mock lookup for the MVP, not full auth.</p>
      <button className="primary-button" type="button" onClick={onSubmit}>
        <Send size={18} />
        Open Sponsorship Market
      </button>
    </StepPanel>
  )
}

function CreatorMarket({
  store,
  creatorId,
  onHome,
  onInterest,
}: {
  store: ReturnType<typeof repository.getStore>
  creatorId: string
  onHome: () => void
  onInterest: (creatorId: string, offerId: string, preference: OfferPreference) => void
}) {
  const [category, setCategory] = useState<(typeof CATEGORIES)[number] | 'All'>('All')
  const creator = store.creator_applications.find((item) => item.id === creatorId)
  const offers = useMemo(() => (creator ? getMarketOffers(store, creator) : []), [creator, store])
  const preferences = new Map(
    store.creator_offer_preferences
      .filter((preference) => preference.creator_application_id === creatorId)
      .map((preference) => [preference.business_offer_id, preference]),
  )
  const visibleOffers = category === 'All' ? offers : offers.filter((offer) => offer.category === category)
  const interestedCount = [...preferences.values()].filter((preference) => preference.preference === 'interested').length

  if (!creator) {
    return (
      <SimplePage onHome={onHome}>
        <EmptyState title="Application not found" detail="Return home and check your application again." />
      </SimplePage>
    )
  }

  return (
    <main className="market-page">
      <HeaderBack onHome={onHome} />
      <section className="market-hero">
        <div>
          <p className="eyebrow">Application saved</p>
          <h1>{creator.destination} sponsorship market is open.</h1>
          <p className="helper">
            Browse offers available around your trip. When you mark an offer as interested, Blue Whale will ask that business to review your trip. If they’re interested, they send a proposal first through Blue Whale.
          </p>
        </div>
        <div className="market-summary">
          <SummaryItem label="Trip" value={`${creator.start_date} to ${creator.end_date}`} />
          <SummaryItem label="Interested offers" value={`${interestedCount}`} />
          <SummaryItem label="Business contact" value="Blue Whale first" />
        </div>
      </section>
      <section className="market-toolbar" aria-label="Sponsorship market filters">
        <button className={`filter-chip ${category === 'All' ? 'active' : ''}`} type="button" onClick={() => setCategory('All')}>
          All offers <span>{offers.length}</span>
        </button>
        {CATEGORIES.map((item) => {
          const count = offers.filter((offer) => offer.category === item).length
          return count ? (
            <button key={item} className={`filter-chip ${category === item ? 'active' : ''}`} type="button" onClick={() => setCategory(item)}>
              {item} <span>{count}</span>
            </button>
          ) : null
        })}
      </section>
      <section className="market-results">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Open sponsorships</p>
            <h2>{visibleOffers.length} offers in {creator.destination}</h2>
          </div>
          <p className="helper small">Only businesses you mark as interested should conceptually review your trip and social links.</p>
        </div>
        {visibleOffers.length ? (
          <div className="card-grid">
            {visibleOffers.map((offer) => (
              <OfferCard
                key={offer.id}
                offer={offer}
                preference={preferences.get(offer.id)}
                onPreference={(preference) => onInterest(creator.id, offer.id, preference)}
              />
            ))}
          </div>
        ) : (
          <EmptyState title="No offers here yet" detail="Try another category or destination after Blue Whale seeds more options." />
        )}
      </section>
    </main>
  )
}

function OperatorView({
  store,
  onHome,
  onStatus,
  onNotes,
  onProposal,
}: {
  store: ReturnType<typeof repository.getStore>
  onHome: () => void
  onStatus: (creatorId: string, offerId: string, status: OutreachStatus, notes?: string) => void
  onNotes: (preferenceId: string, notes: string) => void
  onProposal: (offerId: string, creatorId: string) => void
}) {
  const [noteDrafts, setNoteDrafts] = useState<Record<string, string>>({})
  const newLeads = store.creator_applications
  const queue = store.creator_offer_preferences.filter((preference) => preference.preference === 'interested')

  return (
    <main className="operator-page">
      <HeaderBack onHome={onHome} />
      <section className="operator-hero">
        <p className="eyebrow">Blue Whale internal</p>
        <h1>Operator View</h1>
        <p className="helper">Concierge queue for validating whether local businesses respond to warm creator intent.</p>
      </section>
      <section className="operator-section">
        <div className="section-heading">
          <div>
            <p className="eyebrow">New Creator Leads</p>
            <h2>{newLeads.length} applications</h2>
          </div>
        </div>
        <div className="dense-grid">
          {newLeads.map((creator) => {
            const social = store.creator_social_accounts.filter((account) => account.creator_application_id === creator.id)
            const interests = store.creator_offer_preferences.filter((preference) => preference.creator_application_id === creator.id && preference.preference === 'interested')
            return (
              <article className="data-card dense" key={creator.id}>
                <div className="card-header">
                  <div>
                    <p className="eyebrow">{creator.destination} · {creator.start_date} to {creator.end_date}</p>
                    <h2>{creator.nickname}</h2>
                  </div>
                  <span className="pill">{interests.length} interests</span>
                </div>
                <p>{social.map((account) => `${account.platform}: @${account.handle}`).join(' · ') || 'No social profile'}</p>
                <p className="muted">{[creator.contact_instagram, creator.contact_email, creator.contact_phone].filter(Boolean).join(' · ') || 'No optional contact'}</p>
              </article>
            )
          })}
        </div>
      </section>
      <section className="operator-section">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Offer Interest Queue</p>
            <h2>{queue.length} warm creator intents</h2>
          </div>
          <p className="helper small">Update status as Blue Whale reviews creators and contacts businesses.</p>
        </div>
        {queue.length ? (
          <div className="queue-list">
            {queue.map((preference) => {
              const creator = store.creator_applications.find((item) => item.id === preference.creator_application_id)
              const offer = store.business_offers.find((item) => item.id === preference.business_offer_id)
              const social = store.creator_social_accounts.filter((account) => account.creator_application_id === preference.creator_application_id)
              const notes = noteDrafts[preference.id] ?? preference.operator_notes ?? ''
              if (!creator || !offer) return null

              return (
                <article className="queue-card" key={preference.id}>
                  <div>
                    <p className="eyebrow">{offer.category} · {outreachLabels[preference.outreach_status]}</p>
                    <h2>{offer.business_name}</h2>
                    <p>
                      {creator.nickname} · {creator.destination} · {creator.start_date} to {creator.end_date}
                    </p>
                    <p className="muted">{social.map((account) => `${account.platform}: ${account.profile_url}`).join(' · ')}</p>
                  </div>
                  <TextArea label="Operator notes" value={notes} onChange={(value) => setNoteDrafts((drafts) => ({ ...drafts, [preference.id]: value }))} />
                  <div className="button-row">
                    <button className="secondary-button" type="button" onClick={() => onNotes(preference.id, notes)}>
                      Save Notes
                    </button>
                    <StatusButton label="Mark Blue Whale Reviewing" status="blue_whale_reviewing" creator={creator} offer={offer} notes={notes} onStatus={onStatus} />
                    <StatusButton label="Mark Business Contacted" status="business_contacted" creator={creator} offer={offer} notes={notes} onStatus={onStatus} />
                    <StatusButton label="Mark Business Replied" status="business_replied" creator={creator} offer={offer} notes={notes} onStatus={onStatus} />
                    <StatusButton label="Mark Not Interested" status="not_available" creator={creator} offer={offer} notes={notes} onStatus={onStatus} />
                    <button className="primary-button" type="button" onClick={() => onProposal(offer.id, creator.id)}>
                      <MessageSquarePlus size={18} />
                      Create Proposal
                    </button>
                  </div>
                </article>
              )
            })}
          </div>
        ) : (
          <EmptyState title="No warm interests yet" detail="When a creator marks an offer as interested, it appears here for concierge outreach." />
        )}
      </section>
    </main>
  )
}

function StatusButton({
  label,
  status,
  creator,
  offer,
  notes,
  onStatus,
}: {
  label: string
  status: OutreachStatus
  creator: CreatorApplication
  offer: BusinessOffer
  notes: string
  onStatus: (creatorId: string, offerId: string, status: OutreachStatus, notes?: string) => void
}) {
  return (
    <button className="secondary-button" type="button" onClick={() => onStatus(creator.id, offer.id, status, notes)}>
      {label}
    </button>
  )
}

function CreatorSummary({ store, creatorId }: { store: ReturnType<typeof repository.getStore>; creatorId: string }) {
  const bundle = getCreatorBundle(store, creatorId)
  const creator = bundle.application

  if (!creator) return <EmptyState title="Application not found" detail="Try returning to the home page and checking again." />

  const interested = bundle.preferences.filter((preference) => preference.preference === 'interested')

  return (
    <section className="summary-block">
      <p className="eyebrow">Application status</p>
      <h1>Your trip and offer updates</h1>
      <div className="summary-grid">
        <SummaryItem label="Trip" value={`${creator.destination} · ${creator.start_date} to ${creator.end_date}`} />
        <SummaryItem label="Social links" value={`${bundle.socialAccounts.length}`} />
        <SummaryItem label="Interested offers" value={`${interested.length}`} />
        <SummaryItem label="Blue Whale contact" value={[creator.contact_instagram, creator.contact_email, creator.contact_phone].filter(Boolean).join(', ') || 'Not provided'} />
      </div>
      <h2>Social links</h2>
      <div className="mini-list">
        {bundle.socialAccounts.map((account) => (
          <div key={account.id} className="mini-item">
            <span>
              <strong>{account.platform}</strong> @{account.handle}
            </span>
            <a href={account.profile_url} target="_blank" rel="noreferrer">
              Open
            </a>
          </div>
        ))}
      </div>
      <h2>Interested offers</h2>
      {interested.length ? (
        <div className="mini-list">
          {interested.map((preference) => {
            const offer = store.business_offers.find((item) => item.id === preference.business_offer_id)
            return (
              <div className="mini-item stacked" key={preference.id}>
                <span>
                  <strong>{offer?.business_name ?? 'Offer'}</strong>
                  <small>{outreachLabels[preference.outreach_status]}</small>
                </span>
                <p>{offer?.sponsorship_details}</p>
              </div>
            )
          })}
        </div>
      ) : (
        <EmptyState title="No interested offers yet" detail="Browse the market and mark offers you want Blue Whale to review." />
      )}
      <h2>Received proposals</h2>
      {bundle.proposals.length ? (
        <div className="proposal-list">
          {bundle.proposals.map((proposal) => {
            const offer = store.business_offers.find((item) => item.id === proposal.business_offer_id)
            return (
              <article className="data-card" key={proposal.id}>
                <p className="eyebrow">{proposal.status.replaceAll('_', ' ')}</p>
                <h2>{proposal.title || offer?.business_name || 'Business proposal'}</h2>
                <p>{proposal.proposal_message}</p>
                <dl>
                  <div>
                    <dt>Business will provide</dt>
                    <dd>{proposal.provide_details}</dd>
                  </div>
                  {proposal.requested_content && (
                    <div>
                      <dt>Requested content</dt>
                      <dd>{proposal.requested_content}</dd>
                    </div>
                  )}
                  {proposal.available_dates && (
                    <div>
                      <dt>Available dates</dt>
                      <dd>{proposal.available_dates}</dd>
                    </div>
                  )}
                </dl>
              </article>
            )
          })}
        </div>
      ) : (
        <EmptyState title="No proposals yet" detail="When a business responds, Blue Whale will show the proposal here first." />
      )}
    </section>
  )
}

function BusinessHome({ onHome, onCheck, onOperator }: { onHome: () => void; onCheck: () => void; onOperator: () => void }) {
  return (
    <main className="home business-home">
      <TopBar
        right={
          <button className="ghost-button" type="button" onClick={onHome}>
            Creator Home
          </button>
        }
      />
      <section className="business-hero">
        <p className="eyebrow">For Businesses</p>
        <h1>See creators who are already visiting your area and interested in your offer.</h1>
        <p className="subtitle">Blue Whale is operating early business outreach concierge-style. Seeded businesses can check lead demand; Blue Whale coordinates proposals.</p>
        <div className="button-row centered">
          <button className="primary-button large" type="button" onClick={onCheck}>
            <BriefcaseBusiness size={20} />
            Check My Offer
          </button>
          <button className="secondary-button large" type="button" onClick={onOperator}>
            <ClipboardList size={20} />
            Operator View
          </button>
        </div>
      </section>
    </main>
  )
}

function BusinessSummary({ offer, store }: { offer?: BusinessOffer; store: ReturnType<typeof repository.getStore> }) {
  if (!offer) return <EmptyState title="Offer not found" detail="Try returning to the business home page and checking again." />

  const creators = getInterestedCreatorsForOffer(store, offer)
  const bundle = getBusinessBundle(store, offer.id)

  return (
    <section className="summary-block">
      <p className="eyebrow">{offerStatusLabel(offer)}</p>
      <h1>{offer.business_name}</h1>
      <p className="helper">{offer.short_description}</p>
      <div className="summary-grid">
        <SummaryItem label="Location" value={offer.location} />
        <SummaryItem label="Category" value={offer.category} />
        <SummaryItem label="Available sponsorship" value={offer.sponsorship_details} />
        <SummaryItem label="Warm creator leads" value={`${creators.length}`} />
      </div>
      <h2>Interested creators</h2>
      {creators.length ? (
        <div className="mini-list">
          {creators.map((creator) => {
            const social = store.creator_social_accounts.filter((account) => account.creator_application_id === creator.id)
            return (
              <div className="mini-item stacked" key={creator.id}>
                <span>
                  <strong>{creator.nickname}</strong>
                  <small>{creator.destination} · {creator.start_date} to {creator.end_date}</small>
                </span>
                <p>{social.map((account) => `${account.platform}: @${account.handle}`).join(' · ')}</p>
              </div>
            )
          })}
        </div>
      ) : (
        <EmptyState title="No interested creators yet" detail="When creators mark this offer as interested, Blue Whale will surface them here." />
      )}
      <h2>Proposals entered by Blue Whale</h2>
      {bundle.proposals.length ? (
        <div className="mini-list">
          {bundle.proposals.map((proposal) => (
            <div className="mini-item stacked" key={proposal.id}>
              <span>
                <strong>{proposal.title || 'Proposal'}</strong>
                <small>{proposal.status.replaceAll('_', ' ')}</small>
              </span>
              <p>{proposal.proposal_message}</p>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState title="No proposals yet" detail="Blue Whale operators can create proposals from the internal queue." />
      )}
    </section>
  )
}

function OfferCard({
  offer,
  preference,
  onPreference,
}: {
  offer: BusinessOffer
  preference?: CreatorOfferPreference
  onPreference: (preference: OfferPreference) => void
}) {
  const selected = preference?.preference

  return (
    <article className={`data-card offer-card ${selected === 'interested' ? 'highlight' : ''}`}>
      {offer.image_url && <img className="offer-image" src={offer.image_url} alt={`${offer.business_name} preview`} loading="lazy" />}
      <div className="card-header">
        <div>
          <p className="eyebrow">{offer.category}</p>
          <h2>{offer.business_name}</h2>
        </div>
        <span className="pill">{offerStatusLabel(offer)}</span>
      </div>
      <dl>
        <div>
          <dt>Location</dt>
          <dd>{offer.address || offer.location}</dd>
        </div>
        <div>
          <dt>Available sponsorship</dt>
          <dd>{offer.sponsorship_details}</dd>
        </div>
      </dl>
      <p>{offer.short_description}</p>
      {offer.reference_url && (
        <a className="reference-link" href={offer.reference_url} target="_blank" rel="noreferrer">
          {offer.reference_label || 'Reference/source'} <ExternalLink size={14} />
        </a>
      )}
      {selected === 'interested' && <p className="success-note">Interest saved. Blue Whale will review your trip and contact this business first.</p>}
      {selected === 'not_interested' && <p className="muted">Marked not for me.</p>}
      <div className="button-row">
        <button className={`secondary-button ${selected === 'interested' ? 'selected-button' : ''}`} type="button" onClick={() => onPreference('interested')}>
          <Check size={18} />
          I’m Interested
        </button>
        <button className={`ghost-button ${selected === 'not_interested' ? 'selected-button muted-button' : ''}`} type="button" onClick={() => onPreference('not_interested')}>
          <X size={18} />
          Not for Me
        </button>
      </div>
    </article>
  )
}

function FlowShell({
  step,
  steps,
  error,
  onBack,
  onHome,
  children,
}: {
  step: number
  steps: string[]
  error: string
  onBack: () => void
  onHome: () => void
  children: ReactNode
}) {
  return (
    <main className="flow-page">
      <header className="flow-header">
        <button className="ghost-button compact" type="button" onClick={onBack}>
          <ArrowLeft size={18} />
          Back
        </button>
        <button className="brand-button" type="button" onClick={onHome}>
          <span className="brand-mark">BW</span>
          Blue Whale
        </button>
      </header>
      <section className="flow-card">
        <div className="progress-meta">
          <span>Creator application</span>
          <span>
            Step {step + 1} of {steps.length}
          </span>
        </div>
        <div className="progress-track" aria-label="Creator application progress">
          {steps.map((label, index) => (
            <span key={label} className={index <= step ? 'active' : ''} />
          ))}
        </div>
        {error && <p className="error">{error}</p>}
        {children}
      </section>
    </main>
  )
}

function SimplePage({ onHome, children }: { onHome: () => void; children: ReactNode }) {
  return (
    <main className="flow-page">
      <HeaderBack onHome={onHome} />
      <section className="flow-card">{children}</section>
    </main>
  )
}

function LookupLayout({
  title,
  helper,
  onHome,
  aside,
  children,
}: {
  title: string
  helper: string
  onHome: () => void
  aside: ReactNode
  children: ReactNode
}) {
  return (
    <main className="flow-page">
      <HeaderBack onHome={onHome} />
      <section className="lookup-layout">
        <aside className="lookup-intro">
          <p className="eyebrow">Returning access</p>
          <h1>{title}</h1>
          <p className="helper">{helper}</p>
          {aside}
        </aside>
        <div className="lookup-results">{children}</div>
      </section>
    </main>
  )
}

function TopBar({ right }: { right: ReactNode }) {
  return (
    <header className="topbar">
      <button className="brand-button" type="button" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
        <span className="brand-mark">BW</span>
        Blue Whale
      </button>
      <div className="topbar-actions">{right}</div>
    </header>
  )
}

function HeaderBack({ onHome }: { onHome: () => void }) {
  return (
    <header className="flow-header">
      <button className="ghost-button compact" type="button" onClick={onHome}>
        <ArrowLeft size={18} />
        Home
      </button>
      <button className="brand-button" type="button" onClick={onHome}>
        <span className="brand-mark">BW</span>
        Blue Whale
      </button>
    </header>
  )
}

function StepPanel({ title, helper, children }: { title: string; helper?: string; children: ReactNode }) {
  return (
    <section className="step-panel">
      <h1>{title}</h1>
      {helper && <p className="helper">{helper}</p>}
      {children}
    </section>
  )
}

function NextButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button className="primary-button" type="button" onClick={onClick}>
      {label}
      <ArrowRight size={18} />
    </button>
  )
}

function OptionGrid<T extends string>({ values, selected, onToggle }: { values: readonly T[]; selected: T[]; onToggle: (value: T) => void }) {
  return (
    <div className="option-grid">
      {values.map((value) => (
        <button key={value} className={`option ${selected.includes(value) ? 'selected' : ''}`} type="button" onClick={() => onToggle(value)}>
          {selected.includes(value) && <Check size={18} />}
          <span>{value}</span>
        </button>
      ))}
    </div>
  )
}

function TextInput({
  label,
  value,
  onChange,
  type = 'text',
  placeholder,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  type?: string
  placeholder?: string
}) {
  return (
    <label className="field">
      <span>{label}</span>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        onInput={(event) => onChange(event.currentTarget.value)}
      />
    </label>
  )
}

function TextArea({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="field">
      <span>{label}</span>
      <textarea value={value} rows={4} onChange={(event) => onChange(event.target.value)} onInput={(event) => onChange(event.currentTarget.value)} />
    </label>
  )
}

function AccountList({ accounts, onRemove }: { accounts: ParsedSocialAccount[]; onRemove: (url: string) => void }) {
  if (accounts.length === 0) return <EmptyState title="No social profile yet" detail="Add at least one valid profile link to continue." />

  return (
    <div className="mini-list">
      {accounts.map((account) => (
        <div key={account.profile_url} className="mini-item">
          <span>
            <strong>{account.platform}</strong> @{account.handle}
          </span>
          <button className="ghost-button compact" type="button" onClick={() => onRemove(account.profile_url)}>
            Remove
          </button>
        </div>
      ))}
    </div>
  )
}

function Segmented<T extends string>({ options, value, onChange }: { options: { label: string; value: T }[]; value: T; onChange: (value: T) => void }) {
  return (
    <div className="segmented">
      {options.map((option) => (
        <button key={option.value} className={option.value === value ? 'active' : ''} type="button" onClick={() => onChange(option.value)}>
          {option.label}
        </button>
      ))}
    </div>
  )
}

function ShowcaseCard({ image, kicker, title, large }: { image: string; kicker: string; title: string; large?: boolean }) {
  return (
    <article className={`showcase-card ${large ? 'large' : ''}`}>
      <img src={image} alt={`${title} preview`} loading="lazy" />
      <span>{kicker}</span>
      <strong>{title}</strong>
    </article>
  )
}

function SummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="summary-item">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  )
}

function EmptyState({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="empty-state">
      <strong>{title}</strong>
      <p>{detail}</p>
    </div>
  )
}

function DemoCredentials({ type }: { type: 'creator' | 'business' }) {
  return (
    <div className="demo-box">
      <strong>Demo lookup</strong>
      {type === 'creator' ? (
        <p>
          Nickname <code>family-shorts</code>
          <br />
          Password <code>demo1234</code>
        </p>
      ) : (
        <p>
          Login ID <code>jeju-car</code>
          <br />
          Password <code>demo1234</code>
        </p>
      )}
    </div>
  )
}

export default App
