import { useMemo, useRef, useState, type ReactNode } from 'react'
import { ApiError } from '../../lib/api'
import { canonicalPrivateUrl, copyText } from '../privateEventSite/clipboard'
import { changedRsvpDraft, completeRsvpDraft, rsvpConfirmationMessage, rsvpSubmissionPayload, type RsvpDraft } from '../privateEventSite/rsvpForm'
import { usePrivateInvitationRuntime } from './privateInvitationRuntime'

export function PrivateRsvpRuntime({ children, buttonClassName }: { children: ReactNode; buttonClassName: string }) {
  const runtime = usePrivateInvitationRuntime()
  if (!runtime) return <div data-rsvp-button className={buttonClassName}>{children}</div>

  if (runtime.handoffOnly) return <WebViewHandoff currentPath={runtime.currentPath ?? '/'} buttonClassName={buttonClassName} />

  if (runtime.trustState === 'unclaimed' && runtime.canOpen) {
    return <div className="mt-9"><button data-rsvp-button type="button" className={buttonClassName} disabled={runtime.opening} onClick={runtime.onOpen}>{runtime.opening ? 'Opening…' : 'Open Invitation'}</button>{runtime.openError && <p className="mt-3 text-sm" role="alert">We couldn’t open this invitation. Please try again.</p>}</div>
  }
  if (runtime.trustState === 'claimed_elsewhere') {
    if (runtime.accessState === 'transfer_pending') return <TransferPending runtime={runtime} />
    return <ClaimedElsewhere runtime={runtime} buttonClassName={buttonClassName} />
  }
  if (runtime.trustState === 'unclaimed') {
    return <div className="mt-8" data-private-rsvp-state="inactive"><p className="font-semibold">This invitation is currently unavailable.</p></div>
  }
  if (!runtime.rsvp) return null

  return <TrustedRsvp runtime={runtime} buttonClassName={buttonClassName} />
}

function TrustedRsvp({ runtime, buttonClassName }: { runtime: NonNullable<ReturnType<typeof usePrivateInvitationRuntime>>; buttonClassName: string }) {
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

  const availability = {
    open: 'RSVP responses are open.',
    event_closed: 'RSVP responses are closed. Your current responses are shown below.',
    deadline_passed: 'The RSVP deadline has passed. Your current responses are read-only.',
    invitation_inactive: 'This invitation is inactive. Your current responses are read-only.',
  }[rsvp.availability]

  return <div className="mx-auto mt-8 w-full max-w-xl text-left" data-private-rsvp-state="trusted">
    {runtime.accessRequest && <AccessRequestPanel runtime={runtime} buttonClassName={buttonClassName} />}
    {confirmation && <p className="mb-5 text-center text-lg font-semibold" role="status">{rsvpConfirmationMessage(confirmation)}</p>}
    <div className="flex flex-wrap items-center justify-between gap-2"><strong className="capitalize">{rsvp.status}</strong><span className="text-sm">{rsvp.attendingCount} attending · {rsvp.declinedCount} declined · {rsvp.pendingCount} pending</span></div>
    {showEditing ? <form className="mt-5 space-y-5" onSubmit={(event) => { event.preventDefault(); void submit() }}>
      {rsvp.guests.map((guest) => <fieldset key={guest.id} className="border-t border-current/15 pt-4">
        <legend className="font-medium">{guest.name}</legend>
        <div className="mt-2 flex flex-wrap gap-4">
          {(['attending', 'declined'] as const).map((choice) => <label key={choice} className="inline-flex items-center gap-2 capitalize"><input type="radio" name={`rsvp-${guest.id}`} value={choice} checked={draft[guest.id] === choice} onChange={() => { setDraftState({ signature, values: { ...draft, [guest.id]: choice } }); setMessage(null) }} />{choice}</label>)}
        </div>
      </fieldset>)}
      {!complete && <p className="text-sm">Choose Attending or Declined for every Guest.</p>}
      {message && <p className="text-sm" role="alert">{message}</p>}
      <button data-rsvp-button type="submit" className={buttonClassName} disabled={submitting || !complete || !changed}>{submitting ? 'Saving…' : 'Submit RSVP'}</button>
    </form> : <>
      <ul className="mt-5 divide-y divide-current/15">{rsvp.guests.map((guest) => <li key={guest.id} className="flex items-center justify-between gap-4 py-3"><span className="font-medium">{guest.name}</span><span className="capitalize">{guest.response ?? 'Pending'}</span></li>)}</ul>
      {rsvp.lastUpdated && <p className="mt-4 text-xs">RSVP last updated {new Date(rsvp.lastUpdated).toLocaleString()}</p>}
      <p className="mt-4 text-sm">{availability}</p>
      {message && <p className="mt-3 text-sm" role="alert">{message}</p>}
      {editable && <button data-rsvp-button type="button" className={`${buttonClassName} mt-5`} onClick={() => { setConfirmation(null); setMessage(null); setEditing(true) }}>Update RSVP</button>}
    </>}
  </div>
}

function WebViewHandoff({ currentPath, buttonClassName }: { currentPath: string; buttonClassName: string }) {
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'failed'>('idle')
  async function copy() {
    setCopyState(await copyText(canonicalPrivateUrl(window.location.origin, currentPath)) ? 'copied' : 'failed')
  }

  return <div className="mx-auto mt-8 max-w-xl text-center" data-private-rsvp-state="handoff"><p className="font-semibold">Open this invitation in your browser</p><p className="mt-2 text-sm">For privacy and reliable access, open this link in your regular browser.</p><button data-copy-private-link type="button" className={`${buttonClassName} mt-5`} onClick={() => { void copy() }}>Copy link</button><p className="mt-3 text-sm" role="status">{copyState === 'copied' ? 'Link copied.' : copyState === 'failed' ? 'Couldn’t copy the link. Use your browser’s share menu.' : ''}</p></div>
}

function TransferPending({ runtime }: { runtime: NonNullable<ReturnType<typeof usePrivateInvitationRuntime>> }) {
  return <div className="mt-8" data-private-rsvp-state="transfer-pending"><p className="font-semibold">Access request pending</p>{runtime.accessRequest && <p className="mt-2 text-sm">Requested {new Date(runtime.accessRequest.requestedAt).toLocaleString()}. Expires {new Date(runtime.accessRequest.expiresAt).toLocaleString()}.</p>}</div>
}

function ClaimedElsewhere({ runtime, buttonClassName }: { runtime: NonNullable<ReturnType<typeof usePrivateInvitationRuntime>>; buttonClassName: string }) {
  const [error, setError] = useState(false)
  async function requestAccess() {
    setError(false)
    try { await runtime.onRequestAccess() }
    catch { setError(true) }
  }

  return <div className="mt-8" data-private-rsvp-state="claimed-elsewhere"><p className="font-semibold">This invitation is linked to another browser.</p>{runtime.accessState === 'request_pending' ? <p className="mt-2 text-sm">An access request is already pending.</p> : <>{runtime.accessState === 'can_request' && <button data-request-access type="button" className={`${buttonClassName} mt-5`} disabled={runtime.accessBusy} onClick={() => { void requestAccess() }}>{runtime.accessBusy ? 'Requesting…' : 'Request access'}</button>}</>}{error && <p className="mt-3 text-sm" role="alert">We couldn’t request access. Please try again.</p>}</div>
}

function AccessRequestPanel({ runtime, buttonClassName }: { runtime: NonNullable<ReturnType<typeof usePrivateInvitationRuntime>>; buttonClassName: string }) {
  const request = runtime.accessRequest!
  const device = [request.browserFamily, request.platform].filter(Boolean).join(' on ') || 'Another browser'
  const [error, setError] = useState(false)
  async function resolve(decision: 'approve' | 'reject') {
    setError(false)
    try { await runtime.onResolveAccess(decision) }
    catch { setError(true) }
  }

  return <aside className="mb-6 rounded-lg border border-current/20 p-4" data-access-request><p className="font-semibold">Access request</p><p className="mt-1 text-sm">{device}</p><p className="mt-1 text-xs">Requested {new Date(request.requestedAt).toLocaleString()}</p><div className="mt-4 flex flex-wrap gap-3"><button type="button" className={buttonClassName} disabled={runtime.accessBusy} onClick={() => { void resolve('approve') }}>Approve</button><button type="button" className={buttonClassName} disabled={runtime.accessBusy} onClick={() => { void resolve('reject') }}>Reject</button></div>{error && <p className="mt-3 text-sm" role="alert">We couldn’t update this access request. Refresh and try again.</p>}</aside>
}
