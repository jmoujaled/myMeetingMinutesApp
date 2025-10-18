import { NextRequest, NextResponse } from 'next/server';
import type { GetMeetingDetailResponse } from '@/lib/validation/meetings-schemas';

/**
 * Mock API endpoint for demo purposes
 * GET /api/meetings/meeting-1
 */
export async function GET(request: NextRequest) {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 1000));

  const mockMeetingDetail: GetMeetingDetailResponse = {
    meeting: {
      id: 'meeting-1',
      user_id: 'user-1',
      transcription_job_id: 'job-1',
      title: 'Team Standup - March 15, 2024',
      description: 'Daily standup meeting to discuss progress and blockers for the current sprint. We covered completed tasks, upcoming work, and identified key blockers that need immediate attention.',
      meeting_date: '2024-03-15T09:00:00Z',
      duration_minutes: 25,
      attendees: ['John Doe', 'Jane Smith', 'Bob Johnson', 'Alice Wilson', 'Charlie Brown'],
      transcript_text: `[00:00:00] John Doe: Good morning everyone, let's start our daily standup. Jane, would you like to go first?

[00:00:15] Jane Smith: Sure! Yesterday I completed the user authentication module and submitted PR #123 for review. Today I'm planning to work on the password reset functionality. No blockers at the moment.

[00:00:35] Bob Johnson: Thanks Jane. I finished the database migration scripts yesterday and they're ready for testing. Today I'll be working on the API endpoints for user management. I do have one blocker - I need access to the staging environment to test the migrations.

[00:01:00] Alice Wilson: I can help with that Bob, I'll get you the staging access after this meeting. Yesterday I completed the frontend components for the dashboard. Today I'm focusing on the responsive design for mobile devices. No blockers.

[00:01:25] Charlie Brown: I worked on the documentation updates yesterday and they're about 80% complete. Today I'll finish those up and start on the user guide. I'm blocked on getting the final screenshots since some features are still in development.

[00:01:45] John Doe: Great updates everyone. Let me address the blockers. Bob, Alice will get you staging access. Charlie, let's sync after this meeting to identify which features are ready for screenshots. Any other concerns?

[00:02:05] Jane Smith: Just a quick note - the authentication module might need some additional testing with different user roles. I'll coordinate with the QA team.

[00:02:20] John Doe: Perfect. Let's wrap up. Remember we have the sprint review tomorrow at 2 PM. Thanks everyone!`,
      summary: `**Meeting Summary:**

The team held their daily standup meeting to discuss progress on the current sprint. All team members provided updates on their completed work and planned tasks for the day.

**Key Accomplishments:**
- User authentication module completed (Jane)
- Database migration scripts finished (Bob)
- Frontend dashboard components completed (Alice)
- Documentation updates 80% complete (Charlie)

**Current Focus Areas:**
- Password reset functionality development
- API endpoints for user management
- Mobile responsive design implementation
- Documentation completion and user guide creation

**Decisions Made:**
- Alice will provide Bob with staging environment access
- John and Charlie will sync on feature readiness for documentation screenshots
- Jane will coordinate additional authentication testing with QA team

**Next Steps:**
- Continue with planned daily tasks
- Address identified blockers
- Prepare for tomorrow's sprint review at 2 PM`,
      action_items: [
        {
          id: 'action-1',
          text: 'Provide Bob with staging environment access',
          assignee: 'Alice Wilson',
          due_date: '2024-03-15T17:00:00Z',
          completed: true,
          priority: 'high',
          notes: 'Completed immediately after the meeting'
        },
        {
          id: 'action-2',
          text: 'Sync with Charlie on feature readiness for documentation screenshots',
          assignee: 'John Doe',
          due_date: '2024-03-15T15:00:00Z',
          completed: false,
          priority: 'medium',
          notes: 'Schedule 30-minute meeting to review current feature status'
        },
        {
          id: 'action-3',
          text: 'Coordinate authentication testing with QA team',
          assignee: 'Jane Smith',
          due_date: '2024-03-16T12:00:00Z',
          completed: false,
          priority: 'medium',
          notes: 'Focus on different user roles and edge cases'
        },
        {
          id: 'action-4',
          text: 'Complete password reset functionality',
          assignee: 'Jane Smith',
          due_date: '2024-03-17T17:00:00Z',
          completed: false,
          priority: 'high'
        },
        {
          id: 'action-5',
          text: 'Finish documentation updates and user guide',
          assignee: 'Charlie Brown',
          due_date: '2024-03-18T17:00:00Z',
          completed: false,
          priority: 'low',
          notes: 'Waiting for final screenshots from development team'
        }
      ],
      key_topics: ['Sprint Progress', 'Authentication', 'Database Migration', 'Documentation', 'QA Testing', 'Mobile Design'],
      audio_file_url: null,
      transcript_file_url: null,
      summary_file_url: null,
      created_at: '2024-03-15T10:05:00Z',
      updated_at: '2024-03-15T10:05:00Z'
    },
    transcription_job: {
      filename: 'team-standup-2024-03-15.mp3',
      file_size: 15728640, // ~15MB
      processing_time: 45 // 45 seconds
    }
  };

  return NextResponse.json(mockMeetingDetail);
}