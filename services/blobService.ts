import { put, type PutBlobResult } from '@vercel/blob';

export async function uploadAudioBlob(filename: string, audioBuffer: Buffer, contentType: string): Promise<PutBlobResult> {
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