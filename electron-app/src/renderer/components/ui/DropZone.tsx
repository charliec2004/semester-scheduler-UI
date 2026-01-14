/**
 * Drag & Drop Zone Component
 * Accessible file drop area with visual feedback
 */

import { useState, useRef, useCallback } from 'react';

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
    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
        d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
    </svg>
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
      className={`drop-zone cursor-pointer ${isDragging ? 'drop-zone-active' : ''}`}
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
      
      <div className={`text-surface-400 ${isDragging ? 'text-accent-400' : ''}`}>
        {icon || defaultIcon}
      </div>
      
      <div className="text-center">
        <p className="text-surface-200 font-medium">{label}</p>
        {description && (
          <p className="text-sm text-surface-400 mt-1">{description}</p>
        )}
      </div>
      
      <p className="text-xs text-surface-500">
        Drag & drop or click to browse
      </p>
    </div>
  );
}
