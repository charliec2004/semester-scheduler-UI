/**
 * Drag & Drop Zone Component
 * Accessible file drop area with visual feedback
 */

import { useState, useRef, useCallback } from 'react';
import { Upload } from 'lucide-react';
import { cn } from '../../lib/utils';

interface DropZoneProps {
  onFileDrop: (content: string, path: string) => void;
  accept?: string;
  label: string;
  description?: string;
  icon?: JSX.Element;
  className?: string;
  activeLabel?: string;
  activeDescription?: string;
  activeIcon?: JSX.Element;
  children?: React.ReactNode;
}

export function DropZone({
  onFileDrop,
  accept = '.csv',
  label,
  description,
  icon,
  className,
  activeLabel,
  activeDescription,
  activeIcon,
  children,
}: DropZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const acceptsFile = useCallback((file: File) => {
    const acceptedTokens = accept
      .split(',')
      .map((token) => token.trim().toLowerCase())
      .filter(Boolean);

    if (acceptedTokens.length === 0) {
      return true;
    }

    const lowercaseName = file.name.toLowerCase();
    return acceptedTokens.some((token) => {
      if (token.startsWith('.')) {
        return lowercaseName.endsWith(token);
      }
      return file.type.toLowerCase() === token;
    });
  }, [accept]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      if (acceptsFile(file)) {
        const reader = new FileReader();
        reader.onload = (event) => {
          const content = event.target?.result as string;
          onFileDrop(content, file.name);
        };
        reader.readAsText(file);
      }
    }
  }, [acceptsFile, onFileDrop]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (!acceptsFile(file)) {
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result as string;
        onFileDrop(content, file.name);
      };
      reader.readAsText(file);
    }
  }, [acceptsFile, onFileDrop]);

  const handleClick = () => {
    inputRef.current?.click();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      inputRef.current?.click();
    }
  };

  const defaultIcon = (
    <Upload className="h-6 w-6" strokeWidth={1.8} />
  );

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={cn(
        'drop-zone relative cursor-pointer overflow-hidden transition-[border-color,background-color,transform,box-shadow] duration-200 ease-out',
        isDragging && 'drop-zone-active',
        className,
      )}
      aria-label={`${label}. Click or drag and drop a file.`}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        onChange={handleFileSelect}
        className="sr-only"
        aria-hidden="true"
      />
      
      <div
        className={cn(
          'flex w-full flex-col items-center gap-3 text-center transition-all duration-200 ease-out',
          isDragging && 'translate-y-2 scale-[0.985] opacity-0',
        )}
      >
        {children ?? (
          <>
            <div className="text-surface-400">
              {icon || defaultIcon}
            </div>

            <div className="text-center">
              <p className="text-sm font-medium text-surface-200">{label}</p>
              {description && (
                <p className="mt-1 text-[13px] text-surface-400">{description}</p>
              )}
            </div>

          <p className="text-[11px] text-surface-500">
            Drag & drop or click to browse
          </p>
          </>
        )}
      </div>

      <div
        className={cn(
          'pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-3 px-6 text-center transition-all duration-200 ease-out',
          isDragging ? 'scale-100 opacity-100' : 'scale-[0.985] opacity-0',
        )}
        aria-hidden={!isDragging}
      >
        <div className="text-foreground">
          {activeIcon || icon || defaultIcon}
        </div>
        <div>
          <p className="text-base font-semibold text-foreground">
            {activeLabel || 'Drop file'}
          </p>
          <p className="mt-1 text-[13px] text-surface-300">
            {activeDescription || 'Release to import'}
          </p>
        </div>
      </div>
    </div>
  );
}
