import { useRef, useState, useCallback } from 'react';
import { Upload, FileText, Image, File, X, Loader2 } from 'lucide-react';

const formatFileSize = (bytes) => {
  if (!bytes && bytes !== 0) return '';
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const getFileIcon = (mimeType = '') => {
  if (mimeType.startsWith('image/')) {
    return <Image className="w-5 h-5 text-emerald-500 shrink-0" />;
  }
  if (
    mimeType === 'application/pdf' ||
    mimeType.includes('document') ||
    mimeType.includes('msword') ||
    mimeType.includes('text/')
  ) {
    return <FileText className="w-5 h-5 text-blue-500 shrink-0" />;
  }
  return <File className="w-5 h-5 text-slate-400 shrink-0" />;
};

const FileUploadArea = ({
  files = [],
  onUpload,
  onRemove,
  accept = '.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.jpg,.jpeg,.png,.gif,.txt',
  maxFiles = 5,
  maxSizeMB = 10,
  uploading = false,
  disabled = false,
}) => {
  const inputRef = useRef(null);
  const [dragOver, setDragOver] = useState(false);

  const isMaxed = files.length >= maxFiles;
  const isDisabled = disabled || isMaxed;

  const handleFile = useCallback(
    (file) => {
      if (!file) return;
      const maxBytes = maxSizeMB * 1024 * 1024;
      if (file.size > maxBytes) {
        alert(`File "${file.name}" exceeds the ${maxSizeMB} MB size limit.`);
        return;
      }
      if (onUpload) {
        onUpload(file);
      }
    },
    [maxSizeMB, onUpload]
  );

  const onDragOver = useCallback(
    (e) => {
      e.preventDefault();
      if (!isDisabled) setDragOver(true);
    },
    [isDisabled]
  );

  const onDragLeave = useCallback((e) => {
    e.preventDefault();
    setDragOver(false);
  }, []);

  const onDrop = useCallback(
    (e) => {
      e.preventDefault();
      setDragOver(false);
      if (isDisabled) return;
      const droppedFiles = Array.from(e.dataTransfer.files);
      droppedFiles.forEach(handleFile);
    },
    [isDisabled, handleFile]
  );

  const onInputChange = useCallback(
    (e) => {
      const selectedFiles = Array.from(e.target.files);
      selectedFiles.forEach(handleFile);
      e.target.value = '';
    },
    [handleFile]
  );

  const handleZoneClick = () => {
    if (!isDisabled && inputRef.current) {
      inputRef.current.click();
    }
  };

  return (
    <div className="space-y-3">
      {/* Drop zone */}
      <div
        role="button"
        tabIndex={0}
        onClick={handleZoneClick}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleZoneClick(); }}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        className={`relative flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-6 py-8 transition-colors duration-200 cursor-pointer ${
          isDisabled
            ? 'border-slate-200 bg-slate-50 cursor-not-allowed opacity-60'
            : dragOver
            ? 'border-blue-500 bg-blue-50/50'
            : 'border-slate-300 bg-white hover:border-slate-400 hover:bg-slate-50/50'
        }`}
      >
        {uploading ? (
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
        ) : (
          <Upload className="w-8 h-8 text-slate-400" />
        )}
        <div className="text-center">
          <p className="text-sm font-medium text-slate-600">
            {isMaxed
              ? `Maximum of ${maxFiles} files reached`
              : uploading
              ? 'Uploading…'
              : 'Drag files here or click to browse'}
          </p>
          {!isMaxed && (
            <p className="mt-1 text-xs text-slate-400">
              {accept.replace(/\./g, '').toUpperCase().replace(/,/g, ', ')} — Max {maxSizeMB} MB per file
            </p>
          )}
        </div>

        <input
          ref={inputRef}
          type="file"
          accept={accept}
          className="hidden"
          onChange={onInputChange}
          disabled={isDisabled}
          multiple
        />
      </div>

      {/* File list */}
      {files.length > 0 && (
        <ul className="space-y-2">
          {files.map((file, index) => (
            <li
              key={`${file.name}-${index}`}
              className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2.5 shadow-sm"
            >
              {getFileIcon(file.mimeType)}
              <a
                href={file.signedUrl || file.url || '#'}
                target={file.url ? "_blank" : "_self"}
                rel={file.url ? "noopener noreferrer" : ""}
                className="flex-1 min-w-0 text-sm font-medium !text-slate-900 hover:!text-blue-600 hover:underline truncate"
              >
                {file.name}
              </a>
              {file.size != null && (
                <span className="text-xs text-slate-400 shrink-0">
                  {formatFileSize(file.size)}
                </span>
              )}
              {onRemove && (
                <button
                  type="button"
                  onClick={() => onRemove(index)}
                  className="p-1 rounded-md text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors cursor-pointer"
                  title="Remove file"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default FileUploadArea;
