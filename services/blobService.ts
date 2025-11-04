import { put } from '@vercel/blob';
import { VercelBlobResponse } from '@vercel/blob';

export async function uploadAudioBlob(filename: string, audioBuffer: Buffer, contentType: string): Promise<VercelBlobResponse> {
  try {
    const blob = await put(filename, audioBuffer, {
      access: 'public',
      contentType: contentType,
    });
    return blob;
  } catch (error) {
    console.error('Error uploading audio to Vercel Blob:', error);
    throw new Error('Failed to upload audio to Vercel Blob.');
  }
}