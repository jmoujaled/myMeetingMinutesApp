'use client';

import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import styles from './MeetingDetailModal.module.css';
import { 
  X, 
  Calendar, 
  Clock, 
  Users, 
  FileText, 
  CheckSquare, 
  Square,
  Download,
  AlertCircle,
  Loader2,
  Tag,
  User,
  CalendarDays,
  Copy,
  Search,
  ChevronDown,
  ChevronUp,
  Play,
  Pause,
  Volume2,
  BarChart3,
  MessageSquare,
  Hash
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import type { 
  ActionItem, 
  ExportFormat
} from '@/lib/supabase/meetings-types';
import type { 
  MeetingDetail,
  GetMeetingDetailResponse 
} from '@/lib/validation/meetings-schemas';

interface MeetingDetailModalProps {
  meetingId: string;
  isOpen: boolean;
  onClose: () => void;
  onDownload?: (id: string, format: ExportFormat) => void;
}

interface MeetingDetailWithJob extends MeetingDetail {
  transcription_job?: {
    filename: string;
    file_size: number | null;
    processing_time: number | null;
  };
}

export function MeetingDetailModal({ 
  meetingId, 
  isOpen, 
  onClose,
  onDownload 
}: MeetingDetailModalProps) {
  const [meeting, setMeeting] = useState<MeetingDetailWithJob | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionItems, setActionItems] = useState<ActionItem[]>([]);
  const [transcriptSearch, setTranscriptSearch] = useState('');
  const [expandedSections, setExpandedSections] = useState({
    metadata: true,
    summary: true,
    actionItems: true,
    transcript: true,
    analytics: false
  });
  const [copySuccess, setCopySuccess] = useState<string | null>(null);

  // Fetch meeting details when modal opens
  useEffect(() => {
    if (isOpen && meetingId) {
      fetchMeetingDetails();
    }
  }, [isOpen, meetingId]);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setMeeting(null);
      setError(null);
      setActionItems([]);
      setTranscriptSearch('');
      setCopySuccess(null);
    }
  }, [isOpen]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!isOpen) return;

      switch (event.key) {
        case 'Escape':
          onClose();
          break;
        case 'f':
          if (event.ctrlKey || event.metaKey) {
            event.preventDefault();
            // Focus on search input if transcript is expanded
            if (expandedSections.transcript) {
              const searchInput = document.querySelector('input[placeholder="Search in transcript..."]') as HTMLInputElement;
              searchInput?.focus();
            }
          }
          break;
        case '1':
          if (event.ctrlKey || event.metaKey) {
            event.preventDefault();
            toggleSection('metadata');
          }
          break;
        case '2':
          if (event.ctrlKey || event.metaKey) {
            event.preventDefault();
            toggleSection('summary');
          }
          break;
        case '3':
          if (event.ctrlKey || event.metaKey) {
            event.preventDefault();
            toggleSection('actionItems');
          }
          break;
        case '4':
          if (event.ctrlKey || event.metaKey) {
            event.preventDefault();
            toggleSection('transcript');
          }
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, expandedSections]);

  const fetchMeetingDetails = async () => {
    console.log('Fetching meeting details for ID:', meetingId);
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/meetings/${meetingId}`);
      console.log('API response status:', response.status);
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error('API error response:', errorData);
        throw new Error(errorData.error || 'Failed to fetch meeting details');
      }

      const data: GetMeetingDetailResponse = await response.json();
      console.log('Meeting data received:', data);
      
      const meetingWithJob: MeetingDetailWithJob = {
        ...data.meeting,
        transcription_job: data.transcription_job
      };
      
      setMeeting(meetingWithJob);
      setActionItems(data.meeting.action_items || []);
    } catch (err) {
      console.error('Error fetching meeting details:', err);
      setError(err instanceof Error ? err.message : 'Failed to load meeting details');
    } finally {
      setIsLoading(false);
    }
  };

  const handleActionItemToggle = async (itemId: string, completed: boolean) => {
    // Optimistically update the UI
    setActionItems(prev => 
      prev.map(item => 
        item.id === itemId ? { ...item, completed } : item
      )
    );

    // TODO: In a future enhancement, this would sync with the backend
    // For now, we just update the local state
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Not specified';
    try {
      return format(new Date(dateString), 'EEEE, MMMM d, yyyy \'at\' h:mm a');
    } catch {
      return 'Invalid date';
    }
  };

  const formatDuration = (minutes: number | null) => {
    if (!minutes) return 'Unknown duration';
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    
    if (hours > 0) {
      return `${hours}h ${remainingMinutes}m`;
    }
    return `${remainingMinutes}m`;
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return 'Unknown size';
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(1)} MB`;
  };

  const formatProcessingTime = (seconds: number | null) => {
    if (!seconds) return 'Unknown';
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleDownload = (format: ExportFormat) => {
    if (onDownload && meeting) {
      onDownload(meeting.id, format);
    }
  };

  const handleCopyToClipboard = async (text: string, type: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopySuccess(type);
      setTimeout(() => setCopySuccess(null), 2000);
    } catch (err) {
      console.error('Failed to copy text:', err);
    }
  };

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const highlightSearchText = (text: string, search: string) => {
    if (!search.trim()) return text;
    
    const regex = new RegExp(`(${search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    return text.replace(regex, '<mark class="bg-yellow-200 px-1 rounded">$1</mark>');
  };

  const getWordCount = (text: string | null) => {
    if (!text) return 0;
    return text.trim().split(/\s+/).length;
  };

  const getReadingTime = (text: string | null) => {
    if (!text) return 0;
    const words = getWordCount(text);
    return Math.ceil(words / 200); // Average reading speed: 200 words per minute
  };

  if (!isOpen) return null;

  return (
    <div 
      className={cn("fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-2 sm:p-4", styles.modalOverlay)}
      onClick={handleBackdropClick}
    >
      <div className={cn("w-full max-w-4xl bg-white rounded-lg shadow-xl overflow-hidden flex flex-col", styles.modalContainer, styles.modalContent)}>
        {/* Header */}
        <div className={cn("flex items-center justify-between p-4 sm:p-6 border-b bg-gray-50", styles.modalHeader)}>
          <div className="flex-1 min-w-0">
            <h2 className="text-lg sm:text-xl font-semibold text-gray-900 truncate">
              {isLoading ? 'Loading...' : meeting?.title || 'Meeting Details'}
            </h2>
            {meeting?.description && (
              <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                {meeting.description}
              </p>
            )}
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-8 w-8 ml-2 sm:ml-4 flex-shrink-0"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Content */}
        <div 
          className={cn("flex-1 overflow-y-auto min-h-0", styles.modalBody)}
          tabIndex={0}
          role="region"
          aria-label="Meeting details content"
        >
          {isLoading && (
            <div className="flex items-center justify-center p-12">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
              <span className="ml-3 text-gray-600">Loading meeting details...</span>
            </div>
          )}

          {error && (
            <div className="p-6">
              <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                <div>
                  <h3 className="font-medium text-red-800">Error Loading Meeting</h3>
                  <p className="text-sm text-red-600 mt-1">{error}</p>
                </div>
              </div>
              <div className="mt-4 flex gap-3">
                <Button onClick={fetchMeetingDetails} variant="outline">
                  Try Again
                </Button>
                <Button onClick={onClose} variant="ghost">
                  Close
                </Button>
              </div>
            </div>
          )}

          {meeting && !isLoading && !error && (
            <div className={cn("space-y-4 sm:space-y-6", styles.contentSection)}>
              {/* Meeting Metadata */}
              <Card className={styles.sectionCard}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CalendarDays className="w-5 h-5" />
                      {meeting.title?.includes('.') ? 'Transcription Information' : 'Meeting Information'}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleSection('metadata')}
                    >
                      {expandedSections.metadata ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </Button>
                  </CardTitle>
                </CardHeader>
                {expandedSections.metadata && (
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="flex items-center gap-3">
                        <Calendar className="w-4 h-4 text-gray-500" />
                        <div>
                          <p className="text-sm font-medium">Date & Time</p>
                          <p className="text-sm text-gray-600">
                            {formatDate(meeting.meeting_date || meeting.created_at)}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3">
                        <Clock className="w-4 h-4 text-gray-500" />
                        <div>
                          <p className="text-sm font-medium">Duration</p>
                          <p className="text-sm text-gray-600">
                            {formatDuration(meeting.duration_minutes)}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <Hash className="w-4 h-4 text-gray-500" />
                        <div>
                          <p className="text-sm font-medium">Word Count</p>
                          <p className="text-sm text-gray-600">
                            {getWordCount(meeting.transcript_text).toLocaleString()} words
                          </p>
                        </div>
                      </div>
                    </div>

                    {meeting.transcript_text && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t">
                        <div className="flex items-center gap-3">
                          <FileText className="w-4 h-4 text-gray-500" />
                          <div>
                            <p className="text-sm font-medium">Reading Time</p>
                            <p className="text-sm text-gray-600">
                              ~{getReadingTime(meeting.transcript_text)} min read
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-3">
                          <MessageSquare className="w-4 h-4 text-gray-500" />
                          <div>
                            <p className="text-sm font-medium">Content Type</p>
                            <p className="text-sm text-gray-600">
                              {meeting.title?.includes('.') ? 'Audio Transcription' : 'Meeting Minutes'}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                  {meeting.attendees && meeting.attendees.length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <Users className="w-4 h-4 text-gray-500" />
                        <p className="text-sm font-medium">
                          Attendees ({meeting.attendees.length})
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {meeting.attendees.map((attendee, index) => (
                          <Badge key={index} variant="secondary" className="text-xs">
                            <User className="w-3 h-3 mr-1" />
                            {attendee}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {meeting.key_topics && meeting.key_topics.length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <Tag className="w-4 h-4 text-gray-500" />
                        <p className="text-sm font-medium">Key Topics</p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {meeting.key_topics.map((topic, index) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {topic}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {meeting.transcription_job && (
                    <div>
                      <p className="text-sm font-medium mb-2">Source File</p>
                      <div className="text-sm text-gray-600 space-y-1">
                        <p><span className="font-medium">Filename:</span> {meeting.transcription_job.filename}</p>
                        <p><span className="font-medium">File Size:</span> {formatFileSize(meeting.transcription_job.file_size)}</p>
                        <p><span className="font-medium">Processing Time:</span> {formatProcessingTime(meeting.transcription_job.processing_time)}</p>
                      </div>
                    </div>
                  )}
                  </CardContent>
                )}
              </Card>

              {/* Summary */}
              {meeting.summary && (
                <Card className={styles.sectionCard}>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <FileText className="w-5 h-5" />
                        Summary
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleCopyToClipboard(meeting.summary || '', 'summary')}
                        >
                          <Copy className="w-4 h-4" />
                          {copySuccess === 'summary' ? 'Copied!' : 'Copy'}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleSection('summary')}
                        >
                          {expandedSections.summary ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </Button>
                      </div>
                    </CardTitle>
                  </CardHeader>
                  {expandedSections.summary && (
                    <CardContent>
                      <div className="prose prose-sm max-w-none">
                        <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">
                          {meeting.summary}
                        </p>
                      </div>
                    </CardContent>
                  )}
                </Card>
              )}

              {/* Action Items */}
              {actionItems && actionItems.length > 0 && (
                <Card className={styles.sectionCard}>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CheckSquare className="w-5 h-5" />
                        Action Items ({actionItems.filter(item => !item.completed).length} pending)
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleSection('actionItems')}
                      >
                        {expandedSections.actionItems ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </Button>
                    </CardTitle>
                  </CardHeader>
                  {expandedSections.actionItems && (
                    <CardContent>
                      <div className="space-y-3">
                        {actionItems.map((item, index) => (
                        <div 
                          key={item.id || index}
                          className={cn(
                            "flex items-start gap-3 p-3 rounded-lg border transition-colors",
                            item.completed 
                              ? "bg-green-50 border-green-200" 
                              : "bg-gray-50 border-gray-200 hover:bg-gray-100"
                          )}
                        >
                          <button
                            onClick={() => handleActionItemToggle(item.id || `temp-${index}`, !item.completed)}
                            className="mt-0.5 text-gray-500 hover:text-gray-700 transition-colors"
                          >
                            {item.completed ? (
                              <CheckSquare className="w-4 h-4 text-green-600" />
                            ) : (
                              <Square className="w-4 h-4" />
                            )}
                          </button>
                          
                          <div className="flex-1 min-w-0">
                            <p className={cn(
                              "text-sm",
                              item.completed 
                                ? "text-gray-600 line-through" 
                                : "text-gray-900"
                            )}>
                              {item.text}
                            </p>
                            
                            <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                              {item.assignee && (
                                <span className="flex items-center gap-1">
                                  <User className="w-3 h-3" />
                                  {item.assignee}
                                </span>
                              )}
                              
                              {item.due_date && (
                                <span className="flex items-center gap-1">
                                  <Calendar className="w-3 h-3" />
                                  {format(new Date(item.due_date), 'MMM d, yyyy')}
                                </span>
                              )}
                              
                              {item.priority && (
                                <Badge 
                                  variant={
                                    item.priority === 'high' ? 'destructive' :
                                    item.priority === 'medium' ? 'default' : 'secondary'
                                  }
                                  className="text-xs px-1.5 py-0.5"
                                >
                                  {item.priority}
                                </Badge>
                              )}
                            </div>
                            
                            {item.notes && (
                              <p className="text-xs text-gray-600 mt-1 italic">
                                {item.notes}
                              </p>
                            )}
                          </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  )}
                </Card>
              )}

              {/* Transcript */}
              <Card className={styles.sectionCard}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FileText className="w-5 h-5" />
                      Full Transcript
                    </div>
                    <div className="flex items-center gap-2">
                      {meeting.transcript_text && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleCopyToClipboard(meeting.transcript_text || '', 'transcript')}
                        >
                          <Copy className="w-4 h-4" />
                          {copySuccess === 'transcript' ? 'Copied!' : 'Copy'}
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleSection('transcript')}
                      >
                        {expandedSections.transcript ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </Button>
                    </div>
                  </CardTitle>
                  {meeting.transcript_text && expandedSections.transcript && (
                    <div className="px-6 pb-2">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                        <input
                          type="text"
                          placeholder="Search in transcript..."
                          value={transcriptSearch}
                          onChange={(e) => setTranscriptSearch(e.target.value)}
                          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                    </div>
                  )}
                </CardHeader>
                {expandedSections.transcript && (
                  <CardContent>
                    {meeting.transcript_text ? (
                      <div className="bg-gray-50 rounded-lg p-4">
                        <div 
                          className={cn("text-sm text-gray-700 whitespace-pre-wrap font-mono leading-relaxed", styles.transcriptScrollArea)}
                          dangerouslySetInnerHTML={{
                            __html: highlightSearchText(meeting.transcript_text, transcriptSearch)
                          }}
                        />
                      </div>
                    ) : (
                      <div className="p-4 bg-gray-50 rounded-lg text-center">
                        <p className="text-gray-600 text-sm">
                          Transcript not available. This may be because the transcription is still processing or failed to complete.
                        </p>
                        {meeting.transcription_job && (
                          <p className="text-gray-500 text-xs mt-2">
                            Original file: {meeting.transcription_job.filename}
                          </p>
                        )}
                      </div>
                    )}
                  </CardContent>
                )}
              </Card>

              {/* Analytics & Metadata */}
              {(meeting.transcription_job || meeting.key_topics) && (
                <Card className={styles.sectionCard}>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <BarChart3 className="w-5 h-5" />
                        Analytics & Details
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleSection('analytics')}
                      >
                        {expandedSections.analytics ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </Button>
                    </CardTitle>
                  </CardHeader>
                  {expandedSections.analytics && (
                    <CardContent className="space-y-4">
                      {meeting.transcription_job && (
                        <div>
                          <h4 className="text-sm font-medium mb-3">Processing Details</h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                            <div className="space-y-2">
                              <div className="flex justify-between">
                                <span className="text-gray-600">Original Filename:</span>
                                <span className="font-medium">{meeting.transcription_job.filename}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-600">File Size:</span>
                                <span className="font-medium">{formatFileSize(meeting.transcription_job.file_size)}</span>
                              </div>
                            </div>
                            <div className="space-y-2">
                              <div className="flex justify-between">
                                <span className="text-gray-600">Processing Time:</span>
                                <span className="font-medium">{formatProcessingTime(meeting.transcription_job.processing_time)}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-600">Status:</span>
                                <Badge variant="outline" className="text-xs">
                                  Completed
                                </Badge>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {meeting.transcript_text && (
                        <div className="border-t pt-4">
                          <h4 className="text-sm font-medium mb-3">Content Analysis</h4>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            <div className="text-center p-3 bg-blue-50 rounded-lg">
                              <div className="text-lg font-semibold text-blue-600">
                                {getWordCount(meeting.transcript_text).toLocaleString()}
                              </div>
                              <div className="text-gray-600">Words</div>
                            </div>
                            <div className="text-center p-3 bg-green-50 rounded-lg">
                              <div className="text-lg font-semibold text-green-600">
                                {Math.ceil(meeting.transcript_text.length / 5)}
                              </div>
                              <div className="text-gray-600">Characters</div>
                            </div>
                            <div className="text-center p-3 bg-purple-50 rounded-lg">
                              <div className="text-lg font-semibold text-purple-600">
                                {getReadingTime(meeting.transcript_text)}
                              </div>
                              <div className="text-gray-600">Min Read</div>
                            </div>
                            <div className="text-center p-3 bg-orange-50 rounded-lg">
                              <div className="text-lg font-semibold text-orange-600">
                                {meeting.transcript_text.split(/[.!?]+/).length - 1}
                              </div>
                              <div className="text-gray-600">Sentences</div>
                            </div>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  )}
                </Card>
              )}
            </div>
          )}
        </div>

        {/* Footer with Actions */}
        {meeting && !isLoading && !error && (
          <div className="border-t bg-gray-50 px-6 py-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="text-xs text-gray-500">
                <div>Created {format(new Date(meeting.created_at), 'MMM d, yyyy \'at\' h:mm a')}</div>
                {meeting.updated_at !== meeting.created_at && (
                  <div>Updated {format(new Date(meeting.updated_at), 'MMM d, yyyy \'at\' h:mm a')}</div>
                )}
                <div className="mt-1 text-gray-400">
                  Press <kbd className="px-1 py-0.5 bg-gray-200 rounded text-xs">Esc</kbd> to close
                </div>
              </div>
              
              <div className="flex flex-wrap items-center gap-2">
                {onDownload && (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDownload('txt')}
                      className="text-xs"
                    >
                      <Download className="w-3 h-3 mr-1" />
                      TXT
                    </Button>
                    {meeting.summary && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDownload('docx')}
                          className="text-xs"
                        >
                          <Download className="w-3 h-3 mr-1" />
                          Word
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDownload('pdf')}
                          className="text-xs"
                        >
                          <Download className="w-3 h-3 mr-1" />
                          PDF
                        </Button>
                      </>
                    )}
                  </>
                )}
                <Button onClick={onClose} variant="default" size="sm">
                  Close
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}