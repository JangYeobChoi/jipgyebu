// 업로드 전 이미지 크기를 줄이고 JPEG로 압축하는 유틸
// 사진 스토리지 용량과 전송량(egress)을 줄이기 위한 목적

function isHeic(file) {
  const type = (file.type || '').toLowerCase()
  const name = (file.name || '').toLowerCase()
  return type.includes('heic') || type.includes('heif') || name.endsWith('.heic') || name.endsWith('.heif')
}

// 아이폰/맥 카메라의 기본 저장 형식인 HEIC는 Chrome 등 대부분의 브라우저가 직접 디코딩하지 못함
// 필요할 때만 변환 라이브러리를 불러와(코드 스플리팅) JPEG로 먼저 바꿔줌
async function toDecodableBlob(file) {
  if (!isHeic(file)) return file
  try {
    const heic2any = (await import('heic2any')).default
    const converted = await heic2any({ blob: file, toType: 'image/jpeg', quality: 0.9 })
    return Array.isArray(converted) ? converted[0] : converted
  } catch {
    throw new Error('HEIC 사진을 변환하지 못했어요. 아이폰 설정에서 "호환성 우선(JPG)"으로 촬영하거나, 사진 앱에서 JPG로 내보낸 뒤 다시 시도해주세요.')
  }
}

export async function compressImage(file, { maxDimension = 1200, quality = 0.7 } = {}) {
  const decodable = await toDecodableBlob(file)

  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(decodable)
    const img = new Image()

    img.onload = () => {
      let { width, height } = img
      if (width > maxDimension || height > maxDimension) {
        if (width > height) {
          height = Math.round((height * maxDimension) / width)
          width = maxDimension
        } else {
          width = Math.round((width * maxDimension) / height)
          height = maxDimension
        }
      }
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')
      ctx.drawImage(img, 0, 0, width, height)
      URL.revokeObjectURL(objectUrl)
      canvas.toBlob(
        (blob) => {
          if (blob) resolve(blob)
          else reject(new Error('이미지를 압축하는 중 오류가 발생했어요.'))
        },
        'image/jpeg',
        quality,
      )
    }

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl)
      reject(new Error('이미지를 불러오는 중 오류가 발생했어요. 다른 사진 형식(JPG, PNG)으로 다시 시도해주세요.'))
    }

    img.src = objectUrl
  })
}
