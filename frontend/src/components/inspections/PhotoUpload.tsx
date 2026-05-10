import { useRef, useState } from 'react'
import { Camera, X, Upload } from 'lucide-react'
import toast from 'react-hot-toast'
import { useGetUploadUrl } from '../../hooks/useInspections'
import { cn } from '../../lib/utils'

interface PhotoUploadProps {
  inspectionId: number
  issueId?: number
  photoType: 'before' | 'after'
  existingUrl?: string
  onUploaded: (url: string) => void
}

export default function PhotoUpload({
  inspectionId,
  issueId,
  photoType,
  existingUrl,
  onUploaded,
}: PhotoUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [previewUrl, setPreviewUrl] = useState<string | undefined>(existingUrl)
  const [error, setError] = useState<string | null>(null)

  const getUploadUrl = useGetUploadUrl()

  function handleClick() {
    fileInputRef.current?.click()
  }

  async function handleFile(file: File) {
    if (!file) return
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be smaller than 5MB')
      return
    }

    setUploading(true)
    setError(null)
    setProgress(0)

    try {
      const ext = (file.name.split('.').pop() || 'jpg').toLowerCase()
      const result = await getUploadUrl.mutateAsync({
        inspection_id: inspectionId,
        issue_id: issueId,
        photo_type: photoType,
        file_extension: ext,
      })

      if (!result.upload_url) throw new Error('No upload URL returned')

      // Upload via PUT with progress
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest()
        xhr.open('PUT', result.upload_url as string)
        xhr.setRequestHeader('Content-Type', file.type)
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) {
            setProgress(Math.round((e.loaded / e.total) * 100))
          }
        }
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) resolve()
          else reject(new Error(`Upload failed: ${xhr.status}`))
        }
        xhr.onerror = () => reject(new Error('Upload network error'))
        xhr.send(file)
      })

      if (result.public_url) {
        setPreviewUrl(result.public_url)
        onUploaded(result.public_url)
        toast.success('Photo uploaded')
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Upload failed'
      setError(msg)
      toast.error(msg)
    } finally {
      setUploading(false)
      setProgress(0)
    }
  }

  function handleRemove() {
    setPreviewUrl(undefined)
    onUploaded('')
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  if (previewUrl) {
    return (
      <div className="relative inline-block">
        <img
          src={previewUrl}
          alt="Uploaded"
          className="h-32 w-32 object-cover rounded-[10px] border border-gray-200"
        />
        <button
          type="button"
          onClick={handleRemove}
          className="absolute -top-2 -right-2 bg-red text-white rounded-full p-1 hover:bg-red/80 shadow-sm"
          aria-label="Remove photo"
        >
          <X size={14} />
        </button>
      </div>
    )
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleClick}
        disabled={uploading}
        className={cn(
          'w-full border-2 border-dashed rounded-[10px] py-8 px-4 flex flex-col items-center justify-center gap-2 transition-colors',
          uploading
            ? 'border-orange bg-orange-light/30'
            : 'border-gray-300 hover:border-orange hover:bg-orange-light/10'
        )}
      >
        {uploading ? (
          <>
            <Upload size={28} className="text-orange animate-pulse" />
            <span className="text-sm text-orange font-semibold">Uploading… {progress}%</span>
            <div className="w-full max-w-[200px] h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full bg-orange transition-all" style={{ width: `${progress}%` }} />
            </div>
          </>
        ) : (
          <>
            <Camera size={28} className="text-gray-400" />
            <span className="text-sm font-semibold text-gray-600">Tap to take photo or upload</span>
            <span className="text-xs text-gray-400">JPG, PNG, WebP · Max 5MB</span>
          </>
        )}
      </button>
      {error && <p className="text-xs text-red mt-1">{error}</p>}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        capture="environment"
        onChange={(e) => {
          const f = e.target.files?.[0]
          if (f) handleFile(f)
        }}
        className="hidden"
      />
    </div>
  )
}
