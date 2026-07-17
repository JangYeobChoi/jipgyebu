import { useState, useEffect, useMemo } from 'react'
import { supabase } from './supabaseClient'
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

const categories = [
  { value: 'replace', label: '교체' },
  { value: 'repair', label: '수리' },
  { value: 'install', label: '설치' },
]

function formatCost(num) {
  return '₩' + num.toLocaleString('ko-KR')
}

function parseDateValue(dateStr) {
  const match = (dateStr || '').match(/^(\d{4})년\s*(\d{1,2})월\s*(?:(\d{1,2})일)?/)
  if (!match) return 0
  const year = parseInt(match[1], 10)
  const month = parseInt(match[2], 10)
  const day = match[3] ? parseInt(match[3], 10) : 0
  return year * 372 + month * 31 + day
}

function koreanDateToISO(dateStr) {
  const match = (dateStr || '').match(/^(\d{4})년\s*(\d{1,2})월\s*(?:(\d{1,2})일)?/)
  if (!match) return new Date().toISOString().split('T')[0]
  const year = match[1]
  const month = String(match[2]).padStart(2, '0')
  const day = String(match[3] || '1').padStart(2, '0')
  return `${year}-${month}-${day}`
}

function getYearFromDate(dateStr) {
  const match = (dateStr || '').match(/^(\d{4})년/)
  return match ? parseInt(match[1], 10) : null
}

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
  const str = String(value ?? '')
  if (/[",\n]/.test(str)) return '"' + str.replace(/"/g, '""') + '"'
  return str
}

function buildCSV(records) {
  const headers = ['항목명', '공간', '날짜', '비용', '카테고리', '수리방식', '업체명', '업체연락처', '메모']
  const rows = records.map((r) => [
    r.name,
    r.location,
    r.date,
    r.cost,
    r.category_label,
    r.diy ? '직접 수리' : '업체 시공',
    r.vendor_name || '',
    r.vendor_phone || '',
    r.memo || '',
  ])
  return [headers, ...rows].map((row) => row.map(csvEscape).join(',')).join('\r\n')
}

function downloadRecordsAsCSV(records) {
  if (records.length === 0) {
    alert('내보낼 내역이 없어요.')
    return
  }
  const csv = buildCSV(records)
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  const today = new Date().toISOString().split('T')[0]
  a.href = url
  a.download = `집로그_수리내역_${today}.csv`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

function LoginScreen() {
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
      alert('로그인 중 오류가 발생했어요: ' + error.message)
      setLoading(false)
    }
  }

  return (
    <div className="app">
      <div className="login-screen">
        <div className="login-logo">🏠</div>
        <h1 className="login-title">집로그</h1>
        <p className="login-subtitle">우리 집 수리 내역을 한 곳에서 관리하세요</p>
        <button className="google-login-btn" onClick={handleGoogleLogin} disabled={loading}>
          <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" width="20" />
          {loading ? '로그인 중...' : 'Google로 시작하기'}
        </button>
      </div>
    </div>
  )
}

function ListScreen({ records, onSelect, onAddClick, onLogout, user, loading }) {
  const totalCount = records.length
  const currentYear = new Date().getFullYear()
  const totalCostThisYear = records
    .filter((r) => parseInt((r.date || '').match(/^(\d{4})년/)?.[1], 10) === currentYear)
    .reduce((sum, r) => sum + r.cost, 0)
  const totalCostAllTime = records.reduce((sum, r) => sum + r.cost, 0)
  const diyCount = records.filter((r) => r.diy).length

  const [showYearly, setShowYearly] = useState(false)
  const yearlyStats = useMemo(() => computeYearlyStats(records), [records])

  const [sortOption, setSortOption] = useState('latest')
  const sortedRecords = useMemo(() => {
    const arr = [...records]
    if (sortOption === 'latest') arr.sort((a, b) => parseDateValue(b.date) - parseDateValue(a.date))
    else if (sortOption === 'oldest') arr.sort((a, b) => parseDateValue(a.date) - parseDateValue(b.date))
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
        ⚠️ 현재 베타 버전입니다. 데이터가 예고 없이 삭제될 수 있어요.
      </div>
      <div className="header">
        <div className="header-top">
          <span className="app-title">집로그</span>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button className="add-btn" onClick={onAddClick}>+ 내역 추가</button>
            <button className="logout-btn" onClick={onLogout}>로그아웃</button>
          </div>
        </div>
        <div className="user-info">안녕하세요, {user?.email?.split('@')[0]}님 👋</div>
        <div className="stats-row">
          <div className="stat-card">
            <div className="stat-label">총 수리 건수</div>
            <div className="stat-value">{totalCount}건</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">올해 지출</div>
            <div className="stat-value">{formatCost(totalCostThisYear)}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">직접 수리</div>
            <div className="stat-value">{diyCount}건</div>
          </div>
        </div>

        <div className="action-row">
          <button className="action-btn" onClick={() => setShowYearly(!showYearly)}>
            📊 연도별 통계 {showYearly ? '숨기기' : '보기'}
          </button>
          <button className="action-btn" onClick={() => downloadRecordsAsCSV(sortedRecords)}>
            ⬇ CSV 내보내기
          </button>
        </div>

        {showYearly && (
          <div className="yearly-panel">
            <div className="yearly-total">
              <span className="yearly-total-label">총 누적 비용</span>
              <span className="yearly-total-value">{formatCost(totalCostAllTime)}</span>
            </div>
            {yearlyStats.length === 0 ? (
              <div className="empty-hint" style={{ padding: '10px 0' }}>연도별로 표시할 내역이 없어요.</div>
            ) : (
              <div className="yearly-table">
                {yearlyStats.map((stat) => (
                  <div className="yearly-row" key={stat.year}>
                    <span className="yearly-year">{stat.year}년</span>
                    <span className="yearly-count">{stat.count}건</span>
                    <span className="yearly-cost">{formatCost(stat.cost)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="section-label-row">
        <span className="section-label-text">최근 내역</span>
        <span className="section-label-line"></span>
        <div className="sort-dropdown">
          <select value={sortOption} onChange={(e) => setSortOption(e.target.value)}>
            <option value="latest">최신순</option>
            <option value="oldest">오래된순</option>
            <option value="costDesc">비용 높은순</option>
          </select>
        </div>
      </div>

      {loading && <div className="empty-hint">불러오는 중...</div>}

      {!loading && records.length === 0 && (
        <div className="empty-hint">아직 등록된 내역이 없어요. 첫 내역을 추가해보세요!</div>
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
                <div className="record-meta">{record.date} · {record.diy ? '직접 수리' : '업체 시공'}</div>
              </div>
            </div>
            <div className="record-cost">{formatCost(record.cost)}</div>
          </div>
          <div className="record-bottom">
            <span className="tag tag-location">📍 {record.location}</span>
          </div>
          <div className="lifecycle-bar-wrap">
            <div className="lifecycle-label">
              <span>수명주기</span>
              <span>{record.lifecycle_label}</span>
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
            <button className={pageSize === 5 ? 'active' : ''} onClick={() => setPageSize(5)}>5개씩</button>
            <button className={pageSize === 10 ? 'active' : ''} onClick={() => setPageSize(10)}>10개씩</button>
          </div>
          <div className="page-nav">
            <button className="page-nav-btn" onClick={() => setPage(Math.max(1, currentPage - 1))} disabled={currentPage <= 1}>‹ 이전</button>
            <span className="page-info">{currentPage} / {totalPages}</span>
            <button className="page-nav-btn" onClick={() => setPage(Math.min(totalPages, currentPage + 1))} disabled={currentPage >= totalPages}>다음 ›</button>
          </div>
        </div>
      )}

      <div className="fab" onClick={onAddClick}>+ 새 수리 내역 추가하기</div>
    </div>
  )
}

function DetailScreen({ record, onBack, onDelete, onEdit }) {
  return (
    <div className="app">
      <div className="detail-header">
        <div className="detail-header-left">
          <div className="back-btn" onClick={onBack}>←</div>
          <span className="header-title">수리 상세</span>
        </div>
        <div className="edit-btn" onClick={onEdit}>수정</div>
      </div>

      <div className="hero">
        <div className="hero-top">
          <div className="hero-icon" style={{ background: categoryColors[record.category], color: categoryRing[record.category] }}>{record.icon}</div>
          <div>
            <div className="hero-name">{record.name}</div>
            <div className="hero-sub">{record.location} · {record.date}</div>
          </div>
        </div>
        <div className="badge-row">
          <span className="badge badge-install">{record.category_label}</span>
          <span className="badge badge-pro">{record.diy ? '직접 수리' : '업체 시공'}</span>
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat">
          <div className="stat-label">지출 비용</div>
          <div className="stat-val">{formatCost(record.cost)}</div>
        </div>
        <div className="stat">
          <div className="stat-label">경과</div>
          <div className="stat-val">{record.lifecycle_label}</div>
        </div>
        <div className="stat">
          <div className="stat-label">상태</div>
          <div className="stat-val">
            {record.lifecycle_status === 'good' ? '양호' : record.lifecycle_status === 'warn' ? '주의' : '보통'}
          </div>
        </div>
      </div>

      <div className="section">
        <div className="section-title">수명주기</div>
        <div className="lc-bar">
          <div className="lc-fill" style={{ width: `${record.lifecycle_percent}%`, background: lifecycleColors[record.lifecycle_status] }}></div>
        </div>
      </div>

      <div className="section">
        <div className="section-title">상세 정보</div>
        <div className="info-row"><span className="info-key">📍 공간</span><span className="info-val">{record.location}</span></div>
        <div className="info-row"><span className="info-key">📅 날짜</span><span className="info-val">{record.date}</span></div>
        <div className="info-row"><span className="info-key">🧾 비용</span><span className="info-val">{formatCost(record.cost)}</span></div>
      </div>

      {!record.diy && record.vendor_name && (
        <div className="section">
          <div className="section-title">시공 업체</div>
          <div className="contact-card">
            <div className="contact-left">
              <div className="contact-avatar">🏢</div>
              <div>
                <div className="contact-name">{record.vendor_name}</div>
                <div className="contact-num">{record.vendor_phone}</div>
              </div>
            </div>
            <div className="call-btn" onClick={() => alert(`${record.vendor_phone} 로 전화 연결`)}>📞</div>
          </div>
        </div>
      )}

      <div className="section">
        <div className="section-title">메모</div>
        <div className="memo-box">{record.memo}</div>
      </div>

      <div className="delete-section">
        <button className="delete-btn" onClick={onDelete}>🗑 삭제하기</button>
      </div>
    </div>
  )
}

function AddScreen({ onBack, onSave, editingRecord, spaces, onSpaceAdd, onSpaceDelete }) {
  const isEditing = !!editingRecord
  const [name, setName] = useState(editingRecord?.name || '')
  const [space, setSpace] = useState(editingRecord?.location || '')
  const [showCustomInput, setShowCustomInput] = useState(false)
  const [customInput, setCustomInput] = useState('')
  const [date, setDate] = useState(editingRecord ? koreanDateToISO(editingRecord.date) : new Date().toISOString().split('T')[0])
  const [cost, setCost] = useState(editingRecord?.cost ? String(editingRecord.cost) : '')
  const [category, setCategory] = useState(editingRecord?.category || '')
  const [diy, setDiy] = useState(editingRecord ? editingRecord.diy : true)
  const [vendorName, setVendorName] = useState(editingRecord?.vendor_name || '')
  const [vendorPhone, setVendorPhone] = useState(editingRecord?.vendor_phone || '')
  const [memo, setMemo] = useState(editingRecord?.memo === '메모 없음' ? '' : (editingRecord?.memo || ''))
  const [saving, setSaving] = useState(false)

  async function handleSubmit() {
    if (!name.trim()) { alert('항목명을 입력해주세요'); return }
    if (!space) { alert('공간을 선택해주세요'); return }
    setSaving(true)
    const dateObj = new Date(date)
    const dateLabel = `${dateObj.getFullYear()}년 ${dateObj.getMonth() + 1}월 ${dateObj.getDate()}일`
    const catInfo = categories.find((c) => c.value === category) || categories[0]
    const { data: { user } } = await supabase.auth.getUser()
    const recordData = {
      name: name.trim(),
      icon: categoryIcons[catInfo.value] || '🛠️',
      category: catInfo.value,
      category_label: catInfo.label,
      date: dateLabel,
      location: space,
      cost: Number(cost) || 0,
      diy,
      vendor_name: diy ? null : vendorName,
      vendor_phone: diy ? null : vendorPhone,
      memo: memo.trim() || '메모 없음',
      user_id: user.id,
    }
    if (isEditing) {
      const { data, error } = await supabase.from('repairs').update(recordData).eq('id', editingRecord.id).select()
      setSaving(false)
      if (error) { alert('수정 중 오류: ' + error.message); return }
      onSave(data[0])
    } else {
      const { data, error } = await supabase.from('repairs').insert({ ...recordData, lifecycle_percent: 0, lifecycle_label: '등록 직후', lifecycle_status: 'good' }).select()
      setSaving(false)
      if (error) { alert('저장 중 오류: ' + error.message); return }
      onSave(data[0])
    }
  }

  return (
    <div className="app">
      <div className="detail-header">
        <div className="detail-header-left">
          <div className="back-btn" onClick={onBack}>←</div>
          <span className="header-title">{isEditing ? '내역 수정' : '새 수리 내역'}</span>
        </div>
      </div>
      <div className="form-body">
        <div className="field">
          <div className="field-label">항목명</div>
          <input type="text" placeholder="예: 보일러 필터 교체" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="field">
          <div className="field-label">공간</div>
          <div className="space-grid">
            {spaces.map((s) => (
              <div key={s.id} className={`space-btn ${space === s.name ? 'active' : ''}`} onClick={() => setSpace(s.name)}>
                {s.name}
                {!s.is_default && (
                  <span className="space-delete" onClick={(e) => { e.stopPropagation(); onSpaceDelete(s.id) }}>✕</span>
                )}
              </div>
            ))}
            <div className="space-btn space-btn-add" onClick={() => setShowCustomInput(true)}>+ 추가</div>
          </div>
          {showCustomInput && (
            <div className="custom-space-row">
              <input
                type="text"
                placeholder="예: 침실2, 서재"
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
              }}>확인</button>
            </div>
          )}
        </div>
        <div className="field">
          <div className="field-label">날짜</div>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <div className="field">
          <div className="field-label">비용</div>
          <div className="cost-row">
            <span className="cost-prefix">₩</span>
            <input type="number" placeholder="0" value={cost} onChange={(e) => setCost(e.target.value)} />
          </div>
        </div>
        <div className="field">
          <div className="field-label">카테고리</div>
          <select value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="">선택하세요</option>
            {categories.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
        </div>
        <div className="toggle-row">
          <div>
            <div className="toggle-label">직접 수리</div>
            <div className="toggle-sub">{diy ? '업체 없이 직접 했어요' : '업체를 통해 수리했어요'}</div>
          </div>
          <button className={`toggle ${diy ? 'on' : ''}`} onClick={() => setDiy(!diy)}></button>
        </div>
        {!diy && (
          <div className="vendor-box open">
            <div className="field-label">업체명</div>
            <input type="text" placeholder="예: ○○소방설비" value={vendorName} onChange={(e) => setVendorName(e.target.value)} />
            <div className="field-label" style={{ marginTop: '4px' }}>업체 연락처</div>
            <input type="tel" placeholder="010-0000-0000" value={vendorPhone} onChange={(e) => setVendorPhone(e.target.value)} />
          </div>
        )}
        <div className="field">
          <div className="field-label">메모</div>
          <textarea placeholder="추가로 기억해두고 싶은 내용을 적어요" value={memo} onChange={(e) => setMemo(e.target.value)}></textarea>
        </div>
        <button className="save-btn" onClick={handleSubmit} disabled={saving}>
          {saving ? '저장 중...' : isEditing ? '수정 완료' : '저장하기'}
        </button>
      </div>
    </div>
  )
}

function App() {
  const [user, setUser] = useState(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [records, setRecords] = useState([])
  const [loading, setLoading] = useState(false)
  const [screen, setScreen] = useState('list')
  const [selectedId, setSelectedId] = useState(null)
  const [editingRecord, setEditingRecord] = useState(null)
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
    const { data: { user } } = await supabase.auth.getUser()
    const { data, error } = await supabase.from('repairs').select('*').eq('user_id', user.id).order('created_at', { ascending: false })
    if (error) { console.error(error) } else { setRecords(data) }
    setLoading(false)
  }

  async function fetchSpaces() {
    const { data, error } = await supabase.from('spaces').select('*').order('created_at', { ascending: true })
    if (error) { console.error(error) } else { setSpaces(data) }
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    setRecords([])
    setScreen('list')
  }

  const selectedRecord = records.find((r) => r.id === selectedId)

  function handleSelect(id) { setSelectedId(id); setScreen('detail') }

  function handleSave(savedRecord) {
    const exists = records.some((r) => r.id === savedRecord.id)
    if (exists) { setRecords(records.map((r) => r.id === savedRecord.id ? savedRecord : r)) }
    else { setRecords([savedRecord, ...records]) }
    setEditingRecord(null)
    setScreen('list')
  }

  async function handleDelete(id) {
    const confirmed = confirm('정말 삭제하시겠어요?')
    if (!confirmed) return
    const { error } = await supabase.from('repairs').delete().eq('id', id)
    if (error) { alert('삭제 중 오류: ' + error.message); return }
    setRecords(records.filter((r) => r.id !== id))
    setScreen('list')
  }

  if (authLoading) return <div className="app"><div className="empty-hint" style={{paddingTop:'40px'}}>로딩 중...</div></div>
  if (!user) return <LoginScreen />

  if (screen === 'detail' && selectedRecord) {
    return (
      <DetailScreen
        record={selectedRecord}
        onBack={() => setScreen('list')}
        onDelete={() => handleDelete(selectedRecord.id)}
        onEdit={() => { setEditingRecord(selectedRecord); setScreen('add') }}
      />
    )
  }

  if (screen === 'add') {
    return (
      <AddScreen
        onBack={() => { setEditingRecord(null); setScreen(editingRecord ? 'detail' : 'list') }}
        onSave={handleSave}
        editingRecord={editingRecord}
        spaces={spaces}
        onSpaceAdd={async (name) => {
          const { data: { user } } = await supabase.auth.getUser()
          const { data, error } = await supabase.from('spaces').insert({ name, is_default: false, user_id: user.id }).select()
          if (!error) setSpaces([...spaces, data[0]])
        }}
        onSpaceDelete={async (id) => {
          const { error } = await supabase.from('spaces').delete().eq('id', id)
          if (!error) setSpaces(spaces.filter((s) => s.id !== id))
        }}
      />
    )
  }

  return (
    <ListScreen
      records={records}
      onSelect={handleSelect}
      onAddClick={() => setScreen('add')}
      onLogout={handleLogout}
      user={user}
      loading={loading}
    />
  )
}

export default App