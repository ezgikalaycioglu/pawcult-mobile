import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { useAuth } from '../context/AuthContext';

export const HomeScreen = () => {
  const { signOut, user } = useAuth();
  const [signingOut, setSigningOut] = useState(false);

  const handleSignOut = async () => {
    setSigningOut(true);

    try {
      await signOut();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unable to sign out right now.';

      Alert.alert('Sign out failed', message);
    } finally {
      setSigningOut(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Home</Text>
      <Text style={styles.subtitle}>You are signed in.</Text>
      <Text style={styles.email}>{user?.email ?? 'No email available'}</Text>

      <Pressable
        disabled={signingOut}
        onPress={handleSignOut}
        style={({ pressed }) => [
          styles.button,
          pressed && !signingOut ? styles.buttonPressed : null,
          signingOut ? styles.buttonDisabled : null,
        ]}
      >
        {signingOut ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Sign Out</Text>
        )}
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 30,
    fontWeight: '700',
    color: '#0f172a',
  },
  subtitle: {
    marginTop: 8,
    fontSize: 16,
    color: '#475569',
  },
  email: {
    marginTop: 12,
    fontSize: 16,
    fontWeight: '500',
    color: '#1e293b',
  },
  button: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 180,
    minHeight: 52,
    marginTop: 32,
    borderRadius: 12,
    backgroundColor: '#dc2626',
    paddingHorizontal: 24,
  },
  buttonPressed: {
    opacity: 0.9,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});
