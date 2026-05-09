import React, { useState } from 'react';
import { 
  View, 
  TextInput, 
  Text, 
  StyleSheet, 
  ViewStyle, 
  TextInputProps,
  StyleProp,
  TouchableOpacity
} from 'react-native';
import { COLORS, SPACING, TYPOGRAPHY } from '../../constants/Theme';
import { useTheme } from '../../context/ThemeContext';
import { Eye, EyeOff } from 'lucide-react-native';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  containerStyle?: StyleProp<ViewStyle>;
  icon?: React.ReactNode;
}

export default function Input({
  label,
  error,
  containerStyle,
  icon,
  onFocus,
  onBlur,
  secureTextEntry,
  ...props
}: InputProps) {
  const { theme, isDark } = useTheme();
  const [isFocused, setIsFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleFocus = (e: any) => {
    setIsFocused(true);
    onFocus?.(e);
  };

  const handleBlur = (e: any) => {
    setIsFocused(false);
    onBlur?.(e);
  };

  const isPassword = secureTextEntry;

  return (
    <View style={[styles.container, containerStyle]}>
      {label && <Text style={[styles.label, { color: theme.textSecondary }]}>{label}</Text>}
      <View style={[
        styles.inputContainer, 
        { 
          backgroundColor: isDark ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.02)',
          borderColor: isFocused ? COLORS.primary[400] : theme.border 
        },
        isFocused && styles.inputFocused,
        error ? styles.inputError : null
      ]}>
        {icon && <View style={styles.iconWrapper}>{icon}</View>}
        <TextInput
          style={[styles.input, { color: theme.text }]}
          placeholderTextColor={isDark ? "rgba(255, 255, 255, 0.3)" : "rgba(0, 0, 0, 0.3)"}
          onFocus={handleFocus}
          onBlur={handleBlur}
          secureTextEntry={isPassword && !showPassword}
          {...props}
        />
        {isPassword && (
          <TouchableOpacity 
            onPress={() => setShowPassword(!showPassword)}
            style={styles.eyeIcon}
          >
            {showPassword ? (
              <EyeOff size={20} color={theme.textSecondary} />
            ) : (
              <Eye size={20} color={theme.textSecondary} />
            )}
          </TouchableOpacity>
        )}
      </View>
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
    width: '100%',
  },
  label: {
    ...TYPOGRAPHY.caption,
    marginBottom: 8,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  inputContainer: {
    borderRadius: 18,
    borderWidth: 1.5,
    height: 60,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  inputFocused: {
    backgroundColor: 'rgba(106, 13, 213, 0.05)',
  },
  inputError: {
    borderColor: COLORS.error,
  },
  iconWrapper: {
    marginRight: 12,
  },
  eyeIcon: {
    padding: 8,
    marginLeft: 8,
  },
  input: {
    flex: 1,
    fontSize: 16,
    height: '100%',
    fontWeight: '500',
  },
  errorText: {
    color: COLORS.error,
    fontSize: 12,
    marginTop: 6,
    fontWeight: '600',
    marginLeft: 4,
  },
});
