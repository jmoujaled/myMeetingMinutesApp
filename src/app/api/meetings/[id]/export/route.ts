import { NextRequest } from 'next/server';
import { validateAuth } from '@/lib/auth-middleware';
import { createClient } from '@/lib/supabase/server';
import { ExportService, type ExportData } from '@/lib/export-service';
import { 
  MeetingIdParamSchema
} from '@/lib/validation/meetings-schemas';
import { 
  validatePathParams,
  createErrorResponse 
} from '@/lib/validation/middleware';
import { 
  MEETINGS_ERROR_CODES,
  type ExportFormat,
  type ExportOptions 
} from '@/lib/supabase/meetings-types';

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/meetings/[id]/export?format=pdf&include_transcript=true&include_summary=true&include_action_items=true
 * Export meeting or transcription data in various formats
 */
export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  try {
    // Validate authentication
    const { user, error: authError } = await validateAuth(request);
    if (authError || !user) {
      return createErrorResponse(
        authError?.error || 'Authentication required',
        authError?.code || 'AUTH_REQUIRED',
        401
      );
    }

    const params = await context.params;
    
    // Validate path parameters
    const { data: validatedParams, error: validationError } = validatePathParams(
      MeetingIdParamSchema,
      params
    );
    
    if (validationError || !validatedParams) {
      return validationError || createErrorResponse('Invalid path parameters', 'VALIDATION_ERROR', 400);
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format') as ExportFormat;
    const includeTranscript = searchParams.get('include_transcript') !== 'false';
    const includeSummary = searchParams.get('include_summary') !== 'false';
    const includeActionItems = searchParams.get('include_action_items') !== 'false';

    // Validate format
    if (!format || !['txt', 'srt', 'docx', 'pdf'].includes(format)) {
      return createErrorResponse(
        'Invalid or missing export format. Supported formats: txt, srt, docx, pdf',
        'INVALID_FORMAT',
        400
      );
    }

    const supabase = await createClient();
    const userId = user.id;
    const recordId = validatedParams.id;

    // Try to get meeting data first
    const { data: meeting, error: meetingError } = await supabase
      .from('meetings')
      .select('*')
      .eq('id', recordId)
      .eq('user_id', userId)
      .single();

    let exportData: ExportData;

    if (meeting && !meetingError) {
      // Export meeting data
      exportData = {
        id: meeting.id,
        title: meeting.title,
        date: meeting.meeting_date || meeting.created_at,
        duration: meeting.duration_minutes ? meeting.duration_minutes * 60 : undefined,
        transcript: meeting.transcript_text || undefined,
        summary: meeting.summary || undefined,
        actionItems: meeting.action_items || undefined,
        attendees: meeting.attendees || undefined,
        keyTopics: meeting.key_topics || undefined,
        recordType: 'meeting',
      };
    } else {
      // Try to get transcription job data
      const { data: transcriptionJob, error: transcriptionError } = await supabase
        .from('transcription_jobs')
        .select('*')
        .eq('id', recordId)
        .eq('user_id', userId)
        .single();

      if (transcriptionError || !transcriptionJob) {
        return createErrorResponse(
          'Record not found or access denied',
          MEETINGS_ERROR_CODES.MEETING_NOT_FOUND,
          404
        );
      }

      // Export transcription data
      exportData = {
        id: transcriptionJob.id,
        title: transcriptionJob.filename,
        filename: transcriptionJob.filename,
        date: transcriptionJob.created_at,
        duration: transcriptionJob.duration_seconds || undefined,
        transcript: transcriptionJob.transcription_metadata?.transcript || undefined,
        recordType: 'transcription',
      };
    }

    // Validate export data
    try {
      ExportService.validateExportData(exportData, format);
    } catch (validationError) {
      return createErrorResponse(
        validationError instanceof Error ? validationError.message : 'Invalid export data',
        MEETINGS_ERROR_CODES.EXPORT_FAILED,
        400
      );
    }

    const exportOptions: ExportOptions = {
      include_transcript: includeTranscript,
      include_summary: includeSummary,
      include_action_items: includeActionItems,
    };

    // Generate the export
    const exportBuffer = await ExportService.generateExport(
      exportData,
      format,
      exportOptions
    );

    // Get filename and MIME type
    const filename = ExportService.getExportFilename(exportData, format);
    const mimeType = ExportService.getMimeType(format);

    // Return the file as a streaming download
    return ExportService.createStreamingResponse(exportBuffer, filename, mimeType);

  } catch (error) {
    console.error('Unexpected error in GET /api/meetings/[id]/export:', error);
    return createErrorResponse(
      'Export generation failed',
      MEETINGS_ERROR_CODES.EXPORT_FAILED,
      500
    );
  }
}