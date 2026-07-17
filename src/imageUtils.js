// 업로드 전 이미지 크기를 줄이고 JPEG로 압축하는 유틸
// 사진 스토리지 용량과 전송량(egress)을 줄이기 위한 목적
export function compressImage(file, { maxDimension = 1200, quality = 0.7 } = {}) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
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
        canvas.toBlob(
          (blob) => {
            if (blob) resolve(blob)
            else reject(new Error('이미지를 압축하는 중 오류가 발생했어요.'))
          },
          'image/jpeg',
          quality,
        )
      }
      img.onerror = () => reject(new Error('이미지를 불러오는 중 오류가 발생했어요.'))
      img.src = reader.result
    }
    reader.onerror = () => reject(new Error('파일을 읽는 중 오류가 발생했어요.'))
    reader.readAsDataURL(file)
  })
}
