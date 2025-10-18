'use client';

import React, { useState } from 'react';
import { RecordCard } from './RecordCard';
import { CardSkeletonList } from './CardSkeleton';
import { MeetingDetailModal } from './MeetingDetailModal';
import { Button } from '@/components/ui/button';
import type { TranscriptionHistoryRecord, ExportFormat } from '@/lib/supabase/meetings-types';

// Sample data for demonstration
const sampleMeetingRecord: TranscriptionHistoryRecord = {
  id: '1',
  user_id: 'user-1',
  filename: 'team-standup-recording.mp3',
  status: 'completed',
  duration_seconds: 1500,
  file_size: 15728640,
  created_at: '2024-03-15T10:00:00Z',
  completed_at: '2024-03-15T10:05:00Z',
  error_message: null,
  tier: 'pro',
  usage_cost: 1,
  transcription_metadata: {},
  meeting_id: 'meeting-1',
  meeting_title: 'Team Standup - March 15, 2024',
  meeting_description: 'Daily standup meeting to discuss progress and blockers',
  meeting_date: '2024-03-15T09:00:00Z',
  duration_minutes: 25,
  attendees: ['John Doe', 'Jane Smith', 'Bob Johnson'],
  summary: 'Team discussed current sprint progress. Main blockers identified in the authentication module.',
  action_items: [
    { id: '1', text: 'Fix authentication bug', assignee: 'John Doe', due_date: '2024-03-16', completed: false },
    { id: '2', text: 'Review PR #123', assignee: 'Jane Smith', due_date: '2024-03-15', completed: true },
    { id: '3', text: 'Update documentation', assignee: 'Bob Johnson', due_date: '2024-03-17', completed: false }
  ],
  key_topics: ['Authentication', 'Sprint Planning', 'Code Review'],
  audio_file_url: null,
  transcript_file_url: null,
  summary_file_url: null,
  meeting_updated_at: '2024-03-15T10:05:00Z',
  record_type: 'meeting',
  display_status: 'completed',
  action_items_count: 3
};

const sampleTranscriptionRecord: TranscriptionHistoryRecord = {
  id: '2',
  user_id: 'user-1',
  filename: 'interview-recording.mp3',
  status: 'completed',
  duration_seconds: 2700,
  file_size: 27262976,
  created_at: '2024-03-14T14:00:00Z',
  completed_at: '2024-03-14T14:08:00Z',
  error_message: null,
  tier: 'free',
  usage_cost: 1,
  transcription_metadata: {},
  meeting_id: null,
  meeting_title: null,
  meeting_description: null,
  meeting_date: null,
  duration_minutes: null,
  attendees: null,
  summary: null,
  action_items: null,
  key_topics: null,
  audio_file_url: null,
  transcript_file_url: null,
  summary_file_url: null,
  meeting_updated_at: null,
  record_type: 'transcription',
  display_status: 'completed',
  action_items_count: 0
};

const sampleProcessingRecord: TranscriptionHistoryRecord = {
  id: '3',
  user_id: 'user-1',
  filename: 'client-call-recording.mp3',
  status: 'processing',
  duration_seconds: null,
  file_size: 20971520,
  created_at: '2024-03-16T11:00:00Z',
  completed_at: null,
  error_message: null,
  tier: 'pro',
  usage_cost: 0,
  transcription_metadata: {},
  meeting_id: null,
  meeting_title: null,
  meeting_description: null,
  meeting_date: null,
  duration_minutes: null,
  attendees: null,
  summary: null,
  action_items: null,
  key_topics: null,
  audio_file_url: null,
  transcript_file_url: null,
  summary_file_url: null,
  meeting_updated_at: null,
  record_type: 'transcription',
  display_status: 'processing',
  action_items_count: 0
};

const sampleFailedRecord: TranscriptionHistoryRecord = {
  id: '4',
  user_id: 'user-1',
  filename: 'corrupted-audio.mp3',
  status: 'failed',
  duration_seconds: null,
  file_size: 5242880,
  created_at: '2024-03-16T12:00:00Z',
  completed_at: null,
  error_message: 'Audio file is corrupted or in an unsupported format',
  tier: 'free',
  usage_cost: 0,
  transcription_metadata: {},
  meeting_id: null,
  meeting_title: null,
  meeting_description: null,
  meeting_date: null,
  duration_minutes: null,
  attendees: null,
  summary: null,
  action_items: null,
  key_topics: null,
  audio_file_url: null,
  transcript_file_url: null,
  summary_file_url: null,
  meeting_updated_at: null,
  record_type: 'transcription',
  display_status: 'failed',
  action_items_count: 0
};

export function CardDemo() {
  const [showModal, setShowModal] = useState(false);
  const [selectedMeetingId, setSelectedMeetingId] = useState<string>('');

  const handleView = (id: string) => {
    console.log('View record:', id);
    setSelectedMeetingId(id);
    setShowModal(true);
  };

  const handleDownload = (id: string, format: ExportFormat) => {
    console.log('Download record:', id, 'format:', format);
  };

  const handleDelete = async (id: string) => {
    console.log('Delete record:', id);
    // Simulate async operation
    await new Promise(resolve => setTimeout(resolve, 1000));
  };

  const handleSaveAsMeeting = (id: string) => {
    console.log('Save as meeting:', id);
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold mb-6">Meeting and Transcription Cards Demo</h1>
      
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Meeting Card</h2>
        <RecordCard
          record={sampleMeetingRecord}
          onView={handleView}
          onDownload={handleDownload}
          onDelete={handleDelete}
        />
      </div>

      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Completed Transcription Card</h2>
        <RecordCard
          record={sampleTranscriptionRecord}
          onView={handleView}
          onDownload={handleDownload}
          onDelete={handleDelete}
          onSaveAsMeeting={handleSaveAsMeeting}
        />
      </div>

      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Processing Transcription Card</h2>
        <RecordCard
          record={sampleProcessingRecord}
          onView={handleView}
          onDownload={handleDownload}
          onDelete={handleDelete}
          onSaveAsMeeting={handleSaveAsMeeting}
        />
      </div>

      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Failed Transcription Card</h2>
        <RecordCard
          record={sampleFailedRecord}
          onView={handleView}
          onDownload={handleDownload}
          onDelete={handleDelete}
          onSaveAsMeeting={handleSaveAsMeeting}
        />
      </div>

      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Loading Skeleton</h2>
        <CardSkeletonList count={2} />
      </div>

      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Meeting Detail Modal Demo</h2>
        <p className="text-sm text-gray-600">
          Click the button below to open the meeting detail modal with sample data.
        </p>
        <Button onClick={() => {
          setSelectedMeetingId('meeting-1');
          setShowModal(true);
        }}>
          Open Meeting Detail Modal
        </Button>
      </div>

      {/* Meeting Detail Modal */}
      <MeetingDetailModal
        meetingId={selectedMeetingId}
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onDownload={handleDownload}
      />
    </div>
  );
}