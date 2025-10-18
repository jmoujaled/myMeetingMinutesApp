import { NextRequest, NextResponse } from 'next/server';
import { validateAuth } from '@/lib/auth-middleware';
import { createClient } from '@/lib/supabase/server';
import { 
  MeetingIdParamSchema,
  type GetMeetingDetailResponse,
  type MeetingIdParam 
} from '@/lib/validation/meetings-schemas';
import { 
  validatePathParams,
  createErrorResponse,
  createSuccessResponse 
} from '@/lib/validation/middleware';
import { MEETINGS_ERROR_CODES } from '@/lib/supabase/meetings-types';

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/meetings/[id]
 * Get detailed meeting information
 * Handles both meeting IDs and transcription job IDs
 */
async function handleGetMeetingDetail(
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

    const supabase = await createClient();
    const userId = user.id;
    const recordId = validatedParams.id;

    // First, try to find a meeting with this ID
    const { data: meeting, error: meetingError } = await supabase
      .from('meetings')
      .select('*')
      .eq('id', recordId)
      .eq('user_id', userId)
      .single();

    let transcriptionJob = undefined;
    let finalMeeting = meeting;

    if (meetingError || !meeting) {
      // If no meeting found, check if this is a transcription job ID
      const { data: jobData, error: jobError } = await supabase
        .from('transcription_jobs')
        .select('*')
        .eq('id', recordId)
        .eq('user_id', userId)
        .single();

      if (jobError || !jobData) {
        return createErrorResponse(
          'Record not found or access denied',
          MEETINGS_ERROR_CODES.MEETING_NOT_FOUND,
          404
        );
      }

      // Found transcription job, now check if there's an associated meeting
      const { data: associatedMeeting, error: associatedMeetingError } = await supabase
        .from('meetings')
        .select('*')
        .eq('transcription_job_id', recordId)
        .eq('user_id', userId)
        .single();

      // Set up transcription job details
      const processingTime = jobData.completed_at && jobData.created_at
        ? new Date(jobData.completed_at).getTime() - new Date(jobData.created_at).getTime()
        : null;

      transcriptionJob = {
        filename: jobData.filename,
        file_size: jobData.file_size,
        processing_time: processingTime ? Math.round(processingTime / 1000) : null, // Convert to seconds
      };

      if (!associatedMeetingError && associatedMeeting) {
        // Use the associated meeting
        finalMeeting = associatedMeeting;
      } else {
        // Create a pseudo-meeting object from transcription job data
        finalMeeting = {
          id: jobData.id,
          user_id: jobData.user_id,
          transcription_job_id: jobData.id,
          title: jobData.filename,
          description: null,
          meeting_date: jobData.created_at,
          duration_minutes: jobData.duration_seconds ? Math.round(jobData.duration_seconds / 60) : null,
          attendees: null,
          transcript_text: jobData.metadata?.transcript_text || null,
          summary: jobData.metadata?.summary || null,
          action_items: jobData.metadata?.action_items || [],
          key_topics: jobData.metadata?.key_topics || null,
          audio_file_url: null,
          transcript_file_url: null,
          summary_file_url: null,
          created_at: jobData.created_at,
          updated_at: jobData.created_at,
        };
      }
    } else {
      // Found meeting, get associated transcription job details if available
      if (meeting.transcription_job_id) {
        const { data: jobData, error: jobError } = await supabase
          .from('transcription_jobs')
          .select('filename, file_size, created_at, completed_at')
          .eq('id', meeting.transcription_job_id)
          .eq('user_id', userId)
          .single();

        if (!jobError && jobData) {
          const processingTime = jobData.completed_at && jobData.created_at
            ? new Date(jobData.completed_at).getTime() - new Date(jobData.created_at).getTime()
            : null;

          transcriptionJob = {
            filename: jobData.filename,
            file_size: jobData.file_size,
            processing_time: processingTime ? Math.round(processingTime / 1000) : null, // Convert to seconds
          };
        }
      }
    }

    const response: GetMeetingDetailResponse = {
      meeting: finalMeeting,
      transcription_job: transcriptionJob,
    };

    return createSuccessResponse(response);
  } catch (error) {
    console.error('Unexpected error in GET /api/meetings/[id]:', error);
    return createErrorResponse(
      'Internal server error',
      'INTERNAL_ERROR',
      500
    );
  }
}

/**
 * DELETE /api/meetings/[id]
 * Delete a meeting record with proper authorization
 */
async function handleDeleteMeeting(
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

    const supabase = await createClient();
    const userId = user.id;
    const meetingId = validatedParams.id;

    // First verify the meeting exists and belongs to the user
    const { data: meeting, error: meetingError } = await supabase
      .from('meetings')
      .select('id, user_id')
      .eq('id', meetingId)
      .eq('user_id', userId)
      .single();

    if (meetingError || !meeting) {
      return createErrorResponse(
        'Meeting not found or access denied',
        MEETINGS_ERROR_CODES.MEETING_NOT_FOUND,
        404
      );
    }

    // Use the database function to delete the meeting
    const { data: deleteResult, error: deleteError } = await supabase
      .rpc('delete_meeting', {
        p_meeting_id: meetingId,
      });

    if (deleteError || !deleteResult) {
      console.error('Error deleting meeting:', deleteError);
      return createErrorResponse(
        'Failed to delete meeting',
        MEETINGS_ERROR_CODES.ACCESS_DENIED,
        500
      );
    }

    return createSuccessResponse({ 
      message: 'Meeting deleted successfully',
      id: meetingId 
    });
  } catch (error) {
    console.error('Unexpected error in DELETE /api/meetings/[id]:', error);
    return createErrorResponse(
      'Internal server error',
      'INTERNAL_ERROR',
      500
    );
  }
}

/**
 * PUT /api/meetings/[id]
 * Update a meeting record (optional enhancement)
 */
async function handleUpdateMeeting(
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
    
    if (validationError) {
      return validationError;
    }

    // For now, return method not allowed since update is not in the current task requirements
    return createErrorResponse(
      'Meeting updates not yet implemented',
      'METHOD_NOT_IMPLEMENTED',
      501
    );
  } catch (error) {
    console.error('Unexpected error in PUT /api/meetings/[id]:', error);
    return createErrorResponse(
      'Internal server error',
      'INTERNAL_ERROR',
      500
    );
  }
}

// Export the handlers
export const GET = handleGetMeetingDetail;
export const DELETE = handleDeleteMeeting;
export const PUT = handleUpdateMeeting;