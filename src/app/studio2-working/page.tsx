'use client';

import { useState, useRef, useCallback } from 'react';

export default function Studio2Working() {
  const [file, setFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [transcriptionResult, setTranscriptionResult] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setError(null);
    }
  }, []);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    
    if (!file) {
      setError('Please select an audio file');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setStatusMessage('Uploading and processing...');

    try {
      const formData = new FormData();
      formData.append('audio', file);
      formData.append('language', 'en');
      formData.append('diarizationMode', 'speaker');

      const response = await fetch('/api/transcribe', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const result = await response.json();
      setTranscriptionResult(result);
      setStatusMessage('Transcription completed successfully!');
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Transcription failed';
      setError(errorMessage);
      setStatusMessage('');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Studio2 Working</h1>
              <p className="text-gray-600">Simplified transcription interface</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Upload Form */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Upload Audio File</h2>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Audio File
              </label>
              <input
                ref={fileInputRef}
                type="file"
                accept="audio/*"
                onChange={handleFileChange}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
            </div>

            {file && (
              <div className="text-sm text-gray-600">
                Selected: {file.name} ({Math.round(file.size / 1024 / 1024 * 100) / 100} MB)
              </div>
            )}

            <button
              type="submit"
              disabled={!file || isSubmitting}
              className="w-full px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Processing...' : 'Transcribe Audio'}
            </button>
          </form>

          {/* Status */}
          {statusMessage && (
            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded">
              <p className="text-blue-700">{statusMessage}</p>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded">
              <p className="text-red-700">{error}</p>
            </div>
          )}
        </div>

        {/* Results */}
        {transcriptionResult && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Transcription Results</h2>
            
            {/* Segments */}
            {transcriptionResult.segments && transcriptionResult.segments.length > 0 && (
              <div className="mb-6">
                <h3 className="text-lg font-medium mb-3">Transcript</h3>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {transcriptionResult.segments.map((segment: any, index: number) => (
                    <div key={index} className="p-3 bg-gray-50 rounded">
                      <div className="flex items-start space-x-3">
                        <span className="text-sm font-medium text-gray-600 min-w-0">
                          {segment.speakerLabel || `Speaker ${index + 1}`}
                        </span>
                        <p className="text-gray-900 flex-1">{segment.text}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Minutes */}
            {transcriptionResult.minutes && (
              <div className="mb-6">
                <h3 className="text-lg font-medium mb-3">Meeting Minutes</h3>
                <div className="p-4 bg-gray-50 rounded">
                  <pre className="whitespace-pre-wrap text-gray-900">{transcriptionResult.minutes}</pre>
                </div>
              </div>
            )}

            {/* Limit Exceeded Warning */}
            {transcriptionResult.limitExceeded && (
              <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded">
                <h3 className="text-yellow-800 font-medium">⚠️ Usage Limit Exceeded</h3>
                <p className="text-yellow-700 mt-1">{transcriptionResult.limitExceeded.message}</p>
                <a 
                  href={transcriptionResult.limitExceeded.upgradeUrl}
                  className="inline-block mt-2 px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600"
                >
                  Upgrade Plan
                </a>
              </div>
            )}
          </div>
        )}

        {/* Navigation */}
        <div className="mt-8 space-y-2">
          <button
            onClick={() => window.location.href = '/studio2'}
            className="w-full px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
          >
            Try Original Studio2
          </button>
          <button
            onClick={() => window.location.href = '/basic-test'}
            className="w-full px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Go to Basic Auth Test
          </button>
        </div>
      </main>
    </div>
  );
}