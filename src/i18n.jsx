import { createContext, useContext, useState, useMemo } from 'react'

const STORAGE_KEY = 'jiplog_lang'

export const LANGUAGES = [
  { code: 'ko', label: '한국어' },
  { code: 'en', label: 'English' },
  { code: 'es', label: 'Español' },
]

const LOCALE_MAP = { ko: 'ko-KR', en: 'en-US', es: 'es-ES' }

const dict = {
  ko: {
    'app.name': '집로그',
    'login.subtitle': '우리 집 수리 내역을 한 곳에서 관리하세요',
    'login.startWithGoogle': 'Google로 시작하기',
    'login.loading': '로그인 중...',
    'login.hint': 'Google 계정만 있으면 별도 가입 없이 바로 이용할 수 있어요',
    'alert.loginError': '로그인 중 오류가 발생했어요: {message}',

    'beta.banner': '⚠️ 현재 베타 버전입니다. 데이터가 예고 없이 삭제될 수 있어요.',

    'list.addButton': '+ 내역 추가',
    'list.logout': '로그아웃',
    'list.logoutConfirm': '로그아웃 하시겠어요?',
    'list.greeting': '안녕하세요, {name}님 👋',
    'list.withdraw': '회원 탈퇴',
    'list.withdrawConfirm': '정말 탈퇴하시겠어요?\n\n등록된 모든 수리 내역, 사진, 공간 정보가 영구적으로 삭제되며 복구할 수 없습니다.',
    'alert.withdrawError': '탈퇴 처리 중 오류가 발생했어요: {message}',
    'list.withdrawSuccess': '탈퇴가 완료됐어요. 모든 데이터가 삭제되었습니다.',

    'common.diy': '직접 수리',
    'common.pro': '업체 시공',
    'common.countUnit': '{count}건',

    'stats.totalCount': '총 수리 건수',
    'stats.thisYearSpend': '올해 지출',
    'stats.diy': '직접 수리',

    'action.yearlyStatsShow': '📊 연도별 통계 보기',
    'action.yearlyStatsHide': '📊 연도별 통계 숨기기',
    'action.csvExport': '⬇ CSV 내보내기',

    'yearly.totalCost': '총 누적 비용',
    'yearly.empty': '연도별로 표시할 내역이 없어요.',

    'section.recent': '최근 내역',
    'sort.latest': '최신순',
    'sort.oldest': '오래된순',
    'sort.costDesc': '비용 높은순',

    'error.retry': '다시 시도',
    'error.fetchFailed': '수리 내역을 불러오지 못했어요. 네트워크 상태를 확인해주세요.',

    'loading.generic': '불러오는 중...',
    'loading.auth': '로딩 중...',

    'empty.noRecords': '아직 등록된 내역이 없어요. 첫 내역을 추가해보세요!',
    'empty.notFound': '내역을 찾을 수 없어요.',
    'empty.backToList': '목록으로 돌아가기',

    'lifecycle.title': '수명주기',
    'lifecycle.justRegistered': '등록 직후',
    'lifecycle.status.good': '양호',
    'lifecycle.status.ok': '보통',
    'lifecycle.status.warn': '주의',

    'pagination.size5': '5개씩',
    'pagination.size10': '10개씩',
    'pagination.prev': '‹ 이전',
    'pagination.next': '다음 ›',
    'pagination.info': '{current} / {total}',

    'fab.add': '+ 새 수리 내역 추가하기',

    'category.replace': '교체',
    'category.repair': '수리',
    'category.install': '설치',
    'category.placeholder': '선택하세요',

    'detail.back': '뒤로가기',
    'detail.title': '수리 상세',
    'detail.edit': '수정',
    'detail.spend': '지출 비용',
    'detail.elapsed': '경과',
    'detail.status': '상태',
    'detail.info': '상세 정보',
    'detail.space': '📍 공간',
    'detail.date': '📅 날짜',
    'detail.cost': '🧾 비용',
    'detail.photos': '사진',
    'detail.photoAlt': '수리 내역 사진',
    'detail.vendor': '시공 업체',
    'detail.callAria': '업체에 전화하기',
    'detail.memo': '메모',
    'detail.noMemo': '메모 없음',
    'detail.delete': '🗑 삭제하기',

    'add.titleNew': '새 수리 내역',
    'add.titleEdit': '내역 수정',
    'add.nameLabel': '항목명',
    'add.namePlaceholder': '예: 보일러 필터 교체',
    'add.spaceLabel': '공간',
    'add.spaceAdd': '+ 추가',
    'add.spacePlaceholder': '예: 침실2, 서재',
    'add.spaceConfirm': '확인',
    'add.spaceDeleteAria': '{name} 삭제',
    'add.dateLabel': '날짜',
    'add.costLabel': '비용',
    'add.categoryLabel': '카테고리',
    'add.diyLabel': '직접 수리',
    'add.diySubOn': '업체 없이 직접 했어요',
    'add.diySubOff': '업체를 통해 수리했어요',
    'add.vendorNameLabel': '업체명',
    'add.vendorNamePlaceholder': '예: ○○소방설비',
    'add.vendorPhoneLabel': '업체 연락처',
    'add.vendorPhonePlaceholder': '010-0000-0000',
    'add.photoLabel': '사진 (최대 {max}장)',
    'add.photoAlt': '첨부 사진',
    'add.photoRemoveAria': '사진 삭제',
    'add.photoAdd': '+ 추가',
    'add.photoUploading': '사진 업로드 중...',
    'add.memoLabel': '메모',
    'add.memoPlaceholder': '추가로 기억해두고 싶은 내용을 적어요',
    'add.saveBtn': '저장하기',
    'add.saveBtnSaving': '저장 중...',
    'add.saveBtnEditDone': '수정 완료',

    'alert.nameRequired': '항목명을 입력해주세요',
    'alert.spaceRequired': '공간을 선택해주세요',
    'alert.costInvalid': '비용은 0원 이상으로 입력해주세요',
    'alert.vendorPhoneInvalid': '업체 연락처 형식을 확인해주세요 (숫자와 - 만 입력)',
    'alert.photoMax': '사진은 최대 {max}장까지 추가할 수 있어요.',
    'alert.photoMaxPartial': '최대 {max}장까지만 추가되어 일부 사진은 제외됐어요.',
    'alert.photoUploadError': '사진 업로드 중 오류가 발생했어요: {message}',
    'alert.updateError': '수정 중 오류: {message}',
    'alert.saveError': '저장 중 오류: {message}',
    'alert.deleteConfirm': '정말 삭제하시겠어요?',
    'alert.deleteError': '삭제 중 오류: {message}',
    'alert.csvEmpty': '내보낼 내역이 없어요.',

    'csv.headerName': '항목명',
    'csv.headerLocation': '공간',
    'csv.headerDate': '날짜',
    'csv.headerCost': '비용',
    'csv.headerCategory': '카테고리',
    'csv.headerMethod': '수리방식',
    'csv.headerVendorName': '업체명',
    'csv.headerVendorPhone': '업체연락처',
    'csv.headerMemo': '메모',
    'csv.filenamePrefix': '집로그_수리내역_',
  },
  en: {
    'app.name': '집로그',
    'login.subtitle': 'Track all your home repairs in one place',
    'login.startWithGoogle': 'Continue with Google',
    'login.loading': 'Signing in...',
    'login.hint': "No separate sign-up needed — just use your Google account",
    'alert.loginError': 'Sign-in error: {message}',

    'beta.banner': '⚠️ This is a beta version. Data may be deleted without notice.',

    'list.addButton': '+ Add Record',
    'list.logout': 'Log Out',
    'list.logoutConfirm': 'Are you sure you want to log out?',
    'list.greeting': 'Hi, {name} 👋',
    'list.withdraw': 'Delete Account',
    'list.withdrawConfirm': 'Are you sure you want to delete your account?\n\nAll repair records, photos, and space info will be permanently deleted and cannot be recovered.',
    'alert.withdrawError': 'An error occurred while deleting your account: {message}',
    'list.withdrawSuccess': 'Your account has been deleted. All data has been removed.',

    'common.diy': 'DIY',
    'common.pro': 'Professional',
    'common.countUnit': '{count}',

    'stats.totalCount': 'Total Repairs',
    'stats.thisYearSpend': 'This Year',
    'stats.diy': 'DIY',

    'action.yearlyStatsShow': '📊 Show Yearly Stats',
    'action.yearlyStatsHide': '📊 Hide Yearly Stats',
    'action.csvExport': '⬇ Export CSV',

    'yearly.totalCost': 'Total Spend',
    'yearly.empty': 'No records to show by year.',

    'section.recent': 'Recent Records',
    'sort.latest': 'Newest',
    'sort.oldest': 'Oldest',
    'sort.costDesc': 'Highest Cost',

    'error.retry': 'Retry',
    'error.fetchFailed': 'Failed to load records. Please check your network connection.',

    'loading.generic': 'Loading...',
    'loading.auth': 'Loading...',

    'empty.noRecords': 'No records yet. Add your first one!',
    'empty.notFound': 'Record not found.',
    'empty.backToList': 'Back to List',

    'lifecycle.title': 'Lifecycle',
    'lifecycle.justRegistered': 'Just added',
    'lifecycle.status.good': 'Good',
    'lifecycle.status.ok': 'Fair',
    'lifecycle.status.warn': 'Attention',

    'pagination.size5': '5 / page',
    'pagination.size10': '10 / page',
    'pagination.prev': '‹ Prev',
    'pagination.next': 'Next ›',
    'pagination.info': '{current} / {total}',

    'fab.add': '+ Add New Record',

    'category.replace': 'Replace',
    'category.repair': 'Repair',
    'category.install': 'Install',
    'category.placeholder': 'Select',

    'detail.back': 'Back',
    'detail.title': 'Repair Details',
    'detail.edit': 'Edit',
    'detail.spend': 'Cost',
    'detail.elapsed': 'Status',
    'detail.status': 'Condition',
    'detail.info': 'Details',
    'detail.space': '📍 Space',
    'detail.date': '📅 Date',
    'detail.cost': '🧾 Cost',
    'detail.photos': 'Photos',
    'detail.photoAlt': 'Repair photo',
    'detail.vendor': 'Service Vendor',
    'detail.callAria': 'Call vendor',
    'detail.memo': 'Notes',
    'detail.noMemo': 'No notes',
    'detail.delete': '🗑 Delete',

    'add.titleNew': 'New Repair Record',
    'add.titleEdit': 'Edit Record',
    'add.nameLabel': 'Item Name',
    'add.namePlaceholder': 'e.g. Boiler filter replacement',
    'add.spaceLabel': 'Space',
    'add.spaceAdd': '+ Add',
    'add.spacePlaceholder': 'e.g. Bedroom 2, Study',
    'add.spaceConfirm': 'Confirm',
    'add.spaceDeleteAria': 'Delete {name}',
    'add.dateLabel': 'Date',
    'add.costLabel': 'Cost',
    'add.categoryLabel': 'Category',
    'add.diyLabel': 'DIY',
    'add.diySubOn': 'I did it myself, without a vendor',
    'add.diySubOff': 'A vendor handled the repair',
    'add.vendorNameLabel': 'Vendor Name',
    'add.vendorNamePlaceholder': 'e.g. ABC Plumbing',
    'add.vendorPhoneLabel': 'Vendor Phone',
    'add.vendorPhonePlaceholder': '010-0000-0000',
    'add.photoLabel': 'Photos (up to {max})',
    'add.photoAlt': 'Attached photo',
    'add.photoRemoveAria': 'Remove photo',
    'add.photoAdd': '+ Add',
    'add.photoUploading': 'Uploading photos...',
    'add.memoLabel': 'Notes',
    'add.memoPlaceholder': 'Add anything else worth remembering',
    'add.saveBtn': 'Save',
    'add.saveBtnSaving': 'Saving...',
    'add.saveBtnEditDone': 'Save Changes',

    'alert.nameRequired': 'Please enter an item name',
    'alert.spaceRequired': 'Please select a space',
    'alert.costInvalid': 'Cost must be 0 or greater',
    'alert.vendorPhoneInvalid': 'Please check the vendor phone format (numbers and - only)',
    'alert.photoMax': 'You can add up to {max} photos.',
    'alert.photoMaxPartial': 'Only up to {max} photos were added; the rest were excluded.',
    'alert.photoUploadError': 'An error occurred while uploading photos: {message}',
    'alert.updateError': 'Update error: {message}',
    'alert.saveError': 'Save error: {message}',
    'alert.deleteConfirm': 'Are you sure you want to delete this?',
    'alert.deleteError': 'Delete error: {message}',
    'alert.csvEmpty': 'There are no records to export.',

    'csv.headerName': 'Item',
    'csv.headerLocation': 'Space',
    'csv.headerDate': 'Date',
    'csv.headerCost': 'Cost',
    'csv.headerCategory': 'Category',
    'csv.headerMethod': 'Method',
    'csv.headerVendorName': 'Vendor Name',
    'csv.headerVendorPhone': 'Vendor Phone',
    'csv.headerMemo': 'Notes',
    'csv.filenamePrefix': 'Jiplog_Repairs_',
  },
  es: {
    'app.name': '집로그',
    'login.subtitle': 'Gestiona todas las reparaciones de tu casa en un solo lugar',
    'login.startWithGoogle': 'Continuar con Google',
    'login.loading': 'Iniciando sesión...',
    'login.hint': 'No necesitas registrarte por separado, solo usa tu cuenta de Google',
    'alert.loginError': 'Error al iniciar sesión: {message}',

    'beta.banner': '⚠️ Esta es una versión beta. Los datos pueden eliminarse sin previo aviso.',

    'list.addButton': '+ Añadir registro',
    'list.logout': 'Cerrar sesión',
    'list.logoutConfirm': '¿Seguro que quieres cerrar sesión?',
    'list.greeting': 'Hola, {name} 👋',
    'list.withdraw': 'Eliminar cuenta',
    'list.withdrawConfirm': '¿Seguro que quieres eliminar tu cuenta?\n\nTodos los registros de reparación, fotos e información de espacios se eliminarán permanentemente y no podrán recuperarse.',
    'alert.withdrawError': 'Ocurrió un error al eliminar la cuenta: {message}',
    'list.withdrawSuccess': 'Tu cuenta ha sido eliminada. Todos los datos fueron borrados.',

    'common.diy': 'Hecho por mí',
    'common.pro': 'Servicio profesional',
    'common.countUnit': '{count}',

    'stats.totalCount': 'Total de reparaciones',
    'stats.thisYearSpend': 'Gasto este año',
    'stats.diy': 'Hecho por mí',

    'action.yearlyStatsShow': '📊 Ver estadísticas anuales',
    'action.yearlyStatsHide': '📊 Ocultar estadísticas anuales',
    'action.csvExport': '⬇ Exportar CSV',

    'yearly.totalCost': 'Gasto total acumulado',
    'yearly.empty': 'No hay registros para mostrar por año.',

    'section.recent': 'Registros recientes',
    'sort.latest': 'Más reciente',
    'sort.oldest': 'Más antiguo',
    'sort.costDesc': 'Mayor costo',

    'error.retry': 'Reintentar',
    'error.fetchFailed': 'No se pudieron cargar los registros. Verifica tu conexión de red.',

    'loading.generic': 'Cargando...',
    'loading.auth': 'Cargando...',

    'empty.noRecords': 'Aún no hay registros. ¡Añade el primero!',
    'empty.notFound': 'No se encontró el registro.',
    'empty.backToList': 'Volver a la lista',

    'lifecycle.title': 'Ciclo de vida',
    'lifecycle.justRegistered': 'Recién registrado',
    'lifecycle.status.good': 'Bueno',
    'lifecycle.status.ok': 'Regular',
    'lifecycle.status.warn': 'Atención',

    'pagination.size5': '5 por página',
    'pagination.size10': '10 por página',
    'pagination.prev': '‹ Anterior',
    'pagination.next': 'Siguiente ›',
    'pagination.info': '{current} / {total}',

    'fab.add': '+ Añadir nuevo registro',

    'category.replace': 'Reemplazo',
    'category.repair': 'Reparación',
    'category.install': 'Instalación',
    'category.placeholder': 'Selecciona',

    'detail.back': 'Volver',
    'detail.title': 'Detalle de reparación',
    'detail.edit': 'Editar',
    'detail.spend': 'Costo',
    'detail.elapsed': 'Estado',
    'detail.status': 'Condición',
    'detail.info': 'Información detallada',
    'detail.space': '📍 Espacio',
    'detail.date': '📅 Fecha',
    'detail.cost': '🧾 Costo',
    'detail.photos': 'Fotos',
    'detail.photoAlt': 'Foto de la reparación',
    'detail.vendor': 'Proveedor del servicio',
    'detail.callAria': 'Llamar al proveedor',
    'detail.memo': 'Notas',
    'detail.noMemo': 'Sin notas',
    'detail.delete': '🗑 Eliminar',

    'add.titleNew': 'Nuevo registro de reparación',
    'add.titleEdit': 'Editar registro',
    'add.nameLabel': 'Nombre del artículo',
    'add.namePlaceholder': 'ej. Cambio de filtro de caldera',
    'add.spaceLabel': 'Espacio',
    'add.spaceAdd': '+ Añadir',
    'add.spacePlaceholder': 'ej. Dormitorio 2, Estudio',
    'add.spaceConfirm': 'Confirmar',
    'add.spaceDeleteAria': 'Eliminar {name}',
    'add.dateLabel': 'Fecha',
    'add.costLabel': 'Costo',
    'add.categoryLabel': 'Categoría',
    'add.diyLabel': 'Hecho por mí',
    'add.diySubOn': 'Lo hice yo mismo, sin un proveedor',
    'add.diySubOff': 'Un proveedor realizó la reparación',
    'add.vendorNameLabel': 'Nombre del proveedor',
    'add.vendorNamePlaceholder': 'ej. Fontanería ABC',
    'add.vendorPhoneLabel': 'Teléfono del proveedor',
    'add.vendorPhonePlaceholder': '010-0000-0000',
    'add.photoLabel': 'Fotos (hasta {max})',
    'add.photoAlt': 'Foto adjunta',
    'add.photoRemoveAria': 'Eliminar foto',
    'add.photoAdd': '+ Añadir',
    'add.photoUploading': 'Subiendo fotos...',
    'add.memoLabel': 'Notas',
    'add.memoPlaceholder': 'Añade algo más que quieras recordar',
    'add.saveBtn': 'Guardar',
    'add.saveBtnSaving': 'Guardando...',
    'add.saveBtnEditDone': 'Guardar cambios',

    'alert.nameRequired': 'Por favor ingresa un nombre de artículo',
    'alert.spaceRequired': 'Por favor selecciona un espacio',
    'alert.costInvalid': 'El costo debe ser 0 o mayor',
    'alert.vendorPhoneInvalid': 'Verifica el formato del teléfono del proveedor (solo números y -)',
    'alert.photoMax': 'Puedes añadir hasta {max} fotos.',
    'alert.photoMaxPartial': 'Solo se añadieron hasta {max} fotos; el resto fue excluido.',
    'alert.photoUploadError': 'Ocurrió un error al subir las fotos: {message}',
    'alert.updateError': 'Error al actualizar: {message}',
    'alert.saveError': 'Error al guardar: {message}',
    'alert.deleteConfirm': '¿Seguro que quieres eliminar esto?',
    'alert.deleteError': 'Error al eliminar: {message}',
    'alert.csvEmpty': 'No hay registros para exportar.',

    'csv.headerName': 'Artículo',
    'csv.headerLocation': 'Espacio',
    'csv.headerDate': 'Fecha',
    'csv.headerCost': 'Costo',
    'csv.headerCategory': 'Categoría',
    'csv.headerMethod': 'Método',
    'csv.headerVendorName': 'Nombre del proveedor',
    'csv.headerVendorPhone': 'Teléfono del proveedor',
    'csv.headerMemo': 'Notas',
    'csv.filenamePrefix': 'Jiplog_Reparaciones_',
  },
}

function interpolate(str, vars) {
  if (!vars) return str
  return str.replace(/\{(\w+)\}/g, (_, key) => (vars[key] !== undefined ? String(vars[key]) : `{${key}}`))
}

// 날짜는 두 가지 형식이 섞여 있을 수 있음: 예전 데이터 "2026년 7월 18일"(한글 텍스트),
// 새 데이터 "2026-07-18"(ISO). 화면 표시는 항상 이 함수를 거쳐 현재 언어에 맞게 포맷한다.
export function parseAnyDate(dateStr) {
  const s = (dateStr || '').trim()
  let m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (m) return { year: +m[1], month: +m[2], day: +m[3] }
  m = s.match(/^(\d{4})년\s*(\d{1,2})월\s*(?:(\d{1,2})일)?/)
  if (m) return { year: +m[1], month: +m[2], day: m[3] ? +m[3] : 1 }
  return null
}

export function dateToInputValue(dateStr) {
  const d = parseAnyDate(dateStr)
  if (!d) return new Date().toISOString().split('T')[0]
  return `${d.year}-${String(d.month).padStart(2, '0')}-${String(d.day).padStart(2, '0')}`
}

export function dateSortValue(dateStr) {
  const d = parseAnyDate(dateStr)
  return d ? d.year * 372 + d.month * 31 + d.day : 0
}

export function getYearFromDate(dateStr) {
  const d = parseAnyDate(dateStr)
  return d ? d.year : null
}

// 저장된 언어 선택이 없을 때, 브라우저(=기기)의 언어 설정을 확인해서 한/영/스 중
// 일치하는 게 있으면 그 언어로, 없으면 영어를 기본값으로 사용한다.
function detectBrowserLang() {
  try {
    const candidates = navigator.languages && navigator.languages.length ? navigator.languages : [navigator.language]
    for (const l of candidates) {
      const code = (l || '').slice(0, 2).toLowerCase()
      if (dict[code]) return code
    }
  } catch {
    /* navigator 접근 불가 시 무시 */
  }
  return 'en'
}

const LanguageContext = createContext(null)

export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved && dict[saved]) return saved
    } catch {
      /* localStorage 접근 불가 시 무시 */
    }
    return detectBrowserLang()
  })

  const value = useMemo(() => {
    function setLang(code) {
      if (!dict[code]) return
      setLangState(code)
      try { localStorage.setItem(STORAGE_KEY, code) } catch { /* 저장 실패해도 무시 */ }
    }
    function t(key, vars) {
      const str = dict[lang]?.[key] ?? dict.ko[key] ?? key
      return interpolate(str, vars)
    }
    function formatDate(dateStr) {
      const parsed = parseAnyDate(dateStr)
      if (!parsed) return dateStr || ''
      const jsDate = new Date(parsed.year, parsed.month - 1, parsed.day)
      return jsDate.toLocaleDateString(LOCALE_MAP[lang] || 'ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })
    }
    function formatCost(num) {
      return '₩' + new Intl.NumberFormat(LOCALE_MAP[lang] || 'ko-KR').format(num)
    }
    return { lang, setLang, t, formatDate, formatCost }
  }, [lang])

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
}

export function useLanguage() {
  const ctx = useContext(LanguageContext)
  if (!ctx) throw new Error('useLanguage must be used within a LanguageProvider')
  return ctx
}
