import { useState } from 'react'
import { ArrowRight } from 'lucide-react'
import toast from 'react-hot-toast'
import type { Housekeeper, RoomAssignment } from '../../types'
import HousekeeperSelect from './HousekeeperSelect'
import { useTransferRooms } from '../../hooks/useHousekeeping'
import { getToday } from '../../lib/utils'

interface TransferModalProps {
  housekeepers: Housekeeper[]
  assignments: RoomAssignment[]
}

export default function TransferModal({ housekeepers, assignments }: TransferModalProps) {
  const [fromId, setFromId] = useState<number | null>(null)
  const [toId, setToId] = useState<number | null>(null)
  const transfer = useTransferRooms()

  const pendingFromSource = assignments.filter(
    (a) => a.housekeeper_id === fromId && a.status !== 'done'
  )
  const fromName = housekeepers.find((h) => h.id === fromId)?.name ?? ''
  const toName = housekeepers.find((h) => h.id === toId)?.name ?? ''

  async function handleTransfer() {
    if (!fromId || !toId) return
    if (fromId === toId) {
      toast.error('Source and destination must be different')
      return
    }
    try {
      const res = await transfer.mutateAsync({
        date: getToday(),
        from_housekeeper_id: fromId,
        to_housekeeper_id: toId,
        room_numbers: [],
      })
      toast.success(res.message)
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Transfer failed')
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex-1 min-w-[140px]">
          <label className="block text-[10px] uppercase tracking-widest text-gray-400 font-semibold mb-1.5">From</label>
          <HousekeeperSelect
            housekeepers={housekeepers}
            value={fromId}
            onChange={setFromId}
            placeholder="Source housekeeper"
            className="w-full"
          />
        </div>
        <ArrowRight size={18} className="text-gray-400 mt-5 flex-shrink-0" />
        <div className="flex-1 min-w-[140px]">
          <label className="block text-[10px] uppercase tracking-widest text-gray-400 font-semibold mb-1.5">To</label>
          <HousekeeperSelect
            housekeepers={housekeepers}
            value={toId}
            onChange={setToId}
            placeholder="Destination housekeeper"
            className="w-full"
          />
        </div>
        <div className="mt-5">
          <button
            type="button"
            onClick={handleTransfer}
            disabled={!fromId || !toId || fromId === toId || transfer.isPending}
            className="bg-orange hover:bg-orange-dark text-white font-semibold rounded-[10px] px-4 py-2.5 text-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {transfer.isPending ? 'Transferring…' : 'Transfer All Pending Rooms'}
          </button>
        </div>
      </div>

      {fromId && toId && fromId !== toId && (
        <p className="text-xs text-gray-400">
          <span className="font-semibold text-brand-black">{pendingFromSource.length}</span> pending room
          {pendingFromSource.length !== 1 ? 's' : ''} will be transferred from{' '}
          <span className="font-semibold">{fromName}</span> to{' '}
          <span className="font-semibold">{toName}</span>.
        </p>
      )}
    </div>
  )
}
