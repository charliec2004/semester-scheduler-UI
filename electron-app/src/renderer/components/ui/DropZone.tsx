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
}

export function DropZone({ onFileDrop, accept = '.csv', label, description, icon }: DropZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

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
      if (file.name.endsWith('.csv')) {
        const reader = new FileReader();
        reader.onload = (event) => {
          const content = event.target?.result as string;
          onFileDrop(content, file.name);
        };
        reader.readAsText(file);
      }
    }
  }, [onFileDrop]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result as string;
        onFileDrop(content, file.name);
      };
      reader.readAsText(file);
    }
  }, [onFileDrop]);

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
      className={cn('drop-zone cursor-pointer', isDragging && 'drop-zone-active')}
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
      
      <div className={cn('text-surface-400', isDragging && 'text-foreground')}>
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
    </div>
  );
}
