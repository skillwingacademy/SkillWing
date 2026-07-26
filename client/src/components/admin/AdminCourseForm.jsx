import { useState, useEffect } from 'react'
import { X, Plus, Save, BookOpen, Users, DollarSign, ListChecks, Settings2, Tag, User, UsersRound } from 'lucide-react'
import api from '../../api/axios'
import Button from '../ui/Button'
import toast from 'react-hot-toast'

export default function AdminCourseForm({ course, onSaved, onCancel }) {
  const isEditing = !!course

  // Basic fields
  const [title, setTitle] = useState(course?.title || '')
  const [description, setDescription] = useState(course?.description || '')
  const [introduction, setIntroduction] = useState(course?.introduction || '')
  const [inrOneOnOne, setInrOneOnOne] = useState(course?.pricing?.inr?.oneOnOne ?? '')
  const [inrDouble, setInrDouble] = useState(course?.pricing?.inr?.double ?? '')
  const [inrBatch, setInrBatch] = useState(course?.pricing?.inr?.batch ?? '')
  const [usdOneOnOne, setUsdOneOnOne] = useState(course?.pricing?.usd?.oneOnOne ?? '')
  const [usdDouble, setUsdDouble] = useState(course?.pricing?.usd?.double ?? '')
  const [usdBatch, setUsdBatch] = useState(course?.pricing?.usd?.batch ?? '')
  const [discountMonth3, setDiscountMonth3] = useState(course?.pricing?.discounts?.month3 ?? '')
  const [discountMonth6, setDiscountMonth6] = useState(course?.pricing?.discounts?.month6 ?? '')
  const [discountMonth9, setDiscountMonth9] = useState(course?.pricing?.discounts?.month9 ?? '')
  const [maxBatchCapacity, setMaxBatchCapacity] = useState(course?.maxBatchCapacity || 10)
  const [thumbnailImage, setThumbnailImage] = useState(course?.thumbnailImage || '')

  // Instructors
  const [availableTeachers, setAvailableTeachers] = useState([])
  const [selectedInstructors, setSelectedInstructors] = useState(
    course?.instructors?.map((i) => (typeof i === 'object' ? i._id : i)) || []
  )

  // Course details
  const [totalSessions, setTotalSessions] = useState(course?.courseDetails?.totalSessions || '')
  const [duration, setDuration] = useState(course?.courseDetails?.duration || '')
  const [skillLevel, setSkillLevel] = useState(course?.courseDetails?.skillLevel || '')
  const [language, setLanguage] = useState(course?.courseDetails?.language || 'English')

  // Dynamic arrays
  const [batchTypes, setBatchTypes] = useState(course?.courseDetails?.batchTypes || [])
  const [batchInput, setBatchInput] = useState('')
  const [deliverables, setDeliverables] = useState(course?.whatYouWillReceive || [])
  const [deliverableInput, setDeliverableInput] = useState('')

  const [saving, setSaving] = useState(false)
  const [uploadingThumbnail, setUploadingThumbnail] = useState(false)

  // Fetch approved teachers on mount
  useEffect(() => {
    const fetchTeachers = async () => {
      try {
        const res = await api.get('/admin/teachers/approved')
        setAvailableTeachers(res.data.data || [])
      } catch {
        console.error('Failed to load teachers')
      }
    }
    fetchTeachers()
  }, [])

  const toggleInstructor = (id) => {
    setSelectedInstructors((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    )
  }

  const addBatchType = () => {
    const val = batchInput.trim()
    if (val && !batchTypes.includes(val)) {
      setBatchTypes((prev) => [...prev, val])
    }
    setBatchInput('')
  }

  const removeBatchType = (val) => {
    setBatchTypes((prev) => prev.filter((b) => b !== val))
  }

  const addDeliverable = () => {
    const val = deliverableInput.trim()
    if (val && !deliverables.includes(val)) {
      setDeliverables((prev) => [...prev, val])
    }
    setDeliverableInput('')
  }

  const removeDeliverable = (val) => {
    setDeliverables((prev) => prev.filter((d) => d !== val))
  }

  const handleThumbnailUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be under 5MB')
      return
    }

    const formData = new FormData()
    formData.append('thumbnail', file)

    setUploadingThumbnail(true)
    try {
      const res = await api.post('/courses/upload-thumbnail', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      setThumbnailImage(res.data.data)
      toast.success('Thumbnail uploaded successfully')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to upload thumbnail')
    } finally {
      setUploadingThumbnail(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!title || !description) {
      toast.error('Title and description are required')
      return
    }

    const p1 = Number(inrOneOnOne) || 0
    const p2 = Number(inrDouble) || 0
    const p3 = Number(inrBatch) || 0
    const p4 = Number(usdOneOnOne) || 0
    const p5 = Number(usdDouble) || 0
    const p6 = Number(usdBatch) || 0

    if (p1 <= 0 && p2 <= 0 && p3 <= 0 && p4 <= 0 && p5 <= 0 && p6 <= 0) {
      toast.error('At least one pricing tier must have a positive price')
      return
    }

    const payload = {
      title,
      description,
      introduction,
      pricing: {
        inr: { oneOnOne: p1, double: p2, batch: p3 },
        usd: { oneOnOne: p4, double: p5, batch: p6 },
        discounts: {
          month3: Number(discountMonth3) || 0,
          month6: Number(discountMonth6) || 0,
          month9: Number(discountMonth9) || 0,
        },
      },
      maxBatchCapacity: Number(maxBatchCapacity) || 10,
      thumbnailImage,
      instructors: selectedInstructors,
      courseDetails: {
        batchTypes,
        totalSessions: totalSessions ? Number(totalSessions) : undefined,
        duration,
        skillLevel: skillLevel || undefined,
        language,
      },
      whatYouWillReceive: deliverables,
    }

    setSaving(true)
    try {
      if (isEditing) {
        await api.put(`/courses/${course._id}`, payload)
        toast.success('Course updated successfully')
      } else {
        await api.post('/courses', payload)
        toast.success('Course created successfully')
      }
      onSaved?.()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save course')
    } finally {
      setSaving(false)
    }
  }

  const inputClass =
    'w-full bg-slate-50 border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all py-2.5 px-3.5 rounded-xl text-sm'

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* ── Basic Info ─────────────────────────────────── */}
      <section>
        <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
          <BookOpen size={18} className="text-blue-600" />
          Basic Information
        </h3>
        <div className="space-y-4">
          <div>
            <label className="text-xs font-medium text-slate-600 uppercase tracking-wider">Title *</label>
            <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Course title" className={inputClass} />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600 uppercase tracking-wider">Introduction</label>
            <textarea value={introduction} onChange={(e) => setIntroduction(e.target.value)} placeholder="Brief overview paragraph..." rows={3} className={inputClass} />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600 uppercase tracking-wider">Description *</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Detailed course description..." rows={5} className={inputClass} />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600 uppercase tracking-wider">Thumbnail Image</label>
            <div className="mt-1 flex items-center gap-4">
              {thumbnailImage && (
                <img src={thumbnailImage} alt="Thumbnail preview" className="w-16 h-16 object-cover rounded-xl border border-slate-200" />
              )}
              <div className="flex-1">
                <input 
                  type="file" 
                  accept="image/*" 
                  onChange={handleThumbnailUpload} 
                  disabled={uploadingThumbnail}
                  className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
                {uploadingThumbnail && <p className="text-xs text-blue-600 mt-1 animate-pulse">Uploading...</p>}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Pricing Management ──────────────────────────────────── */}
      <section>
        <h3 className="text-lg font-bold text-slate-900 mb-1 flex items-center gap-2">
          <DollarSign size={18} className="text-blue-600" />
          Pricing Management
        </h3>
        <p className="text-xs text-slate-500 mb-6">
          Set the 1-Month base price for each batch type. Multi-month package prices (3, 6, 9 months) will be calculated automatically based on global discount percentages.
        </p>

        {/* 1-Month Prices: INR & USD */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-6">
          {/* INR Column */}
          <div className="space-y-4">
            <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2 mb-2">
              <span>🇮🇳</span> Domestic (INR ₹) — 1 Month Base Prices
            </h4>
            {/* Explorer Group (Batch) */}
            <div className="bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200 rounded-2xl p-4">
              <label className="block text-xs font-bold text-emerald-900 mb-1">Explorer Group (Batch) · 1 Month Price</label>
              <input type="number" min="0" value={inrBatch} onChange={(e) => setInrBatch(e.target.value)} placeholder="e.g. 2000" className={inputClass} />
            </div>
            {/* Focus Buddy (Double) */}
            <div className="bg-gradient-to-br from-blue-50 to-blue-50 border border-blue-200 rounded-2xl p-4">
              <label className="block text-xs font-bold text-blue-900 mb-1">Focus Buddy (Double) · 1 Month Price</label>
              <input type="number" min="0" value={inrDouble} onChange={(e) => setInrDouble(e.target.value)} placeholder="e.g. 3500" className={inputClass} />
            </div>
            {/* Elite 1-on-1 */}
            <div className="bg-gradient-to-br from-indigo-50 to-blue-50 border border-indigo-200 rounded-2xl p-4">
              <label className="block text-xs font-bold text-indigo-900 mb-1">Elite 1-on-1 · 1 Month Price</label>
              <input type="number" min="0" value={inrOneOnOne} onChange={(e) => setInrOneOnOne(e.target.value)} placeholder="e.g. 5000" className={inputClass} />
            </div>
          </div>

          {/* USD Column */}
          <div className="space-y-4">
            <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2 mb-2">
              <span>🌍</span> International (USD $) — 1 Month Base Prices
            </h4>
            {/* Explorer Group (Batch) */}
            <div className="bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200 rounded-2xl p-4">
              <label className="block text-xs font-bold text-emerald-900 mb-1">Explorer Group (Batch) · 1 Month Price</label>
              <input type="number" min="0" value={usdBatch} onChange={(e) => setUsdBatch(e.target.value)} placeholder="e.g. 25" className={inputClass} />
            </div>
            {/* Focus Buddy (Double) */}
            <div className="bg-gradient-to-br from-blue-50 to-blue-50 border border-blue-200 rounded-2xl p-4">
              <label className="block text-xs font-bold text-blue-900 mb-1">Focus Buddy (Double) · 1 Month Price</label>
              <input type="number" min="0" value={usdDouble} onChange={(e) => setUsdDouble(e.target.value)} placeholder="e.g. 45" className={inputClass} />
            </div>
            {/* Elite 1-on-1 */}
            <div className="bg-gradient-to-br from-indigo-50 to-blue-50 border border-indigo-200 rounded-2xl p-4">
              <label className="block text-xs font-bold text-indigo-900 mb-1">Elite 1-on-1 · 1 Month Price</label>
              <input type="number" min="0" value={usdOneOnOne} onChange={(e) => setUsdOneOnOne(e.target.value)} placeholder="e.g. 60" className={inputClass} />
            </div>
          </div>
        </div>

        {/* Global Discounts */}
        <div className="bg-slate-100/70 border border-slate-200 rounded-2xl p-5 mb-6">
          <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">Global Duration Discounts (%)</h4>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-medium text-slate-600 mb-1 block">3 Months Discount (%)</label>
              <input type="number" min="0" max="100" value={discountMonth3} onChange={(e) => setDiscountMonth3(e.target.value)} placeholder="e.g. 5" className={inputClass} />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600 mb-1 block">6 Months Discount (%)</label>
              <input type="number" min="0" max="100" value={discountMonth6} onChange={(e) => setDiscountMonth6(e.target.value)} placeholder="e.g. 10" className={inputClass} />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600 mb-1 block">9 Months Discount (%)</label>
              <input type="number" min="0" max="100" value={discountMonth9} onChange={(e) => setDiscountMonth9(e.target.value)} placeholder="e.g. 15" className={inputClass} />
            </div>
          </div>
        </div>

        {/* Automatic Price Calculation Preview */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 mb-6 shadow-sm">
          <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-3">Automated Price Calculation Preview</h4>
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 font-semibold">
                <tr>
                  <th className="py-2 px-3">Plan / Currency</th>
                  <th className="py-2 px-3">1 Month</th>
                  <th className="py-2 px-3">3 Months (-{Number(discountMonth3) || 0}%)</th>
                  <th className="py-2 px-3">6 Months (-{Number(discountMonth6) || 0}%)</th>
                  <th className="py-2 px-3">9 Months (-{Number(discountMonth9) || 0}%)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {[
                  { label: 'Explorer Group (INR)', base: Number(inrBatch) || 0, sym: '₹' },
                  { label: 'Focus Buddy (INR)', base: Number(inrDouble) || 0, sym: '₹' },
                  { label: 'Elite 1-on-1 (INR)', base: Number(inrOneOnOne) || 0, sym: '₹' },
                  { label: 'Explorer Group (USD)', base: Number(usdBatch) || 0, sym: '$' },
                  { label: 'Focus Buddy (USD)', base: Number(usdDouble) || 0, sym: '$' },
                  { label: 'Elite 1-on-1 (USD)', base: Number(usdOneOnOne) || 0, sym: '$' },
                ].map((row) => {
                  const calc = (m, d) => Math.max(0, Math.round((row.base * m) * (1 - (Number(d) || 0) / 100)))
                  return (
                    <tr key={row.label}>
                      <td className="py-2 px-3 font-semibold text-slate-800">{row.label}</td>
                      <td className="py-2 px-3 text-slate-700">{row.sym}{row.base.toLocaleString()}</td>
                      <td className="py-2 px-3 text-slate-700">{row.sym}{calc(3, discountMonth3).toLocaleString()}</td>
                      <td className="py-2 px-3 text-slate-700">{row.sym}{calc(6, discountMonth6).toLocaleString()}</td>
                      <td className="py-2 px-3 text-slate-700">{row.sym}{calc(9, discountMonth9).toLocaleString()}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-medium text-slate-600 uppercase tracking-wider">Max Batch Capacity</label>
            <input type="number" min="2" value={maxBatchCapacity} onChange={(e) => setMaxBatchCapacity(e.target.value)} placeholder="e.g. 10" className={inputClass} />
          </div>
        </div>
      </section>

      {/* ── Instructors ─────────────────────────────────── */}
      <section>
        <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
          <Users size={18} className="text-blue-600" />
          Instructors
        </h3>
        {availableTeachers.length === 0 ? (
          <p className="text-sm text-slate-500 italic">No approved teachers available. Approve teachers first.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {availableTeachers.map((teacher) => {
              const isSelected = selectedInstructors.includes(teacher._id)
              return (
                <button
                  key={teacher._id}
                  type="button"
                  onClick={() => toggleInstructor(teacher._id)}
                  className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-left text-sm ${
                    isSelected
                      ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-200'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <div
                    className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm ${
                      isSelected
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {teacher.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-slate-900 truncate">{teacher.name}</p>
                    <p className="text-xs text-slate-500 truncate">{teacher.email}</p>
                  </div>
                  {isSelected && (
                    <div className="w-5 h-5 bg-blue-600 text-white rounded-full flex items-center justify-center shrink-0">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                    </div>
                  )}
                </button>
              )
            })}
          </div>
        )}
      </section>

      {/* ── Course Details ──────────────────────────────── */}
      <section>
        <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
          <Settings2 size={18} className="text-blue-600" />
          Course Details
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-medium text-slate-600 uppercase tracking-wider">Total Sessions</label>
            <input type="number" min="1" value={totalSessions} onChange={(e) => setTotalSessions(e.target.value)} placeholder="e.g. 24" className={inputClass} />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600 uppercase tracking-wider">Duration</label>
            <input type="text" value={duration} onChange={(e) => setDuration(e.target.value)} placeholder="e.g. 12 Weeks" className={inputClass} />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600 uppercase tracking-wider">Skill Level</label>
            <input
              type="text"
              value={skillLevel}
              onChange={(e) => setSkillLevel(e.target.value)}
              placeholder="e.g. Beginner, All Levels"
              className={inputClass}
            />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600 uppercase tracking-wider">Language</label>
            <input type="text" value={language} onChange={(e) => setLanguage(e.target.value)} placeholder="e.g. English" className={inputClass} />
          </div>
        </div>

        {/* Batch Types — dynamic chips */}
        <div className="mt-4">
          <label className="text-xs font-medium text-slate-600 uppercase tracking-wider">Batch Types</label>
          <div className="flex gap-2 mt-1.5">
            <input
              type="text"
              value={batchInput}
              onChange={(e) => setBatchInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addBatchType() } }}
              placeholder="e.g. Weekend"
              className={`${inputClass} flex-1`}
            />
            <Button type="button" onClick={addBatchType} className="shrink-0 px-4">
              <Plus size={16} />
              Add
            </Button>
          </div>
          {batchTypes.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-3">
              {batchTypes.map((bt) => (
                <span key={bt} className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium bg-blue-50 text-blue-700 border border-blue-200">
                  <Tag size={12} />
                  {bt}
                  <button type="button" onClick={() => removeBatchType(bt)} className="ml-1 text-blue-400 hover:text-blue-700">
                    <X size={14} />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ── Deliverables ────────────────────────────────── */}
      <section>
        <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
          <ListChecks size={18} className="text-blue-600" />
          What You Will Receive
        </h3>
        <div className="flex gap-2">
          <input
            type="text"
            value={deliverableInput}
            onChange={(e) => setDeliverableInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addDeliverable() } }}
            placeholder="e.g. Certificate of Completion"
            className={`${inputClass} flex-1`}
          />
          <Button type="button" onClick={addDeliverable} className="shrink-0 px-4">
            <Plus size={16} />
            Add
          </Button>
        </div>
        {deliverables.length > 0 && (
          <div className="space-y-2 mt-3">
            {deliverables.map((d, i) => (
              <div key={i} className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
                <svg className="shrink-0 w-4 h-4 text-emerald-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                <span className="flex-1 text-sm text-slate-800">{d}</span>
                <button type="button" onClick={() => removeDeliverable(d)} className="text-slate-400 hover:text-red-500 transition-colors">
                  <X size={16} />
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── Actions ──────────────────────────────────────── */}
      <div className="flex gap-3 pt-4 border-t border-slate-200">
        <Button type="submit" loading={saving} className="flex-1 sm:flex-none !bg-gradient-to-r !from-blue-600 !to-blue-700 !text-white !shadow-blue-500/30">
          <Save size={16} />
          {isEditing ? 'Update Course' : 'Create Course'}
        </Button>
        {onCancel && (
          <Button type="button" onClick={onCancel} className="!bg-white !text-white !border-slate-200 hover:!bg-slate-200 !shadow-none">
            Cancel
          </Button>
        )}
      </div>
    </form>
  )
}
