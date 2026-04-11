import { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  SafeAreaView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import { supabase } from '../lib/supabase';
import { RootStackParamList } from '../navigation/AppNavigator';
import { authScreenStyles as styles } from '../styles/authScreenStyles';

type Props = NativeStackScreenProps<RootStackParamList, 'ForgotPassword'>;

export const ForgotPasswordScreen = ({ navigation }: Props) => {
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleSendResetEmail = async () => {
    if (!email.trim()) {
      setErrorMessage('Please enter the email address for your account.');
      return;
    }

    setSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: 'pawcult://reset-password',
      });

      if (error) {
        throw error;
      }

      setSuccessMessage(
        'If that email exists in PawCult, we sent a password reset link.'
      );
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Unable to send the password reset email right now.';

      setErrorMessage(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.brand}>
          <Text style={styles.brandIcon}>🐾</Text>
          <Text style={styles.brandTitle}>PawCult</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.title}>Forgot Password</Text>
          <Text style={styles.subtitle}>
            Enter your email and we&apos;ll send you a reset link.
          </Text>

          <View style={styles.form}>
            <TextInput
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              onChangeText={setEmail}
              placeholder="Email address"
              placeholderTextColor="#94a3b8"
              style={styles.input}
              value={email}
            />

            {errorMessage ? (
              <Text style={styles.errorText}>{errorMessage}</Text>
            ) : null}

            {successMessage ? (
              <Text style={styles.successText}>{successMessage}</Text>
            ) : null}

            <Pressable
              disabled={submitting}
              onPress={handleSendResetEmail}
              style={({ pressed }) => [
                styles.primaryButton,
                pressed && !submitting ? styles.primaryButtonPressed : null,
                submitting ? styles.buttonDisabled : null,
              ]}
            >
              {submitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.primaryButtonText}>Send Reset Email</Text>
              )}
            </Pressable>

            <Pressable
              disabled={submitting}
              onPress={() => navigation.navigate('Login')}
              style={styles.secondaryButton}
            >
              <Text style={styles.secondaryButtonText}>
                Remembered it?{' '}
                <Text style={styles.secondaryButtonLink}>Back to sign in</Text>
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
};
