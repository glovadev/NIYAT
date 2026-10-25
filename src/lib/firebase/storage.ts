import { getStorage, ref, uploadBytesResumable, getDownloadURL, deleteObject } from "firebase/storage";
import { app } from "./client";

export const storage = getStorage(app);

export const MAX_IMAGE_SIZE_BYTES = 1 * 1024 * 1024; // 1 MB strictly enforced

export interface UploadResult {
  url: string;
  publicId: string;
  name: string;
  size: number;
  contentType: string;
}

/**
 * Uploads an image file to Firebase Cloud Storage with strict 1MB size validation.
 * @param file The file selected by the user
 * @param folder Destination folder in Firebase Storage (e.g. 'banners', 'products')
 * @param onProgress Optional callback receiving 0-100 upload progress percentage
 */
export async function uploadImageToFirebase(
  file: File,
  folder: string = "banners",
  onProgress?: (percent: number) => void
): Promise<UploadResult> {
  if (!file) {
    throw new Error("No file provided for upload");
  }

  // 1. Strict 1 MB Size Validation
  if (file.size > MAX_IMAGE_SIZE_BYTES) {
    const sizeInMB = (file.size / (1024 * 1024)).toFixed(2);
    throw new Error(
      `Image size (${sizeInMB} MB) exceeds the maximum allowed limit of 1 MB. Please compress or choose a smaller image.`
    );
  }

  // 2. Format Validation
  const validMimeTypes = [
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/avif",
    "image/gif",
  ];
  if (!validMimeTypes.includes(file.type)) {
    throw new Error(
      `Unsupported format "${file.type}". Please upload a JPG, PNG, WEBP, AVIF, or GIF image.`
    );
  }

  // 3. Unique sanitized storage path
  const sanitizedFileName = file.name
    .toLowerCase()
    .replace(/[^a-z0-9.-]/g, "_");
  const uniqueStoragePath = `${folder}/${Date.now()}_${sanitizedFileName}`;
  const storageRef = ref(storage, uniqueStoragePath);

  // 4. Perform upload with metadata
  const uploadTask = uploadBytesResumable(storageRef, file, {
    contentType: file.type,
    customMetadata: {
      originalName: file.name,
      uploadedAt: new Date().toISOString(),
    },
  });

  return new Promise((resolve, reject) => {
    uploadTask.on(
      "state_changed",
      (snapshot) => {
        if (onProgress && snapshot.totalBytes > 0) {
          const progress = Math.round(
            (snapshot.bytesTransferred / snapshot.totalBytes) * 100
          );
          onProgress(progress);
        }
      },
      (error) => {
        reject(new Error(`Firebase Storage upload failed: ${error.message}`));
      },
      async () => {
        try {
          const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
          resolve({
            url: downloadUrl,
            publicId: uniqueStoragePath,
            name: file.name,
            size: file.size,
            contentType: file.type,
          });
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : "Failed to obtain download URL";
          reject(new Error(msg));
        }
      }
    );
  });
}

/**
 * Removes an uploaded image from Firebase Cloud Storage by its storage path.
 */
export async function deleteImageFromFirebase(storagePath: string): Promise<void> {
  if (!storagePath) return;
  const storageRef = ref(storage, storagePath);
  await deleteObject(storageRef);
}
