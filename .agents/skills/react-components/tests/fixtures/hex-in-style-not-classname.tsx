import React from 'react';

interface StylePropHexProps {
  readonly avatarUrl: string;
  readonly label: string;
}

// Hex colors used in style prop (not className) - should pass validation
export const StylePropHexComponent: React.FC<StylePropHexProps> = ({ avatarUrl, label }) => {
  return (
    <div className="flex items-center rounded-lg p-4">
      <div
        className="aspect-square h-10 w-10 rounded-full bg-cover"
        style={{ backgroundImage: `url(${avatarUrl})`, borderColor: '#294056' }}
        aria-label={label}
      />
      <span className="text-primary">{label}</span>
    </div>
  );
};

export default StylePropHexComponent;