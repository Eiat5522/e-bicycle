import React from 'react';

// Intentionally missing Props interface to test validation failure
export const NoInterfaceComponent = ({ label }: { label: string }) => {
  return (
    <div className="flex items-center rounded-lg bg-surface-dark p-4">
      <span className="text-primary font-semibold">{label}</span>
    </div>
  );
};

export default NoInterfaceComponent;