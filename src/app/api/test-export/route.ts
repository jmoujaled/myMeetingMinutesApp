import { NextRequest, NextResponse } from 'next/server';
import { ExportService, type ExportData } from '@/lib/export-service';
import type { ExportFormat } from '@/lib/supabase/meetings-types';

/**
 * GET /api/test-export?format=pdf
 * Test endpoint for export functionality
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const format = (searchParams.get('format') || 'txt') as ExportFormat;

    // Create test data
    const testData: ExportData = {
      id: 'test-123',
      title: 'Test Meeting Export',
      date: new Date().toISOString(),
      duration: 1800, // 30 minutes
      transcript: 'This is a test transcript for export functionality. It contains multiple sentences to test the formatting and layout of the exported document. The transcript should be properly formatted in the output.',
      summary: 'This is a test summary of the meeting. It should highlight the key points discussed and decisions made during the meeting.',
      actionItems: [
        {
          text: 'Complete the export functionality implementation',
          assignee: 'Developer',
          dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days from now
          completed: false,
        },
        {
          text: 'Test all export formats',
          assignee: 'QA Team',
          dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days from now
          completed: false,
        },
        {
          text: 'Review export documentation',
          assignee: 'Tech Lead',
          completed: true,
        },
      ],
      attendees: ['John Doe', 'Jane Smith', 'Bob Johnson'],
      keyTopics: ['Export Implementation', 'File Formats', 'User Experience'],
      recordType: 'meeting',
    };

    // Validate export data
    ExportService.validateExportData(testData, format);

    // Generate export
    const exportBuffer = await ExportService.generateExport(testData, format, {
      include_transcript: true,
      include_summary: true,
      include_action_items: true,
    });

    // Get filename and MIME type
    const filename = ExportService.getExportFilename(testData, format);
    const mimeType = ExportService.getMimeType(format);

    // Return the file as a streaming download
    return ExportService.createStreamingResponse(exportBuffer, filename, mimeType);

  } catch (error) {
    console.error('Test export failed:', error);
    return NextResponse.json(
      { 
        error: 'Test export failed', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}