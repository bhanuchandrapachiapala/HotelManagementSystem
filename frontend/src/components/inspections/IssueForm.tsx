import { useState } from 'react'
import { cn } from '../../lib/utils'
import PhotoUpload from './PhotoUpload'

const CATEGORIES: Array<{ id: string; emoji: string; label: string }> = [
  { id: 'cleanliness', emoji: '🧹', label: 'Cleanliness' },
  { id: 'maintenance', emoji: '🔧', label: 'Maintenance' },
  { id: 'furniture', emoji: '🪑', label: 'Furniture' },
  { id: 'plumbing', emoji: '🚿', label: 'Plumbing' },
  { id: 'electrical', emoji: '⚡', label: 'Electrical' },
  { id: 'hvac', emoji: '❄️', label: 'HVAC' },
  { id: 'safety', emoji: '🔒', label: 'Safety' },
  { id: 'cosmetic', emoji: '🎨', label: 'Cosmetic' },
]

const SEVERITIES: Array<{ id: string; emoji: string; label: string; subtitle: string; color: string }> = [
  { id: 'urgent',   emoji: '🔴', label: 'Urgent',   subtitle: 'Fix before next check-in', color: 'bg-red-100 border-red-300 text-red-800' },
  { id: 'standard', emoji: '🟡', label: 'Standard', subtitle: 'Fix within 24h',          color: 'bg-yellow-100 border-yellow-300 text-yellow-800' },
  { id: 'minor',    emoji: '🔵', label: 'Minor',    subtitle: 'Fix when possible',       color: 'bg-blue-100 border-blue-300 text-blue-800' },
  { id: 'note',     emoji: '📝', label: 'Note',     subtitle: 'Record only',             color: 'bg-gray-100 border-gray-300 text-gray-700' },
]

const LOCATIONS = ['Bathroom', 'Bedroom', 'Closet', 'Entryway', 'Balcony', 'Common area', 'Other']

export interface IssueDraft {
  category: string
  severity: string
  location_in_room: string
  description: string
  before_photo_url?: string
}

interface IssueFormProps {
  inspectionId: number
  onAdd: (issue: IssueDraft) => void
  onCancel: () => void
}

export default function IssueForm({ inspectionId, onAdd, onCancel }: IssueFormProps) {
  const [category, setCategory] = useState('')
  const [severity, setSeverity] = useState('standard')
  const [location, setLocation] = useState('')
  const [description, setDescription] = useState('')
  const [photoUrl, setPhotoUrl] = useState<string | undefined>(undefined)

  const canSubmit = category && severity && description.trim().length >= 5

  function handleSubmit() {
    if (!canSubmit) return
    onAdd({
      category,
      severity,
      location_in_room: location || undefined as unknown as string,
      description: description.trim(),
      before_photo_url: photoUrl,
    })
  }

  return (
    <div className="bg-gray-50 rounded-[12px] p-5 space-y-5 border border-gray-200">
      {/* Category */}
      <div>
        <label className="block text-xs uppercase tracking-widest text-gray-500 font-bold mb-2">
          Category
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setCategory(cat.id)}
              className={cn(
                'flex flex-col items-center justify-center gap-1 py-3 rounded-[10px] border-2 transition-all min-h-[70px]',
                category === cat.id
                  ? 'border-orange bg-orange text-white'
                  : 'border-gray-200 bg-white text-gray-700 hover:border-orange/50'
              )}
            >
              <span className="text-2xl">{cat.emoji}</span>
              <span className="text-xs font-semibold">{cat.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Severity */}
      <div>
        <label className="block text-xs uppercase tracking-widest text-gray-500 font-bold mb-2">
          Severity
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {SEVERITIES.map((sev) => (
            <button
              key={sev.id}
              type="button"
              onClick={() => setSeverity(sev.id)}
              className={cn(
                'flex flex-col items-start gap-0.5 px-3 py-3 rounded-[10px] border-2 transition-all min-h-[70px]',
                severity === sev.id
                  ? sev.color + ' border-current'
                  : 'border-gray-200 bg-white hover:border-gray-300'
              )}
            >
              <div className="flex items-center gap-1.5 font-bold text-sm">
                <span>{sev.emoji}</span>
                <span>{sev.label}</span>
              </div>
              <span className="text-[10px] leading-tight opacity-80">{sev.subtitle}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Location */}
      <div>
        <label className="block text-xs uppercase tracking-widest text-gray-500 font-bold mb-2">
          Location in Room
        </label>
        <select
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          className="w-full text-base border-2 border-gray-200 focus:border-orange rounded-[10px] px-4 py-3 outline-none bg-white min-h-[48px]"
        >
          <option value="">Select location…</option>
          {LOCATIONS.map((loc) => <option key={loc} value={loc}>{loc}</option>)}
        </select>
      </div>

      {/* Description */}
      <div>
        <label className="block text-xs uppercase tracking-widest text-gray-500 font-bold mb-2">
          Description
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Describe what you found…"
          rows={3}
          className="w-full text-base border-2 border-gray-200 focus:border-orange rounded-[10px] px-4 py-3 outline-none resize-none"
        />
        {description.length > 0 && description.trim().length < 5 && (
          <p className="text-xs text-red mt-1">At least 5 characters required</p>
        )}
      </div>

      {/* Photo */}
      <div>
        <label className="block text-xs uppercase tracking-widest text-gray-500 font-bold mb-2">
          Photo (optional)
        </label>
        <PhotoUpload
          inspectionId={inspectionId}
          photoType="before"
          existingUrl={photoUrl}
          onUploaded={(url) => setPhotoUrl(url || undefined)}
        />
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-2">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!canSubmit}
          className="flex-1 bg-orange hover:bg-orange-dark text-white font-bold rounded-[10px] py-3.5 text-base transition-colors disabled:opacity-40 min-h-[48px]"
        >
          Add Issue
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-5 text-sm font-semibold text-gray-500 hover:text-gray-700 min-h-[48px]"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}
