import React from 'react';

interface ValidComponentProps {
  readonly label: string;
  readonly count: number;
}

export const ValidComponent: React.FC<ValidComponentProps> = ({ label, count }) => {
  return (
    <div className="flex items-center rounded-lg bg-surface-dark p-4">
      <span className="text-primary font-semibold">{label}</span>
      <span className="text-white/60">{count}</span>
    </div>
  );
};

export default ValidComponent;