import { Globe2, Plus, RefreshCw } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Button } from '../../components/ui/Button'
import { Dialog, DialogFooter, DialogHeader } from '../../components/ui/Dialog'
import { Input } from '../../components/ui/Input'
import { Select } from '../../components/ui/Select'
import { Text } from '../../components/ui/Text'
import { useEventWorkspace } from '../../features/events/workspace/EventWorkspaceContext'
import { WorkspaceSection } from '../../features/events/workspace/WorkspaceSection'
import { createWebsiteProject, publishWebsiteProject, unpublishWebsite } from '../../features/websiteProjects/api'
import { websiteTemplateDisplayName } from '../../features/websiteProjects/templates'
import { useWebsiteProjects } from '../../features/websiteProjects/useWebsiteProjects'
import { useWebsiteCreationTemplates } from '../../features/websiteTemplates/useWebsiteCreationTemplates'

export function WebsiteProjectsPage() {
  const event = useEventWorkspace()
  const navigate = useNavigate()
  const { projects, error, isLoading, retry } = useWebsiteProjects(event.id)
  const templateCatalog = useWebsiteCreationTemplates(event.id)
  const [creating, setCreating] = useState(false)
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('Website')
  const [templateKey, setTemplateKey] = useState('')
  const [formError, setFormError] = useState<string | null>(null)
  const [publishingId, setPublishingId] = useState<string | null>(null)
  const [publicationError, setPublicationError] = useState<string | null>(null)

  const selectedTemplateKey = templateKey || templateCatalog.templates[0]?.key || ''

  async function create() {
    const trimmed = name.trim()
    if (!trimmed || trimmed.length > 100 || !selectedTemplateKey) return
    setCreating(true); setFormError(null)
    try {
      const draft = await createWebsiteProject(event.id, { name: trimmed, templateKey: selectedTemplateKey })
      setOpen(false)
      navigate(`/events/${event.id}/websites/${draft.id}`)
    } catch (createError) {
      setFormError(createError instanceof Error ? createError.message : 'Unable to create the Website Project.')
    } finally {
      setCreating(false)
    }
  }

  async function changePublication(projectId: string | null) {
    setPublishingId(projectId ?? 'unpublish'); setPublicationError(null)
    try {
      if (projectId) await publishWebsiteProject(event.id, projectId)
      else await unpublishWebsite(event.id)
      retry()
    } catch (reason) {
      setPublicationError(reason instanceof Error ? reason.message : 'Unable to change publication.')
    } finally {
      setPublishingId(null)
    }
  }

  return <WorkspaceSection eyebrow="Event websites" title="Website Projects" description="Create and manage independent Website drafts for this Event.">
    <div className="flex justify-end"><Button type="button" onClick={() => setOpen(true)}><Plus aria-hidden="true" size={16} /> Create Website</Button></div>
    {publicationError && <Text className="mt-4" variant="error" role="alert">{publicationError}</Text>}
    {isLoading && <Text className="mt-6" variant="muted">Loading Website Projects…</Text>}
    {Boolean(error) && <div className="mt-6 rounded-xl border border-border bg-surface p-5"><Text variant="error">Unable to load Website Projects.</Text><Button className="mt-3" size="sm" type="button" onClick={retry}><RefreshCw aria-hidden="true" size={15} /> Try again</Button></div>}
    {!isLoading && !error && projects.length === 0 && <section className="mt-6 rounded-2xl border border-dashed border-border bg-surface p-8 text-center"><Globe2 className="mx-auto text-secondary-accent" aria-hidden="true" /><h2 className="mt-3 font-semibold">No Website Projects yet</h2><Text className="mt-1" variant="muted">Create a Website to start with a fresh Template and independent draft.</Text><Button className="mt-5" type="button" onClick={() => setOpen(true)}>Create Website</Button></section>}
    {!isLoading && !error && projects.length > 0 && <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{projects.map((project) => <article className="flex min-h-48 flex-col rounded-2xl border border-border bg-surface p-5" key={project.id}><div className="flex items-start justify-between gap-3"><span className="grid size-10 place-items-center rounded-lg bg-surface-muted text-secondary-accent"><Globe2 aria-hidden="true" size={20} /></span>{project.isPublished && <span className="rounded-full bg-surface-muted px-2.5 py-1 text-xs font-semibold text-foreground">Published</span>}</div><h2 className="mt-4 truncate font-semibold">{project.name}</h2><Text className="mt-1" variant="muted">{websiteTemplateDisplayName(templateCatalog.templates, project.templateKey)}</Text><div className="mt-auto flex flex-wrap gap-2 pt-5"><Link className="inline-flex min-h-9 items-center rounded-sm bg-accent px-3 py-1.5 text-sm font-medium text-accent-foreground hover:bg-accent-hover" to={project.id}>Open Website</Link>{project.isPublished ? <Button size="sm" variant="secondary" type="button" disabled={publishingId !== null} onClick={() => void changePublication(null)}>{publishingId === 'unpublish' ? 'Unpublishing…' : 'Unpublish'}</Button> : <Button size="sm" variant="secondary" type="button" disabled={publishingId !== null} onClick={() => void changePublication(project.id)}>{publishingId === project.id ? 'Publishing…' : 'Publish'}</Button>}</div></article>)}</div>}
    <Dialog open={open} onClose={() => !creating && setOpen(false)} closeDisabled={creating} titleId="create-website-title" descriptionId="create-website-description">
      <form className="p-5 sm:p-6" onSubmit={(formEvent) => { formEvent.preventDefault(); void create() }}>
        <DialogHeader title="Create Website" titleId="create-website-title" description="Choose a name and starting Template. The Template is fixed for this project." descriptionId="create-website-description" onClose={() => setOpen(false)} closeDisabled={creating} />
        <div className="mt-5 space-y-4">
          <label className="block text-sm font-medium" htmlFor="project-name">Project Name</label>
          <Input id="project-name" value={name} maxLength={100} required disabled={creating} onChange={(event) => setName(event.target.value)} />
          <label className="block text-sm font-medium" htmlFor="project-template">Template</label>
          {templateCatalog.isLoading && <Text variant="muted">Loading Templates…</Text>}
          {Boolean(templateCatalog.error) && <div><Text variant="error">Unable to load available Templates.</Text><Button className="mt-2" size="sm" variant="secondary" type="button" onClick={templateCatalog.retry}>Try again</Button></div>}
          {!templateCatalog.isLoading && !templateCatalog.error && templateCatalog.templates.length === 0 && <Text variant="muted">No Templates are currently available for this Event.</Text>}
          {templateCatalog.templates.length > 0 && <Select id="project-template" value={selectedTemplateKey} disabled={creating} options={templateCatalog.templates.map((template) => ({ value: template.key, label: template.displayName }))} onChange={setTemplateKey} />}
          {formError && <Text variant="error" role="alert">{formError}</Text>}
        </div>
        <DialogFooter className="mt-6 border-t border-border pt-4"><Button variant="secondary" type="button" disabled={creating} onClick={() => setOpen(false)}>Cancel</Button><Button type="submit" disabled={creating || templateCatalog.isLoading || Boolean(templateCatalog.error) || !selectedTemplateKey || !name.trim() || name.trim().length > 100}>{creating ? 'Creating…' : 'Create Website'}</Button></DialogFooter>
      </form>
    </Dialog>
  </WorkspaceSection>
}
