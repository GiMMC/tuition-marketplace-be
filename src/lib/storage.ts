import { supabase } from './supabase';
import { v4 as uuidv4 } from 'uuid';

export async function uploadDocumentToStorage(file: File): Promise<{ filename: string, size: number, mimeType: string }> {
  const bucketName = process.env.SUPABASE_STORAGE_BUCKET || 'documents';
  const ext = file.name.split('.').pop();
  const filename = `${uuidv4()}.${ext}`;

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const { data, error } = await supabase.storage
    .from(bucketName)
    .upload(filename, buffer, {
      contentType: file.type,
      upsert: false
    });

  if (error) {
    throw new Error(`Failed to upload file to Supabase: ${error.message}`);
  }

  return {
    filename: data.path,
    size: file.size,
    mimeType: file.type,
  };
}

export async function generateDownloadUrl(filename: string): Promise<string> {
  const bucketName = process.env.SUPABASE_STORAGE_BUCKET || 'documents';
  
  const { data, error } = await supabase.storage
    .from(bucketName)
    .createSignedUrl(filename, 60 * 5); // 5 minutes

  if (error) {
    throw new Error(`Failed to generate signed url: ${error.message}`);
  }

  return data.signedUrl;
}
