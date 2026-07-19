import { useState, useEffect, useMemo } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useParams } from 'react-router-dom'
import { supabase } from './supabaseClient'
import { uploadRepairPhotos, deleteRepairPhotos, getSignedPhotoUrls, MAX_PHOTOS_PER_RECORD } from './photoStorage'
import { LanguageProvider, useLanguage, LANGUAGES, dateSortValue, getYearFromDate, dateToInputValue } from './i18n.jsx'
import './App.css'

const categoryColors = {
  replace: '#EFDFB0',
  install: '#D7E2C0',
  repair: '#C7D9E6',
}

const categoryRing = {
  replace: '#96731F',
  install: '#4C6B27',
  repair: '#2F5E82',
}

const categoryIcons = {
  replace: '🔄',
  install: '🛠️',
  repair: '🔧',
}

const lifecycleColors = {
  good: '#4C7A2E',
  ok: '#2F6690',
  warn: '#B06423',
}

const categories = ['replace', 'repair', 'install']

function computeYearlyStats(records) {
  const map = new Map()
  records.forEach((r) => {
    const year = getYearFromDate(r.date)
    if (year === null) return
    if (!map.has(year)) map.set(year, { year, count: 0, cost: 0 })
    const entry = map.get(year)
    entry.count += 1
    entry.cost += r.cost
  })
  return Array.from(map.values()).sort((a, b) => b.year - a.year)
}

function csvEscape(value) {
  let str = String(value ?? '')
  // 스프레드시트에서 값이 수식으로 해석되지 않도록(CSV 수식 인젝션 방지) 앞에 =,+,-,@ 가 오면 접두어를 붙임
  if (/^[=+\-@]/.test(str)) str = "'" + str
  if (/[",\n]/.test(str)) return '"' + str.replace(/"/g, '""') + '"'
  return str
}

function buildCSV(records, i18n) {
  const { t, formatDate } = i18n
  const headers = [
    t('csv.headerName'), t('csv.headerLocation'), t('csv.headerDate'), t('csv.headerCost'),
    t('csv.headerCategory'), t('csv.headerMethod'), t('csv.headerVendorName'), t('csv.headerVendorPhone'), t('csv.headerMemo'),
  ]
  const rows = records.map((r) => [
    r.name,
    r.location,
    formatDate(r.date),
    r.cost,
    t('category.' + r.category),
    r.diy ? t('common.diy') : t('common.pro'),
    r.vendor_name || '',
    r.vendor_phone || '',
    r.memo || '',
  ])
  return [headers, ...rows].map((row) => row.map(csvEscape).join(',')).join('\r\n')
}

function downloadRecordsAsCSV(records, i18n) {
  if (records.length === 0) {
    alert(i18n.t('alert.csvEmpty'))
    return
  }
  const csv = buildCSV(records, i18n)
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  const today = new Date().toISOString().split('T')[0]
  a.href = url
  a.download = `${i18n.t('csv.filenamePrefix')}${today}.csv`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

function LanguageSwitcher({ className }) {
  const { lang, setLang } = useLanguage()
  return (
    <div className={`lang-switcher${className ? ' ' + className : ''}`}>
      <select value={lang} onChange={(e) => setLang(e.target.value)} aria-label="Language / 언어 / Idioma">
        {LANGUAGES.map((l) => (
          <option key={l.code} value={l.code}>{l.label}</option>
        ))}
      </select>
    </div>
  )
}

function LoginScreen() {
  const { t } = useLanguage()
  const [loading, setLoading] = useState(false)

  async function handleGoogleLogin() {
    setLoading(true)
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
      },
    })
    if (error) {
      alert(t('alert.loginError', { message: error.message }))
      setLoading(false)
    }
  }

  return (
    <div className="app">
      <div className="login-screen">
        <div className="login-lang-row"><LanguageSwitcher /></div>
        <div className="login-logo">🏠</div>
        <h1 className="login-title">{t('app.name')}</h1>
        <p className="login-subtitle">{t('login.subtitle')}</p>
        <button className="google-login-btn" onClick={handleGoogleLogin} disabled={loading}>
          <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" width="20" />
          {loading ? t('login.loading') : t('login.startWithGoogle')}
        </button>
        <p className="login-hint">{t('login.hint')}</p>
      </div>
    </div>
  )
}

function ListScreen({ records, onSelect, onAddClick, onLogout, onWithdraw, user, loading, fetchError, onRetry }) {
  const { t, formatDate, formatCost } = useLanguage()
  const totalCount = records.length
  const currentYear = new Date().getFullYear()
  const totalCostThisYear = records
    .filter((r) => getYearFromDate(r.date) === currentYear)
    .reduce((sum, r) => sum + r.cost, 0)
  const totalCostAllTime = records.reduce((sum, r) => sum + r.cost, 0)
  const diyCount = records.filter((r) => r.diy).length

  const [showYearly, setShowYearly] = useState(false)
  const yearlyStats = useMemo(() => computeYearlyStats(records), [records])

  const [sortOption, setSortOption] = useState('latest')
  const sortedRecords = useMemo(() => {
    const arr = [...records]
    if (sortOption === 'latest') arr.sort((a, b) => dateSortValue(b.date) - dateSortValue(a.date))
    else if (sortOption === 'oldest') arr.sort((a, b) => dateSortValue(a.date) - dateSortValue(b.date))
    else if (sortOption === 'costDesc') arr.sort((a, b) => b.cost - a.cost)
    return arr
  }, [records, sortOption])

  const [pageSize, setPageSize] = useState(5)
  const [page, setPage] = useState(1)
  const totalPages = Math.max(1, Math.ceil(sortedRecords.length / pageSize))
  const currentPage = Math.min(page, totalPages)

  useEffect(() => {
    setPage(1)
  }, [sortOption, pageSize, records.length])

  const pagedRecords = sortedRecords.slice((currentPage - 1) * pageSize, currentPage * pageSize)

  return (
    <div className="app">
      <div className="beta-banner">
        {t('beta.banner')}
      </div>
      <div className="header">
        <div className="header-top">
          <span className="app-title">{t('app.name')}</span>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button className="add-btn" onClick={onAddClick}>{t('list.addButton')}</button>
            <LanguageSwitcher />
            <button className="logout-btn" onClick={onLogout}>{t('list.logout')}</button>
          </div>
        </div>
        <div className="user-info">
          {t('list.greeting', { name: user?.email?.split('@')[0] })}
          <span className="withdraw-link" onClick={onWithdraw}>{t('list.withdraw')}</span>
        </div>
        <div className="stats-row">
          <div className="stat-card">
            <div className="stat-label">{t('stats.totalCount')}</div>
            <div className="stat-value">{t('common.countUnit', { count: totalCount })}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">{t('stats.thisYearSpend')}</div>
            <div className="stat-value">{formatCost(totalCostThisYear)}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">{t('stats.diy')}</div>
            <div className="stat-value">{t('common.countUnit', { count: diyCount })}</div>
          </div>
        </div>

        <div className="action-row">
          <button className="action-btn" onClick={() => setShowYearly(!showYearly)}>
            {showYearly ? t('action.yearlyStatsHide') : t('action.yearlyStatsShow')}
          </button>
          <button className="action-btn" onClick={() => downloadRecordsAsCSV(sortedRecords, { t, formatDate })}>
            {t('action.csvExport')}
          </button>
        </div>

        {showYearly && (
          <div className="yearly-panel">
            <div className="yearly-total">
              <span className="yearly-total-label">{t('yearly.totalCost')}</span>
              <span className="yearly-total-value">{formatCost(totalCostAllTime)}</span>
            </div>
            {yearlyStats.length === 0 ? (
              <div className="empty-hint" style={{ padding: '10px 0' }}>{t('yearly.empty')}</div>
            ) : (
              <div className="yearly-table">
                {yearlyStats.map((stat) => (
                  <div className="yearly-row" key={stat.year}>
                    <span className="yearly-year">{stat.year}</span>
                    <span className="yearly-count">{t('common.countUnit', { count: stat.count })}</span>
                    <span className="yearly-cost">{formatCost(stat.cost)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="section-label-row">
        <span className="section-label-text">{t('section.recent')}</span>
        <span className="section-label-line"></span>
        <div className="sort-dropdown">
          <select value={sortOption} onChange={(e) => setSortOption(e.target.value)}>
            <option value="latest">{t('sort.latest')}</option>
            <option value="oldest">{t('sort.oldest')}</option>
            <option value="costDesc">{t('sort.costDesc')}</option>
          </select>
        </div>
      </div>

      {fetchError && (
        <div className="error-banner">
          <span>{fetchError}</span>
          <button className="error-retry-btn" onClick={onRetry}>{t('error.retry')}</button>
        </div>
      )}

      {loading && <div className="empty-hint">{t('loading.generic')}</div>}

      {!loading && !fetchError && records.length === 0 && (
        <div className="empty-hint">{t('empty.noRecords')}</div>
      )}

      {pagedRecords.map((record) => (
        <div className="record-card" key={record.id} onClick={() => onSelect(record.id)}>
          <div className="record-top">
            <div className="record-left">
              <div className="category-dot" style={{ background: categoryColors[record.category], color: categoryRing[record.category] }}>
                {record.icon}
              </div>
              <div>
                <div className="record-name">{record.name}</div>
                <div className="record-meta">{formatDate(record.date)} · {record.diy ? t('common.diy') : t('common.pro')}</div>
              </div>
            </div>
            <div className="record-cost">{formatCost(record.cost)}</div>
          </div>
          <div className="record-bottom">
            <span className="tag tag-location">📍 {record.location}</span>
            {record.photo_paths && record.photo_paths.length > 0 && (
              <span className="tag tag-photo">📷 {record.photo_paths.length}</span>
            )}
          </div>
          <div className="lifecycle-bar-wrap">
            <div className="lifecycle-label">
              <span>{t('lifecycle.title')}</span>
              <span>{record.lifecycle_label === 'justRegistered' ? t('lifecycle.justRegistered') : record.lifecycle_label}</span>
            </div>
            <div className="lifecycle-bar">
              <div
                className="lifecycle-fill"
                style={{ width: `${record.lifecycle_percent}%`, background: lifecycleColors[record.lifecycle_status] }}
              ></div>
            </div>
          </div>
        </div>
      ))}

      {sortedRecords.length > 0 && (
        <div className="pagination-row">
          <div className="page-size-toggle">
            <button className={pageSize === 5 ? 'active' : ''} onClick={() => setPageSize(5)}>{t('pagination.size5')}</button>
            <button className={pageSize === 10 ? 'active' : ''} onClick={() => setPageSize(10)}>{t('pagination.size10')}</button>
          </div>
          <div className="page-nav">
            <button className="page-nav-btn" onClick={() => setPage(Math.max(1, currentPage - 1))} disabled={currentPage <= 1}>{t('pagination.prev')}</button>
            <span className="page-info">{t('pagination.info', { current: currentPage, total: totalPages })}</span>
            <button className="page-nav-btn" onClick={() => setPage(Math.min(totalPages, currentPage + 1))} disabled={currentPage >= totalPages}>{t('pagination.next')}</button>
          </div>
        </div>
      )}

      <div className="fab" onClick={onAddClick}>{t('fab.add')}</div>
    </div>
  )
}

function DetailScreen({ record, onBack, onDelete, onEdit }) {
  const { t, formatDate, formatCost } = useLanguage()
  const [photoUrls, setPhotoUrls] = useState([])

  useEffect(() => {
    let active = true
    if (record.photo_paths && record.photo_paths.length > 0) {
      getSignedPhotoUrls(record.photo_paths).then((urls) => { if (active) setPhotoUrls(urls) })
    } else {
      setPhotoUrls([])
    }
    return () => { active = false }
  }, [record.id, record.photo_paths])

  const lifecycleLabel = record.lifecycle_label === 'justRegistered' ? t('lifecycle.justRegistered') : record.lifecycle_label
  const statusLabel = t('lifecycle.status.' + record.lifecycle_status)

  return (
    <div className="app">
      <div className="detail-header">
        <div className="detail-header-left">
          <div className="back-btn" onClick={onBack} aria-label={t('detail.back')}>←</div>
          <span className="header-title">{t('detail.title')}</span>
        </div>
        <div className="edit-btn" onClick={onEdit}>{t('detail.edit')}</div>
      </div>

      <div className="hero">
        <div className="hero-top">
          <div className="hero-icon" style={{ background: categoryColors[record.category], color: categoryRing[record.category] }}>{record.icon}</div>
          <div>
            <div className="hero-name">{record.name}</div>
            <div className="hero-sub">{record.location} · {formatDate(record.date)}</div>
          </div>
        </div>
        <div className="badge-row">
          <span className="badge badge-install">{t('category.' + record.category)}</span>
          <span className="badge badge-pro">{record.diy ? t('common.diy') : t('common.pro')}</span>
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat">
          <div className="stat-label">{t('detail.spend')}</div>
          <div className="stat-val">{formatCost(record.cost)}</div>
        </div>
        <div className="stat">
          <div className="stat-label">{t('detail.elapsed')}</div>
          <div className="stat-val">{lifecycleLabel}</div>
        </div>
        <div className="stat">
          <div className="stat-label">{t('detail.status')}</div>
          <div className="stat-val">{statusLabel}</div>
        </div>
      </div>

      <div className="section">
        <div className="section-title">{t('lifecycle.title')}</div>
        <div className="lc-bar">
          <div className="lc-fill" style={{ width: `${record.lifecycle_percent}%`, background: lifecycleColors[record.lifecycle_status] }}></div>
        </div>
      </div>

      <div className="section">
        <div className="section-title">{t('detail.info')}</div>
        <div className="info-row"><span className="info-key">{t('detail.space')}</span><span className="info-val">{record.location}</span></div>
        <div className="info-row"><span className="info-key">{t('detail.date')}</span><span className="info-val">{formatDate(record.date)}</span></div>
        <div className="info-row"><span className="info-key">{t('detail.cost')}</span><span className="info-val">{formatCost(record.cost)}</span></div>
      </div>

      {photoUrls.length > 0 && (
        <div className="section">
          <div className="section-title">{t('detail.photos')}</div>
          <div className="photo-scroll">
            {photoUrls.map((p) => (
              <a href={p.url} target="_blank" rel="noreferrer" key={p.path} className="photo-scroll-item">
                <img src={p.url} alt={t('detail.photoAlt')} />
              </a>
            ))}
          </div>
        </div>
      )}

      {!record.diy && record.vendor_name && (
        <div className="section">
          <div className="section-title">{t('detail.vendor')}</div>
          <div className="contact-card">
            <div className="contact-left">
              <div className="contact-avatar">🏢</div>
              <div>
                <div className="contact-name">{record.vendor_name}</div>
                <div className="contact-num">{record.vendor_phone}</div>
              </div>
            </div>
            <a className="call-btn" href={`tel:${record.vendor_phone}`} aria-label={t('detail.callAria')}>📞</a>
          </div>
        </div>
      )}

      <div className="section">
        <div className="section-title">{t('detail.memo')}</div>
        <div className="memo-box">{record.memo || t('detail.noMemo')}</div>
      </div>

      <div className="delete-section">
        <button className="delete-btn" onClick={onDelete}>{t('detail.delete')}</button>
      </div>
    </div>
  )
}

function AddScreen({ onBack, onSave, editingRecord, spaces, onSpaceAdd, onSpaceDelete }) {
  const { t } = useLanguage()
  const isEditing = !!editingRecord
  const [name, setName] = useState(editingRecord?.name || '')
  const [space, setSpace] = useState(editingRecord?.location || '')
  const [showCustomInput, setShowCustomInput] = useState(false)
  const [customInput, setCustomInput] = useState('')
  const [date, setDate] = useState(editingRecord ? dateToInputValue(editingRecord.date) : new Date().toISOString().split('T')[0])
  const [cost, setCost] = useState(editingRecord?.cost ? String(editingRecord.cost) : '')
  const [category, setCategory] = useState(editingRecord?.category || '')
  const [diy, setDiy] = useState(editingRecord ? editingRecord.diy : true)
  const [vendorName, setVendorName] = useState(editingRecord?.vendor_name || '')
  const [vendorPhone, setVendorPhone] = useState(editingRecord?.vendor_phone || '')
  const [memo, setMemo] = useState(editingRecord?.memo === '메모 없음' ? '' : (editingRecord?.memo || ''))
  const [saving, setSaving] = useState(false)

  // 기존 사진(수정 시) / 새로 추가한 사진 / 삭제 예정 사진 관리
  const [existingPhotos, setExistingPhotos] = useState([]) // [{ path, url }]
  const [removedPaths, setRemovedPaths] = useState([])
  const [newPhotoFiles, setNewPhotoFiles] = useState([])
  const [newPhotoPreviews, setNewPhotoPreviews] = useState([])
  const [uploadingPhotos, setUploadingPhotos] = useState(false)

  useEffect(() => {
    let active = true
    if (editingRecord?.photo_paths && editingRecord.photo_paths.length > 0) {
      getSignedPhotoUrls(editingRecord.photo_paths).then((urls) => { if (active) setExistingPhotos(urls) })
    }
    return () => { active = false }
  }, [editingRecord])

  useEffect(() => {
    const urls = newPhotoFiles.map((file) => URL.createObjectURL(file))
    setNewPhotoPreviews(urls)
    return () => { urls.forEach((url) => URL.revokeObjectURL(url)) }
  }, [newPhotoFiles])

  const totalPhotoCount = existingPhotos.length + newPhotoFiles.length

  function handleFileSelect(e) {
    const files = Array.from(e.target.files || [])
    const remaining = MAX_PHOTOS_PER_RECORD - totalPhotoCount
    if (remaining <= 0) {
      alert(t('alert.photoMax', { max: MAX_PHOTOS_PER_RECORD }))
      e.target.value = ''
      return
    }
    const toAdd = files.slice(0, remaining)
    if (files.length > toAdd.length) {
      alert(t('alert.photoMaxPartial', { max: MAX_PHOTOS_PER_RECORD }))
    }
    setNewPhotoFiles((prev) => [...prev, ...toAdd])
    e.target.value = ''
  }

  function removeExistingPhoto(path) {
    setExistingPhotos((prev) => prev.filter((p) => p.path !== path))
    setRemovedPaths((prev) => [...prev, path])
  }

  function removeNewPhoto(index) {
    setNewPhotoFiles((prev) => prev.filter((_, i) => i !== index))
  }

  async function handleSubmit() {
    if (!name.trim()) { alert(t('alert.nameRequired')); return }
    if (!space) { alert(t('alert.spaceRequired')); return }
    if (Number(cost) < 0) { alert(t('alert.costInvalid')); return }
    if (!diy && vendorPhone && !/^[0-9-]{7,15}$/.test(vendorPhone.trim())) {
      alert(t('alert.vendorPhoneInvalid'))
      return
    }
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()

    let uploadedPaths = []
    if (newPhotoFiles.length > 0) {
      setUploadingPhotos(true)
      try {
        uploadedPaths = await uploadRepairPhotos(newPhotoFiles, user.id)
      } catch (error) {
        setUploadingPhotos(false)
        setSaving(false)
        alert(t('alert.photoUploadError', { message: error.message }))
        return
      }
      setUploadingPhotos(false)
    }

    // 날짜는 항상 ISO(YYYY-MM-DD) 형식으로 저장한다. 기존에 저장된 한글 텍스트 날짜는
    // 그대로 유지되며, 화면에는 formatDate()가 두 형식을 모두 인식해서 보여준다.
    const catValue = category || categories[0]
    const finalPhotoPaths = [...existingPhotos.map((p) => p.path), ...uploadedPaths]
    const recordData = {
      name: name.trim(),
      icon: categoryIcons[catValue] || '🛠️',
      category: catValue,
      category_label: t('category.' + catValue),
      date,
      location: space,
      cost: Math.max(0, Number(cost) || 0),
      diy,
      vendor_name: diy ? null : vendorName,
      vendor_phone: diy ? null : vendorPhone,
      memo: memo.trim(),
      user_id: user.id,
      photo_paths: finalPhotoPaths,
    }
    if (isEditing) {
      const { data, error } = await supabase.from('repairs').update(recordData).eq('id', editingRecord.id).select()
      setSaving(false)
      if (error) { alert(t('alert.updateError', { message: error.message })); return }
      if (removedPaths.length > 0) deleteRepairPhotos(removedPaths)
      onSave(data[0])
    } else {
      const { data, error } = await supabase.from('repairs').insert({ ...recordData, lifecycle_percent: 0, lifecycle_label: 'justRegistered', lifecycle_status: 'good' }).select()
      setSaving(false)
      if (error) { alert(t('alert.saveError', { message: error.message })); return }
      onSave(data[0])
    }
  }

  return (
    <div className="app">
      <div className="detail-header">
        <div className="detail-header-left">
          <div className="back-btn" onClick={onBack} aria-label={t('detail.back')}>←</div>
          <span className="header-title">{isEditing ? t('add.titleEdit') : t('add.titleNew')}</span>
        </div>
      </div>
      <div className="form-body">
        <div className="field">
          <div className="field-label">{t('add.nameLabel')}</div>
          <input type="text" placeholder={t('add.namePlaceholder')} value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="field">
          <div className="field-label">{t('add.spaceLabel')}</div>
          <div className="space-grid">
            {spaces.map((s) => (
              <div key={s.id} className={`space-btn ${space === s.name ? 'active' : ''}`} onClick={() => setSpace(s.name)}>
                {s.name}
                {!s.is_default && (
                  <span className="space-delete" onClick={(e) => { e.stopPropagation(); onSpaceDelete(s.id) }} aria-label={t('add.spaceDeleteAria', { name: s.name })}>✕</span>
                )}
              </div>
            ))}
            <div className="space-btn space-btn-add" onClick={() => setShowCustomInput(true)}>{t('add.spaceAdd')}</div>
          </div>
          {showCustomInput && (
            <div className="custom-space-row">
              <input
                type="text"
                placeholder={t('add.spacePlaceholder')}
                value={customInput}
                onChange={(e) => setCustomInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && customInput.trim()) {
                    onSpaceAdd(customInput.trim()); setSpace(customInput.trim()); setCustomInput(''); setShowCustomInput(false)
                  }
                }}
                autoFocus
              />
              <button className="custom-space-confirm" onClick={() => {
                if (customInput.trim()) { onSpaceAdd(customInput.trim()); setSpace(customInput.trim()); setCustomInput(''); setShowCustomInput(false) }
              }}>{t('add.spaceConfirm')}</button>
            </div>
          )}
        </div>
        <div className="field">
          <div className="field-label">{t('add.dateLabel')}</div>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <div className="field">
          <div className="field-label">{t('add.costLabel')}</div>
          <div className="cost-row">
            <span className="cost-prefix">₩</span>
            <input type="number" min="0" placeholder="0" value={cost} onChange={(e) => setCost(e.target.value)} />
          </div>
        </div>
        <div className="field">
          <div className="field-label">{t('add.categoryLabel')}</div>
          <select value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="">{t('category.placeholder')}</option>
            {categories.map((c) => <option key={c} value={c}>{t('category.' + c)}</option>)}
          </select>
        </div>
        <div className="toggle-row">
          <div>
            <div className="toggle-label">{t('add.diyLabel')}</div>
            <div className="toggle-sub">{diy ? t('add.diySubOn') : t('add.diySubOff')}</div>
          </div>
          <button className={`toggle ${diy ? 'on' : ''}`} onClick={() => setDiy(!diy)}></button>
        </div>
        {!diy && (
          <div className="vendor-box open">
            <div className="field-label">{t('add.vendorNameLabel')}</div>
            <input type="text" placeholder={t('add.vendorNamePlaceholder')} value={vendorName} onChange={(e) => setVendorName(e.target.value)} />
            <div className="field-label" style={{ marginTop: '4px' }}>{t('add.vendorPhoneLabel')}</div>
            <input type="tel" placeholder={t('add.vendorPhonePlaceholder')} value={vendorPhone} onChange={(e) => setVendorPhone(e.target.value)} />
          </div>
        )}
        <div className="field">
          <div className="field-label">{t('add.photoLabel', { max: MAX_PHOTOS_PER_RECORD })}</div>
          <div className="photo-grid">
            {existingPhotos.map((p) => (
              <div className="photo-thumb" key={p.path}>
                <img src={p.url} alt={t('add.photoAlt')} />
                <span className="photo-remove" onClick={() => removeExistingPhoto(p.path)} aria-label={t('add.photoRemoveAria')}>✕</span>
              </div>
            ))}
            {newPhotoFiles.map((file, i) => (
              <div className="photo-thumb" key={`new-${i}`}>
                <img src={newPhotoPreviews[i]} alt={t('add.photoAlt')} />
                <span className="photo-remove" onClick={() => removeNewPhoto(i)} aria-label={t('add.photoRemoveAria')}>✕</span>
              </div>
            ))}
            {totalPhotoCount < MAX_PHOTOS_PER_RECORD && (
              <label className="photo-add">
                {t('add.photoAdd')}
                <input type="file" accept="image/*" multiple onChange={handleFileSelect} style={{ display: 'none' }} />
              </label>
            )}
          </div>
          {uploadingPhotos && <div className="photo-uploading-hint">{t('add.photoUploading')}</div>}
        </div>
        <div className="field">
          <div className="field-label">{t('add.memoLabel')}</div>
          <textarea placeholder={t('add.memoPlaceholder')} value={memo} onChange={(e) => setMemo(e.target.value)}></textarea>
        </div>
        <button className="save-btn" onClick={handleSubmit} disabled={saving}>
          {saving ? t('add.saveBtnSaving') : isEditing ? t('add.saveBtnEditDone') : t('add.saveBtn')}
        </button>
      </div>
    </div>
  )
}

function ListRoute({ records, user, loading, fetchError, onRetry, onLogout, onWithdraw }) {
  const navigate = useNavigate()
  return (
    <ListScreen
      records={records}
      onSelect={(id) => navigate(`/records/${id}`)}
      onAddClick={() => navigate('/records/new')}
      onLogout={onLogout}
      onWithdraw={onWithdraw}
      user={user}
      loading={loading}
      fetchError={fetchError}
      onRetry={onRetry}
    />
  )
}

function DetailRoute({ records, onDelete }) {
  const { t } = useLanguage()
  const { id } = useParams()
  const navigate = useNavigate()
  const record = records.find((r) => String(r.id) === id)

  if (!record) {
    return (
      <div className="app">
        <div className="empty-hint" style={{ paddingTop: '40px' }}>
          {t('empty.notFound')}
          <div className="fab" onClick={() => navigate('/')}>{t('empty.backToList')}</div>
        </div>
      </div>
    )
  }

  return (
    <DetailScreen
      record={record}
      onBack={() => navigate('/')}
      onDelete={async () => {
        const deleted = await onDelete(record.id)
        if (deleted) navigate('/')
      }}
      onEdit={() => navigate(`/records/${record.id}/edit`)}
    />
  )
}

function AddRoute({ records, spaces, onSave, onSpaceAdd, onSpaceDelete }) {
  const { id } = useParams()
  const navigate = useNavigate()
  const editingRecord = id ? records.find((r) => String(r.id) === id) : null

  return (
    <AddScreen
      onBack={() => navigate(editingRecord ? `/records/${editingRecord.id}` : '/')}
      onSave={(saved) => { onSave(saved); navigate('/') }}
      editingRecord={editingRecord}
      spaces={spaces}
      onSpaceAdd={onSpaceAdd}
      onSpaceDelete={onSpaceDelete}
    />
  )
}

function AppContent() {
  const { t } = useLanguage()
  const [user, setUser] = useState(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [records, setRecords] = useState([])
  const [loading, setLoading] = useState(false)
  const [fetchError, setFetchError] = useState(null)
  const [spaces, setSpaces] = useState([])

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setAuthLoading(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })
    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (user) {
      fetchRecords()
      fetchSpaces()
    }
  }, [user])

  async function fetchRecords() {
    setLoading(true)
    setFetchError(null)
    const { data: { user } } = await supabase.auth.getUser()
    const { data, error } = await supabase.from('repairs').select('*').eq('user_id', user.id).order('created_at', { ascending: false })
    if (error) { console.error(error); setFetchError(t('error.fetchFailed')) } else { setRecords(data) }
    setLoading(false)
  }

  async function fetchSpaces() {
    const { data, error } = await supabase.from('spaces').select('*').order('created_at', { ascending: true })
    if (error) { console.error(error) } else { setSpaces(data) }
  }

  async function handleLogout() {
    const confirmed = confirm(t('list.logoutConfirm'))
    if (!confirmed) return
    await supabase.auth.signOut()
    setRecords([])
  }

  async function handleWithdraw() {
    const confirmed = confirm(t('list.withdrawConfirm'))
    if (!confirmed) return

    const { data: { user: currentUser } } = await supabase.auth.getUser()
    if (!currentUser) return

    const allPhotoPaths = records.flatMap((r) => r.photo_paths || [])
    if (allPhotoPaths.length > 0) await deleteRepairPhotos(allPhotoPaths)

    const { error: repairsError } = await supabase.from('repairs').delete().eq('user_id', currentUser.id)
    if (repairsError) {
      alert(t('alert.withdrawError', { message: repairsError.message }))
      return
    }

    const { error: spacesError } = await supabase.from('spaces').delete().eq('user_id', currentUser.id)
    if (spacesError) console.error('공간 삭제 중 오류:', spacesError.message)

    await supabase.auth.signOut()
    setRecords([])
    setSpaces([])
    alert(t('list.withdrawSuccess'))
  }

  function handleSave(savedRecord) {
    setRecords((prev) => {
      const exists = prev.some((r) => r.id === savedRecord.id)
      if (exists) return prev.map((r) => (r.id === savedRecord.id ? savedRecord : r))
      return [savedRecord, ...prev]
    })
  }

  async function handleDelete(id) {
    const confirmed = confirm(t('alert.deleteConfirm'))
    if (!confirmed) return false
    const target = records.find((r) => r.id === id)
    const { error } = await supabase.from('repairs').delete().eq('id', id)
    if (error) { alert(t('alert.deleteError', { message: error.message })); return false }
    if (target?.photo_paths?.length) deleteRepairPhotos(target.photo_paths)
    setRecords((prev) => prev.filter((r) => r.id !== id))
    return true
  }

  async function handleSpaceAdd(name) {
    const { data: { user } } = await supabase.auth.getUser()
    const { data, error } = await supabase.from('spaces').insert({ name, is_default: false, user_id: user.id }).select()
    if (!error) setSpaces((prev) => [...prev, data[0]])
  }

  async function handleSpaceDelete(id) {
    const { error } = await supabase.from('spaces').delete().eq('id', id)
    if (!error) setSpaces((prev) => prev.filter((s) => s.id !== id))
  }

  if (authLoading) return <div className="app"><div className="empty-hint" style={{paddingTop:'40px'}}>{t('loading.auth')}</div></div>
  if (!user) return <LoginScreen />

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/"
          element={
            <ListRoute
              records={records}
              user={user}
              loading={loading}
              fetchError={fetchError}
              onRetry={() => { fetchRecords(); fetchSpaces() }}
              onLogout={handleLogout}
              onWithdraw={handleWithdraw}
            />
          }
        />
        <Route
          path="/records/new"
          element={<AddRoute records={records} spaces={spaces} onSave={handleSave} onSpaceAdd={handleSpaceAdd} onSpaceDelete={handleSpaceDelete} />}
        />
        <Route
          path="/records/:id"
          element={<DetailRoute records={records} onDelete={handleDelete} />}
        />
        <Route
          path="/records/:id/edit"
          element={<AddRoute records={records} spaces={spaces} onSave={handleSave} onSpaceAdd={handleSpaceAdd} onSpaceDelete={handleSpaceDelete} />}
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

function App() {
  return (
    <LanguageProvider>
      <AppContent />
    </LanguageProvider>
  )
}

export default App
