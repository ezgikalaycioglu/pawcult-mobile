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
import { useAuth } from '../context/AuthContext';
import { RootStackParamList } from '../navigation/AppNavigator';
import { authScreenStyles as styles } from '../styles/authScreenStyles';

type Props = NativeStackScreenProps<RootStackParamList, 'Login'>;

export const LoginScreen = ({ navigation }: Props) => {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      Alert.alert('Missing information', 'Please enter your email and password.');
      return;
    }

    setSubmitting(true);

    try {
      await signIn(email.trim(), password);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unable to sign in right now.';

      Alert.alert('Login failed', message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KeyboardSafeScreen
      contentStyle={styles.keyboardContainer}
      style={styles.safeArea}
    >
      <View style={styles.brand}>
        <Text style={styles.brandIcon}>🐾</Text>
        <Text style={styles.brandTitle}>PawCult</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.title}>Sign In</Text>
        <Text style={styles.subtitle}>Welcome back to PawCult</Text>

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
            onPress={handleLogin}
            style={({ pressed }) => [
              styles.primaryButton,
              pressed && !submitting ? styles.primaryButtonPressed : null,
              submitting ? styles.buttonDisabled : null,
            ]}
          >
            {submitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.primaryButtonText}>Sign In</Text>
            )}
          </Pressable>

          <Pressable
            disabled={submitting}
            onPress={() => navigation.navigate('ForgotPassword')}
            style={styles.secondaryButton}
          >
            <Text style={styles.secondaryButtonText}>
              Forgot your password?{' '}
              <Text style={styles.secondaryButtonLink}>Reset it</Text>
            </Text>
          </Pressable>

          <View style={styles.divider} />

          <Pressable
            disabled={submitting}
            onPress={() => navigation.navigate('Signup')}
            style={styles.secondaryButton}
          >
            <Text style={styles.secondaryButtonText}>
              Don&apos;t have an account? <Text style={styles.secondaryButtonLink}>Sign Up</Text>
            </Text>
          </Pressable>
        </View>
      </View>
    </KeyboardSafeScreen>
  );
};
