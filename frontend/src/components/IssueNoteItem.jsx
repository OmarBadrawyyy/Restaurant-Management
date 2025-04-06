import React from 'react';

const IssueNoteItem = ({ note }) => {
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  return (
    <div className="bg-gray-50 rounded-lg p-3 border border-gray-200 shadow-sm">
      <div className="text-sm text-gray-700 mb-2 whitespace-pre-line">{note.content}</div>
      <div className="flex justify-between items-center">
        <div className="text-xs text-gray-500 flex items-center">
          <span className="flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            {note.createdBy}
          </span>
          <span className="mx-2">•</span>
          <span className="flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {formatDate(note.createdAt)}
          </span>
        </div>
      </div>
    </div>
  );
};

export default IssueNoteItem; 