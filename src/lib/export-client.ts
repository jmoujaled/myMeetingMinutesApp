import type { ExportFormat } from '@/lib/supabase/meetings-types';

export interface ExportClientOptions {
  format: ExportFormat;
  includeTranscript?: boolean;
  includeSummary?: boolean;
  includeActionItems?: boolean;
}

export class ExportClient {
  /**
   * Download a meeting or transcription export
   */
  static async downloadExport(
    recordId: string,
    options: ExportClientOptions
  ): Promise<void> {
    try {
      const params = new URLSearchParams({
        format: options.format,
        include_transcript: (options.includeTranscript ?? true).toString(),
        include_summary: (options.includeSummary ?? true).toString(),
        include_action_items: (options.includeActionItems ?? true).toString(),
      });

      const response = await fetch(`/api/meetings/${recordId}/export?${params}`, {
        method: 'GET',
        headers: {
          'Accept': '*/*',
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Export failed with status ${response.status}`);
      }

      // Get filename from Content-Disposition header
      const contentDisposition = response.headers.get('Content-Disposition');
      let filename = `export_${new Date().toISOString().split('T')[0]}.${options.format}`;
      
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="([^"]+)"/);
        if (filenameMatch) {
          filename = filenameMatch[1];
        }
      }

      // Create blob and download
      const blob = await response.blob();
      this.downloadBlob(blob, filename);
    } catch (error) {
      console.error('Export download failed:', error);
      throw error;
    }
  }

  /**
   * Download multiple exports in a batch
   */
  static async downloadBatchExports(
    recordIds: string[],
    options: ExportClientOptions
  ): Promise<void> {
    const downloadPromises = recordIds.map(id => 
      this.downloadExport(id, options).catch(error => {
        console.error(`Failed to export record ${id}:`, error);
        return null; // Continue with other downloads
      })
    );

    await Promise.all(downloadPromises);
  }

  /**
   * Get export preview (for showing file size, etc.)
   */
  static async getExportPreview(
    recordId: string,
    format: ExportFormat
  ): Promise<{ size: number; filename: string }> {
    try {
      const response = await fetch(`/api/meetings/${recordId}/export?format=${format}`, {
        method: 'HEAD',
      });

      if (!response.ok) {
        throw new Error(`Preview failed with status ${response.status}`);
      }

      const contentLength = response.headers.get('Content-Length');
      const contentDisposition = response.headers.get('Content-Disposition');
      
      let filename = `export.${format}`;
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="([^"]+)"/);
        if (filenameMatch) {
          filename = filenameMatch[1];
        }
      }

      return {
        size: contentLength ? parseInt(contentLength, 10) : 0,
        filename,
      };
    } catch (error) {
      console.error('Export preview failed:', error);
      throw error;
    }
  }

  /**
   * Check if export format is supported for record type
   */
  static isFormatSupported(
    recordType: 'meeting' | 'transcription',
    format: ExportFormat
  ): boolean {
    if (recordType === 'transcription') {
      // Transcriptions support TXT and SRT
      return ['txt', 'srt'].includes(format);
    } else {
      // Meetings support all formats
      return ['txt', 'srt', 'docx', 'pdf'].includes(format);
    }
  }

  /**
   * Get available export formats for a record type
   */
  static getAvailableFormats(recordType: 'meeting' | 'transcription'): ExportFormat[] {
    if (recordType === 'transcription') {
      return ['txt', 'srt'];
    } else {
      return ['txt', 'docx', 'pdf'];
    }
  }

  /**
   * Get format display name
   */
  static getFormatDisplayName(format: ExportFormat): string {
    const displayNames = {
      txt: 'Plain Text',
      srt: 'Subtitle File (SRT)',
      docx: 'Word Document',
      pdf: 'PDF Document',
    };

    return displayNames[format];
  }

  /**
   * Get format description
   */
  static getFormatDescription(format: ExportFormat): string {
    const descriptions = {
      txt: 'Simple text format with meeting content',
      srt: 'Subtitle format with timestamps (for transcriptions)',
      docx: 'Microsoft Word document with formatted content',
      pdf: 'PDF document with professional formatting',
    };

    return descriptions[format];
  }

  /**
   * Format file size for display
   */
  static formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  }

  /**
   * Download blob as file
   */
  private static downloadBlob(blob: Blob, filename: string): void {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    
    // Append to body, click, and remove
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Clean up the URL object
    window.URL.revokeObjectURL(url);
  }

  /**
   * Validate export options
   */
  static validateExportOptions(options: ExportClientOptions): void {
    if (!options.format) {
      throw new Error('Export format is required');
    }

    if (!['txt', 'srt', 'docx', 'pdf'].includes(options.format)) {
      throw new Error(`Unsupported export format: ${options.format}`);
    }
  }

  /**
   * Create export options with defaults
   */
  static createExportOptions(
    format: ExportFormat,
    overrides: Partial<ExportClientOptions> = {}
  ): ExportClientOptions {
    return {
      format,
      includeTranscript: true,
      includeSummary: true,
      includeActionItems: true,
      ...overrides,
    };
  }
}