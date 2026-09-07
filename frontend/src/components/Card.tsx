import React from 'react';
import { View, ViewProps } from 'react-native';

interface CardProps extends ViewProps {
  variant?: 'white' | 'softGreen';
  className?: string;
}

export const Card: React.FC<CardProps> = ({ 
  children, 
  variant = 'white', 
  className = '', 
  style, 
  ...props 
}) => {
  const bgStyle = variant === 'white' 
    ? 'bg-white border-[#E2EFE7]' 
    : 'bg-[#F0FDF4] border-[#D1FAE5]';

  return (
    <View
      className={`rounded-[24px] p-5 border ${bgStyle} shadow-sm ${className}`}
      style={[
        {
          shadowColor: '#064E3B',
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: 0.05,
          shadowRadius: 16,
          elevation: 3,
        },
        style
      ]}
      {...props}
    >
      {children}
    </View>
  );
};