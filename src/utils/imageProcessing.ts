// Supported image formats
const SUPPORTED_FORMATS = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];

// Max file size: 20MB (Gemini Vision limit)
const MAX_FILE_SIZE = 20 * 1024 * 1024;

export interface ImageValidationResult {
    valid: boolean;
    error?: string;
    file?: File;
}

export interface ImageProcessingResult {
    base64: string;
    mimeType: string;
    width: number;
    height: number;
}

/**
 * Validate an image file before processing
 */
export function validateImageFile(file: File): ImageValidationResult {
    // Check file type
    if (!SUPPORTED_FORMATS.includes(file.type)) {
        return {
            valid: false,
            error: `Unsupported format. Please use: JPG, PNG, WEBP, HEIC, or HEIF`,
        };
    }

    // Check file size
    if (file.size > MAX_FILE_SIZE) {
        return {
            valid: false,
            error: `File too large. Maximum size is 20MB`,
        };
    }

    return { valid: true, file };
}

/**
 * Convert a File to base64 string
 */
export function fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            const result = reader.result as string;
            // Remove data URL prefix (e.g., "data:image/png;base64,")
            const base64 = result.split(',')[1];
            resolve(base64);
        };
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsDataURL(file);
    });
}

/**
 * Get image dimensions from a File
 */
export function getImageDimensions(file: File): Promise<{ width: number; height: number }> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        const url = URL.createObjectURL(file);

        img.onload = () => {
            URL.revokeObjectURL(url);
            resolve({ width: img.naturalWidth, height: img.naturalHeight });
        };

        img.onerror = () => {
            URL.revokeObjectURL(url);
            reject(new Error('Failed to load image'));
        };

        img.src = url;
    });
}

/**
 * Process an image file: validate, convert to base64, get dimensions
 */
export async function processImageFile(file: File): Promise<ImageProcessingResult> {
    const validation = validateImageFile(file);
    if (!validation.valid) {
        throw new Error(validation.error);
    }

    const [base64, dimensions] = await Promise.all([
        fileToBase64(file),
        getImageDimensions(file),
    ]);

    return {
        base64,
        mimeType: file.type,
        width: dimensions.width,
        height: dimensions.height,
    };
}

/**
 * Convert base64 to data URL for display
 */
export function base64ToDataUrl(base64: string, mimeType: string = 'image/png'): string {
    return `data:${mimeType};base64,${base64}`;
}

/**
 * Create a thumbnail from a base64 image (for library cards)
 */
export function createThumbnail(
    base64: string,
    mimeType: string,
    maxSize: number = 200
): Promise<string> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
            // Calculate new dimensions maintaining aspect ratio
            let { width, height } = img;
            if (width > height) {
                if (width > maxSize) {
                    height = height * (maxSize / width);
                    width = maxSize;
                }
            } else {
                if (height > maxSize) {
                    width = width * (maxSize / height);
                    height = maxSize;
                }
            }

            // Create canvas and draw resized image
            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            if (!ctx) {
                reject(new Error('Failed to get canvas context'));
                return;
            }

            ctx.drawImage(img, 0, 0, width, height);

            // Export as JPEG for smaller size
            const thumbnailDataUrl = canvas.toDataURL('image/jpeg', 0.8);
            const thumbnailBase64 = thumbnailDataUrl.split(',')[1];
            resolve(thumbnailBase64);
        };

        img.onerror = () => reject(new Error('Failed to load image for thumbnail'));
        img.src = base64ToDataUrl(base64, mimeType);
    });
}

/**
 * Estimate file size from base64 string (in bytes)
 */
export function estimateBase64Size(base64: string): number {
    // Base64 encodes 3 bytes into 4 characters
    return Math.ceil((base64.length * 3) / 4);
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
