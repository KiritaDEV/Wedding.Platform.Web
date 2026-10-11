import { useEffect, useRef, useState } from 'react'
import type { MediaAsset } from './types'

export type MediaUploadStatus = 'queued' | 'uploading' | 'success' | 'failed'
export type MediaUploadQueueItem = { id: string; file: File; status: MediaUploadStatus; error?: string }
export type MediaUploadBatchResult = { fileCount: number; assets: MediaAsset[] }

type PendingItem = Pick<MediaUploadQueueItem, 'id' | 'file'> & { batchId: string }
type Batch = { fileCount: number; remaining: number; assets: MediaAsset[] }

const acceptedTypes = new Set(['image/jpeg', 'image/png', 'image/webp'])
const maxBytes = 20 * 1024 * 1024
let fallbackIdSequence = 0

function createQueueId(): string {
  if (typeof globalThis.crypto?.randomUUID === 'function') return globalThis.crypto.randomUUID()
  fallbackIdSequence += 1
  return `media-upload-${Date.now().toString(36)}-${fallbackIdSequence.toString(36)}-${Math.random().toString(36).slice(2)}`
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Unable to upload this image.'
}

export function useMediaUploadQueue({ upload, onBatchComplete }: {
  upload: (file: File) => Promise<MediaAsset>
  onBatchComplete?: (result: MediaUploadBatchResult) => void
}) {
  const pending = useRef<PendingItem[]>([])
  const processing = useRef(false)
  const batches = useRef(new Map<string, Batch>())
  const callback = useRef(onBatchComplete)
  const [queue, setQueue] = useState<MediaUploadQueueItem[]>([])

  useEffect(() => {
    callback.current = onBatchComplete
  }, [onBatchComplete])

  const update = (id: string, change: Partial<MediaUploadQueueItem>) => setQueue((current) => current.map((item) => item.id === id ? { ...item, ...change } : item))

  const complete = (batchId: string, asset?: MediaAsset) => {
    const batch = batches.current.get(batchId)
    if (!batch) return
    if (asset) batch.assets.push(asset)
    batch.remaining -= 1
    if (batch.remaining === 0) {
      batches.current.delete(batchId)
      callback.current?.({ fileCount: batch.fileCount, assets: batch.assets })
    }
  }

  const processQueue = async () => {
    if (processing.current) return
    processing.current = true
    while (pending.current.length > 0) {
      const item = pending.current.shift()
      if (!item) continue
      update(item.id, { status: 'uploading' })
      try {
        const asset = await upload(item.file)
        update(item.id, { status: 'success' })
        complete(item.batchId, asset)
      } catch (error) {
        update(item.id, { status: 'failed', error: errorMessage(error) })
        complete(item.batchId)
      }
    }
    processing.current = false
  }

  const enqueue = (files: File[]) => {
    if (files.length === 0) return
    const batchId = createQueueId()
    batches.current.set(batchId, { fileCount: files.length, remaining: files.length, assets: [] })
    const invalidBatchItems: string[] = []
    const items = files.map((file): MediaUploadQueueItem => {
      const item = { id: createQueueId(), file, status: 'queued' as const }
      if (!acceptedTypes.has(file.type)) {
        invalidBatchItems.push(batchId)
        return { ...item, status: 'failed', error: 'Only JPEG, PNG, and WebP images are supported.' }
      }
      if (file.size > maxBytes) {
        invalidBatchItems.push(batchId)
        return { ...item, status: 'failed', error: 'Image exceeds the 20 MB upload limit.' }
      }
      pending.current.push({ ...item, batchId })
      return item
    })
    setQueue((current) => [...items, ...current])
    invalidBatchItems.forEach((invalidBatchId) => complete(invalidBatchId))
    void processQueue()
  }

  return {
    queue,
    enqueue,
    clearCompleted: () => setQueue((current) => current.filter(({ status }) => status === 'queued' || status === 'uploading')),
  }
}
