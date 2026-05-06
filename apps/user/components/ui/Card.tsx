import React from 'react';
import { View, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS } from '../../constants/Theme';

interface CardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  variant?: 'glass' | 'solid' | 'gradient';
}

export default function Card({ children, style, variant = 'glass' }: CardProps) {
  if (variant === 'gradient') {
    return (
      <LinearGradient
        colors={['rgba(255, 255, 255, 0.08)', 'rgba(255, 255, 255, 0.02)']}
        style={[styles.card, style] as any}
      >
        {children}
      </LinearGradient>
    );
  }

  return (
    <View style={[
      styles.card, 
      variant === 'solid' && styles.solidCard,
      style
    ]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 28,
    padding: 20,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.25,
    shadowRadius: 24,
    elevation: 8,
  },
  solidCard: {
    backgroundColor: COLORS.dark[900],
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
});
