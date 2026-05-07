import { useState, useEffect, useRef } from 'react'
import { createGroupContract } from '../../lib/api'
import type { CreateGroupContractRequest } from '../../types'

export default function GroupInquiryPage() {
  // ── State ──
  const [activeSlide, setActiveSlide] = useState(0)
  const [counters, setCounters] = useState({ rooms: 0, shuttle: 0, miles: 0 })
  const [cardsVisible, setCardsVisible] = useState(false)
  const featuresRef = useRef<HTMLDivElement>(null)

  // Form state
  const [form, setForm] = useState({
    group_name: '', contact_name: '', contact_phone: '',
    check_in_date: '', check_out_date: '',
    room_count: '', room_type: 'standard', special_notes: '',
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [submitError, setSubmitError] = useState('')

  // Contract/policy section state
  const [contractVisible, setContractVisible] = useState([false, false, false, false, false])
  const [contractOpen, setContractOpen] = useState([true, false, false, false, false])
  const [contractHovered, setContractHovered] = useState([false, false, false, false, false])
  const contractRefs = useRef<(HTMLDivElement | null)[]>([null, null, null, null, null])

  const slides = ['/images/lobby.jpg', '/images/room.jpg']

  // Auto-advance carousel every 5 seconds
  useEffect(() => {
    const t = setInterval(() => setActiveSlide(p => (p + 1) % slides.length), 5000)
    return () => clearInterval(t)
  }, [])

  // Count-up animation for stat counters
  useEffect(() => {
    const duration = 2000
    const steps = 60
    let step = 0
    const t = setInterval(() => {
      step++
      const p = step / steps
      setCounters({
        rooms: Math.round(136 * p),
        shuttle: Math.round(24 * p),
        miles: Math.round(2.5 * p * 10) / 10,
      })
      if (step >= steps) clearInterval(t)
    }, duration / steps)
    return () => clearInterval(t)
  }, [])

  // IntersectionObserver for feature card fade-in
  useEffect(() => {
    if (!featuresRef.current) return
    const observer = new IntersectionObserver(
      entries => { if (entries[0].isIntersecting) setCardsVisible(true) },
      { threshold: 0.1 }
    )
    observer.observe(featuresRef.current)
    return () => observer.disconnect()
  }, [])

  // IntersectionObserver for contract/policy section cards (staggered)
  useEffect(() => {
    const observers = contractRefs.current.map((el, i) => {
      if (!el) return null
      const obs = new IntersectionObserver(
        entries => {
          if (entries[0].isIntersecting)
            setContractVisible(prev => { const n = [...prev]; n[i] = true; return n })
        },
        { threshold: 0.1 }
      )
      obs.observe(el)
      return obs
    })
    return () => observers.forEach(o => o?.disconnect())
  }, [])

  function toggleContract(i: number) {
    setContractOpen(prev => { const n = [...prev]; n[i] = !n[i]; return n })
  }

  function contractCardStyle(i: number) {
    const h = contractHovered[i]
    const v = contractVisible[i]
    return {
      opacity: v ? 1 : 0,
      transform: v ? `translateY(${h ? -3 : 0}px)` : 'translateY(30px)',
      transition: `opacity 0.5s ease ${i * 150}ms, transform 0.5s ease ${i * 150}ms, box-shadow 0.2s ease 0s`,
      boxShadow: h ? '0 8px 28px rgba(0,0,0,0.12)' : '0 1px 4px rgba(0,0,0,0.06)',
      borderLeft: h ? '3px solid #F47920' : undefined,
    }
  }

  function scrollToForm() {
    document.getElementById('inquiry-form')?.scrollIntoView({ behavior: 'smooth' })
  }

  function setField(field: string, value: string) {
    setForm(f => ({ ...f, [field]: value }))
    setErrors(e => ({ ...e, [field]: '' }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const errs: Record<string, string> = {}
    if (!form.group_name.trim()) errs.group_name = 'Required'
    if (!form.contact_name.trim()) errs.contact_name = 'Required'
    if (!form.contact_phone.trim()) errs.contact_phone = 'Required'
    if (!form.check_in_date) errs.check_in_date = 'Required'
    if (!form.check_out_date) errs.check_out_date = 'Required'
    if (!form.room_count || parseInt(form.room_count) < 1) errs.room_count = 'At least 1 room required'
    if (Object.keys(errs).length) { setErrors(errs); return }

    setSubmitting(true)
    setSubmitError('')
    try {
      const payload: CreateGroupContractRequest = {
        group_name: form.group_name.trim(),
        contact_name: form.contact_name.trim(),
        contact_phone: form.contact_phone.trim(),
        check_in_date: form.check_in_date,
        check_out_date: form.check_out_date,
        room_count: parseInt(form.room_count),
        room_type: form.room_type === 'not_sure' ? 'standard' : form.room_type,
        special_notes: form.special_notes.trim() || undefined,
        source: 'public_form',
      }
      await createGroupContract(payload)
      setSubmitted(true)
    } catch (err: unknown) {
      setSubmitError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const inputCls = (field: string) =>
    `w-full border rounded-xl px-4 py-3 text-sm outline-none transition-colors font-body ${
      errors[field]
        ? 'border-red-400 focus:border-red-500 focus:ring-2 focus:ring-red-100'
        : 'border-gray-200 focus:border-[#F47920] focus:ring-2 focus:ring-[#F47920]/10'
    }`

  const features = [
    { icon: '✈️', title: 'Airport Proximity', desc: 'Just 2.5 miles from Portland International Jetport — only 8 minutes away. No long rides, no waiting.' },
    { icon: '🚐', title: 'Free 24/7 Shuttle Service', desc: 'Complimentary airport shuttle running around the clock. We\'re there whenever your team lands, day or night.' },
    { icon: '🍳', title: 'Complimentary Breakfast', desc: 'Start every morning right with our complimentary continental breakfast served daily from 6:30 to 9:30 AM.' },
    { icon: '💪', title: 'Fitness Center', desc: 'Keep your routine on the road with our fully equipped fitness center featuring cardio machines and free weights.' },
    { icon: '🏢', title: 'Group-Friendly Rates', desc: 'Special negotiated rates for groups of 10+ rooms. Flexible room types including Standard, Triple, and Quad configurations.' },
    { icon: '🌿', title: 'Peaceful Environment', desc: 'Professional atmosphere with quiet hours from 9 PM–7 AM. Perfect for teams that need rest and focus.' },
  ]

  const amenities = [
    'Complimentary Continental Breakfast', 'Free Airport Shuttle (24/7)',
    'Free Parking', 'High-Speed WiFi',
    'Fitness Center Access', 'Flat-Screen TV in Every Room',
    'Daily Housekeeping', 'Flexible Check-in 3 PM / Check-out 11 AM',
  ]

  return (
    <div className="min-h-screen bg-white font-body">

      {/* ── SECTION 1: HERO ── */}
      <section className="relative h-[90vh] min-h-[600px] flex items-center justify-center overflow-hidden">
        {/* Image carousel */}
        {slides.map((src, i) => (
          <img
            key={src}
            src={src}
            alt=""
            className="absolute inset-0 w-full h-full object-cover transition-opacity duration-[800ms]"
            style={{ opacity: i === activeSlide ? 1 : 0 }}
          />
        ))}
        {/* Dark gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/40 to-black/20" />

        {/* Hero content */}
        <div className="relative z-10 text-center text-white px-4 max-w-3xl mx-auto">
          <p className="text-xs uppercase tracking-[0.3em] text-white/60 mb-4">Welcome to</p>
          <h1 className="font-display text-5xl md:text-6xl font-bold uppercase tracking-widest mb-4 leading-tight">
            Casco Bay Hotel
          </h1>
          <p className="text-xl md:text-2xl font-light text-white/90 mb-8">
            Your Premier Group Destination in Southern Maine
          </p>

          {/* Animated stat counters */}
          <div className="flex items-center justify-center gap-8 md:gap-12 mb-10">
            {[
              { value: counters.rooms, label: 'Rooms', suffix: '' },
              { value: counters.shuttle, label: 'Shuttle', suffix: '/7' },
              { value: counters.miles, label: 'Miles to Airport', suffix: '' },
            ].map(({ value, label, suffix }) => (
              <div key={label} className="text-center">
                <p className="font-display text-3xl md:text-4xl font-bold text-[#FDB924]">
                  {value}{suffix}
                </p>
                <p className="text-xs uppercase tracking-widest text-white/60 mt-1">{label}</p>
              </div>
            ))}
          </div>

          <button
            onClick={scrollToForm}
            className="bg-[#F47920] hover:bg-[#d96810] text-white font-bold px-10 py-4 rounded-full text-base transition-all hover:shadow-xl hover:-translate-y-0.5"
          >
            Request Group Rate →
          </button>
        </div>

        {/* Slide dots */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2 z-10">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => setActiveSlide(i)}
              className={`w-2 h-2 rounded-full transition-all ${i === activeSlide ? 'bg-white w-6' : 'bg-white/40'}`}
            />
          ))}
        </div>
      </section>

      {/* ── SECTION 2: WHY CHOOSE US ── */}
      <section className="py-20 px-4 bg-[#FAFAFA]" ref={featuresRef}>
        <div className="max-w-[900px] mx-auto">
          <div className="text-center mb-12">
            <h2 className="font-display text-3xl md:text-4xl font-bold text-[#1A1A1A] mb-3">
              Why Groups Choose Casco Bay Hotel
            </h2>
            <p className="text-gray-500 text-lg max-w-xl mx-auto">
              The perfect base for corporate teams, sports groups, and organizations
            </p>
            <div className="mx-auto mt-4 h-[3px] w-12 rounded-full bg-gradient-to-r from-[#F47920] to-[#FDB924]" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f, i) => (
              <div
                key={f.title}
                className={`bg-white rounded-2xl p-6 border border-gray-100 shadow-sm transition-all duration-500 hover:shadow-md hover:-translate-y-1 hover:border-l-4 hover:border-l-[#F47920] ${
                  cardsVisible
                    ? 'opacity-100 translate-y-0'
                    : 'opacity-0 translate-y-6'
                }`}
                style={{ transitionDelay: `${i * 80}ms` }}
              >
                <div className="text-3xl mb-3">{f.icon}</div>
                <h3 className="font-display text-lg font-bold text-[#1A1A1A] mb-2">{f.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── SECTION 3: ROOM SHOWCASE ── */}
      <section className="py-20 px-4 bg-white">
        <div className="max-w-[900px] mx-auto">
          <div className="text-center mb-10">
            <h2 className="font-display text-3xl font-bold text-[#1A1A1A] mb-2">Our Spaces</h2>
            <div className="mx-auto mt-3 h-[3px] w-12 rounded-full bg-gradient-to-r from-[#F47920] to-[#FDB924]" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[
              { src: '/images/lobby.jpg', caption: 'Modern Common Areas' },
              { src: '/images/room.jpg', caption: 'Comfortable Guest Rooms' },
            ].map(({ src, caption }) => (
              <div key={caption} className="relative overflow-hidden rounded-2xl group aspect-[4/3] bg-gray-100">
                <img
                  src={src}
                  alt={caption}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-black/20 group-hover:bg-black/35 transition-colors duration-300" />
                <div className="absolute bottom-0 left-0 right-0 p-4">
                  <p className="text-white font-display font-semibold text-lg drop-shadow-md">{caption}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── SECTION 4: WHAT'S INCLUDED ── */}
      <section className="py-20 px-4 bg-[#FAFAFA]">
        <div className="max-w-[900px] mx-auto">
          <div className="text-center mb-10">
            <h2 className="font-display text-3xl font-bold text-[#1A1A1A] mb-2">What's Included</h2>
            <p className="text-gray-500">Every group booking includes these amenities at no extra cost</p>
            <div className="mx-auto mt-4 h-[3px] w-12 rounded-full bg-gradient-to-r from-[#F47920] to-[#FDB924]" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-[700px] mx-auto">
            {amenities.map(item => (
              <div key={item} className="flex items-center gap-3">
                <span className="text-[#F47920] font-bold text-lg flex-shrink-0">✓</span>
                <span className="text-gray-700 text-sm">{item}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── SECTION 5: INQUIRY FORM ── */}
      <section id="inquiry-form" className="py-20 px-4 bg-white">
        <div className="max-w-[640px] mx-auto">
          <div className="text-center mb-8">
            <h2 className="font-display text-3xl font-bold text-[#1A1A1A] mb-2">Request Your Group Rate</h2>
            <p className="text-gray-500">Fill out the form below and our team will get back to you within 24 hours.</p>
            <div className="mx-auto mt-4 h-[3px] w-12 rounded-full bg-gradient-to-r from-[#F47920] to-[#FDB924]" />
          </div>

          <div className="bg-white rounded-2xl shadow-lg border-t-4 border-t-[#F47920] border border-gray-100 p-8">
            {submitted ? (
              /* Success state */
              <div className="text-center py-6">
                <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-5">
                  <span className="text-4xl">✅</span>
                </div>
                <h3 className="font-display text-2xl font-bold text-[#1A1A1A] mb-2">
                  Thank you, {form.group_name}!
                </h3>
                <p className="text-gray-600 mb-4">
                  Your inquiry has been received. Our team will contact{' '}
                  <span className="font-semibold">{form.contact_name}</span> at{' '}
                  <span className="font-semibold">{form.contact_phone}</span> within 24 hours to discuss your group rates.
                </p>
                <p className="text-gray-500 text-sm">
                  In the meantime, feel free to call us directly at{' '}
                  <a href="tel:+12077723838" className="text-[#F47920] font-semibold hover:underline">(207) 772-3838</a>
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                {/* Group name */}
                <div>
                  <label className="block text-xs font-semibold text-gray-600 uppercase tracking-widest mb-1.5">
                    Group / Company Name *
                  </label>
                  <input
                    className={inputCls('group_name')}
                    value={form.group_name}
                    onChange={e => setField('group_name', e.target.value)}
                    placeholder="e.g. Acme Corporation"
                  />
                  {errors.group_name && <p className="text-xs text-red-500 mt-1">{errors.group_name}</p>}
                </div>

                {/* Contact name + phone */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 uppercase tracking-widest mb-1.5">
                      Contact Name *
                    </label>
                    <input
                      className={inputCls('contact_name')}
                      value={form.contact_name}
                      onChange={e => setField('contact_name', e.target.value)}
                      placeholder="Full name"
                    />
                    {errors.contact_name && <p className="text-xs text-red-500 mt-1">{errors.contact_name}</p>}
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 uppercase tracking-widest mb-1.5">
                      Phone Number *
                    </label>
                    <input
                      className={inputCls('contact_phone')}
                      value={form.contact_phone}
                      onChange={e => setField('contact_phone', e.target.value)}
                      placeholder="(555) 000-0000"
                    />
                    {errors.contact_phone && <p className="text-xs text-red-500 mt-1">{errors.contact_phone}</p>}
                  </div>
                </div>

                {/* Dates */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 uppercase tracking-widest mb-1.5">
                      Check-in Date *
                    </label>
                    <input
                      type="date"
                      className={inputCls('check_in_date')}
                      value={form.check_in_date}
                      onChange={e => setField('check_in_date', e.target.value)}
                    />
                    {errors.check_in_date && <p className="text-xs text-red-500 mt-1">{errors.check_in_date}</p>}
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 uppercase tracking-widest mb-1.5">
                      Check-out Date *
                    </label>
                    <input
                      type="date"
                      className={inputCls('check_out_date')}
                      value={form.check_out_date}
                      onChange={e => setField('check_out_date', e.target.value)}
                    />
                    {errors.check_out_date && <p className="text-xs text-red-500 mt-1">{errors.check_out_date}</p>}
                  </div>
                </div>

                {/* Rooms + type */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 uppercase tracking-widest mb-1.5">
                      Number of Rooms *
                    </label>
                    <input
                      type="number"
                      min="1"
                      className={inputCls('room_count')}
                      value={form.room_count}
                      onChange={e => setField('room_count', e.target.value)}
                      placeholder="e.g. 15"
                    />
                    {errors.room_count && <p className="text-xs text-red-500 mt-1">{errors.room_count}</p>}
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 uppercase tracking-widest mb-1.5">
                      Room Type Preference
                    </label>
                    <select
                      className={inputCls('room_type')}
                      value={form.room_type}
                      onChange={e => setField('room_type', e.target.value)}
                    >
                      <option value="standard">Standard</option>
                      <option value="triple">Triple</option>
                      <option value="quad">Quad</option>
                      <option value="not_sure">Not Sure</option>
                    </select>
                  </div>
                </div>

                {/* Special notes */}
                <div>
                  <label className="block text-xs font-semibold text-gray-600 uppercase tracking-widest mb-1.5">
                    Special Requests or Notes
                  </label>
                  <textarea
                    rows={3}
                    className={inputCls('special_notes')}
                    value={form.special_notes}
                    onChange={e => setField('special_notes', e.target.value)}
                    placeholder="Any specific needs, accessibility requirements, or questions…"
                  />
                </div>

                {submitError && (
                  <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-xl">
                    {submitError}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-4 text-base font-bold text-white rounded-xl bg-gradient-to-r from-[#F47920] to-[#FDB924] hover:opacity-90 hover:shadow-lg hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                >
                  {submitting ? 'Sending…' : 'Send Inquiry →'}
                </button>

                <p className="text-center text-xs text-gray-400">
                  We'll respond within 24 hours. Or call us at{' '}
                  <a href="tel:+12077723838" className="text-[#F47920] hover:underline">(207) 772-3838</a>
                </p>
              </form>
            )}
          </div>
        </div>
      </section>

      {/* ── CONTRACT TERMS & POLICY SECTIONS ── */}
      <section className="py-16 px-4 bg-[#FAFAFA]">
        <div className="max-w-[900px] mx-auto">

          <div className="text-center mb-10">
            <h2 className="font-display text-3xl font-bold text-[#1A1A1A] mb-2">Group Contract Policies</h2>
            <p className="text-gray-500 text-base">Payment, cancellation, terms, and signature information for group bookings</p>
            <div className="mx-auto mt-4 h-[3px] w-12 rounded-full bg-gradient-to-r from-[#F47920] to-[#FDB924]" />
          </div>

          <div className="space-y-4">

            {/* ─── CARD 0: METHOD OF PAYMENT ─── */}
            <div
              ref={el => { contractRefs.current[0] = el }}
              onMouseEnter={() => setContractHovered(prev => { const n = [...prev]; n[0] = true; return n })}
              onMouseLeave={() => setContractHovered(prev => { const n = [...prev]; n[0] = false; return n })}
              style={contractCardStyle(0)}
              className="bg-white rounded-2xl border border-gray-100 overflow-hidden"
            >
              <button
                onClick={() => toggleContract(0)}
                className="w-full flex items-center justify-between px-6 py-5 text-left hover:bg-gray-50/50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center text-xl flex-shrink-0" style={{ background: '#FFF5ED' }}>
                    💳
                  </div>
                  <h3 className="font-display text-lg font-bold text-[#1A1A1A]">Method of Payment</h3>
                </div>
                <span style={{ display: 'inline-block', transform: contractOpen[0] ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.3s ease', color: '#F47920', fontSize: '1.25rem', lineHeight: 1 }}>▾</span>
              </button>
              <div style={{ maxHeight: contractOpen[0] ? '1000px' : '0', overflow: 'hidden', transition: 'max-height 0.35s ease' }}>
                <div className="px-6 pb-6">
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-5">
                    {[
                      { icon: '💵', name: 'Cash' },
                      { icon: '💳', name: 'Personal Check' },
                      { icon: '🔵', name: 'Visa' },
                      { icon: '🔴', name: 'MasterCard' },
                      { icon: '🟡', name: 'American Express' },
                      { icon: '🟣', name: 'Discover' },
                    ].map(pm => (
                      <div
                        key={pm.name}
                        className="bg-white border border-gray-200 rounded-xl p-4 flex flex-col items-center gap-2 text-center cursor-default transition-all duration-150 hover:border-[#F47920] hover:scale-[1.03] hover:shadow-md"
                      >
                        <span className="text-2xl">{pm.icon}</span>
                        <span className="text-xs font-semibold text-gray-600 leading-tight">{pm.name}</span>
                      </div>
                    ))}
                  </div>
                  <div className="bg-[#FFF5ED] border border-[#F47920]/20 rounded-xl px-5 py-4">
                    <p className="text-sm text-[#92400E] leading-relaxed">
                      <span className="font-bold text-[#F47920]">Note: </span>
                      A valid credit card is required to be kept on file for the duration of your group's stay.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* ─── CARD 1: CANCELLATION POLICY ─── */}
            <div
              ref={el => { contractRefs.current[1] = el }}
              onMouseEnter={() => setContractHovered(prev => { const n = [...prev]; n[1] = true; return n })}
              onMouseLeave={() => setContractHovered(prev => { const n = [...prev]; n[1] = false; return n })}
              style={contractCardStyle(1)}
              className="bg-white rounded-2xl border border-gray-100 overflow-hidden"
            >
              <button
                onClick={() => toggleContract(1)}
                className="w-full flex items-center justify-between px-6 py-5 text-left hover:bg-gray-50/50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center text-xl flex-shrink-0" style={{ background: '#FFF0F0' }}>
                    📋
                  </div>
                  <h3 className="font-display text-lg font-bold text-[#1A1A1A]">Cancellation Policy</h3>
                </div>
                <span style={{ display: 'inline-block', transform: contractOpen[1] ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.3s ease', color: '#F47920', fontSize: '1.25rem', lineHeight: 1 }}>▾</span>
              </button>
              <div style={{ maxHeight: contractOpen[1] ? '1000px' : '0', overflow: 'hidden', transition: 'max-height 0.35s ease' }}>
                <div className="px-6 pb-6">
                  <div className="relative pl-10">
                    <div className="absolute left-4 top-4 bottom-4 w-0.5 bg-[#F47920]/25 rounded-full" />
                    {[
                      { icon: '📅', title: 'Cutoff Date', text: 'All room reservations must be made by the group cutoff date specified in your contract. Rooms not reserved by the cutoff date will be released back to general inventory.' },
                      { icon: '⏰', title: '48-Hour Notice', text: "Reservations cancelled within 48 hours of the scheduled arrival date will be charged one (1) night's room rate plus applicable taxes." },
                      { icon: '✅', title: 'Early Cancellation', text: 'Cancellations made before the 48-hour window will not be charged. We recommend confirming your final room count as early as possible.' },
                    ].map((step, idx) => (
                      <div key={step.title} className={`relative flex gap-4 ${idx < 2 ? 'mb-7' : ''}`}>
                        <div className="w-9 h-9 rounded-full bg-white border-2 border-[#F47920]/40 flex items-center justify-center text-base flex-shrink-0 z-10" style={{ marginLeft: '-1.25rem' }}>
                          {step.icon}
                        </div>
                        <div className="pt-0.5">
                          <h4 className="font-bold text-[#1A1A1A] text-sm mb-1">{step.title}</h4>
                          <p className="text-gray-600 text-sm leading-relaxed">{step.text}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-6 bg-red-50 border border-red-200 rounded-xl px-5 py-4">
                    <p className="text-sm text-red-700 font-medium leading-relaxed">
                      ⚠ No-shows will be charged the full first night room rate plus tax.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* ─── CARD 2: TERMS & CONDITIONS ─── */}
            <div
              ref={el => { contractRefs.current[2] = el }}
              onMouseEnter={() => setContractHovered(prev => { const n = [...prev]; n[2] = true; return n })}
              onMouseLeave={() => setContractHovered(prev => { const n = [...prev]; n[2] = false; return n })}
              style={contractCardStyle(2)}
              className="bg-white rounded-2xl border border-gray-100 overflow-hidden"
            >
              <button
                onClick={() => toggleContract(2)}
                className="w-full flex items-center justify-between px-6 py-5 text-left hover:bg-gray-50/50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center text-xl flex-shrink-0" style={{ background: '#EFF6FF' }}>
                    📜
                  </div>
                  <h3 className="font-display text-lg font-bold text-[#1A1A1A]">Terms & Conditions</h3>
                </div>
                <span style={{ display: 'inline-block', transform: contractOpen[2] ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.3s ease', color: '#F47920', fontSize: '1.25rem', lineHeight: 1 }}>▾</span>
              </button>
              <div style={{ maxHeight: contractOpen[2] ? '1000px' : '0', overflow: 'hidden', transition: 'max-height 0.35s ease' }}>
                <div className="pb-2">
                  {[
                    'The group coordinator/contact person signing this contract is responsible for ensuring all members of the group adhere to hotel policies during the stay.',
                    'Casco Bay Hotel reserves the right to relocate guests to comparable accommodations if necessary due to unforeseen circumstances.',
                    'The hotel is not responsible for lost, stolen, or damaged personal property belonging to guests.',
                    'Quiet hours are enforced from 9:00 PM to 7:00 AM. Excessive noise complaints may result in removal from the property without refund.',
                    'All guests must present a valid photo ID at check-in.',
                    'Check-in time is 3:00 PM. Check-out time is 11:00 AM. Early check-in and late check-out are subject to availability and may incur additional charges.',
                    "The hotel's standard room rate and any negotiated group rate are subject to applicable state and local taxes.",
                    'This contract is binding upon signature by an authorized representative of the group.',
                  ].map((term, idx) => (
                    <div
                      key={idx}
                      className="flex gap-4 px-6 py-3.5"
                      style={{ background: idx % 2 === 0 ? '#FAFAFA' : '#FFFFFF', transition: 'background 0.1s ease', cursor: 'default' }}
                      onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.background = 'rgba(244,121,32,0.06)' }}
                      onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = idx % 2 === 0 ? '#FAFAFA' : '#FFFFFF' }}
                    >
                      <span className="text-[#F47920] font-bold text-sm flex-shrink-0 mt-0.5 w-5">{idx + 1}.</span>
                      <p className="text-gray-600 text-sm leading-relaxed">{term}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* ─── CARD 3: DAMAGES & LIABILITY ─── */}
            <div
              ref={el => { contractRefs.current[3] = el }}
              onMouseEnter={() => setContractHovered(prev => { const n = [...prev]; n[3] = true; return n })}
              onMouseLeave={() => setContractHovered(prev => { const n = [...prev]; n[3] = false; return n })}
              style={contractCardStyle(3)}
              className="bg-white rounded-2xl border border-gray-100 overflow-hidden"
            >
              <button
                onClick={() => toggleContract(3)}
                className="w-full flex items-center justify-between px-6 py-5 text-left hover:bg-gray-50/50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center text-xl flex-shrink-0" style={{ background: '#FFFBEB' }}>
                    ⚠️
                  </div>
                  <h3 className="font-display text-lg font-bold text-[#1A1A1A]">Damages & Liability</h3>
                </div>
                <span style={{ display: 'inline-block', transform: contractOpen[3] ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.3s ease', color: '#F47920', fontSize: '1.25rem', lineHeight: 1 }}>▾</span>
              </button>
              <div style={{ maxHeight: contractOpen[3] ? '1000px' : '0', overflow: 'hidden', transition: 'max-height 0.35s ease' }}>
                <div className="px-6 pb-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
                    <div className="bg-amber-50 border border-amber-100 rounded-xl p-5">
                      <h4 className="font-bold text-amber-900 text-xs uppercase tracking-widest mb-3">Group Responsibility</h4>
                      <p className="text-amber-800 text-sm leading-relaxed">
                        The group and its designated contact are jointly responsible for any damage caused to hotel property, furnishings, fixtures, or equipment during the stay. This includes damage caused by any member of the group or their guests.
                      </p>
                    </div>
                    <div className="bg-amber-50 border border-amber-100 rounded-xl p-5">
                      <h4 className="font-bold text-amber-900 text-xs uppercase tracking-widest mb-3">Billing</h4>
                      <p className="text-amber-800 text-sm leading-relaxed">
                        Any damages will be assessed by hotel management and charged to the credit card on file. The group contact will be notified of any damage charges within 24 hours of checkout.
                      </p>
                    </div>
                  </div>
                  <div className="bg-amber-50 border border-amber-200 rounded-xl px-5 py-4">
                    <p className="text-sm text-amber-800 leading-relaxed">
                      🔒 By submitting a group inquiry and signing a final contract, the authorized representative agrees to accept financial responsibility for any damages incurred during the group's stay at Casco Bay Hotel.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* ─── CARD 4: AGREEMENT & SIGNATURE ─── */}
            <div
              ref={el => { contractRefs.current[4] = el }}
              onMouseEnter={() => setContractHovered(prev => { const n = [...prev]; n[4] = true; return n })}
              onMouseLeave={() => setContractHovered(prev => { const n = [...prev]; n[4] = false; return n })}
              style={contractCardStyle(4)}
              className="bg-white rounded-2xl border border-gray-100 overflow-hidden"
            >
              <button
                onClick={() => toggleContract(4)}
                className="w-full flex items-center justify-between px-6 py-5 text-left hover:bg-gray-50/50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center text-xl flex-shrink-0" style={{ background: '#F0FFF4' }}>
                    ✍️
                  </div>
                  <h3 className="font-display text-lg font-bold text-[#1A1A1A]">Agreement & Signature</h3>
                </div>
                <span style={{ display: 'inline-block', transform: contractOpen[4] ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.3s ease', color: '#F47920', fontSize: '1.25rem', lineHeight: 1 }}>▾</span>
              </button>
              <div style={{ maxHeight: contractOpen[4] ? '1000px' : '0', overflow: 'hidden', transition: 'max-height 0.35s ease' }}>
                <div className="px-6 pb-6">
                  <p className="text-center text-gray-400 italic text-base leading-relaxed mb-6 max-w-lg mx-auto">
                    "The final group contract including all negotiated rates, room block details, and agreed terms will be sent to the group contact via email for electronic or physical signature prior to confirmation."
                  </p>
                  <div className="overflow-x-auto mb-5">
                    <table className="w-full text-sm border-collapse">
                      <tbody>
                        {[
                          ['Authorized Signature', 'Date'],
                          ['Printed Name', 'Company / Organization'],
                          ['Title / Position', 'Phone Number'],
                        ].map(([left, right], idx) => (
                          <tr key={left} style={{ background: idx % 2 === 0 ? '#F9FAFB' : '#FFFFFF' }}>
                            <td className="border border-gray-200 px-4 py-3.5 font-semibold text-gray-600 w-1/2 text-sm">{left}</td>
                            <td className="border border-gray-200 px-4 py-3.5 font-semibold text-gray-600 w-1/2 text-sm">{right}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="bg-green-50 border border-green-200 rounded-xl px-5 py-4 mb-4">
                    <p className="text-sm text-green-800 font-medium leading-relaxed">
                      ✓ Once signed, a copy of the fully executed contract will be emailed to the group contact for your records.
                    </p>
                  </div>
                  <p className="text-center text-xs text-gray-400">
                    Questions about your contract? Contact us at{' '}
                    <a href="tel:+12077723838" className="text-[#F47920] hover:underline">(207) 772-3838</a>
                    {' '}or visit us at 80 John Roberts Rd, South Portland, ME 04106
                  </p>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ── SECTION 6: FOOTER ── */}
      <footer className="bg-[#1A1A1A] text-white/60 py-8 px-4 text-center">
        <p className="text-sm">
          Casco Bay Hotel · 80 John Roberts Rd, South Portland, ME 04016 ·{' '}
          <a href="tel:+12077723838" className="hover:text-white transition-colors">(207) 772-3838</a>
        </p>
        <p className="text-xs mt-2 text-white/30">© 2025 Casco Bay Hotel. All rights reserved.</p>
      </footer>
    </div>
  )
}
