interface SubmitButtonProps {
  hasSelection: boolean
  isLoading: boolean
  onClick: () => void
}

export default function SubmitButton({ hasSelection, isLoading, onClick }: SubmitButtonProps) {
  const enabled = hasSelection && !isLoading

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!enabled}
      className={`w-full py-3.5 text-sm font-bold rounded-[10px] transition-all ${
        enabled
          ? 'bg-gradient-to-r from-orange to-yellow-hotel text-white hover:opacity-90 shadow-md'
          : 'bg-gray-200 text-gray-400 cursor-not-allowed'
      }`}
    >
      {isLoading ? 'Saving…' : 'Save Progress'}
    </button>
  )
}
