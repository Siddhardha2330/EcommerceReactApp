import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { storage } from "./firebase";

export const uploadImage = async (file) => {
  try {
    // Validate file type
    if (!file.type.startsWith('image/')) {
      throw new Error('File must be an image');
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      throw new Error('File size must be less than 5MB');
    }

    // Create a unique filename
    const timestamp = Date.now();
    const filename = `${timestamp}_${file.name}`;
    const storageRef = ref(storage, `images/${filename}`);

    // Upload file with metadata
    const metadata = {
      contentType: file.type
    };

    // Create upload task
    const uploadTask = uploadBytesResumable(storageRef, file, metadata);

    // Return a promise that resolves with the download URL
    return new Promise((resolve, reject) => {
      uploadTask.on(
        'state_changed',
        (snapshot) => {
          // Progress monitoring can be added here if needed
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          console.log('Upload progress:', progress);
        },
        (error) => {
          console.error('Upload error:', error);
          reject(error);
        },
        async () => {
          try {
            // Get download URL after successful upload
            const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
            resolve(downloadURL);
          } catch (error) {
            console.error('Error getting download URL:', error);
            reject(error);
          }
        }
      );
    });
  } catch (error) {
    console.error('Upload error:', error);
    throw error;
  }
};
