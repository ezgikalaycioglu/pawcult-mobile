import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  SafeAreaView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { RootStackParamList } from '../navigation/AppNavigator';
import { authScreenStyles as styles } from '../styles/authScreenStyles';

type Props = NativeStackScreenProps<RootStackParamList, 'ResetPassword'>;

export const ResetPasswordScreen = ({ navigation }: Props) => {
  const {
    clearRecoveryError,
    recoveryError,
    recoveryLoading,
    session,
  } = useAuth();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const sessionReady = useMemo(() => Boolean(session), [session]);

  const handleUpdatePassword = async () => {
    clearRecoveryError();

    if (!password || !confirmPassword) {
      setFormError('Please enter and confirm your new password.');
      return;
    }

    if (password !== confirmPassword) {
      setFormError('Your password confirmation does not match.');
      return;
    }

    if (!sessionReady) {
      setFormError('Open the latest reset link from your email to continue.');
      return;
    }

    setSubmitting(true);
    setFormError(null);

    try {
      const { error } = await supabase.auth.updateUser({
        password,
      });

      if (error) {
        throw error;
      }

      Alert.alert('Password updated', 'Your password has been updated.', [
        {
          text: 'OK',
          onPress: () => navigation.navigate('Home'),
        },
      ]);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Unable to update your password right now.';

      setFormError(message);
    } finally {
      setSubmitting(false);
    }
  };

  const helperMessage = recoveryLoading
    ? 'Validating your reset link...'
    : sessionReady
      ? 'Choose a new password for your account.'
      : 'Open PawCult from the password reset link in your email to continue.';

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.brand}>
          <Text style={styles.brandIcon}>🐾</Text>
          <Text style={styles.brandTitle}>PawCult</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.title}>Reset Password</Text>
          <Text style={styles.subtitle}>Create a new secure password</Text>

          <View style={styles.form}>
            <Text style={styles.helperText}>{helperMessage}</Text>

            {recoveryLoading ? (
              <ActivityIndicator color="#8b5cf6" />
            ) : null}

            <TextInput
              autoCapitalize="none"
              onChangeText={setPassword}
              placeholder="New password"
              placeholderTextColor="#94a3b8"
              secureTextEntry
              style={styles.input}
              value={password}
            />
            <TextInput
              autoCapitalize="none"
              onChangeText={setConfirmPassword}
              placeholder="Confirm new password"
              placeholderTextColor="#94a3b8"
              secureTextEntry
              style={styles.input}
              value={confirmPassword}
            />

            {recoveryError ? (
              <Text style={styles.errorText}>{recoveryError}</Text>
            ) : null}

            {formError ? <Text style={styles.errorText}>{formError}</Text> : null}

            <Pressable
              disabled={submitting || recoveryLoading}
              onPress={handleUpdatePassword}
              style={({ pressed }) => [
                styles.primaryButton,
                pressed && !submitting ? styles.primaryButtonPressed : null,
                submitting || recoveryLoading ? styles.buttonDisabled : null,
              ]}
            >
              {submitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.primaryButtonText}>Update Password</Text>
              )}
            </Pressable>

            <Pressable
              disabled={submitting}
              onPress={() => navigation.navigate(sessionReady ? 'Home' : 'Login')}
              style={styles.secondaryButton}
            >
              <Text style={styles.secondaryButtonText}>
                {sessionReady ? 'Back to home' : 'Back to sign in'}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
};
