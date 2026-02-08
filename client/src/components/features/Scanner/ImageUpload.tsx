import {
  type DragEvent,
  type ChangeEvent,
  useCallback,
  useRef,
  useState,
} from 'react';

/* ---- Types ---- */

interface ImageUploadProps {
  onUpload: (file: File) => void;
  isUploading?: boolean;
  maxSizeMB?: number;
}

type UploadState = 'empty' | 'dragging' | 'preview' | 'error';

/* ---- Utilities ---- */

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function validateFile(
  file: File,
  maxSizeMB: number,
): string | null {
  if (!file.type.startsWith('image/')) {
    return `"${file.name}" is not an image. Please upload a JPG, PNG, or WebP file.`;
  }
  const maxBytes = maxSizeMB * 1024 * 1024;
  if (file.size > maxBytes) {
    return `File is too large (${formatFileSize(file.size)}). Maximum size is ${maxSizeMB} MB.`;
  }
  return null;
}

/**
 * Compress an image using the Canvas API.
 * Resizes to maxWidth (preserving aspect ratio) and encodes as JPEG at the given quality.
 */
function compressImage(
  file: File,
  maxWidth = 1920,
  quality = 0.8,
): Promise<File> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);

      // Skip if already small
      if (img.width <= maxWidth && file.size < 500 * 1024) {
        resolve(file);
        return;
      }

      const scale = img.width > maxWidth ? maxWidth / img.width : 1;
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(file);
        return;
      }

      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            resolve(file);
            return;
          }
          resolve(
            new File([blob], file.name, {
              type: 'image/jpeg',
              lastModified: Date.now(),
            }),
          );
        },
        'image/jpeg',
        quality,
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image for compression'));
    };

    img.src = url;
  });
}

/* ---- Icons (inline SVGs) ---- */

function CameraIcon() {
  return (
    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2v11Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle
        cx="12"
        cy="13"
        r="4"
        stroke="currentColor"
        strokeWidth="1.5"
      />
    </svg>
  );
}

function UploadCloudIcon() {
  return (
    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M16 16l-4-4-4 4M12 12v9"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M16 16l-4-4-4 4"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/* ---- Component ---- */

export default function ImageUpload({
  onUpload,
  isUploading = false,
  maxSizeMB = 10,
}: ImageUploadProps) {
  const [state, setState] = useState<UploadState>('empty');
  const [preview, setPreview] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [fileSize, setFileSize] = useState<number>(0);
  const [originalSize, setOriginalSize] = useState<number>(0);
  const [error, setError] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  /* ---- Handlers ---- */

  const resetToEmpty = useCallback(() => {
    setState('empty');
    setPreview(null);
    setFileName('');
    setFileSize(0);
    setOriginalSize(0);
    setError('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, []);

  const processFile = useCallback(
    async (file: File) => {
      const validationError = validateFile(file, maxSizeMB);
      if (validationError) {
        setState('error');
        setError(validationError);
        setPreview(null);
        return;
      }

      // Compress image (canvas API: max 1920px, 80% quality)
      let processed: File;
      try {
        processed = await compressImage(file);
      } catch {
        processed = file; // fallback to original on failure
      }

      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreview(e.target?.result as string);
        setFileName(processed.name);
        setFileSize(processed.size);
        setOriginalSize(file.size);
        setState('preview');
        setError('');
        onUpload(processed);
      };
      reader.readAsDataURL(processed);
    },
    [maxSizeMB, onUpload],
  );

  const handleDrop = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      setState('empty');

      const file = e.dataTransfer.files[0];
      if (file) processFile(file);
    },
    [processFile],
  );

  const handleDragOver = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setState('dragging');
  }, []);

  const handleDragLeave = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setState((prev) => (prev === 'dragging' ? 'empty' : prev));
  }, []);

  const handleFileChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) processFile(file);
    },
    [processFile],
  );

  const handleClick = () => {
    if (!isUploading) fileInputRef.current?.click();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleClick();
    }
  };

  /* ---- Render: Error state ---- */

  if (state === 'error') {
    return (
      <div className="w-full">
        <div
          className={[
            'flex items-start gap-3 rounded-xl border border-danger/30 bg-danger-light p-4',
          ].join(' ')}
          role="alert"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 20 20"
            fill="none"
            className="shrink-0 mt-0.5 text-danger"
            aria-hidden="true"
          >
            <path
              d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16ZM7.47 7.47a.75.75 0 0 1 1.06 0L10 8.94l1.47-1.47a.75.75 0 1 1 1.06 1.06L11.06 10l1.47 1.47a.75.75 0 1 1-1.06 1.06L10 11.06l-1.47 1.47a.75.75 0 0 1-1.06-1.06L8.94 10 7.47 8.53a.75.75 0 0 1 0-1.06Z"
              fill="currentColor"
            />
          </svg>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-danger-dark">{error}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={resetToEmpty}
          className={[
            'mt-3 w-full py-2.5 text-sm font-medium text-neutral-700',
            'border border-neutral-200 rounded-lg bg-white',
            'hover:bg-neutral-50 hover:border-neutral-300',
            'active:bg-neutral-100',
            'transition-colors duration-150',
            'cursor-pointer',
          ].join(' ')}
        >
          Try again
        </button>
      </div>
    );
  }

  /* ---- Render: Preview state ---- */

  if (state === 'preview' && preview) {
    return (
      <div className="w-full">
        <div className="relative rounded-xl overflow-hidden border border-neutral-200 bg-neutral-900">
          <img
            src={preview}
            alt={`Preview of ${fileName}`}
            className="w-full max-h-80 object-contain"
          />

          {/* Upload overlay */}
          {isUploading && (
            <div
              className={[
                'absolute inset-0 flex flex-col items-center justify-center gap-3',
                'bg-neutral-900/60 backdrop-blur-sm',
              ].join(' ')}
            >
              {/* Spinner */}
              <svg
                width="36"
                height="36"
                viewBox="0 0 24 24"
                fill="none"
                className="animate-spin text-white"
                aria-hidden="true"
              >
                <circle
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeLinecap="round"
                  opacity="0.25"
                />
                <path
                  d="M12 2a10 10 0 0 1 10 10"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeLinecap="round"
                />
              </svg>
              <p className="text-sm font-medium text-white">
                Analyzing image…
              </p>
            </div>
          )}
        </div>

        {/* File info */}
        <div className="mt-3 flex items-center justify-between px-1">
          <p className="text-sm text-neutral-500 truncate mr-3">
            {fileName}
            <span className="ml-1.5 text-neutral-400">
              ({formatFileSize(fileSize)})
            </span>
            {originalSize > 0 && originalSize !== fileSize && (
              <span className="ml-1 text-xs text-success-dark">
                compressed from {formatFileSize(originalSize)}
              </span>
            )}
          </p>
          {!isUploading && (
            <button
              type="button"
              onClick={resetToEmpty}
              className={[
                'shrink-0 px-3 py-1.5 text-sm font-medium text-brand-700',
                'border border-brand-200 rounded-lg bg-brand-50',
                'hover:bg-brand-100 hover:border-brand-300',
                'active:bg-brand-200',
                'transition-colors duration-150',
                'cursor-pointer',
              ].join(' ')}
            >
              Choose different photo
            </button>
          )}
        </div>
      </div>
    );
  }

  /* ---- Render: Empty / Dragging state ---- */

  const isDragging = state === 'dragging';

  return (
    <div className="w-full">
      <div
        role="button"
        tabIndex={0}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={[
          // base
          'relative flex flex-col items-center justify-center gap-4',
          'w-full min-h-56 p-8 rounded-xl',
          'border-2 border-dashed',
          'transition-all duration-200 ease-in-out',
          'cursor-pointer select-none',
          'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-400',
          // state-specific
          isDragging
            ? 'border-brand-400 bg-brand-50 scale-[1.01]'
            : 'border-neutral-300 bg-white hover:border-brand-300 hover:bg-brand-50/50',
        ].join(' ')}
      >
        {/* Icon */}
        <div
          className={[
            'transition-colors duration-200',
            isDragging ? 'text-brand-500' : 'text-neutral-400',
          ].join(' ')}
        >
          {/* Show camera on mobile-sized, cloud on desktop */}
          <span className="hidden sm:block">
            <UploadCloudIcon />
          </span>
          <span className="block sm:hidden">
            <CameraIcon />
          </span>
        </div>

        {/* Instructions */}
        <div className="text-center">
          <p
            className={[
              'text-base font-medium',
              isDragging ? 'text-brand-700' : 'text-neutral-700',
            ].join(' ')}
          >
            {isDragging ? 'Drop your image here' : 'Drag & drop a photo here'}
          </p>
          <p className="mt-1 text-sm text-neutral-400">
            or{' '}
            <span className="text-brand-600 font-medium">
              browse files
            </span>
          </p>
        </div>

        {/* Supported formats */}
        <p className="text-xs text-neutral-400">
          JPG, PNG, WebP up to {maxSizeMB} MB
        </p>
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileChange}
        className="hidden"
        aria-label="Upload image"
      />
    </div>
  );
}
