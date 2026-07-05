import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import { KeyboardSafeScreen } from '../components/KeyboardSafeScreen';
import { LegalDocumentModal } from '../components/LegalDocumentModal';
import { useAuth } from '../context/AuthContext';
import { LegalDocumentType } from '../legal/legalText';
import { RootStackParamList } from '../navigation/AppNavigator';
import { authScreenStyles as styles } from '../styles/authScreenStyles';

type Props = NativeStackScreenProps<RootStackParamList, 'Signup'>;

export const SignupScreen = ({ navigation }: Props) => {
  const { signUp } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [legalDocument, setLegalDocument] = useState<LegalDocumentType | null>(
    null
  );

  const handleSignup = async () => {
    if (!email.trim() || !password) {
      Alert.alert('Missing information', 'Please enter your email and password.');
      return;
    }

    setSubmitting(true);

    try {
      await signUp(email.trim(), password);
      Alert.alert(
        'Account created',
        'Your account was created. If email confirmation is enabled, check your inbox before logging in.'
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unable to sign up right now.';

      Alert.alert('Signup failed', message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <KeyboardSafeScreen
        contentStyle={styles.keyboardContainer}
        style={styles.safeArea}
      >
        <View style={styles.brand}>
          <Text style={styles.brandIcon}>🐾</Text>
          <Text style={styles.brandTitle}>PawCult</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>Join our pet-loving community today</Text>

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
            <TextInput
              autoCapitalize="none"
              onChangeText={setPassword}
              placeholder="Password"
              placeholderTextColor="#94a3b8"
              secureTextEntry
              style={styles.input}
              value={password}
            />

            <Pressable
              disabled={submitting}
              onPress={handleSignup}
              style={({ pressed }) => [
                styles.primaryButton,
                pressed && !submitting ? styles.primaryButtonPressed : null,
                submitting ? styles.buttonDisabled : null,
              ]}
            >
              {submitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.primaryButtonText}>Create Account</Text>
              )}
            </Pressable>

            <Pressable
              disabled={submitting}
              onPress={() => navigation.navigate('Login')}
              style={styles.secondaryButton}
            >
              <Text style={styles.secondaryButtonText}>
                Already have an account? <Text style={styles.secondaryButtonLink}>Sign In</Text>
              </Text>
            </Pressable>
            <Text style={styles.helperText}>
              By creating an account, you agree to the{' '}
              <Text
                onPress={() => setLegalDocument('terms')}
                style={styles.secondaryButtonLink}
              >
                Terms
              </Text>{' '}
              and acknowledge the{' '}
              <Text
                onPress={() => setLegalDocument('privacy')}
                style={styles.secondaryButtonLink}
              >
                Privacy Policy
              </Text>
              .
            </Text>
          </View>
        </View>
      </KeyboardSafeScreen>
      <LegalDocumentModal
        documentType={legalDocument}
        onClose={() => setLegalDocument(null)}
      />
    </>
  );
};
