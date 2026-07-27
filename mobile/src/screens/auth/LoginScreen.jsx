import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import useAuthStore from '../../store/auth.store';
import { authApi } from '../../api/index';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { COLORS } from '../../config';
import PhoneInput from '../../components/ui/PhoneInput';

const TAB_EMAIL = 'email';
const TAB_PHONE = 'phone';

const OTP_STAGE_PHONE = 'phone';
const OTP_STAGE_OTP = 'otp';

export default function LoginScreen() {
  const navigation = useNavigation();
  const login = useAuthStore((state) => state.login);
  const updateUser = useAuthStore((state) => state.updateUser);

  const [activeTab, setActiveTab] = useState(TAB_EMAIL);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Email/password mode
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Phone OTP mode
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [otpStage, setOtpStage] = useState(OTP_STAGE_PHONE);

  async function handleEmailLogin() {
    if (!email.trim() || !password.trim()) {
      setError('Please enter email and password.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await login({ email: email.trim(), password });
      // Dismiss the modal — fall back to Home if no back stack
      if (navigation.canGoBack()) navigation.goBack();
      else navigation.navigate('MainTabs');
    } catch (err) {
      const msg = err?.message || err?.error || 'Login failed. Please try again.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  async function handleSendOtp() {
    if (phone.length !== 10) {
      setError('Enter a valid 10-digit Indian mobile number.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await authApi.sendOtp('+91' + phone);
      setOtpStage(OTP_STAGE_OTP);
    } catch (err) {
      const msg = err?.message || err?.error || 'Failed to send OTP.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyOtp() {
    if (!otp.trim()) {
      setError('Please enter the OTP.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const res = await authApi.verifyOtp('+91' + phone, otp.trim());
      const token = res.token || res.data?.token;
      const user = res.user || res.data?.user;
      if (token) {
        await AsyncStorage.setItem('velora_token', token);
        updateUser(user);
        useAuthStore.setState({ user, token, isAuthenticated: true });
        if (navigation.canGoBack()) navigation.goBack();
        else navigation.navigate('MainTabs');
      }
    } catch (err) {
      const msg = err?.message || err?.error || 'Invalid OTP. Please try again.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  function switchTab(tab) {
    setActiveTab(tab);
    setError('');
    setOtpStage(OTP_STAGE_PHONE);
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.headerContainer}>
            <TouchableOpacity onPress={() => navigation.navigate('MainTabs')}>
              <Text style={styles.logo}>Dundu</Text>
            </TouchableOpacity>
            <Text style={styles.subtitle}>Welcome back</Text>
          </View>

          {/* Tab Switcher */}
          <View style={styles.tabContainer}>
            <TouchableOpacity
              style={[styles.tab, activeTab === TAB_EMAIL && styles.tabActive]}
              onPress={() => switchTab(TAB_EMAIL)}
            >
              <Text style={[styles.tabText, activeTab === TAB_EMAIL && styles.tabTextActive]}>
                Email
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, activeTab === TAB_PHONE && styles.tabActive]}
              onPress={() => switchTab(TAB_PHONE)}
            >
              <Text style={[styles.tabText, activeTab === TAB_PHONE && styles.tabTextActive]}>
                Phone OTP
              </Text>
            </TouchableOpacity>
          </View>

          {/* Error */}
          {error !== '' && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {/* Email Mode */}
          {activeTab === TAB_EMAIL && (
            <View style={styles.formContainer}>
              <Text style={styles.label}>Email Address</Text>
              <TextInput
                style={styles.input}
                placeholder="you@example.com"
                placeholderTextColor={COLORS.textSecondary}
                keyboardType="email-address"
                autoCapitalize="none"
                value={email}
                onChangeText={setEmail}
              />

              <Text style={styles.label}>Password</Text>
              <View style={styles.passwordRow}>
                <TextInput
                  style={styles.passwordInput}
                  placeholder="Enter your password"
                  placeholderTextColor={COLORS.textSecondary}
                  secureTextEntry={!showPassword}
                  value={password}
                  onChangeText={setPassword}
                />
                <TouchableOpacity
                  style={styles.eyeBtn}
                  onPress={() => setShowPassword((v) => !v)}
                >
                  <Text style={styles.eyeIcon}>{showPassword ? '🙈' : '👁️'}</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                onPress={() => navigation.navigate('ForgotPassword')}
                style={styles.forgotContainer}
              >
                <Text style={styles.forgotText}>Forgot password?</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.button, loading && styles.buttonDisabled]}
                onPress={handleEmailLogin}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color={COLORS.white} />
                ) : (
                  <Text style={styles.buttonText}>Login</Text>
                )}
              </TouchableOpacity>
            </View>
          )}

          {/* Phone OTP Mode */}
          {activeTab === TAB_PHONE && (
            <View style={styles.formContainer}>
              {otpStage === OTP_STAGE_PHONE && (
                <>
                  <PhoneInput
                    value={phone}
                    onChangeText={setPhone}
                    showLabel={false}
                  />
                  <Text style={styles.label} />
                  <TouchableOpacity
                    style={[styles.button, loading && styles.buttonDisabled]}
                    onPress={handleSendOtp}
                    disabled={loading}
                  >
                    {loading ? (
                      <ActivityIndicator color={COLORS.white} />
                    ) : (
                      <Text style={styles.buttonText}>Send OTP</Text>
                    )}
                  </TouchableOpacity>
                </>
              )}

              {otpStage === OTP_STAGE_OTP && (
                <>
                  <Text style={styles.otpSentText}>
                    OTP sent to {phone}
                  </Text>
                  <Text style={styles.label}>Enter OTP</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="6-digit OTP"
                    placeholderTextColor={COLORS.textSecondary}
                    keyboardType="number-pad"
                    maxLength={6}
                    value={otp}
                    onChangeText={setOtp}
                  />
                  <TouchableOpacity
                    style={[styles.button, loading && styles.buttonDisabled]}
                    onPress={handleVerifyOtp}
                    disabled={loading}
                  >
                    {loading ? (
                      <ActivityIndicator color={COLORS.white} />
                    ) : (
                      <Text style={styles.buttonText}>Verify OTP</Text>
                    )}
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => {
                      setOtpStage(OTP_STAGE_PHONE);
                      setOtp('');
                      setError('');
                    }}
                    style={styles.resendContainer}
                  >
                    <Text style={styles.resendText}>Change number</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          )}

          {/* Sign up link */}
          <View style={styles.signupContainer}>
            <Text style={styles.signupText}>Don't have an account? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Signup')}>
              <Text style={styles.signupLink}>Sign up</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: COLORS.dark,
  },
  flex: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingBottom: 32,
  },
  headerContainer: {
    alignItems: 'center',
    paddingTop: 40,
    paddingBottom: 32,
  },
  logo: {
    fontSize: 40,
    fontWeight: '800',
    color: COLORS.primary,
    letterSpacing: 2,
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.textSecondary,
    marginTop: 6,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#1A1A1A',
    borderRadius: 10,
    padding: 4,
    marginBottom: 24,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  tabActive: {
    backgroundColor: COLORS.primary,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  tabTextActive: {
    color: COLORS.white,
  },
  errorContainer: {
    backgroundColor: '#3B0000',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.error,
  },
  errorText: {
    color: COLORS.error,
    fontSize: 13,
  },
  formContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.white,
    marginBottom: 6,
    marginTop: 8,
  },
  input: {
    backgroundColor: '#1A1A1A',
    borderWidth: 1,
    borderColor: '#2A2A2A',
    borderRadius: 10,
    padding: 14,
    fontSize: 15,
    color: COLORS.white,
    marginBottom: 4,
  },
  // password row with eye icon
  passwordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A1A1A',
    borderWidth: 1,
    borderColor: '#2A2A2A',
    borderRadius: 10,
    marginBottom: 4,
    overflow: 'hidden',
  },
  passwordInput: {
    flex: 1,
    padding: 14,
    fontSize: 15,
    color: COLORS.white,
  },
  eyeBtn: {
    paddingHorizontal: 14,
    paddingVertical: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  eyeIcon: {
    fontSize: 18,
  },
  forgotContainer: {
    alignSelf: 'flex-end',
    marginVertical: 10,
  },
  forgotText: {
    color: COLORS.primary,
    fontSize: 13,
    fontWeight: '600',
  },
  button: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 12,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '700',
  },
  otpSentText: {
    color: COLORS.success,
    fontSize: 13,
    marginBottom: 12,
    textAlign: 'center',
  },
  resendContainer: {
    alignItems: 'center',
    marginTop: 14,
  },
  resendText: {
    color: COLORS.primary,
    fontSize: 13,
    fontWeight: '600',
  },
  signupContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 24,
  },
  signupText: {
    color: COLORS.textSecondary,
    fontSize: 14,
  },
  signupLink: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: '700',
  },
});
