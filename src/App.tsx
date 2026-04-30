import { type Dispatch, type FormEvent, type ReactNode, type SetStateAction, useMemo, useState } from 'react'
import {
  ArrowLeft,
  ArrowRight,
  BriefcaseBusiness,
  Check,
  ChevronRight,
  Eye,
  Loader2,
  Plus,
  RefreshCw,
  Send,
  Sparkles,
  UserRound,
} from 'lucide-react'
import './App.css'
import { getBusinessBundle, getCreatorBundle, getInterestedCreatorsForOffer } from './matching'
import { parseSocialProfile, type ParsedSocialAccount } from './social'
import { createId, nowIso, repository } from './storage'
import { fallbackBusinessDescription, sponsorshipTemplates } from './templates'
import {
  CATEGORIES,
  CONTENT_TYPES,
  DESTINATIONS,
  type BusinessOffer,
  type BusinessProposal,
  type Category,
  type ContactPreference,
  type ContentType,
  type CreatorApplication,
  type CreatorOfferPreference,
  type CreatorSocialAccount,
  type Destination,
  type OfferPreference,
} from './types'

type View =
  | 'home'
  | 'business-home'
  | 'creator-flow'
  | 'creator-complete'
  | 'creator-check'
  | 'creator-market'
  | 'business-flow'
  | 'business-complete'
  | 'business-check'
  | 'proposal-flow'
  | 'proposal-complete'

type CreatorDraft = {
  destination?: Destination
  startDate: string
  endDate: string
  categories: Category[]
  offerPreferences: Record<string, OfferPreference>
  socialAccounts: ParsedSocialAccount[]
  contactInstagram: string
  contactEmail: string
  contactPhone: string
  nickname: string
  password: string
}

type BusinessDraft = {
  location?: Destination
  category?: Category
  sponsorshipDetails: string
  noContentPreference: boolean
  desiredContentTypes: ContentType[]
  businessName: string
  address: string
  websiteOrSocial: string
  shortDescription: string
  contactName: string
  contactEmail: string
  contactPhone: string
  contactInstagram: string
  loginId: string
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

const emptyCreatorDraft = (): CreatorDraft => ({
  startDate: '',
  endDate: '',
  categories: [],
  offerPreferences: {},
  socialAccounts: [],
  contactInstagram: '',
  contactEmail: '',
  contactPhone: '',
  nickname: '',
  password: '',
})

const emptyBusinessDraft = (): BusinessDraft => ({
  sponsorshipDetails: '',
  noContentPreference: true,
  desiredContentTypes: [],
  businessName: '',
  address: '',
  websiteOrSocial: '',
  shortDescription: '',
  contactName: '',
  contactEmail: '',
  contactPhone: '',
  contactInstagram: '',
  loginId: '',
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

function App() {
  const [store, setStore] = useState(repository.getStore)
  const [view, setView] = useState<View>('home')
  const [creatorStep, setCreatorStep] = useState(0)
  const [businessStep, setBusinessStep] = useState(0)
  const [creatorDraft, setCreatorDraft] = useState<CreatorDraft>(emptyCreatorDraft)
  const [businessDraft, setBusinessDraft] = useState<BusinessDraft>(emptyBusinessDraft)
  const [lastCreatorId, setLastCreatorId] = useState<string | null>(null)
  const [lastBusinessId, setLastBusinessId] = useState<string | null>(null)
  const [lookupCreator, setLookupCreator] = useState({ nickname: '', password: '', error: '', id: '' })
  const [lookupBusiness, setLookupBusiness] = useState({ loginId: '', password: '', error: '', id: '' })
  const [selectedProposal, setSelectedProposal] = useState<{ offerId: string; creatorId: string } | null>(null)
  const [proposalDraft, setProposalDraft] = useState<ProposalDraft>(emptyProposalDraft)
  const [lastProposalId, setLastProposalId] = useState<string | null>(null)
  const [formError, setFormError] = useState('')
  const [socialInput, setSocialInput] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)

  const showHome = () => {
    setFormError('')
    setView('home')
  }

  const resetDemoData = () => {
    setStore(repository.resetDemoData())
    setCreatorDraft(emptyCreatorDraft())
    setBusinessDraft(emptyBusinessDraft())
    setLookupCreator({ nickname: '', password: '', error: '', id: '' })
    setLookupBusiness({ loginId: '', password: '', error: '', id: '' })
    setLastCreatorId(null)
    setLastBusinessId(null)
    setFormError('')
    setView('home')
  }

  const startCreatorFlow = () => {
    setCreatorDraft(emptyCreatorDraft())
    setCreatorStep(0)
    setFormError('')
    setView('creator-flow')
  }

  const startBusinessFlow = () => {
    setBusinessDraft(emptyBusinessDraft())
    setBusinessStep(0)
    setFormError('')
    setView('business-flow')
  }

  const nextCreatorStep = () => {
    const error = validateCreatorStep(creatorStep, creatorDraft)
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
      setView('home')
      return
    }
    setCreatorStep((step) => step - 1)
  }

  const nextBusinessStep = () => {
    const error = validateBusinessStep(businessStep, businessDraft)
    if (error) {
      setFormError(error)
      return
    }

    setFormError('')
    setBusinessStep((step) => Math.min(step + 1, businessSteps.length - 1))
  }

  const previousBusinessStep = () => {
    setFormError('')
    if (businessStep === 0) {
      setView('business-home')
      return
    }
    setBusinessStep((step) => step - 1)
  }

  const submitCreatorApplication = () => {
    const error = validateCreatorStep(creatorStep, creatorDraft)
    if (error || !creatorDraft.destination) {
      setFormError(error || 'Choose a destination.')
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
      categories: creatorDraft.categories,
      contact_instagram: trimOptional(creatorDraft.contactInstagram),
      contact_email: trimOptional(creatorDraft.contactEmail),
      contact_phone: trimOptional(creatorDraft.contactPhone),
      status: 'Under Blue Whale Review',
      created_at: timestamp,
      updated_at: timestamp,
    }
    const accounts: CreatorSocialAccount[] = creatorDraft.socialAccounts.map((account) => ({
      ...account,
      id: createId('social'),
      creator_application_id: applicationId,
      created_at: timestamp,
    }))
    const preferences: CreatorOfferPreference[] = Object.entries(creatorDraft.offerPreferences).map(([businessOfferId, preference]) => ({
      id: createId('pref'),
      creator_application_id: applicationId,
      business_offer_id: businessOfferId,
      preference,
      created_at: timestamp,
      updated_at: timestamp,
    }))

    setStore(repository.saveCreatorApplication(application, accounts, preferences))
    setLastCreatorId(applicationId)
    setView('creator-market')
  }

  const updateCreatorInterest = (creatorId: string, offerId: string, preference: OfferPreference) => {
    setStore(repository.upsertCreatorOfferPreference(creatorId, offerId, preference))
  }

  const submitBusinessOffer = () => {
    const error = validateBusinessStep(businessStep, businessDraft)
    if (error || !businessDraft.location || !businessDraft.category) {
      setFormError(error || 'Complete the required offer details.')
      return
    }

    const timestamp = nowIso()
    const offerId = createId('offer')
    const offer: BusinessOffer = {
      id: offerId,
      login_id: businessDraft.loginId.trim(),
      password: businessDraft.password,
      location: businessDraft.location,
      category: businessDraft.category,
      sponsorship_details: businessDraft.sponsorshipDetails.trim(),
      desired_content_types: businessDraft.noContentPreference ? [] : businessDraft.desiredContentTypes,
      no_content_preference: businessDraft.noContentPreference,
      business_name: businessDraft.businessName.trim(),
      address: trimOptional(businessDraft.address),
      website_or_social: trimOptional(businessDraft.websiteOrSocial),
      short_description: trimOptional(businessDraft.shortDescription),
      contact_name: trimOptional(businessDraft.contactName),
      contact_email: trimOptional(businessDraft.contactEmail),
      contact_phone: trimOptional(businessDraft.contactPhone),
      contact_instagram: trimOptional(businessDraft.contactInstagram),
      status: 'Under Blue Whale Review',
      created_at: timestamp,
      updated_at: timestamp,
    }

    setStore(repository.saveBusinessOffer(offer))
    setLastBusinessId(offerId)
    setView('business-complete')
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

  const generateDescription = async () => {
    if (!businessDraft.category) {
      setFormError('Choose a category before generating a description.')
      return
    }

    setIsGenerating(true)
    setFormError('')

    try {
      const response = await fetch('/api/generate-description', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessName: businessDraft.businessName,
          category: businessDraft.category,
          sponsorshipDetails: businessDraft.sponsorshipDetails,
        }),
      })
      const data = (await response.json()) as { description?: string }
      if (response.ok && data.description) {
        setBusinessDraft((draft) => ({ ...draft, shortDescription: data.description ?? draft.shortDescription }))
        return
      }
    } catch {
      // The Vercel function is optional in local mock mode.
    } finally {
      setIsGenerating(false)
    }

    setBusinessDraft((draft) => ({
      ...draft,
      shortDescription: fallbackBusinessDescription(draft.businessName, draft.category ?? 'Cafe', draft.sponsorshipDetails),
    }))
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
      setView('business-check')
      return
    }
    if (!proposalDraft.provideDetails.trim() || !proposalDraft.proposalMessage.trim()) {
      setFormError('What you will provide and the proposal message are required.')
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
      status: 'Under Blue Whale Review',
      created_at: timestamp,
      updated_at: timestamp,
    }

    setStore(repository.saveBusinessProposal(proposal))
    setLastProposalId(proposal.id)
    setView('proposal-complete')
  }

  if (view === 'business-home') {
    return (
      <BusinessHome
        onHome={showHome}
        onStart={startBusinessFlow}
        onCheck={() => {
          setLookupBusiness({ loginId: '', password: '', error: '', id: '' })
          setView('business-check')
        }}
      />
    )
  }

  if (view === 'creator-flow') {
    return (
      <FlowShell
        eyebrow="Creator application"
        step={creatorStep}
        steps={creatorSteps}
        error={formError}
        onBack={previousCreatorStep}
        onHome={showHome}
      >
        {renderCreatorStep({
          step: creatorStep,
          draft: creatorDraft,
          setDraft: setCreatorDraft,
          socialInput,
          setSocialInput,
          addSocialAccount,
          onNext: nextCreatorStep,
          onSubmit: submitCreatorApplication,
        })}
      </FlowShell>
    )
  }

  if (view === 'business-flow') {
    return (
      <FlowShell
        eyebrow="Business offer"
        step={businessStep}
        steps={businessSteps}
        error={formError}
        onBack={previousBusinessStep}
        onHome={() => setView('business-home')}
      >
        {renderBusinessStep({
          step: businessStep,
          draft: businessDraft,
          setDraft: setBusinessDraft,
          onNext: nextBusinessStep,
          onSubmit: submitBusinessOffer,
          onGenerate: generateDescription,
          isGenerating,
        })}
      </FlowShell>
    )
  }

  if (view === 'creator-market' && lastCreatorId) {
    return <CreatorMarket store={store} creatorId={lastCreatorId} onHome={showHome} onInterest={updateCreatorInterest} />
  }

  if (view === 'creator-complete' && lastCreatorId) {
    return (
      <CompletionLayout onHome={showHome}>
        <CreatorSummary store={store} creatorId={lastCreatorId} title="Your sponsorship application is complete." />
      </CompletionLayout>
    )
  }

  if (view === 'business-complete' && lastBusinessId) {
    return (
      <CompletionLayout onHome={() => setView('business-home')}>
        <BusinessSummary offer={store.business_offers.find((item) => item.id === lastBusinessId)} hideCreators />
      </CompletionLayout>
    )
  }

  if (view === 'creator-check') {
    const bundle = lookupCreator.id ? getCreatorBundle(store, lookupCreator.id) : null
    return (
      <LookupLayout
        title="Check My Application"
        helper="Use the nickname and password you created after applying."
        onHome={showHome}
        aside={<DemoCredentials type="creator" />}
      >
        <form className="lookup-form" onSubmit={handleCreatorLookup}>
          <TextInput label="Nickname" value={lookupCreator.nickname} onChange={(nickname) => setLookupCreator((lookup) => ({ ...lookup, nickname }))} />
          <TextInput
            label="Password"
            type="password"
            value={lookupCreator.password}
            onChange={(password) => setLookupCreator((lookup) => ({ ...lookup, password }))}
          />
          {lookupCreator.error && <p className="error">{lookupCreator.error}</p>}
          <button className="primary-button" type="submit">
            <Eye size={18} />
            View Application
          </button>
        </form>
        {bundle?.application && (
          <>
            <button
              className="primary-button"
              type="button"
              onClick={() => {
                setLastCreatorId(bundle.application!.id)
                setView('creator-market')
              }}
            >
              <Sparkles size={18} />
              Browse Sponsorship Market
            </button>
            <CreatorSummary store={store} creatorId={bundle.application.id} title="Your submitted trips and updates" />
          </>
        )}
      </LookupLayout>
    )
  }

  if (view === 'business-check') {
    const offer = lookupBusiness.id ? store.business_offers.find((item) => item.id === lookupBusiness.id) : null
    return (
      <LookupLayout
        title="Check My Offer"
        helper="Use the ID and password you created after registering your offer."
        onHome={() => setView('business-home')}
        aside={<DemoCredentials type="business" />}
      >
        <form className="lookup-form" onSubmit={handleBusinessLookup}>
          <TextInput label="Login ID" value={lookupBusiness.loginId} onChange={(loginId) => setLookupBusiness((lookup) => ({ ...lookup, loginId }))} />
          <TextInput
            label="Password"
            type="password"
            value={lookupBusiness.password}
            onChange={(password) => setLookupBusiness((lookup) => ({ ...lookup, password }))}
          />
          {lookupBusiness.error && <p className="error">{lookupBusiness.error}</p>}
          <button className="primary-button" type="submit">
            <Eye size={18} />
            View Offer
          </button>
        </form>
        {offer && <BusinessSummary offer={offer} store={store} onProposal={beginProposal} />}
      </LookupLayout>
    )
  }

  if (view === 'proposal-flow') {
    const creator = selectedProposal ? store.creator_applications.find((item) => item.id === selectedProposal.creatorId) : undefined
    return (
      <FlowShell
        eyebrow="Creator proposal"
        step={0}
        steps={['Proposal']}
        error={formError}
        onBack={() => setView('business-check')}
        onHome={() => setView('business-home')}
      >
        <section className="step-panel">
          <p className="eyebrow">Proposal for {creator?.nickname ?? 'creator'}</p>
          <h1>Write a proposal for this creator.</h1>
          <p className="helper">Blue Whale will review your proposal and deliver it to the creator. If you prefer, you may also contact the creator directly.</p>
          <div className="form-grid">
            <TextInput label="Proposal title (optional)" value={proposalDraft.title} onChange={(title) => setProposalDraft((draft) => ({ ...draft, title }))} />
            <TextArea
              label="What you’ll provide"
              value={proposalDraft.provideDetails}
              onChange={(provideDetails) => setProposalDraft((draft) => ({ ...draft, provideDetails }))}
            />
            <TextArea
              label="Proposal summary or additional message"
              value={proposalDraft.proposalMessage}
              onChange={(proposalMessage) => setProposalDraft((draft) => ({ ...draft, proposalMessage }))}
            />
            <TextInput label="Included items (optional)" value={proposalDraft.includedItems} onChange={(includedItems) => setProposalDraft((draft) => ({ ...draft, includedItems }))} />
            <TextInput label="Excluded items (optional)" value={proposalDraft.excludedItems} onChange={(excludedItems) => setProposalDraft((draft) => ({ ...draft, excludedItems }))} />
            <TextInput label="Requested content (optional)" value={proposalDraft.requestedContent} onChange={(requestedContent) => setProposalDraft((draft) => ({ ...draft, requestedContent }))} />
            <TextInput label="Available visit dates (optional)" value={proposalDraft.availableDates} onChange={(availableDates) => setProposalDraft((draft) => ({ ...draft, availableDates }))} />
            <TextInput label="Preferred upload deadline (optional)" value={proposalDraft.uploadDeadline} onChange={(uploadDeadline) => setProposalDraft((draft) => ({ ...draft, uploadDeadline }))} />
          </div>
          <Segmented
            options={[
              { label: 'Send through Blue Whale', value: 'blue_whale' },
              { label: 'Direct contact is okay', value: 'direct_ok' },
            ]}
            value={proposalDraft.contactPreference}
            onChange={(contactPreference) => setProposalDraft((draft) => ({ ...draft, contactPreference }))}
          />
          <button className="primary-button" type="button" onClick={submitProposal}>
            <Send size={18} />
            Submit Proposal
          </button>
        </section>
      </FlowShell>
    )
  }

  if (view === 'proposal-complete') {
    const proposal = lastProposalId ? store.business_proposals.find((item) => item.id === lastProposalId) : undefined
    return (
      <CompletionLayout onHome={() => setView('business-home')}>
        <section className="summary-block">
          <p className="eyebrow">Status: {proposal?.status ?? 'Under Blue Whale Review'}</p>
          <h1>Your proposal has been submitted.</h1>
          <p className="helper">Blue Whale will review it and deliver it to the creator.</p>
          <button className="secondary-button" type="button" onClick={() => setView('business-check')}>
            <Eye size={18} />
            Back to Offer
          </button>
        </section>
      </CompletionLayout>
    )
  }

  return (
    <main className="home">
      <TopBar
        right={
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
        }
      />
      <section className="hero-section">
        <div className="hero-copy">
          <p className="eyebrow">Blue Whale</p>
          <h1>Get travel sponsorship offers based on your trip.</h1>
          <p className="subtitle">Find hotels, rental cars, restaurants, beauty services, and local experiences that match your travel dates.</p>
          <p className="market-promise">Apply once, browse open sponsorships in your destination, and mark the offers you like. Businesses send proposals first through Blue Whale.</p>
          <button className="primary-button large" type="button" onClick={startCreatorFlow}>
            <Sparkles size={20} />
            Apply for Travel Sponsorships
          </button>
        </div>
      </section>
      <section className="entry-strip">
        <button className="secondary-button" type="button" onClick={() => setView('business-home')}>
          <BriefcaseBusiness size={18} />
          For Businesses
        </button>
        <button className="ghost-button" type="button" onClick={resetDemoData}>
          <RefreshCw size={18} />
          Reset Demo Data
        </button>
      </section>
      <section className="offer-showcase" aria-label="Available sponsorship examples">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Sponsorships you can browse</p>
            <h2>Hotels, rides, beauty, local food, and travel essentials.</h2>
          </div>
          <p className="helper small">Apply once, then open a market of available offers around your destination.</p>
        </div>
        <div className="showcase-grid">
          <article className="showcase-card large">
            <img src="https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&w=1200&q=80" alt="Pool villa sponsorship preview" />
            <span>Jeju stays</span>
            <strong>Ocean-view stays and private villas</strong>
          </article>
          <article className="showcase-card">
            <img src="https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&w=900&q=80" alt="Rental car sponsorship preview" />
            <span>Rental car</span>
            <strong>Contactless car rentals for creator routes</strong>
          </article>
          <article className="showcase-card">
            <img src="https://commons.wikimedia.org/wiki/Special:FilePath/Jeju_gogi_noodle.jpg?width=900" alt="Jeju gogi-guksu sponsorship preview" />
            <span>Local food</span>
            <strong>Jeju gogi-guksu and restaurant visits</strong>
          </article>
          <article className="showcase-card">
            <img src="https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?auto=format&fit=crop&w=900&q=80" alt="K-beauty sponsorship preview" />
            <span>K-beauty</span>
            <strong>Skin clinics and beauty studios</strong>
          </article>
          <article className="showcase-card">
            <img src="https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=900&q=80" alt="Travel eSIM sponsorship preview" />
            <span>eSIM</span>
            <strong>Travel data packs for upload-on-the-go</strong>
          </article>
        </div>
      </section>
    </main>
  )
}

const creatorSteps = ['Destination', 'Dates', 'Preferences', 'Social', 'Contact', 'Login']
const businessSteps = ['Location', 'Category', 'Offer', 'Content', 'Business', 'Contact', 'Login']

const validateCreatorStep = (step: number, draft: CreatorDraft) => {
  if (step === 0 && !draft.destination) return 'Choose your first destination.'
  if (step === 1 && (!draft.startDate || !draft.endDate)) return 'Add both start and end dates.'
  if (step === 1 && draft.endDate < draft.startDate) return 'End date must be after the start date.'
  if (step === 2 && draft.categories.length === 0) return 'Select at least one sponsorship category.'
  if (step === 3 && draft.socialAccounts.length === 0) return 'Add at least one valid social profile link.'
  if (step === 5 && !draft.nickname.trim()) return 'Create a nickname.'
  if (step === 5 && !passwordValid(draft.password)) return 'Password must be 4-12 characters.'
  return ''
}

const validateBusinessStep = (step: number, draft: BusinessDraft) => {
  if (step === 0 && !draft.location) return 'Choose where you can provide sponsorship.'
  if (step === 1 && !draft.category) return 'Choose your business category.'
  if (step === 2 && !draft.sponsorshipDetails.trim()) return 'Describe what you can offer.'
  if (step === 4 && !draft.businessName.trim()) return 'Add your business name.'
  if (step === 6 && !draft.loginId.trim()) return 'Create a login ID.'
  if (step === 6 && !passwordValid(draft.password)) return 'Password must be 4-12 characters.'
  return ''
}

function renderCreatorStep({
  step,
  draft,
  setDraft,
  socialInput,
  setSocialInput,
  addSocialAccount,
  onNext,
  onSubmit,
}: {
  step: number
  draft: CreatorDraft
  setDraft: Dispatch<SetStateAction<CreatorDraft>>
  socialInput: string
  setSocialInput: (value: string) => void
  addSocialAccount: () => void
  onNext: () => void
  onSubmit: () => void
}) {
  if (step === 0) {
    return (
      <StepPanel title="Where are you traveling first?" helper="You can add more trips later. For now, choose the destination you’ll visit first.">
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
      <StepPanel title="What kind of sponsorships are you interested in?">
        <OptionGrid
          values={CATEGORIES}
          selected={draft.categories}
          multi
          onToggle={(category) =>
            setDraft((item) => ({
              ...item,
              categories: item.categories.includes(category) ? item.categories.filter((value) => value !== category) : [...item.categories, category],
            }))
          }
        />
        <NextButton label="Continue" onClick={onNext} />
      </StepPanel>
    )
  }

  if (step === 3) {
    return (
      <StepPanel
        title="Add the social accounts you want us to review."
        helper="Open your profile, tap share, copy the profile link, and paste it here. You don’t need to enter followers or views. Blue Whale will review your links. Adding more accounts can increase your chances of receiving offers."
      >
        <div className="inline-form">
          <TextInput label="Social profile link" value={socialInput} onChange={setSocialInput} placeholder="https://instagram.com/yourhandle" />
          <button className="secondary-button inline-button" type="button" onClick={addSocialAccount}>
            <Plus size={18} />
            {draft.socialAccounts.length ? 'Add Another Account' : 'Add Account'}
          </button>
        </div>
        <AccountList accounts={draft.socialAccounts} onRemove={(url) => setDraft((item) => ({ ...item, socialAccounts: item.socialAccounts.filter((account) => account.profile_url !== url) }))} />
        <NextButton label="Continue" onClick={onNext} />
      </StepPanel>
    )
  }

  if (step === 4) {
    return (
      <StepPanel
        title="Where should Blue Whale contact you?"
        helper="Businesses won’t contact you directly by default. Blue Whale will review sponsorship conditions and send you the details."
      >
        <p className="helper small">Optional, but recommended. It helps Blue Whale contact you faster about sponsorship offers.</p>
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
    <StepPanel title="Create login info to check your application later." helper="You can check your application from the home page using this nickname and password.">
      <div className="form-grid">
        <TextInput label="Nickname" value={draft.nickname} onChange={(nickname) => setDraft((item) => ({ ...item, nickname }))} />
        <TextInput label="Password" type="password" value={draft.password} onChange={(password) => setDraft((item) => ({ ...item, password }))} />
      </div>
      <button className="primary-button" type="button" onClick={onSubmit}>
        <Send size={18} />
        Submit Application
      </button>
    </StepPanel>
  )
}

function renderBusinessStep({
  step,
  draft,
  setDraft,
  onNext,
  onSubmit,
  onGenerate,
  isGenerating,
}: {
  step: number
  draft: BusinessDraft
  setDraft: Dispatch<SetStateAction<BusinessDraft>>
  onNext: () => void
  onSubmit: () => void
  onGenerate: () => void
  isGenerating: boolean
}) {
  if (step === 0) {
    return (
      <StepPanel title="Where can you provide this sponsorship?">
        <OptionGrid values={DESTINATIONS} selected={draft.location ? [draft.location] : []} onToggle={(location) => setDraft((item) => ({ ...item, location }))} />
        <NextButton label="Continue" onClick={onNext} />
      </StepPanel>
    )
  }

  if (step === 1) {
    return (
      <StepPanel title="What type of product or service do you offer?">
        <OptionGrid values={CATEGORIES} selected={draft.category ? [draft.category] : []} onToggle={(category) => setDraft((item) => ({ ...item, category }))} />
        <NextButton label="Continue" onClick={onNext} />
      </StepPanel>
    )
  }

  if (step === 2) {
    return (
      <StepPanel
        title="What can you offer to creators?"
        helper="The more specific you are, the easier it is to match with the right creator. Not sure what to write? Use a recommended template."
      >
        <TextArea
          label="Sponsorship details"
          value={draft.sponsorshipDetails}
          onChange={(sponsorshipDetails) => setDraft((item) => ({ ...item, sponsorshipDetails }))}
          placeholder={draft.category ? sponsorshipTemplates[draft.category] : 'Meal for 2, signature menu included'}
        />
        <button
          className="secondary-button"
          type="button"
          onClick={() => draft.category && setDraft((item) => ({ ...item, sponsorshipDetails: sponsorshipTemplates[draft.category ?? 'Cafe'] }))}
        >
          <Sparkles size={18} />
          Recommend for Me
        </button>
        <NextButton label="Continue" onClick={onNext} />
      </StepPanel>
    )
  }

  if (step === 3) {
    return (
      <StepPanel title="What content would you like from creators?">
        <button
          className={`option full ${draft.noContentPreference ? 'selected' : ''}`}
          type="button"
          onClick={() => setDraft((item) => ({ ...item, noContentPreference: true, desiredContentTypes: [] }))}
        >
          <Check size={18} />
          No preference. Let Blue Whale recommend what fits this offer.
        </button>
        <OptionGrid
          values={CONTENT_TYPES}
          selected={draft.desiredContentTypes}
          multi
          onToggle={(contentType) =>
            setDraft((item) => ({
              ...item,
              noContentPreference: false,
              desiredContentTypes: item.desiredContentTypes.includes(contentType)
                ? item.desiredContentTypes.filter((value) => value !== contentType)
                : [...item.desiredContentTypes, contentType],
            }))
          }
        />
        <NextButton label="Continue" onClick={onNext} />
      </StepPanel>
    )
  }

  if (step === 4) {
    return (
      <StepPanel
        title="Add the business information creators will see."
        helper="Optional, but adding a link or short description helps creators understand your offer."
      >
        <div className="form-grid">
          <TextInput label="Business name" value={draft.businessName} onChange={(businessName) => setDraft((item) => ({ ...item, businessName }))} />
          <TextInput label="Location / address detail (optional)" value={draft.address} onChange={(address) => setDraft((item) => ({ ...item, address }))} />
          <TextInput label="Website or social link (optional)" value={draft.websiteOrSocial} onChange={(websiteOrSocial) => setDraft((item) => ({ ...item, websiteOrSocial }))} />
          <TextArea label="Short description (optional)" value={draft.shortDescription} onChange={(shortDescription) => setDraft((item) => ({ ...item, shortDescription }))} />
        </div>
        <button className="secondary-button" type="button" onClick={onGenerate} disabled={isGenerating}>
          {isGenerating ? <Loader2 className="spin" size={18} /> : <Sparkles size={18} />}
          Generate Description
        </button>
        <NextButton label="Continue" onClick={onNext} />
      </StepPanel>
    )
  }

  if (step === 5) {
    return (
      <StepPanel
        title="Who should Blue Whale contact?"
        helper="This is not for creators to contact you directly. If there’s a matching creator, Blue Whale will reach out to you first."
      >
        <div className="form-grid">
          <TextInput label="Contact person name (optional)" value={draft.contactName} onChange={(contactName) => setDraft((item) => ({ ...item, contactName }))} />
          <TextInput label="Email (optional)" value={draft.contactEmail} onChange={(contactEmail) => setDraft((item) => ({ ...item, contactEmail }))} />
          <TextInput label="Phone / KakaoTalk (optional)" value={draft.contactPhone} onChange={(contactPhone) => setDraft((item) => ({ ...item, contactPhone }))} />
          <TextInput label="Instagram DM (optional)" value={draft.contactInstagram} onChange={(contactInstagram) => setDraft((item) => ({ ...item, contactInstagram }))} />
        </div>
        <NextButton label="Continue" onClick={onNext} />
      </StepPanel>
    )
  }

  return (
    <StepPanel title="Create an ID and password to check your offer later." helper="You can check your offer from the home page using this ID and password.">
      <div className="form-grid">
        <TextInput label="Login ID" value={draft.loginId} onChange={(loginId) => setDraft((item) => ({ ...item, loginId }))} />
        <TextInput label="Password" type="password" value={draft.password} onChange={(password) => setDraft((item) => ({ ...item, password }))} />
      </div>
      <button className="primary-button" type="button" onClick={onSubmit}>
        <Send size={18} />
        Submit Offer
      </button>
    </StepPanel>
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

function BusinessHome({ onHome, onStart, onCheck }: { onHome: () => void; onStart: () => void; onCheck: () => void }) {
  return (
    <main className="home business">
      <TopBar
        right={
          <>
            <button className="ghost-button" type="button" onClick={onCheck}>
              <Eye size={18} />
              Check My Offer
            </button>
          </>
        }
      />
      <section className="hero-section">
        <div className="hero-copy">
          <p className="eyebrow">Blue Whale for Businesses</p>
          <h1>See creators who are visiting your area and interested in your offer.</h1>
          <p className="subtitle">Register your sponsorship offer, and Blue Whale will organize matching creators for you.</p>
          <button className="primary-button large" type="button" onClick={onStart}>
            <BriefcaseBusiness size={20} />
            Register an Offer and View Creators
          </button>
        </div>
      </section>
      <section className="entry-strip">
        <button className="secondary-button" type="button" onClick={onHome}>
          <UserRound size={18} />
          Creator Home
        </button>
      </section>
    </main>
  )
}

function FlowShell({
  eyebrow,
  step,
  steps,
  error,
  onBack,
  onHome,
  children,
}: {
  eyebrow: string
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
          <span>{eyebrow}</span>
          <span>
            Step {step + 1} of {steps.length}
          </span>
        </div>
        <div className="progress-track" aria-label={`${eyebrow} progress`}>
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

function OptionGrid<T extends string>({
  values,
  selected,
  onToggle,
}: {
  values: readonly T[]
  selected: T[]
  multi?: boolean
  onToggle: (value: T) => void
}) {
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
      <input type={type} value={value} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} />
    </label>
  )
}

function TextArea({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string }) {
  return (
    <label className="field">
      <span>{label}</span>
      <textarea value={value} placeholder={placeholder} rows={4} onChange={(event) => onChange(event.target.value)} />
    </label>
  )
}

function OfferCard({
  offer,
  selected,
  onPreference,
}: {
  offer: BusinessOffer
  selected?: OfferPreference
  onPreference: (preference: OfferPreference) => void
}) {
  return (
    <article className={`data-card ${selected === 'interested' ? 'highlight' : ''}`}>
      {offer.image_url && <img className="offer-image" src={offer.image_url} alt={`${offer.business_name} sponsorship preview`} loading="lazy" />}
      <div className="card-header">
        <div>
          <p className="eyebrow">{offer.category}</p>
          <h2>{offer.business_name}</h2>
        </div>
        <span className="pill">{offer.location}</span>
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
        <div>
          <dt>Preferred content type</dt>
          <dd>{offer.no_content_preference ? 'No preference' : offer.desired_content_types.join(', ')}</dd>
        </div>
      </dl>
      <p>{offer.short_description}</p>
      {offer.reference_url && (
        <a className="reference-link" href={offer.reference_url} target="_blank" rel="noreferrer">
          {offer.reference_label || 'Reference example'}
        </a>
      )}
      <div className="button-row">
        <button className={`secondary-button ${selected === 'interested' ? 'selected-button' : ''}`} type="button" onClick={() => onPreference('interested')}>
          <Check size={18} />
          Interested
        </button>
        <button className={`ghost-button ${selected === 'not_interested' ? 'selected-button muted' : ''}`} type="button" onClick={() => onPreference('not_interested')}>
          Not Interested
        </button>
      </div>
    </article>
  )
}

function AccountList({ accounts, onRemove }: { accounts: ParsedSocialAccount[]; onRemove: (url: string) => void }) {
  if (accounts.length === 0) {
    return <EmptyState title="No social accounts yet" detail="Add at least one valid profile link to continue." />
  }

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

function CompletionLayout({ children, onHome }: { children: ReactNode; onHome: () => void }) {
  return (
    <main className="flow-page">
      <header className="flow-header">
        <button className="brand-button" type="button" onClick={onHome}>
          <span className="brand-mark">BW</span>
          Blue Whale
        </button>
      </header>
      <section className="flow-card complete">{children}</section>
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
  const [selectedCategory, setSelectedCategory] = useState<Category | 'All'>('All')
  const creator = store.creator_applications.find((item) => item.id === creatorId)

  const destinationOffers = useMemo(() => {
    if (!creator) {
      return []
    }

    return [...store.business_offers]
      .filter((offer) => offer.location === creator.destination)
      .sort((left, right) => Number(creator.categories.includes(right.category)) - Number(creator.categories.includes(left.category)))
  }, [creator, store.business_offers])

  if (!creator) {
    return (
      <CompletionLayout onHome={onHome}>
        <EmptyState title="Application not found" detail="Return home and check your application again." />
      </CompletionLayout>
    )
  }

  const preferences = new Map(
    store.creator_offer_preferences
      .filter((preference) => preference.creator_application_id === creator.id)
      .map((preference) => [preference.business_offer_id, preference.preference]),
  )
  const visibleOffers = selectedCategory === 'All' ? destinationOffers : destinationOffers.filter((offer) => offer.category === selectedCategory)
  const interestedCount = [...preferences.values()].filter((preference) => preference === 'interested').length

  return (
    <main className="market-page">
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
      <section className="market-hero">
        <div>
          <p className="eyebrow">Application saved</p>
          <h1>{creator.destination} sponsorship market is open.</h1>
          <p className="helper">
            Browse offers available around your trip. When you mark an offer as interested, that business can review your trip and send a proposal first through Blue Whale.
          </p>
        </div>
        <div className="market-summary">
          <SummaryItem label="Trip" value={`${creator.start_date} to ${creator.end_date}`} />
          <SummaryItem label="Preference survey" value={creator.categories.join(', ')} />
          <SummaryItem label="Interested offers" value={`${interestedCount}`} />
        </div>
      </section>
      <section className="market-toolbar" aria-label="Sponsorship market filters">
        <button className={`filter-chip ${selectedCategory === 'All' ? 'active' : ''}`} type="button" onClick={() => setSelectedCategory('All')}>
          All offers
          <span>{destinationOffers.length}</span>
        </button>
        {CATEGORIES.map((category) => {
          const count = destinationOffers.filter((offer) => offer.category === category).length
          if (!count) {
            return null
          }

          return (
            <button
              key={category}
              className={`filter-chip ${selectedCategory === category ? 'active' : ''}`}
              type="button"
              onClick={() => setSelectedCategory(category)}
            >
              {category}
              <span>{count}</span>
            </button>
          )
        })}
      </section>
      <section className="market-results">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Open sponsorships</p>
            <h2>{visibleOffers.length} offers in {creator.destination}</h2>
          </div>
          <p className="helper small">Only businesses you mark as interested can see your trip and social links.</p>
        </div>
        {visibleOffers.length ? (
          <div className="card-grid">
            {visibleOffers.map((offer) => (
              <OfferCard
                key={offer.id}
                offer={offer}
                selected={preferences.get(offer.id)}
                onPreference={(preference) => onInterest(creator.id, offer.id, preference)}
              />
            ))}
          </div>
        ) : (
          <EmptyState title="No offers in this category yet" detail="Try another category, or check back after Blue Whale approves more local offers." />
        )}
      </section>
    </main>
  )
}

function CreatorSummary({ store, creatorId, title }: { store: ReturnType<typeof repository.getStore>; creatorId: string; title: string }) {
  const bundle = getCreatorBundle(store, creatorId)
  const creator = bundle.application

  if (!creator) {
    return <EmptyState title="Application not found" detail="Try returning to the home page and checking again." />
  }

  const interestedOfferIds = new Set(bundle.preferences.filter((preference) => preference.preference === 'interested').map((preference) => preference.business_offer_id))
  const interestedOffers = store.business_offers.filter((offer) => interestedOfferIds.has(offer.id))

  return (
    <section className="summary-block">
      <p className="eyebrow">Status: {creator.status}</p>
      <h1>{title}</h1>
      <p className="helper">Blue Whale will review your application and contact businesses to confirm possible sponsorships.</p>
      <div className="summary-grid">
        <SummaryItem label="Destination / dates" value={`${creator.destination} · ${creator.start_date} to ${creator.end_date}`} />
        <SummaryItem label="Selected sponsorship categories" value={creator.categories.join(', ')} />
        <SummaryItem label="Interested businesses" value={`${interestedOffers.length}`} />
        <SummaryItem label="Blue Whale contact channel" value={[creator.contact_instagram, creator.contact_email, creator.contact_phone].filter(Boolean).join(', ') || 'Not provided'} />
      </div>
      <h2>Added social links</h2>
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
      <h2>Interested businesses</h2>
      {interestedOffers.length ? (
        <div className="card-grid compact-cards">
          {interestedOffers.map((offer) => (
            <article className="data-card" key={offer.id}>
              <p className="eyebrow">{offer.category}</p>
              <h2>{offer.business_name}</h2>
              <p>{offer.sponsorship_details}</p>
            </article>
          ))}
        </div>
      ) : (
        <EmptyState title="No interested businesses selected" detail="Your application is saved, but no businesses were selected." />
      )}
      <h2>Received sponsorship offers or updates</h2>
      {bundle.proposals.length ? (
        <div className="mini-list">
          {bundle.proposals.map((proposal) => {
            const offer = store.business_offers.find((item) => item.id === proposal.business_offer_id)
            return (
              <div key={proposal.id} className="mini-item stacked">
                <span>
                  <strong>{proposal.title || offer?.business_name || 'Proposal'}</strong>
                  <small>{proposal.status}</small>
                </span>
                <p>{proposal.proposal_message}</p>
              </div>
            )
          })}
        </div>
      ) : (
        <EmptyState title="No delivered proposals yet" detail="Blue Whale will show updates here after review." />
      )}
    </section>
  )
}

function BusinessSummary({
  offer,
  store,
  hideCreators,
  onProposal,
}: {
  offer?: BusinessOffer
  store?: ReturnType<typeof repository.getStore>
  hideCreators?: boolean
  onProposal?: (offerId: string, creatorId: string) => void
}) {
  if (!offer) {
    return <EmptyState title="Offer not found" detail="Try returning to the business home page and checking again." />
  }

  const creators = store && !hideCreators ? getInterestedCreatorsForOffer(store, offer) : []
  const proposals = store ? getBusinessBundle(store, offer.id).proposals : []

  return (
    <section className="summary-block">
      <p className="eyebrow">Status: {offer.status}</p>
      <h1>Your sponsorship offer has been submitted.</h1>
      <p className="helper">Blue Whale will review your offer and contact you when matching creators are available.</p>
      <div className="summary-grid">
        <SummaryItem label="Location" value={offer.location} />
        <SummaryItem label="Category" value={offer.category} />
        <SummaryItem label="Sponsorship details" value={offer.sponsorship_details} />
        <SummaryItem label="Desired content" value={offer.no_content_preference ? 'No preference' : offer.desired_content_types.join(', ')} />
        <SummaryItem label="Business info" value={[offer.business_name, offer.address, offer.website_or_social, offer.short_description].filter(Boolean).join(' · ')} />
      </div>
      {!hideCreators && (
        <>
          <h2>Creators interested in your offer</h2>
          <p className="helper small">Only creators who marked your offer as interested are shown here.</p>
          {creators.length && store ? (
            <div className="card-grid">
              {creators.map((creator) => (
                <CreatorCard key={creator.id} creator={creator} offer={offer} store={store} onProposal={onProposal} />
              ))}
            </div>
          ) : (
            <EmptyState title="No interested creators yet" detail="When creators mark this offer as interested, Blue Whale will list them here." />
          )}
          <h2>Submitted proposals</h2>
          {proposals.length ? (
            <div className="mini-list">
              {proposals.map((proposal) => {
                const creator = store?.creator_applications.find((item) => item.id === proposal.creator_application_id)
                return (
                  <div key={proposal.id} className="mini-item stacked">
                    <span>
                      <strong>{proposal.title || `Proposal to ${creator?.nickname ?? 'creator'}`}</strong>
                      <small>{proposal.status}</small>
                    </span>
                    <p>{proposal.proposal_message}</p>
                  </div>
                )
              })}
            </div>
          ) : (
            <EmptyState title="No proposals submitted" detail="Choose an interested creator to write a proposal." />
          )}
        </>
      )}
    </section>
  )
}

function CreatorCard({
  creator,
  offer,
  store,
  onProposal,
}: {
  creator: CreatorApplication
  offer: BusinessOffer
  store: ReturnType<typeof repository.getStore>
  onProposal?: (offerId: string, creatorId: string) => void
}) {
  const socialAccounts = store.creator_social_accounts.filter((account) => account.creator_application_id === creator.id)

  return (
    <article className="data-card">
      <div className="card-header">
        <div>
          <p className="eyebrow">{creator.destination} · {creator.start_date} to {creator.end_date}</p>
          <h2>{creator.nickname}</h2>
        </div>
        <span className="pill">{offer.category}</span>
      </div>
      <p>Interested categories: {creator.categories.join(', ')}</p>
      <p>Offer they marked as interested: {offer.business_name}</p>
      <div className="mini-list nested">
        {socialAccounts.map((account) => (
          <div key={account.id} className="mini-item stacked">
            <span>
              <strong>{account.platform}</strong> @{account.handle}
            </span>
            <small>
              {[
                account.reviewed_followers ? `${account.reviewed_followers.toLocaleString()} followers reviewed` : '',
                account.reviewed_average_views ? `${account.reviewed_average_views.toLocaleString()} avg views reviewed` : '',
                account.reviewed_average_likes ? `${account.reviewed_average_likes.toLocaleString()} avg likes reviewed` : '',
              ]
                .filter(Boolean)
                .join(' · ') || 'Metrics pending Blue Whale review'}
            </small>
          </div>
        ))}
      </div>
      {onProposal && (
        <button className="primary-button" type="button" onClick={() => onProposal(offer.id, creator.id)}>
          <ChevronRight size={18} />
          Write Proposal
        </button>
      )}
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
          Nickname <code>ari-reels</code>
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
