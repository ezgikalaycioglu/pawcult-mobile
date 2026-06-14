import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import { useAuth } from '../context/AuthContext';
import { usePetProfiles } from '../context/PetProfilesContext';
import { RootStackParamList } from '../navigation/AppNavigator';
import { PetOwnerInvitePreview } from '../types/pets';

type Props = NativeStackScreenProps<RootStackParamList, 'Invite'>;

const getInviteErrorMessage = (error: unknown) => {
  const message = error instanceof Error ? error.message : '';

  if (message.includes('email_mismatch')) {
    return 'This invite was sent to another email. Please log in with that email.';
  }

  if (message.includes('invite_expired')) {
    return 'This invite has expired. Ask the owner to send a new one.';
  }

  if (message.includes('already_accepted')) {
    return 'This invite was already accepted.';
  }

  if (message.includes('invite_not_found')) {
    return 'This invite could not be found.';
  }

  return 'Could not accept invite. Please try again.';
};

const formatExpiry = (expiresAt: string) =>
  new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(expiresAt));

export const PetOwnerInviteScreen = ({ navigation, route }: Props) => {
  const { clearPendingInviteToken, storePendingInviteToken, user } = useAuth();
  const {
    acceptPetOwnerInvite,
    getPetOwnerInvitePreview,
  } = usePetProfiles();
  const token = route.params?.token ?? null;
  const [preview, setPreview] = useState<PetOwnerInvitePreview | null>(null);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      return;
    }

    if (!user) {
      void storePendingInviteToken(token);
    }
  }, [storePendingInviteToken, token, user]);

  useEffect(() => {
    let isMounted = true;

    const fetchPreview = async () => {
      if (!token) {
        setError('This invite link is invalid or incomplete.');
        setPreview(null);
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const nextPreview = await getPetOwnerInvitePreview(token);

        if (isMounted) {
          setPreview(nextPreview);
        }
      } catch (previewError) {
        if (isMounted) {
          setError(getInviteErrorMessage(previewError));
          setPreview(null);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    void fetchPreview();

    return () => {
      isMounted = false;
    };
  }, [getPetOwnerInvitePreview, token]);

  const handleAcceptInvite = async () => {
    if (!token) {
      setError('This invite link is invalid or incomplete.');
      return;
    }

    setAccepting(true);
    setError(null);

    try {
      await acceptPetOwnerInvite(token);
      await clearPendingInviteToken();
      Alert.alert('Invite accepted', 'The shared pet is now on your profile.');
      navigation.navigate('App');
    } catch (acceptError) {
      setError(getInviteErrorMessage(acceptError));
    } finally {
      setAccepting(false);
    }
  };

  const handleNotNow = async () => {
    if (user) {
      navigation.navigate('App');
      return;
    }

    navigation.navigate('Login');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.card}>
          <Text style={styles.title}>Pet owner invite</Text>

          {loading ? (
            <View style={styles.centered}>
              <ActivityIndicator color="#8b5cf6" size="large" />
              <Text style={styles.helperText}>Loading invite...</Text>
            </View>
          ) : error && !preview ? (
            <View style={styles.centered}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : preview ? (
            <>
              <Text style={styles.description}>
                {preview.inviterDisplayName ?? 'Another owner'} invited you to become
                an owner of {preview.petName}.
              </Text>
              <View style={styles.detailBox}>
                <Text style={styles.detailLabel}>Sent to</Text>
                <Text style={styles.detailValue}>{preview.invitedEmail}</Text>
                <Text style={styles.detailLabel}>Expires</Text>
                <Text style={styles.detailValue}>
                  {formatExpiry(preview.expiresAt)}
                </Text>
              </View>

              {error ? <Text style={styles.errorText}>{error}</Text> : null}

              {user ? (
                <View style={styles.actions}>
                  <Pressable
                    disabled={accepting || preview.status === 'accepted'}
                    onPress={handleAcceptInvite}
                    style={({ pressed }) => [
                      styles.primaryButton,
                      accepting || preview.status === 'accepted'
                        ? styles.buttonDisabled
                        : null,
                      pressed && !accepting ? styles.buttonPressed : null,
                    ]}
                  >
                    {accepting ? (
                      <ActivityIndicator color="#ffffff" />
                    ) : (
                      <Text style={styles.primaryButtonText}>
                        {preview.status === 'accepted'
                          ? 'Already accepted'
                          : 'Accept invite'}
                      </Text>
                    )}
                  </Pressable>
                  <Pressable
                    disabled={accepting}
                    onPress={handleNotNow}
                    style={({ pressed }) => [
                      styles.secondaryButton,
                      pressed ? styles.buttonPressed : null,
                    ]}
                  >
                    <Text style={styles.secondaryButtonText}>Not now</Text>
                  </Pressable>
                </View>
              ) : (
                <View style={styles.actions}>
                  <Text style={styles.helperText}>
                    Log in or create an account with {preview.invitedEmail} to accept.
                  </Text>
                  <Pressable
                    onPress={() => navigation.navigate('Signup')}
                    style={({ pressed }) => [
                      styles.primaryButton,
                      pressed ? styles.buttonPressed : null,
                    ]}
                  >
                    <Text style={styles.primaryButtonText}>Sign up</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => navigation.navigate('Login')}
                    style={({ pressed }) => [
                      styles.secondaryButton,
                      pressed ? styles.buttonPressed : null,
                    ]}
                  >
                    <Text style={styles.secondaryButtonText}>Log in</Text>
                  </Pressable>
                </View>
              )}
            </>
          ) : null}
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: '#f8fafc',
    flex: 1,
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  card: {
    backgroundColor: '#ffffff',
    borderColor: '#e2e8f0',
    borderRadius: 20,
    borderWidth: 1,
    gap: 16,
    padding: 22,
  },
  title: {
    color: '#0f172a',
    fontSize: 26,
    fontWeight: '700',
    textAlign: 'center',
  },
  centered: {
    alignItems: 'center',
    gap: 12,
    paddingVertical: 18,
  },
  description: {
    color: '#334155',
    fontSize: 17,
    lineHeight: 25,
    textAlign: 'center',
  },
  detailBox: {
    backgroundColor: '#f8fafc',
    borderColor: '#e2e8f0',
    borderRadius: 14,
    borderWidth: 1,
    gap: 5,
    padding: 14,
  },
  detailLabel: {
    color: '#64748b',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  detailValue: {
    color: '#0f172a',
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 8,
  },
  actions: {
    gap: 10,
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: '#8b5cf6',
    borderRadius: 14,
    justifyContent: 'center',
    minHeight: 52,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  secondaryButton: {
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderColor: '#e2e8f0',
    borderRadius: 14,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 52,
  },
  secondaryButtonText: {
    color: '#475569',
    fontSize: 16,
    fontWeight: '700',
  },
  buttonPressed: {
    opacity: 0.88,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  helperText: {
    color: '#64748b',
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  errorText: {
    color: '#dc2626',
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
});
