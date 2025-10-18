'use client';

import React, { useState } from 'react';
import { MeetingCard } from './MeetingCard';
import { TranscriptionCard } from './TranscriptionCard';
import { ConfirmDialog } from './ConfirmDialog';
import type { TranscriptionHistoryRecord, ExportFormat } from '@/lib/supabase/meetings-types';

interface RecordCardProps {
  record: TranscriptionHistoryRecord;
  onView: (id: string) => void;
  onDownload: (id: string, format: ExportFormat) => void;
  onDelete: (id: string) => Promise<void>;
  onSaveAsMeeting?: (id: string) => void;
  isLoading?: boolean;
  className?: string;
}

export function RecordCard({ 
  record, 
  onView, 
  onDownload, 
  onDelete, 
  onSaveAsMeeting,
  isLoading = false,
  className 
}: RecordCardProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteClick = () => {
    setShowDeleteDialog(true);
  };

  const handleDeleteConfirm = async () => {
    try {
      setIsDeleting(true);
      await onDelete(record.meeting_id || record.id);
      setShowDeleteDialog(false);
    } catch (error) {
      console.error('Failed to delete record:', error);
      // Error handling could be improved with toast notifications
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteCancel = () => {
    setShowDeleteDialog(false);
  };

  const getDeleteDialogContent = () => {
    const isTranscription = record.record_type === 'transcription';
    const title = isTranscription ? record.filename : (record.meeting_title || 'Untitled Meeting');
    
    return {
      title: `Delete ${isTranscription ? 'Transcription' : 'Meeting'}`,
      description: `Are you sure you want to delete "${title}"? This action cannot be undone.${
        isTranscription && record.meeting_id 
          ? ' This will also delete the associated meeting record.' 
          : ''
      }`
    };
  };

  const dialogContent = getDeleteDialogContent();

  // Render the appropriate card based on record type
  const CardComponent = record.record_type === 'meeting' ? MeetingCard : TranscriptionCard;

  return (
    <>
      <CardComponent
        record={record}
        onDownload={onDownload}
        onDelete={handleDeleteClick}
        onSaveAsMeeting={onSaveAsMeeting}
        isLoading={isLoading}
        className={className}
      />
      
      <ConfirmDialog
        isOpen={showDeleteDialog}
        onClose={handleDeleteCancel}
        onConfirm={handleDeleteConfirm}
        title={dialogContent.title}
        description={dialogContent.description}
        confirmText="Delete"
        cancelText="Cancel"
        variant="destructive"
        isLoading={isDeleting}
      />
    </>
  );
}