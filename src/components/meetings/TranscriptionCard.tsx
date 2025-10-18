'use client';

import React, { useState } from 'react';
import { format } from 'date-fns';
import { 
  FileAudio, 
  Clock, 
  Download, 
  Eye, 
  Trash2, 
  MoreVertical,
  AlertCircle,
  CheckCircle,
  Loader2,
  Plus,
  FileText
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
import { SwipeableCard, createTranscriptionActions } from './SwipeableCard';
import { MeetingDetailModal } from './MeetingDetailModal';

interface TranscriptionCardProps {
  record: TranscriptionHistoryRecord;
  onDownload: (id: string, format: ExportFormat) => void;
  onDelete: (id: string) => void;
  onSaveAsMeeting?: (id: string) => void;
  isLoading?: boolean;
  className?: string;
}

export function TranscriptionCard({ 
  record, 
  onDownload, 
  onDelete, 
  onSaveAsMeeting,
  isLoading = false,
  className 
}: TranscriptionCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return 'Unknown duration';
    const minutes = Math.round(seconds / 60);
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes}m`;
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return 'Unknown size';
    const mb = bytes / (1024 * 1024);
    if (mb < 1) return `${Math.round(bytes / 1024)} KB`;
    return `${mb.toFixed(1)} MB`;
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
      case 'cancelled':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
        return <CheckCircle className="w-4 h-4" />;
      case 'processing':
        return <Loader2 className="w-4 h-4 animate-spin" />;
      case 'failed':
        return <AlertCircle className="w-4 h-4" />;
      case 'cancelled':
        return <AlertCircle className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  const handleDeleteClick = () => {
    if (showDeleteConfirm) {
      onDelete(record.id);
      setShowDeleteConfirm(false);
    } else {
      setShowDeleteConfirm(true);
      // Auto-hide confirmation after 3 seconds
      setTimeout(() => setShowDeleteConfirm(false), 3000);
    }
  };

  const isCompleted = record.status === 'completed';
  const canSaveAsMeeting = isCompleted && !record.meeting_id && onSaveAsMeeting;

  // Create swipe actions
  const swipeActions = createTranscriptionActions(
    () => setShowDetailModal(true),
    () => onDownload(record.id, 'txt'),
    () => onDelete(record.id),
    canSaveAsMeeting ? () => onSaveAsMeeting!(record.id) : undefined
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
      onClick={() => setShowDetailModal(true)}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <FileAudio className="w-5 h-5 text-muted-foreground flex-shrink-0" />
              <h3 className="font-semibold text-lg truncate" title={record.filename}>
                {record.filename}
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
            
            {record.meeting_id && (
              <div className="flex items-center gap-1 text-sm text-blue-600 mb-2">
                <FileText className="w-4 h-4" />
                <span>Saved as meeting</span>
              </div>
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
                setShowDetailModal(true);
              }}>
                <Eye className="w-4 h-4 mr-2" />
                View Details
              </DropdownMenuItem>
              
              {canSaveAsMeeting && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={(e) => {
                    e.stopPropagation();
                    onSaveAsMeeting(record.id);
                  }}>
                    <Plus className="w-4 h-4 mr-2" />
                    Save as Meeting
                  </DropdownMenuItem>
                </>
              )}
              
              {isCompleted && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={(e) => {
                    e.stopPropagation();
                    onDownload(record.id, 'txt');
                  }}>
                    <Download className="w-4 h-4 mr-2" />
                    Download TXT
                  </DropdownMenuItem>
                  
                  <DropdownMenuItem onClick={(e) => {
                    e.stopPropagation();
                    onDownload(record.id, 'srt');
                  }}>
                    <Download className="w-4 h-4 mr-2" />
                    Download SRT
                  </DropdownMenuItem>
                </>
              )}
              
              <DropdownMenuSeparator />
              
              <DropdownMenuItem 
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteClick();
                }}
                className="text-red-600 focus:text-red-600"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                {showDeleteConfirm ? 'Confirm Delete' : 'Delete'}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <Clock className="w-4 h-4" />
            <span>{formatDuration(record.duration_seconds)}</span>
          </div>
          
          <div className="flex items-center gap-1">
            <FileAudio className="w-4 h-4" />
            <span>{formatFileSize(record.file_size)}</span>
          </div>
          
          <div className="flex items-center gap-1">
            <span>Created {formatDate(record.created_at)}</span>
          </div>
          
          {record.completed_at && (
            <div className="flex items-center gap-1">
              <CheckCircle className="w-4 h-4" />
              <span>Completed {formatDate(record.completed_at)}</span>
            </div>
          )}
        </div>

        {record.status === 'processing' && (
          <div className="mt-3 p-2 bg-yellow-50 border border-yellow-200 rounded-md">
            <p className="text-sm text-yellow-700 flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              Transcription in progress...
            </p>
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

        {isCompleted && !record.meeting_id && (
          <div className="mt-3 p-2 bg-blue-50 border border-blue-200 rounded-md">
            <p className="text-sm text-blue-700 flex items-center justify-between">
              <span className="flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Transcript ready
              </span>
              {canSaveAsMeeting && (
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSaveAsMeeting(record.id);
                  }}
                  className="text-xs h-6"
                >
                  <Plus className="w-3 h-3 mr-1" />
                  Save as Meeting
                </Button>
              )}
            </p>
          </div>
        )}

        {/* Tier and usage information */}
        <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-xs">
              {record.tier.toUpperCase()}
            </Badge>
            {record.usage_cost > 0 && (
              <span>Cost: {record.usage_cost} credits</span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <>
      <SwipeableCard
        actions={swipeActions}
        disabled={isLoading}
        className={className}
      >
        {cardContent}
      </SwipeableCard>

      {/* Meeting Detail Modal */}
      <MeetingDetailModal
        meetingId={record.id}
        isOpen={showDetailModal}
        onClose={() => setShowDetailModal(false)}
        onDownload={(id, format) => onDownload(record.id, format)}
      />
    </>
  );
}