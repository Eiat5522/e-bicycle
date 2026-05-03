import React from 'react';

interface HardcodedHexProps {
  readonly label: string;
}

// Intentionally has hardcoded hex color in className to test validation failure
export const HardcodedHexComponent: React.FC<HardcodedHexProps> = ({ label }) => {
  return (
    <div className="flex items-center #294056 p-4">
      <span className="text-#2C2C2C font-semibold">{label}</span>
    </div>
  );
};

export default HardcodedHexComponent;