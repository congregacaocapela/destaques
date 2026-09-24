import { firebaseApp } from './firebase';

const MAX_SOURCE_BYTES = 12 * 1024 * 1024;
const MAX_OUTPUT_BYTES = 512 * 1024;
const PHOTO_SIZE = 512;

function loadImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => resolve({ image, url });
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Não foi possível ler esta imagem. Tente usar JPG, PNG ou WebP.'));
    };
    image.src = url;
  });
}

export async function compressProfilePhoto(file, crop = { x: 50, y: 50 }) {
  if (!file || !file.type.startsWith('image/')) throw new Error('Escolha um arquivo de imagem.');
  if (file.size > MAX_SOURCE_BYTES) throw new Error('A foto original deve ter no máximo 12 MB.');

  const { image, url } = await loadImage(file);
  try {
    const canvas = document.createElement('canvas');
    canvas.width = PHOTO_SIZE;
    canvas.height = PHOTO_SIZE;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Seu navegador não conseguiu preparar a foto.');

    const sourceWidth = image.naturalWidth;
    const sourceHeight = image.naturalHeight;
    const sourceSize = Math.min(sourceWidth, sourceHeight);
    const cropX = Math.min(100, Math.max(0, Number(crop.x) || 0));
    const cropY = Math.min(100, Math.max(0, Number(crop.y) || 0));
    const sourceX = (sourceWidth - sourceSize) * (cropX / 100);
    const sourceY = (sourceHeight - sourceSize) * (cropY / 100);
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, PHOTO_SIZE, PHOTO_SIZE);
    context.drawImage(image, sourceX, sourceY, sourceSize, sourceSize, 0, 0, PHOTO_SIZE, PHOTO_SIZE);

    const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.8));
    if (!blob) throw new Error('Não foi possível preparar a foto.');
    if (blob.size > MAX_OUTPUT_BYTES) throw new Error('A foto continuou muito grande após a otimização. Tente outra imagem.');
    return blob;
  } finally {
    URL.revokeObjectURL(url);
  }
}

export async function uploadProfilePhoto(uid, file, crop) {
  const photo = await compressProfilePhoto(file, crop);
  const { getDownloadURL, getStorage, ref, uploadBytes } = await import('firebase/storage');
  const storage = getStorage(firebaseApp);
  const photoRef = ref(storage, `profilePhotos/${uid}/avatar.jpg`);
  await uploadBytes(photoRef, photo, {
    cacheControl: 'public,max-age=86400',
    contentType: 'image/jpeg',
  });
  return getDownloadURL(photoRef);
}
