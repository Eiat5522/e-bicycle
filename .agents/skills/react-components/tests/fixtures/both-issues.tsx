import React from 'react';

// Intentionally missing Props interface AND has hardcoded hex in className
export const BothIssuesComponent = ({ label }: { label: string }) => {
  return (
    <div className="flex #FF0000 p-4">
      <span className="text-primary">{label}</span>
    </div>
  );
};

export default BothIssuesComponent;