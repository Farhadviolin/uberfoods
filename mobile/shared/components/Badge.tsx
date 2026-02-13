import { View, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { tokens } from '@shared-design/facebook-tokens';

interface BadgeProps {
  children: string;
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'error' | 'info';
  size?: 'small' | 'medium' | 'large';
  style?: ViewStyle;
}

export function Badge({
  children,
  variant = 'default',
  size = 'medium',
  style,
}: BadgeProps) {
  const getBadgeStyle = (): ViewStyle => {
    const baseStyle: ViewStyle = {
      borderRadius: tokens.radii.full,
      alignItems: 'center',
      justifyContent: 'center',
    };

    // Size
    const sizeStyles: Record<string, ViewStyle> = {
      small: {
        paddingHorizontal: tokens.spacing.xs,
        paddingVertical: tokens.spacing.xs / 2,
      },
      medium: {
        paddingHorizontal: tokens.spacing.sm,
        paddingVertical: tokens.spacing.xs,
      },
      large: {
        paddingHorizontal: tokens.spacing.md,
        paddingVertical: tokens.spacing.sm,
      },
    };

    // Variant
    const variantStyles: Record<string, ViewStyle> = {
      default: {
        backgroundColor: tokens.colors.gray[200],
      },
      primary: {
        backgroundColor: tokens.colors.primary[500],
      },
      success: {
        backgroundColor: tokens.colors.green[500],
      },
      warning: {
        backgroundColor: tokens.colors.warning,
      },
      error: {
        backgroundColor: tokens.colors.error,
      },
      info: {
        backgroundColor: tokens.colors.blue[500],
      },
    };

    return {
      ...baseStyle,
      ...sizeStyles[size],
      ...variantStyles[variant],
    };
  };

  const getTextStyle = (): TextStyle => {
    const sizeStyles: Record<string, TextStyle> = {
      small: {
        fontSize: tokens.typography.caption - 2,
      },
      medium: {
        fontSize: tokens.typography.caption,
      },
      large: {
        fontSize: tokens.typography.body,
      },
    };

    const variantStyles: Record<string, TextStyle> = {
      default: {
        color: tokens.colors.gray[700],
      },
      primary: {
        color: '#FFF',
      },
      success: {
        color: '#FFF',
      },
      warning: {
        color: '#FFF',
      },
      error: {
        color: '#FFF',
      },
      info: {
        color: '#FFF',
      },
    };

    return {
      fontWeight: '600',
      ...sizeStyles[size],
      ...variantStyles[variant],
    };
  };

  return (
    <View style={[getBadgeStyle(), style]}>
      <Text style={getTextStyle()}>{children}</Text>
    </View>
  );
}