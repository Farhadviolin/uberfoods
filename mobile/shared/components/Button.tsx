import { Pressable, Text, StyleSheet, ActivityIndicator, ViewStyle, TextStyle } from 'react-native';
import { tokens } from '@shared-design/facebook-tokens';

interface ButtonProps {
  children: string;
  onPress?: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export function Button({
  children,
  onPress,
  variant = 'primary',
  size = 'medium',
  disabled = false,
  loading = false,
  fullWidth = false,
  style,
  textStyle,
}: ButtonProps) {
  const getButtonStyle = (): ViewStyle => {
    const baseStyle: ViewStyle = {
      borderRadius: tokens.radii.md,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
    };

    // Size
    const sizeStyles: Record<string, ViewStyle> = {
      small: {
        paddingHorizontal: tokens.spacing.md,
        paddingVertical: tokens.spacing.sm,
      },
      medium: {
        paddingHorizontal: tokens.spacing.lg,
        paddingVertical: tokens.spacing.md,
      },
      large: {
        paddingHorizontal: tokens.spacing.xl,
        paddingVertical: tokens.spacing.lg,
      },
    };

    // Variant
    const variantStyles: Record<string, ViewStyle> = {
      primary: {
        backgroundColor: tokens.colors.primary[500],
      },
      secondary: {
        backgroundColor: tokens.colors.secondary[500],
      },
      outline: {
        backgroundColor: 'transparent',
        borderWidth: 1,
        borderColor: tokens.colors.primary[500],
      },
      ghost: {
        backgroundColor: 'transparent',
      },
      danger: {
        backgroundColor: tokens.colors.error,
      },
    };

    // Disabled
    const disabledStyle: ViewStyle = {
      opacity: 0.5,
    };

    return {
      ...baseStyle,
      ...sizeStyles[size],
      ...variantStyles[variant],
      ...(disabled || loading ? disabledStyle : {}),
      ...(fullWidth ? { width: '100%' } : {}),
    };
  };

  const getTextStyle = (): TextStyle => {
    const baseStyle: TextStyle = {
      fontWeight: '700',
    };

    // Size
    const sizeStyles: Record<string, TextStyle> = {
      small: {
        fontSize: tokens.typography.caption,
      },
      medium: {
        fontSize: tokens.typography.button,
      },
      large: {
        fontSize: tokens.typography.subtitle,
      },
    };

    // Variant
    const variantStyles: Record<string, TextStyle> = {
      primary: {
        color: '#FFF',
      },
      secondary: {
        color: '#FFF',
      },
      outline: {
        color: tokens.colors.primary[500],
      },
      ghost: {
        color: tokens.colors.primary[500],
      },
      danger: {
        color: '#FFF',
      },
    };

    return {
      ...baseStyle,
      ...sizeStyles[size],
      ...variantStyles[variant],
    };
  };

  return (
    <Pressable
      style={[getButtonStyle(), style]}
      onPress={onPress}
      disabled={disabled || loading}
      android_ripple={{ color: 'rgba(0, 0, 0, 0.1)' }}
    >
      {loading && (
        <ActivityIndicator
          size="small"
          color={variant === 'outline' || variant === 'ghost' ? tokens.colors.primary[500] : '#FFF'}
          style={{ marginRight: tokens.spacing.sm }}
        />
      )}
      <Text style={[getTextStyle(), textStyle]}>
        {loading ? 'Lädt...' : children}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({});