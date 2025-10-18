'use client';

import React, { useState } from 'react';
import { useExport, useExportFormats } from '@/hooks/useExport';
import type { ExportFormat } from '@/lib/supabase/meetings-types';

interface ExportButtonProps {
  recordId: string;
  recordType: 'meeting' | 'transcription';
  title?: string;
  className?: string;
  variant?: 'button' | 'dropdown';
}

export function ExportButton({
  recordId,
  recordType,
  title = 'Export',
  className = '',
  variant = 'dropdown'
}: ExportButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>('pdf');
  const [exportOptions, setExportOptions] = useState({
    includeTranscript: true,
    includeSummary: true,
    includeActionItems: true,
  });

  const { exportState, downloadExport, clearError } = useExport();
  const { 
    getAvailableFormats, 
    getFormatDisplayName, 
    getFormatDescription,
    createExportOptions 
  } = useExportFormats();

  const availableFormats = getAvailableFormats(recordType);

  const handleExport = async (format: ExportFormat) => {
    try {
      const options = createExportOptions(format, exportOptions);
      await downloadExport(recordId, options);
      setIsOpen(false);
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  const handleQuickExport = async () => {
    const defaultFormat = recordType === 'meeting' ? 'pdf' : 'txt';
    await handleExport(defaultFormat);
  };

  if (variant === 'button') {
    return (
      <button
        onClick={handleQuickExport}
        disabled={exportState.isExporting}
        className={`inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
      >
        {exportState.isExporting ? (
          <>
            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-gray-500" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Exporting...
          </>
        ) : (
          <>
            <svg className="-ml-1 mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            {title}
          </>
        )}
      </button>
    );
  }

  return (
    <div className="relative inline-block text-left">
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={exportState.isExporting}
        className={`inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
      >
        {exportState.isExporting ? (
          <>
            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-gray-500" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Exporting...
          </>
        ) : (
          <>
            <svg className="-ml-1 mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            {title}
            <svg className="-mr-1 ml-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </>
        )}
      </button>

      {isOpen && (
        <div className="origin-top-right absolute right-0 mt-2 w-80 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 focus:outline-none z-50">
          <div className="py-1">
            <div className="px-4 py-2 border-b border-gray-200">
              <h3 className="text-sm font-medium text-gray-900">Export Options</h3>
            </div>
            
            {/* Format Selection */}
            <div className="px-4 py-3">
              <label className="block text-xs font-medium text-gray-700 mb-2">
                Format
              </label>
              <div className="space-y-2">
                {availableFormats.map((format) => (
                  <label key={format} className="flex items-start">
                    <input
                      type="radio"
                      name="format"
                      value={format}
                      checked={selectedFormat === format}
                      onChange={(e) => setSelectedFormat(e.target.value as ExportFormat)}
                      className="mt-0.5 h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                    />
                    <div className="ml-2">
                      <div className="text-sm text-gray-900">
                        {getFormatDisplayName(format)}
                      </div>
                      <div className="text-xs text-gray-500">
                        {getFormatDescription(format)}
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Content Options */}
            {recordType === 'meeting' && (
              <div className="px-4 py-3 border-t border-gray-200">
                <label className="block text-xs font-medium text-gray-700 mb-2">
                  Include Content
                </label>
                <div className="space-y-2">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={exportOptions.includeTranscript}
                      onChange={(e) => setExportOptions(prev => ({
                        ...prev,
                        includeTranscript: e.target.checked
                      }))}
                      className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">Transcript</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={exportOptions.includeSummary}
                      onChange={(e) => setExportOptions(prev => ({
                        ...prev,
                        includeSummary: e.target.checked
                      }))}
                      className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">Summary</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={exportOptions.includeActionItems}
                      onChange={(e) => setExportOptions(prev => ({
                        ...prev,
                        includeActionItems: e.target.checked
                      }))}
                      className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">Action Items</span>
                  </label>
                </div>
              </div>
            )}

            {/* Error Display */}
            {exportState.error && (
              <div className="px-4 py-3 border-t border-gray-200">
                <div className="flex items-center text-red-600 text-sm">
                  <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {exportState.error}
                </div>
                <button
                  onClick={clearError}
                  className="mt-1 text-xs text-red-600 hover:text-red-800"
                >
                  Dismiss
                </button>
              </div>
            )}

            {/* Action Buttons */}
            <div className="px-4 py-3 border-t border-gray-200 flex justify-between">
              <button
                onClick={() => setIsOpen(false)}
                className="text-sm text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={() => handleExport(selectedFormat)}
                disabled={exportState.isExporting}
                className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Export {getFormatDisplayName(selectedFormat)}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Progress Bar */}
      {exportState.isExporting && exportState.progress > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1">
          <div className="bg-gray-200 rounded-full h-1">
            <div 
              className="bg-blue-600 h-1 rounded-full transition-all duration-300"
              style={{ width: `${exportState.progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Click outside to close */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
}