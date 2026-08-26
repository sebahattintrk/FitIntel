import React from 'react';
import { View, ViewProps } from 'react-native';

type Props = ViewProps & { padded?: boolean };

export function Card({ children, padded = true, style, className, ...rest }: Props) {
  return (
    <View
      {...rest}
      className={[
        'rounded-3xl bg-surface border border-border',
        padded ? 'p-5' : '',
        className ?? '',
      ].join(' ')}
      style={[
        {
          shadowColor: '#000',
          shadowOpacity: 0.18,
          shadowRadius: 18,
          shadowOffset: { width: 0, height: 8 },
          elevation: 4,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}
