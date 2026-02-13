import { View, StyleSheet, ViewStyle, Pressable } from 'react-native';
import { tokens } from '@shared-design/facebook-tokens';

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  padding?: 'none' | 'small' | 'medium' | 'large';
  elevation?: 'none' | 'small' | 'medium' | 'large';
  borderRadius?: 'none' | 'small' | 'medium' | 'large';
  onPress?: () => void;
}

export function Card({
  children,
  style,
  padding = 'medium',
  elevation = 'medium',
  borderRadius = 'large',
  onPress,
}: CardProps) {
  const getPadding = () => {
    const paddingMap = {
      none: 0,
      small: tokens.spacing.sm,
      medium: tokens.spacing.md,
      large: tokens.spacing.lg,
    };
    return paddingMap[padding];
  };

  const getElevation = () => {
    const elevationMap = {
      none: {},
      small: tokens.shadow.small,
      medium: tokens.shadow.card,
      large: tokens.shadow.large,
    };
    return elevationMap[elevation];
  };

  const getBorderRadius = () => {
    const radiusMap = {
      none: 0,
      small: tokens.radii.sm,
      medium: tokens.radii.md,
      large: tokens.radii.lg,
    };
    return radiusMap[borderRadius];
  };

  const cardStyle: ViewStyle = {
    backgroundColor: '#FFF',
    padding: getPadding(),
    borderRadius: getBorderRadius(),
    ...getElevation(),
  };

  if (onPress) {
    return (
      <Pressable
        style={[cardStyle, style]}
        onPress={onPress}
        android_ripple={{ color: 'rgba(0, 0, 0, 0.05)' }}
      >
        {children}
      </Pressable>
    );
  }

  return <View style={[cardStyle, style]}>{children}</View>;
}