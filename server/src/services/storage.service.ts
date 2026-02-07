import { createClient } from '@supabase/supabase-js';
import { env } from '../config/environment.js';

// Initialize Supabase client
const supabase = createClient(env.SUPABASE_URL!, env.SUPABASE_SERVICE_KEY!);

const BUCKETS = {
    STYLES: 'styles',
    CHARACTERS: 'characters',
    GENERATIONS: 'generations',
} as const;

export interface UploadResult {
    url: string;
    key: string;
    thumbnailUrl?: string;
    thumbnailKey?: string;
}

export class StorageService {
    /**
     * Upload a file to Supabase Storage
     */
    async upload(
        bucket: keyof typeof BUCKETS,
        path: string,
        file: Buffer | Blob,
        contentType: string
    ): Promise<UploadResult> {
        const bucketName = BUCKETS[bucket];

        const { data, error } = await supabase.storage
            .from(bucketName)
            .upload(path, file, {
                contentType,
                upsert: true,
                cacheControl: '31536000', // 1 year cache
            });

        if (error) {
            throw new Error(`Upload failed: ${error.message}`);
        }

        // Get public URL
        const { data: urlData } = supabase.storage
            .from(bucketName)
            .getPublicUrl(data.path);

        return {
            url: urlData.publicUrl,
            key: data.path,
        };
    }

    /**
     * Upload an image with auto-generated thumbnail
     */
    async uploadWithThumbnail(
        bucket: keyof typeof BUCKETS,
        path: string,
        imageBuffer: Buffer,
        contentType: string = 'image/png'
    ): Promise<UploadResult> {
        const bucketName = BUCKETS[bucket];

        // Upload original image
        const { data: imageData, error: imageError } = await supabase.storage
            .from(bucketName)
            .upload(path, imageBuffer, {
                contentType,
                upsert: true,
                cacheControl: '31536000',
            });

        if (imageError) {
            throw new Error(`Image upload failed: ${imageError.message}`);
        }

        // Get public URL for original
        const { data: originalUrl } = supabase.storage
            .from(bucketName)
            .getPublicUrl(imageData.path);

        // For thumbnails, use Supabase's transform feature
        // This generates a thumbnail on-the-fly via URL parameters
        const thumbnailUrl = `${originalUrl.publicUrl}?width=300&height=300&resize=contain`;

        return {
            url: originalUrl.publicUrl,
            key: imageData.path,
            thumbnailUrl,
            thumbnailKey: imageData.path, // Same key, thumbnail is generated via URL transform
        };
    }

    /**
     * Upload a video file
     */
    async uploadVideo(
        path: string,
        videoBuffer: Buffer,
        contentType: string = 'video/mp4'
    ): Promise<UploadResult> {
        return this.upload('GENERATIONS', path, videoBuffer, contentType);
    }

    /**
     * Delete a file from storage
     */
    async delete(bucket: keyof typeof BUCKETS, path: string): Promise<void> {
        const bucketName = BUCKETS[bucket];

        const { error } = await supabase.storage
            .from(bucketName)
            .remove([path]);

        if (error) {
            throw new Error(`Delete failed: ${error.message}`);
        }
    }

    /**
     * Delete multiple files
     */
    async deleteMany(bucket: keyof typeof BUCKETS, paths: string[]): Promise<void> {
        const bucketName = BUCKETS[bucket];

        const { error } = await supabase.storage
            .from(bucketName)
            .remove(paths);

        if (error) {
            throw new Error(`Bulk delete failed: ${error.message}`);
        }
    }

    /**
     * Generate a signed URL for temporary access
     */
    async getSignedUrl(
        bucket: keyof typeof BUCKETS,
        path: string,
        expiresIn: number = 3600 // 1 hour default
    ): Promise<string> {
        const bucketName = BUCKETS[bucket];

        const { data, error } = await supabase.storage
            .from(bucketName)
            .createSignedUrl(path, expiresIn);

        if (error) {
            throw new Error(`Signed URL generation failed: ${error.message}`);
        }

        return data.signedUrl;
    }

    /**
     * List files in a path
     */
    async list(
        bucket: keyof typeof BUCKETS,
        path: string,
        options?: { limit?: number; offset?: number }
    ) {
        const bucketName = BUCKETS[bucket];

        const { data, error } = await supabase.storage
            .from(bucketName)
            .list(path, {
                limit: options?.limit || 100,
                offset: options?.offset || 0,
            });

        if (error) {
            throw new Error(`List failed: ${error.message}`);
        }

        return data;
    }

    /**
     * Move/rename a file
     */
    async move(
        bucket: keyof typeof BUCKETS,
        fromPath: string,
        toPath: string
    ): Promise<void> {
        const bucketName = BUCKETS[bucket];

        const { error } = await supabase.storage
            .from(bucketName)
            .move(fromPath, toPath);

        if (error) {
            throw new Error(`Move failed: ${error.message}`);
        }
    }

    /**
     * Copy a file
     */
    async copy(
        bucket: keyof typeof BUCKETS,
        fromPath: string,
        toPath: string
    ): Promise<void> {
        const bucketName = BUCKETS[bucket];

        const { error } = await supabase.storage
            .from(bucketName)
            .copy(fromPath, toPath);

        if (error) {
            throw new Error(`Copy failed: ${error.message}`);
        }
    }
}

export const storageService = new StorageService();
