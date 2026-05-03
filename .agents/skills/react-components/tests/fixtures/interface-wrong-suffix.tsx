import React from 'react';

// Interface exists but does not end in 'Props' - should fail validation
interface ButtonConfig {
  readonly label: string;
  readonly disabled?: boolean;
}

export const WrongSuffixComponent: React.FC<ButtonConfig> = ({ label, disabled }) => {
  return (
    <button className="rounded-lg bg-primary px-4 py-2" disabled={disabled}>
      {label}
    </button>
  );
};

export default WrongSuffixComponent;