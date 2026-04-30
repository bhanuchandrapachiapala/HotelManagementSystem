import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'

export default function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [id, setId] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(false)

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const ok = login(id, password)
    if (ok) {
      navigate('/admin')
    } else {
      setError(true)
      setPassword('')
    }
  }

  return (
    <div className="min-h-screen bg-brand-black flex items-center justify-center relative overflow-hidden px-4">
      {/* Radial glow */}
      <div
        className="absolute w-[500px] h-[500px] rounded-full pointer-events-none"
        style={{
          background: 'radial-gradient(circle, rgba(244,121,32,0.18) 0%, transparent 70%)',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
        }}
      />

      <div className="relative z-10 bg-white rounded-card shadow-2xl w-full max-w-sm p-8">
        {/* Hotel name */}
        <div className="text-center mb-6">
          <h1 className="font-display text-3xl font-bold text-brand-black uppercase tracking-wide">
            Casco Bay Hotel
          </h1>
          <p className="text-xs uppercase tracking-[0.2em] text-gray-400 mt-1">Management System</p>
          <div className="mx-auto mt-4 h-[3px] w-10 rounded-full bg-gradient-to-r from-orange to-yellow-hotel" />
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="login-id" className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
              Staff ID
            </label>
            <input
              id="login-id"
              type="text"
              placeholder="Enter your staff ID"
              value={id}
              onChange={(e) => { setId(e.target.value); setError(false) }}
              className="w-full border border-gray-200 focus:border-orange focus:ring-2 focus:ring-orange/10 rounded-[10px] px-4 py-3 outline-none font-body text-sm"
            />
          </div>

          <div>
            <label htmlFor="login-pw" className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
              Password
            </label>
            <input
              id="login-pw"
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError(false) }}
              onKeyDown={(e) => e.key === 'Enter' && handleSubmit(e as unknown as FormEvent)}
              className="w-full border border-gray-200 focus:border-orange focus:ring-2 focus:ring-orange/10 rounded-[10px] px-4 py-3 outline-none font-body text-sm"
            />
          </div>

          {error && (
            <div className="bg-red-light text-red text-sm px-4 py-3 rounded-[10px]">
              Incorrect ID or password. Please try again.
            </div>
          )}

          <button
            type="submit"
            className="w-full py-3 text-sm font-bold text-white rounded-[10px] bg-gradient-to-r from-orange to-yellow-hotel hover:opacity-90 transition-opacity"
          >
            Sign In to Dashboard
          </button>
        </form>
      </div>
    </div>
  )
}
