import { useMemo, useRef, useState, type ReactNode } from 'react'
import { ApiError } from '../../lib/api'
import { canonicalPrivateUrl, copyText } from '../privateEventSite/clipboard'
import { changedRsvpDraft, completeRsvpDraft, rsvpSubmissionPayload, type RsvpDraft } from '../privateEventSite/rsvpForm'
import { usePrivateInvitationRuntime } from './privateInvitationRuntime'
import { RsvpFormPresentation, RuntimeText, WebsiteAction } from './RsvpPresentation'
import { resolveRsvpPresentation, type RsvpPresentationEnvironment, type ResolvedRsvpPresentation } from './rsvpPresentationResolution'

export function PrivateRsvpRuntime({ children, buttonClassName = '', presentationEnvironment = {} }: { children: ReactNode; buttonClassName?: string; presentationEnvironment?: RsvpPresentationEnvironment }) {
  const runtime = usePrivateInvitationRuntime()
  const presentation = resolveRsvpPresentation(presentationEnvironment)
  if (!runtime) return <div data-rsvp-button className={buttonClassName}>{children}</div>

  if (runtime.handoffOnly) return <WebViewHandoff currentPath={runtime.currentPath ?? '/'} presentation={presentation} environment={presentationEnvironment} />

  if (runtime.trustState === 'unclaimed' && runtime.canOpen) {
    return <div className="mt-9"><WebsiteAction appearance={presentation.primaryAction} environment={presentationEnvironment} type="button" disabled={runtime.opening} aria-busy={runtime.opening || undefined} onClick={runtime.onOpen}>{runtime.opening ? 'Opening…' : 'Open Invitation'}</WebsiteAction>{runtime.openError && <RuntimeText as="p" kind="supportingText" appearance={presentation.supportingText} environment={presentationEnvironment} className="mt-3" style={{ color: '#b91c1c' }} role="alert">We couldn’t open this invitation. Please try again.</RuntimeText>}</div>
  }
  if (runtime.trustState === 'claimed_elsewhere') {
    if (runtime.accessState === 'transfer_pending') return <TransferPending runtime={runtime} presentation={presentation} environment={presentationEnvironment} />
    return <ClaimedElsewhere runtime={runtime} presentation={presentation} environment={presentationEnvironment} />
  }
  if (runtime.trustState === 'unclaimed') {
    return <div className="mt-8" data-private-rsvp-state="inactive"><RuntimeText as="p" kind="statusHeading" appearance={presentation.statusHeading} environment={presentationEnvironment}>This invitation is currently unavailable.</RuntimeText></div>
  }
  if (!runtime.rsvp) return null

  return <TrustedRsvp runtime={runtime} presentation={presentation} environment={presentationEnvironment} />
}

function TrustedRsvp({ runtime, presentation, environment }: { runtime: NonNullable<ReturnType<typeof usePrivateInvitationRuntime>>; presentation: ResolvedRsvpPresentation; environment: RsvpPresentationEnvironment }) {
  const rsvp = runtime.rsvp!
  const editable = rsvp.availability === 'open'
  const signature = `${rsvp.lastUpdated ?? 'never'}:${rsvp.guests.map((guest) => `${guest.id}:${guest.response ?? 'pending'}`).join('|')}`
  const initialDraft = () => Object.fromEntries(rsvp.guests.map((guest) => [guest.id, guest.response])) as RsvpDraft
  const [editing, setEditing] = useState(editable && rsvp.status !== 'complete')
  const [draftState, setDraftState] = useState(() => ({ signature, values: initialDraft() }))
  const [confirmation, setConfirmation] = useState<'received' | 'updated' | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const submittingRef = useRef(false)
  const draft = draftState.signature === signature ? draftState.values : initialDraft()
  const showEditing = editing && editable

  const complete = completeRsvpDraft(rsvp.guests, draft)
  const changed = useMemo(() => changedRsvpDraft(rsvp.guests, draft), [draft, rsvp.guests])

  async function submit() {
    if (submittingRef.current) return
    if (!complete) {
      setMessage('Please choose a response for every Guest.')
      return
    }
    if (!changed) {
      setMessage('No changes to save.')
      return
    }

    submittingRef.current = true
    setSubmitting(true)
    setMessage(null)
    try {
      const result = await runtime.onSubmitRsvp(rsvpSubmissionPayload(rsvp.guests, draft))
      setConfirmation(result.changed ? result.confirmation : null)
      setMessage(result.changed ? null : 'No changes to save.')
      setEditing(false)
    } catch (reason) {
      setConfirmation(null)
      setMessage(reason instanceof ApiError && reason.status === 422
        ? 'The RSVP details changed. Review the latest Guest list and try again.'
        : 'We couldn’t save your RSVP. Please try again.')
    } finally {
      submittingRef.current = false
      setSubmitting(false)
    }
  }

  return <RsvpFormPresentation rsvp={rsvp} presentation={presentation} environment={environment} draft={draft} editingExisting={showEditing && rsvp.status === 'complete'} confirmation={confirmation} message={message} submitting={submitting} accessPanel={runtime.accessRequest ? <AccessRequestPanel runtime={runtime} presentation={presentation} environment={environment} /> : undefined} onChoice={(guestId, choice) => { setDraftState({ signature, values: { ...draft, [guestId]: choice } }); setMessage(null) }} onSubmit={(event) => { event.preventDefault(); void submit() }} onEdit={() => { setConfirmation(null); setMessage(null); setEditing(true) }} />
}

function WebViewHandoff({ currentPath, presentation, environment }: { currentPath: string; presentation: ResolvedRsvpPresentation; environment: RsvpPresentationEnvironment }) {
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'failed'>('idle')
  async function copy() {
    setCopyState(await copyText(canonicalPrivateUrl(window.location.origin, currentPath)) ? 'copied' : 'failed')
  }

  return <div className="mx-auto mt-8 max-w-xl text-center" data-private-rsvp-state="handoff"><RuntimeText as="p" kind="statusHeading" appearance={presentation.statusHeading} environment={environment}>Open this invitation in your browser</RuntimeText><RuntimeText as="p" kind="supportingText" appearance={presentation.supportingText} environment={environment} className="mt-2">For privacy and reliable access, open this link in your regular browser.</RuntimeText><WebsiteAction appearance={presentation.secondaryAction} environment={environment} className="mt-5" data-copy-private-link type="button" onClick={() => { void copy() }}>Copy link</WebsiteAction><RuntimeText as="p" kind="supportingText" appearance={presentation.supportingText} environment={environment} className="mt-3" role="status">{copyState === 'copied' ? 'Link copied.' : copyState === 'failed' ? 'Couldn’t copy the link. Use your browser’s share menu.' : ''}</RuntimeText></div>
}

function TransferPending({ runtime, presentation, environment }: { runtime: NonNullable<ReturnType<typeof usePrivateInvitationRuntime>>; presentation: ResolvedRsvpPresentation; environment: RsvpPresentationEnvironment }) {
  return <div className="mt-8" data-private-rsvp-state="transfer-pending"><RuntimeText as="p" kind="statusHeading" appearance={presentation.statusHeading} environment={environment}>Access request pending</RuntimeText>{runtime.accessRequest && <RuntimeText as="p" kind="supportingText" appearance={presentation.supportingText} environment={environment} className="mt-2">Requested {new Date(runtime.accessRequest.requestedAt).toLocaleString()}. Expires {new Date(runtime.accessRequest.expiresAt).toLocaleString()}.</RuntimeText>}</div>
}

function ClaimedElsewhere({ runtime, presentation, environment }: { runtime: NonNullable<ReturnType<typeof usePrivateInvitationRuntime>>; presentation: ResolvedRsvpPresentation; environment: RsvpPresentationEnvironment }) {
  const [error, setError] = useState(false)
  async function requestAccess() {
    setError(false)
    try { await runtime.onRequestAccess() }
    catch { setError(true) }
  }

  return <div className="mt-8" data-private-rsvp-state="claimed-elsewhere"><RuntimeText as="p" kind="statusHeading" appearance={presentation.statusHeading} environment={environment}>This invitation is linked to another browser.</RuntimeText>{runtime.accessState === 'request_pending' ? <RuntimeText as="p" kind="supportingText" appearance={presentation.supportingText} environment={environment} className="mt-2">An access request is already pending.</RuntimeText> : <>{runtime.accessState === 'can_request' && <WebsiteAction appearance={presentation.primaryAction} environment={environment} className="mt-5" data-request-access type="button" disabled={runtime.accessBusy} aria-busy={runtime.accessBusy || undefined} onClick={() => { void requestAccess() }}>{runtime.accessBusy ? 'Requesting…' : 'Request access'}</WebsiteAction>}</>}{error && <RuntimeText as="p" kind="supportingText" appearance={presentation.supportingText} environment={environment} className="mt-3" style={{ color: '#b91c1c' }} role="alert">We couldn’t request access. Please try again.</RuntimeText>}</div>
}

function AccessRequestPanel({ runtime, presentation, environment }: { runtime: NonNullable<ReturnType<typeof usePrivateInvitationRuntime>>; presentation: ResolvedRsvpPresentation; environment: RsvpPresentationEnvironment }) {
  const request = runtime.accessRequest!
  const device = [request.browserFamily, request.platform].filter(Boolean).join(' on ') || 'Another browser'
  const [error, setError] = useState(false)
  async function resolve(decision: 'approve' | 'reject') {
    setError(false)
    try { await runtime.onResolveAccess(decision) }
    catch { setError(true) }
  }

  return <aside className="mb-6 rounded-lg border border-current/20 p-4" data-access-request><RuntimeText as="p" kind="statusHeading" appearance={presentation.statusHeading} environment={environment}>Access request</RuntimeText><RuntimeText as="p" kind="supportingText" appearance={presentation.supportingText} environment={environment} className="mt-1">{device}</RuntimeText><RuntimeText as="p" kind="supportingText" appearance={presentation.supportingText} environment={environment} className="mt-1">Requested {new Date(request.requestedAt).toLocaleString()}</RuntimeText><div className="mt-4 flex flex-wrap gap-3"><WebsiteAction appearance={presentation.primaryAction} environment={environment} type="button" disabled={runtime.accessBusy} onClick={() => { void resolve('approve') }}>Approve</WebsiteAction><WebsiteAction appearance={presentation.secondaryAction} environment={environment} danger type="button" disabled={runtime.accessBusy} onClick={() => { void resolve('reject') }}>Reject</WebsiteAction></div>{error && <RuntimeText as="p" kind="supportingText" appearance={presentation.supportingText} environment={environment} className="mt-3" style={{ color: '#b91c1c' }} role="alert">We couldn’t update this access request. Refresh and try again.</RuntimeText>}</aside>
}
