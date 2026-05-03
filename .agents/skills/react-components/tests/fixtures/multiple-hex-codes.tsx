import React from 'react';

interface MultipleHexProps {
  readonly label: string;
}

// Has multiple hardcoded hex codes in classNames to test count reporting
export const MultipleHexComponent: React.FC<MultipleHexProps> = ({ label }) => {
  return (
    <div className="flex #FCFAFA p-4">
      <span className="#2C2C2C font-semibold">{label}</span>
      <span className="#6B6B6B text-sm">secondary</span>
    </div>
  );
};

export default MultipleHexComponent;