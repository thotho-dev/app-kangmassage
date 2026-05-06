import imageCompression from 'browser-image-compression';
import toast from 'react-hot-toast';

export const compressImage = async (file: File): Promise<File | null> => {
  // 1. Validation: Max 1MB
  if (file.size > 1024 * 1024) {
    toast.error('Waduh, ukuran gambar terlalu besar. Maksimal 1MB ya.');
    return null;
  }

  const options = {
    maxSizeMB: 0.5, // 500KB
    maxWidthOrHeight: 1024,
    useWebWorker: true,
  };

  try {
    const compressedFile = await imageCompression(file, options);
    console.log(`Image compressed from ${file.size / 1024}KB to ${compressedFile.size / 1024}KB`);
    return compressedFile;
  } catch (error) {
    console.error('Compression error:', error);
    toast.error('Gagal memproses gambar. Silakan coba lagi.');
    return null;
  }
};
