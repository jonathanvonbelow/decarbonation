import React, { useState } from 'react';

interface TooltipProps {
  text?: string;
  content?: React.ReactNode;
  children: React.ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right' | 'top-right';
}

const Tooltip: React.FC<TooltipProps> = ({ text, content, children, position = 'top' }) => {
  const [visible, setVisible] = useState(false);

  const getPositionClasses = () => {
    switch (position) {
      case 'top':
        return 'bottom-full left-1/2 -translate-x-1/2 mb-2';
      case 'bottom':
        return 'top-full left-1/2 -translate-x-1/2 mt-2';
      case 'left':
        return 'right-full top-1/2 -translate-y-1/2 mr-2';
      case 'right':
        return 'left-full top-1/2 -translate-y-1/2 ml-2';
      case 'top-right':
        return 'bottom-full right-0 mb-2';
      default:
        return 'bottom-full left-1/2 -translate-x-1/2 mb-2';
    }
  };
  
  const getArrowClasses = () => {
    switch(position) {
      case 'top':
        return 'left-1/2 -translate-x-1/2 bottom-[-4px]';
      case 'bottom':
        return 'left-1/2 -translate-x-1/2 top-[-4px]';
      case 'left':
        return 'top-1/2 -translate-y-1/2 right-[-4px]';
      case 'right':
        return 'top-1/2 -translate-y-1/2 left-[-4px]';
      case 'top-right':
        return 'right-3 bottom-[-4px]';
      default:
        return 'left-1/2 -translate-x-1/2 bottom-[-4px]';
    }
  }

  const tooltipContent = content || text;

  if (!tooltipContent) {
    return <>{children}</>;
  }

  return (
    <div 
      className="relative inline-block"
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
    >
      {children}
      {visible && (
        <div 
          className={`absolute z-10 px-3 py-2 text-sm font-medium text-white bg-gray-800 rounded-lg shadow-sm text-left max-w-md ${getPositionClasses()}`}
        >
          {tooltipContent}
          <div className={`absolute w-2 h-2 bg-gray-800 rotate-45 ${getArrowClasses()}`}></div>
        </div>
      )}
    </div>
  );
};

export default Tooltip;