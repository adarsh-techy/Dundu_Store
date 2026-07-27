/**
 * PhoneInput — Indian phone number input
 * - Fixed "+91" prefix (non-editable)
 * - Accepts exactly 10 digits only
 * - Strips non-numeric characters automatically
 * - value / onChange work with the 10-digit part only
 */
import React from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import { COLORS } from '../../config';

export default function PhoneInput({
  value = '',
  onChangeText,
  style,
  inputStyle,
  error = false,
  label = 'Phone Number',
  showLabel = true,
}) {
  function handleChange(text) {
    // Keep only digits, max 10
    const digits = text.replace(/\D/g, '').slice(0, 10);
    onChangeText?.(digits);
  }

  return (
    <View style={style}>
      {showLabel && <Text style={styles.label}>{label}</Text>}
      <View style={[styles.row, error && styles.rowError]}>
        {/* +91 prefix badge */}
        <View style={styles.prefix}>
          <Text style={styles.prefixText}>🇮🇳 +91</Text>
        </View>
        <View style={styles.divider} />
        <TextInput
          style={[styles.input, inputStyle]}
          placeholder="10-digit mobile number"
          placeholderTextColor="#666"
          keyboardType="number-pad"
          maxLength={10}
          value={value}
          onChangeText={handleChange}
          returnKeyType="done"
        />
      </View>
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.white || '#f5f5f5',
    marginBottom: 6,
    marginTop: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A1A1A',
    borderWidth: 1,
    borderColor: '#2A2A2A',
    borderRadius: 10,
    overflow: 'hidden',
  },
  rowError: {
    borderColor: '#ef4444',
  },
  prefix: {
    paddingHorizontal: 12,
    paddingVertical: 14,
    backgroundColor: '#252525',
  },
  prefixText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#f5f5f5',
    letterSpacing: 0.5,
  },
  divider: {
    width: 1,
    height: '100%',
    backgroundColor: '#2A2A2A',
  },
  input: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 15,
    color: '#f5f5f5',
    letterSpacing: 1,
  },
  errorText: {
    fontSize: 11,
    color: '#ef4444',
    marginTop: 4,
    marginLeft: 2,
  },
});
