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
