import { supabase } from './supabaseClient'
import { compressImage } from './imageUtils'

export const PHOTO_BUCKET = 'repair-photos'
export const MAX_PHOTOS_PER_RECORD = 5

// 압축한 사진을 사용자별 폴더(userId/)에 업로드하고 저장 경로(path)를 반환
// 경로만 DB에 저장하고, 실제 파일은 비공개 버킷 + RLS로 보호됨
export async function uploadRepairPhoto(file, userId) {
  const compressed = await compressImage(file)
  const fileName = `${crypto.randomUUID()}.jpg`
  const path = `${userId}/${fileName}`
  const { error } = await supabase.storage.from(PHOTO_BUCKET).upload(path, compressed, {
    contentType: 'image/jpeg',
    upsert: false,
  })
  if (error) throw error
  return path
}

// 여러 장의 사진을 순서대로 업로드 (일부 실패해도 성공한 것은 반환)
export async function uploadRepairPhotos(files, userId) {
  const uploaded = []
  for (const file of files) {
    try {
      const path = await uploadRepairPhoto(file, userId)
      uploaded.push(path)
    } catch (error) {
      console.error('사진 업로드 실패:', error.message)
      throw error
    }
  }
  return uploaded
}

// 삭제된 내역/사진에 대해 스토리지에서도 파일 제거
export async function deleteRepairPhotos(paths) {
  if (!paths || paths.length === 0) return
  const { error } = await supabase.storage.from(PHOTO_BUCKET).remove(paths)
  if (error) console.error('사진 삭제 중 오류:', error.message)
}

// 비공개 버킷이므로 화면에 표시할 때마다 임시 서명 URL(signed URL)을 발급받음
export async function getSignedPhotoUrls(paths) {
  if (!paths || paths.length === 0) return []
  const results = await Promise.all(
    paths.map(async (path) => {
      const { data, error } = await supabase.storage.from(PHOTO_BUCKET).createSignedUrl(path, 60 * 60)
      if (error) {
        console.error('사진 URL 생성 중 오류:', error.message)
        return null
      }
      return { path, url: data.signedUrl }
    }),
  )
  return results.filter(Boolean)
}
