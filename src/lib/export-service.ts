import { jsPDF } from 'jspdf';
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } from 'docx';
import type { ExportFormat, ExportOptions } from '@/lib/supabase/meetings-types';

export interface ExportData {
  id: string;
  title: string;
  filename?: string;
  date: string;
  duration?: number;
  transcript?: string;
  summary?: string;
  actionItems?: Array<{
    text: string;
    assignee?: string;
    dueDate?: string;
    completed?: boolean;
  }>;
  attendees?: string[];
  keyTopics?: string[];
  recordType: 'meeting' | 'transcription';
}

export class ExportService {
  /**
   * Generate export file based on format and options
   */
  static async generateExport(
    data: ExportData,
    format: ExportFormat,
    options: ExportOptions = {}
  ): Promise<Buffer> {
    switch (format) {
      case 'txt':
        return this.generateTextExport(data, options);
      case 'srt':
        return this.generateSRTExport(data);
      case 'docx':
        return this.generateWordExport(data, options);
      case 'pdf':
        return this.generatePDFExport(data, options);
      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
  }

  /**
   * Generate plain text export
   */
  private static async generateTextExport(
    data: ExportData,
    options: ExportOptions
  ): Promise<Buffer> {
    let content = '';

    // Header
    content += `${data.title}\n`;
    content += `${'='.repeat(data.title.length)}\n\n`;

    if (data.filename) {
      content += `File: ${data.filename}\n`;
    }
    content += `Date: ${new Date(data.date).toLocaleDateString()}\n`;
    if (data.duration) {
      content += `Duration: ${Math.floor(data.duration / 60)}:${(data.duration % 60).toString().padStart(2, '0')}\n`;
    }
    content += '\n';

    // Attendees (for meetings)
    if (data.attendees && data.attendees.length > 0) {
      content += 'Attendees:\n';
      data.attendees.forEach(attendee => {
        content += `- ${attendee}\n`;
      });
      content += '\n';
    }

    // Summary
    if (options.include_summary !== false && data.summary) {
      content += 'Summary:\n';
      content += '---------\n';
      content += `${data.summary}\n\n`;
    }

    // Action Items
    if (options.include_action_items !== false && data.actionItems && data.actionItems.length > 0) {
      content += 'Action Items:\n';
      content += '-------------\n';
      data.actionItems.forEach((item, index) => {
        const status = item.completed ? '[✓]' : '[ ]';
        content += `${index + 1}. ${status} ${item.text}`;
        if (item.assignee) {
          content += ` (Assigned to: ${item.assignee})`;
        }
        if (item.dueDate) {
          content += ` (Due: ${new Date(item.dueDate).toLocaleDateString()})`;
        }
        content += '\n';
      });
      content += '\n';
    }

    // Key Topics
    if (data.keyTopics && data.keyTopics.length > 0) {
      content += 'Key Topics:\n';
      content += '-----------\n';
      data.keyTopics.forEach(topic => {
        content += `- ${topic}\n`;
      });
      content += '\n';
    }

    // Transcript
    if (options.include_transcript !== false && data.transcript) {
      content += 'Transcript:\n';
      content += '-----------\n';
      content += `${data.transcript}\n`;
    }

    return Buffer.from(content, 'utf-8');
  }

  /**
   * Generate SRT subtitle export (for transcriptions with timestamps)
   */
  private static async generateSRTExport(data: ExportData): Promise<Buffer> {
    if (!data.transcript) {
      throw new Error('No transcript available for SRT export');
    }

    // For now, create a simple SRT with the full transcript
    // In a real implementation, you'd need timestamp data from the transcription service
    let srtContent = '';
    
    const lines = data.transcript.split('\n').filter(line => line.trim());
    const duration = data.duration || 60; // Default to 60 seconds if no duration
    const timePerLine = duration / lines.length;

    lines.forEach((line, index) => {
      const startTime = index * timePerLine;
      const endTime = (index + 1) * timePerLine;
      
      srtContent += `${index + 1}\n`;
      srtContent += `${this.formatSRTTime(startTime)} --> ${this.formatSRTTime(endTime)}\n`;
      srtContent += `${line.trim()}\n\n`;
    });

    return Buffer.from(srtContent, 'utf-8');
  }

  /**
   * Generate Word document export
   */
  private static async generateWordExport(
    data: ExportData,
    options: ExportOptions
  ): Promise<Buffer> {
    const children: Paragraph[] = [];

    // Title
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: data.title,
            bold: true,
            size: 32,
          }),
        ],
        heading: HeadingLevel.TITLE,
        alignment: AlignmentType.CENTER,
      })
    );

    // Metadata
    const metadataLines: string[] = [];
    if (data.filename) metadataLines.push(`File: ${data.filename}`);
    metadataLines.push(`Date: ${new Date(data.date).toLocaleDateString()}`);
    if (data.duration) {
      metadataLines.push(`Duration: ${Math.floor(data.duration / 60)}:${(data.duration % 60).toString().padStart(2, '0')}`);
    }

    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: metadataLines.join(' | '),
            italics: true,
          }),
        ],
        alignment: AlignmentType.CENTER,
      })
    );

    children.push(new Paragraph({ text: '' })); // Empty line

    // Attendees
    if (data.attendees && data.attendees.length > 0) {
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: 'Attendees',
              bold: true,
              size: 24,
            }),
          ],
          heading: HeadingLevel.HEADING_2,
        })
      );

      data.attendees.forEach(attendee => {
        children.push(
          new Paragraph({
            children: [
              new TextRun({
                text: `• ${attendee}`,
              }),
            ],
          })
        );
      });

      children.push(new Paragraph({ text: '' }));
    }

    // Summary
    if (options.include_summary !== false && data.summary) {
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: 'Summary',
              bold: true,
              size: 24,
            }),
          ],
          heading: HeadingLevel.HEADING_2,
        })
      );

      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: data.summary,
            }),
          ],
        })
      );

      children.push(new Paragraph({ text: '' }));
    }

    // Action Items
    if (options.include_action_items !== false && data.actionItems && data.actionItems.length > 0) {
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: 'Action Items',
              bold: true,
              size: 24,
            }),
          ],
          heading: HeadingLevel.HEADING_2,
        })
      );

      data.actionItems.forEach((item, index) => {
        const status = item.completed ? '✓' : '○';
        let itemText = `${index + 1}. ${status} ${item.text}`;
        
        if (item.assignee) {
          itemText += ` (Assigned to: ${item.assignee})`;
        }
        if (item.dueDate) {
          itemText += ` (Due: ${new Date(item.dueDate).toLocaleDateString()})`;
        }

        children.push(
          new Paragraph({
            children: [
              new TextRun({
                text: itemText,
              }),
            ],
          })
        );
      });

      children.push(new Paragraph({ text: '' }));
    }

    // Key Topics
    if (data.keyTopics && data.keyTopics.length > 0) {
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: 'Key Topics',
              bold: true,
              size: 24,
            }),
          ],
          heading: HeadingLevel.HEADING_2,
        })
      );

      data.keyTopics.forEach(topic => {
        children.push(
          new Paragraph({
            children: [
              new TextRun({
                text: `• ${topic}`,
              }),
            ],
          })
        );
      });

      children.push(new Paragraph({ text: '' }));
    }

    // Transcript
    if (options.include_transcript !== false && data.transcript) {
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: 'Transcript',
              bold: true,
              size: 24,
            }),
          ],
          heading: HeadingLevel.HEADING_2,
        })
      );

      // Split transcript into paragraphs
      const transcriptParagraphs = data.transcript.split('\n').filter(p => p.trim());
      transcriptParagraphs.forEach(paragraph => {
        children.push(
          new Paragraph({
            children: [
              new TextRun({
                text: paragraph.trim(),
              }),
            ],
          })
        );
      });
    }

    const doc = new Document({
      sections: [
        {
          properties: {},
          children,
        },
      ],
    });

    return Buffer.from(await Packer.toBuffer(doc));
  }

  /**
   * Generate PDF export
   */
  private static async generatePDFExport(
    data: ExportData,
    options: ExportOptions
  ): Promise<Buffer> {
    const pdf = new jsPDF();
    let yPosition = 20;
    const pageHeight = pdf.internal.pageSize.height;
    const margin = 20;
    const lineHeight = 7;

    // Helper function to add text with word wrapping
    const addText = (text: string, fontSize: number = 12, isBold: boolean = false) => {
      pdf.setFontSize(fontSize);
      if (isBold) {
        pdf.setFont('helvetica', 'bold');
      } else {
        pdf.setFont('helvetica', 'normal');
      }

      const lines = pdf.splitTextToSize(text, pdf.internal.pageSize.width - 2 * margin);
      
      // Check if we need a new page
      if (yPosition + (lines.length * lineHeight) > pageHeight - margin) {
        pdf.addPage();
        yPosition = margin;
      }

      lines.forEach((line: string) => {
        pdf.text(line, margin, yPosition);
        yPosition += lineHeight;
      });
      
      yPosition += 3; // Extra spacing after text block
    };

    // Title
    addText(data.title, 18, true);
    yPosition += 5;

    // Metadata
    const metadataLines: string[] = [];
    if (data.filename) metadataLines.push(`File: ${data.filename}`);
    metadataLines.push(`Date: ${new Date(data.date).toLocaleDateString()}`);
    if (data.duration) {
      metadataLines.push(`Duration: ${Math.floor(data.duration / 60)}:${(data.duration % 60).toString().padStart(2, '0')}`);
    }
    addText(metadataLines.join(' | '), 10);
    yPosition += 10;

    // Attendees
    if (data.attendees && data.attendees.length > 0) {
      addText('Attendees', 14, true);
      data.attendees.forEach(attendee => {
        addText(`• ${attendee}`, 12);
      });
      yPosition += 5;
    }

    // Summary
    if (options.include_summary !== false && data.summary) {
      addText('Summary', 14, true);
      addText(data.summary, 12);
      yPosition += 5;
    }

    // Action Items
    if (options.include_action_items !== false && data.actionItems && data.actionItems.length > 0) {
      addText('Action Items', 14, true);
      data.actionItems.forEach((item, index) => {
        const status = item.completed ? '✓' : '○';
        let itemText = `${index + 1}. ${status} ${item.text}`;
        
        if (item.assignee) {
          itemText += ` (Assigned to: ${item.assignee})`;
        }
        if (item.dueDate) {
          itemText += ` (Due: ${new Date(item.dueDate).toLocaleDateString()})`;
        }

        addText(itemText, 12);
      });
      yPosition += 5;
    }

    // Key Topics
    if (data.keyTopics && data.keyTopics.length > 0) {
      addText('Key Topics', 14, true);
      data.keyTopics.forEach(topic => {
        addText(`• ${topic}`, 12);
      });
      yPosition += 5;
    }

    // Transcript
    if (options.include_transcript !== false && data.transcript) {
      addText('Transcript', 14, true);
      addText(data.transcript, 10);
    }

    return Buffer.from(pdf.output('arraybuffer'));
  }

  /**
   * Format time for SRT format (HH:MM:SS,mmm)
   */
  private static formatSRTTime(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    const milliseconds = Math.floor((seconds % 1) * 1000);

    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')},${milliseconds.toString().padStart(3, '0')}`;
  }

  /**
   * Get appropriate filename for export
   */
  static getExportFilename(data: ExportData, format: ExportFormat): string {
    const baseFilename = data.filename 
      ? data.filename.replace(/\.[^/.]+$/, '') // Remove extension
      : data.title.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
    
    const timestamp = new Date().toISOString().split('T')[0];
    return `${baseFilename}_${timestamp}.${format}`;
  }

  /**
   * Get MIME type for export format
   */
  static getMimeType(format: ExportFormat): string {
    const mimeTypes = {
      txt: 'text/plain',
      srt: 'application/x-subrip',
      docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      pdf: 'application/pdf',
    };

    return mimeTypes[format];
  }

  /**
   * Create a streaming response for large files
   */
  static createStreamingResponse(
    buffer: Buffer,
    filename: string,
    mimeType: string
  ): Response {
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(buffer);
        controller.close();
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': mimeType,
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': buffer.length.toString(),
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    });
  }

  /**
   * Validate export data has required fields for format
   */
  static validateExportData(data: ExportData, format: ExportFormat): void {
    if (format === 'srt' && !data.transcript) {
      throw new Error('Transcript is required for SRT export');
    }

    if (!data.title && !data.filename) {
      throw new Error('Either title or filename is required for export');
    }
  }

  /**
   * Sanitize filename for safe file system usage
   */
  static sanitizeFilename(filename: string): string {
    return filename
      .replace(/[^a-zA-Z0-9._-]/g, '_')
      .replace(/_{2,}/g, '_')
      .replace(/^_+|_+$/g, '')
      .toLowerCase();
  }
}