'use client';

import React, { useState } from 'react';
import { format } from 'date-fns';
import { 
  Calendar, 
  Clock, 
  Users, 
  FileText, 
  CheckSquare, 
  Download, 
  Eye, 
  Trash2, 
  MoreVertical,
  AlertCircle,
  CheckCircle
} from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import type { TranscriptionHistoryRecord, ExportFormat } from '@/lib/supabase/meetings-types';
import { MeetingDetailModal } from './MeetingDetailModal';
import { SwipeableCard, createMeetingActions } from './SwipeableCard';
import { useMeetingsErrorHandler } from '@/hooks/useMeetingsErrorHandler';
import { ConfirmDialog } from './ConfirmDialog';
import { RetryButton } from './RetryButton';

interface MeetingCardProps {
  record: TranscriptionHistoryRecord;
  onDownload: (id: string, format: ExportFormat) => void;
  onDelete: (id: string) => void;
  isLoading?: boolean;
  className?: string;
}

export function MeetingCard({ 
  record, 
  onDownload, 
  onDelete, 
  isLoading = false,
  className 
}: MeetingCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  
  const { 
    handleDeleteError, 
    handleExportError, 
    showDeleteSuccess, 
    showExportSuccess 
  } = useMeetingsErrorHandler();

  const handleDownloadWithErrorHandling = async (format: ExportFormat) => {
    if (isDownloading) return;
    
    setIsDownloading(true);
    try {
      await onDownload(record.meeting_id || record.id, format);
      showExportSuccess(format, record.meeting_title || record.filename);
    } catch (error) {
      handleExportError(error, format);
    } finally {
      setIsDownloading(false);
    }
  };

  const handleDeleteWithErrorHandling = async () => {
    if (isDeleting) return;
    
    setIsDeleting(true);
    setDeleteError(null);
    
    try {
      await onDelete(record.meeting_id || record.id);
      showDeleteSuccess(record.meeting_title || record.filename);
      setShowDeleteConfirm(false);
    } catch (error) {
      const appError = handleDeleteError(error, record.meeting_title || record.filename);
      setDeleteError(appError.message);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleRetryDelete = async () => {
    setDeleteError(null);
    await handleDeleteWithErrorHandling();
  };

  const formatDuration = (minutes: number | null, seconds: number | null) => {
    if (minutes) return `${minutes} min`;
    if (seconds) return `${Math.round(seconds / 60)} min`;
    return 'Unknown duration';
  };

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'MMM d, yyyy');
    } catch {
      return 'Invalid date';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'processing':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'failed':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
        return <CheckCircle className="w-4 h-4" />;
      case 'processing':
        return <Clock className="w-4 h-4 animate-spin" />;
      case 'failed':
        return <AlertCircle className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };



  const displayTitle = record.meeting_title || record.filename;
  const displayDate = record.meeting_date || record.created_at;
  const duration = formatDuration(record.duration_minutes, record.duration_seconds);

  // Create swipe actions
  const swipeActions = createMeetingActions(
    () => setShowDetailModal(true),
    () => handleDownloadWithErrorHandling('txt'),
    () => setShowDeleteConfirm(true)
  );

  const cardContent = (
    <Card 
      className={cn(
        "transition-all duration-200 hover:shadow-md cursor-pointer touch-card",
        isLoading && "opacity-50 pointer-events-none",
        isHovered && "shadow-lg",
        className
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={() => {
        console.log('Card clicked, opening modal for:', record.meeting_id || record.id);
        setShowDetailModal(true);
      }}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <h3 className="font-semibold text-lg truncate" title={displayTitle}>
                {displayTitle}
              </h3>
              <Badge 
                variant="outline" 
                className={cn("text-xs", getStatusColor(record.status))}
              >
                <span className="flex items-center gap-1">
                  {getStatusIcon(record.status)}
                  {record.status}
                </span>
              </Badge>
            </div>
            
            {record.meeting_description && (
              <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                {record.meeting_description}
              </p>
            )}
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={(e) => {
                e.stopPropagation();
                console.log('View Details clicked for:', record.meeting_id || record.id);
                setShowDetailModal(true);
              }}>
                <Eye className="w-4 h-4 mr-2" />
                View Details
              </DropdownMenuItem>
              
              <DropdownMenuSeparator />
              
              <DropdownMenuItem onClick={(e) => {
                e.stopPropagation();
                handleDownloadWithErrorHandling('txt');
              }}>
                <Download className="w-4 h-4 mr-2" />
                Download TXT
              </DropdownMenuItem>
              
              {record.record_type === 'meeting' && (
                <>
                  <DropdownMenuItem onClick={(e) => {
                    e.stopPropagation();
                    handleDownloadWithErrorHandling('docx');
                  }}>
                    <Download className="w-4 h-4 mr-2" />
                    Download Word
                  </DropdownMenuItem>
                  
                  <DropdownMenuItem onClick={(e) => {
                    e.stopPropagation();
                    handleDownloadWithErrorHandling('pdf');
                  }}>
                    <Download className="w-4 h-4 mr-2" />
                    Download PDF
                  </DropdownMenuItem>
                </>
              )}
              
              {record.record_type === 'transcription' && (
                <DropdownMenuItem onClick={(e) => {
                  e.stopPropagation();
                  handleDownloadWithErrorHandling('srt');
                }}>
                  <Download className="w-4 h-4 mr-2" />
                  Download SRT
                </DropdownMenuItem>
              )}
              
              <DropdownMenuSeparator />
              
              <DropdownMenuItem 
                onClick={(e) => {
                  e.stopPropagation();
                  setShowDeleteConfirm(true);
                }}
                className="text-red-600 focus:text-red-600"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <Calendar className="w-4 h-4" />
            <span>{formatDate(displayDate)}</span>
          </div>
          
          <div className="flex items-center gap-1">
            <Clock className="w-4 h-4" />
            <span>{duration}</span>
          </div>
          
          {record.attendees && record.attendees.length > 0 && (
            <div className="flex items-center gap-1">
              <Users className="w-4 h-4" />
              <span>{record.attendees.length} attendees</span>
            </div>
          )}
          
          {record.summary && (
            <div className="flex items-center gap-1">
              <FileText className="w-4 h-4" />
              <span>Summary available</span>
            </div>
          )}
          
          {record.action_items_count > 0 && (
            <div className="flex items-center gap-1">
              <CheckSquare className="w-4 h-4" />
              <span>{record.action_items_count} action items</span>
            </div>
          )}
        </div>

        {record.key_topics && record.key_topics.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1">
            {record.key_topics.slice(0, 3).map((topic, index) => (
              <Badge key={index} variant="secondary" className="text-xs">
                {topic}
              </Badge>
            ))}
            {record.key_topics.length > 3 && (
              <Badge variant="secondary" className="text-xs">
                +{record.key_topics.length - 3} more
              </Badge>
            )}
          </div>
        )}

        {record.error_message && (
          <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-600 flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              {record.error_message}
            </p>
          </div>
        )}
      </CardContent>
      
      {/* Meeting Detail Modal */}
      <MeetingDetailModal
        meetingId={record.meeting_id || record.id}
        isOpen={showDetailModal}
        onClose={() => setShowDetailModal(false)}
        onDownload={(id, format) => handleDownloadWithErrorHandling(format)}
      />
    </Card>
  );

  return (
    <>
      <SwipeableCard
        actions={swipeActions}
        disabled={isLoading || isDeleting || isDownloading}
        className={className}
      >
        {cardContent}
      </SwipeableCard>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showDeleteConfirm}
        onClose={() => {
          setShowDeleteConfirm(false);
          setDeleteError(null);
        }}
        onConfirm={handleDeleteWithErrorHandling}
        title="Delete Item"
        description={`Are you sure you want to delete "${record.meeting_title || record.filename}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        variant="destructive"
        isLoading={isDeleting}
        error={deleteError || undefined}
      />
    </>
  );
}