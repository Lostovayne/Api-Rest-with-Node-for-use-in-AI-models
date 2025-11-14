import { put, type PutBlobResult } from "@vercel/blob";

const uploadBlob = async (
  filename: string,
  buffer: Buffer,
  contentType: string
): Promise<PutBlobResult> => {
  try {
    return await put(filename, buffer, {
      access: "public",
      contentType,
    });
  } catch (error) {
    console.error("Error uploading file to Vercel Blob:", error);
    throw new Error("Failed to upload file to Vercel Blob.");
  }
};

export const uploadAudioBlob = async (
  filename: string,
  audioBuffer: Buffer,
  contentType: string
): Promise<PutBlobResult> => uploadBlob(filename, audioBuffer, contentType);

export const uploadImageBlob = async (
  filename: string,
  imageBuffer: Buffer,
  contentType = "image/png"
): Promise<PutBlobResult> => uploadBlob(filename, imageBuffer, contentType);
