// 업로드 전 이미지 크기를 줄이고 JPEG로 압축하는 유틸
// 사진 스토리지 용량과 전송량(egress)을 줄이기 위한 목적

function isHeic(file) {
  const type = (file.type || '').toLowerCase()
  const name = (file.name || '').toLowerCase()
  return type.includes('heic') || type.includes('heif') || name.endsWith('.heic') || name.endsWith('.heif')
}

// HEIC/HEIF는 브라우저가 자체적으로 디코딩할 수 있는 경우에만 지원됨(예: 아이폰 사파리, 최신 안드로이드 브라우저).
// 별도 변환 라이브러리는 CSP의 script-src에 unsafe-eval을 허용해야만 동작해서 보안을 낮추게 되므로 사용하지 않음.
// 디코딩에 실패하면 사용자에게 변환 또는 다른 기기 사용을 안내함.
export async function compressImage(file, { maxDimension = 1200, quality = 0.7 } = {}) {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file)
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
      if (isHeic(file)) {
        reject(new Error('이 브라우저는 HEIC 사진을 지원하지 않아요. 아이폰/안드로이드 앱에서 올리거나, 사진 앱에서 JPG로 변환한 뒤 다시 시도해주세요.'))
      } else {
        reject(new Error('이미지를 불러오는 중 오류가 발생했어요. 다른 사진 형식(JPG, PNG)으로 다시 시도해주세요.'))
      }
    }

    img.src = objectUrl
  })
}
