import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { usePetProfiles } from '../context/PetProfilesContext';
import { RootStackParamList } from '../navigation/AppNavigator';
import { MobilePetProfile, PetOwnerInvite } from '../types/pets';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export const ProfileScreen = () => {
  const { createPetOwnerInvite, pets, loading, error } = usePetProfiles();
  const navigation = useNavigation<NavigationProp>();
  const [invitePet, setInvitePet] = useState<MobilePetProfile | null>(null);
  const [inviteEmail, setInviteEmail] = useState('');
  const [invite, setInvite] = useState<PetOwnerInvite | null>(null);
  const [creatingInvite, setCreatingInvite] = useState(false);

  const inviteLink = invite
    ? `https://pawcult.app/invite/${invite.token}`
    : null;

  const petSummary = useMemo(() => {
    if (loading) {
      return 'Loading pets...';
    }

    if (pets.length === 0) {
      return 'No pets added yet';
    }

    return `${pets.length} ${pets.length === 1 ? 'pet' : 'pets'} on your profile`;
  }, [loading, pets.length]);

  const resetInviteModal = () => {
    setInvitePet(null);
    setInviteEmail('');
    setInvite(null);
    setCreatingInvite(false);
  };

  const handleCreateInvite = async () => {
    if (!invitePet) {
      return;
    }

    const normalizedEmail = inviteEmail.trim().toLowerCase();
    const emailIsValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail);

    if (!emailIsValid) {
      Alert.alert('Invalid email', 'Enter a valid email address.');
      return;
    }

    setCreatingInvite(true);

    try {
      const createdInvite = await createPetOwnerInvite(invitePet.id, normalizedEmail);
      setInvite(createdInvite);
    } catch (inviteError) {
      const message =
        inviteError instanceof Error
          ? inviteError.message
          : 'Unable to create this invite right now.';

      Alert.alert('Invite failed', message);
    } finally {
      setCreatingInvite(false);
    }
  };

  const handleShareInvite = async () => {
    if (!inviteLink || !invite) {
      return;
    }

    await Share.share({
      message: `You have been invited to share ${invitePet?.name ?? 'a pet'} on PawCult: ${inviteLink}`,
      url: inviteLink,
      title: 'PawCult pet owner invite',
    });
  };

  return (
    <ScrollView contentContainerStyle={styles.content} style={styles.screen}>
      <View style={styles.heroCard}>
        <View style={styles.heroBadge}>
          <Text style={styles.heroBadgeIcon}>◉</Text>
        </View>
        <Text style={styles.title}>Profile</Text>
        <Text style={styles.subtitle}>Build your pet family on PawCult.</Text>

        <View style={styles.countPill}>
          <Text style={styles.countPillText}>{petSummary}</Text>
        </View>
      </View>

      {loading ? (
        <View style={styles.loadingCard}>
          <ActivityIndicator color="#8b5cf6" size="large" />
          <Text style={styles.loadingText}>Loading your pets...</Text>
        </View>
      ) : error ? (
        <View style={styles.emptyCard}>
          <View style={styles.emptyBadge}>
            <Text style={styles.emptyBadgeIcon}>!</Text>
          </View>
          <Text style={styles.emptyTitle}>Could not load pets</Text>
          <Text style={styles.emptyDescription}>{error}</Text>
        </View>
      ) : pets.length === 0 ? (
        <View style={styles.emptyCard}>
          <View style={styles.emptyBadge}>
            <Text style={styles.emptyBadgeIcon}>🐾</Text>
          </View>
          <Text style={styles.emptyTitle}>No pets yet</Text>
          <Text style={styles.emptyDescription}>
            Add your first pet profile to start shaping your mobile profile experience.
          </Text>
        </View>
      ) : (
        <View style={styles.petList}>
          {pets.map((pet) => (
            <View key={pet.id} style={styles.petCard}>
              {pet.profilePhotoUri ? (
                <Image source={{ uri: pet.profilePhotoUri }} style={styles.petImage} />
              ) : (
                <View style={styles.petImagePlaceholder}>
                  <Text style={styles.petImagePlaceholderIcon}>🐾</Text>
                </View>
              )}
              <View style={styles.petBody}>
                <View style={styles.petHeader}>
                  <View style={styles.petNameRow}>
                    <Text style={styles.petName}>{pet.name}</Text>
                    {pet.isShared ? (
                      <View style={styles.sharedBadge}>
                        <Text style={styles.sharedBadgeText}>Shared</Text>
                      </View>
                    ) : null}
                  </View>
                  <Text style={styles.petBreed}>{pet.breed}</Text>
                </View>
                {pet.bio ? (
                  <Text numberOfLines={3} style={styles.petBio}>
                    {pet.bio}
                  </Text>
                ) : (
                  <Text style={styles.petBioPlaceholder}>
                    No bio yet. You can flesh this out more when the full profile backend is ready.
                  </Text>
                )}
                <Pressable
                  onPress={() => setInvitePet(pet)}
                  style={({ pressed }) => [
                    styles.inviteOwnerButton,
                    pressed ? styles.addPetButtonPressed : null,
                  ]}
                >
                  <Text style={styles.inviteOwnerButtonText}>
                    Invite another owner
                  </Text>
                </Pressable>
              </View>
            </View>
          ))}
        </View>
      )}

      <Pressable
        onPress={() => navigation.navigate('CreatePet')}
        style={({ pressed }) => [styles.addPetButton, pressed ? styles.addPetButtonPressed : null]}
      >
        <Text style={styles.addPetButtonIcon}>＋</Text>
        <Text style={styles.addPetButtonText}>Add Pet</Text>
      </Pressable>

      <Modal
        animationType="slide"
        onRequestClose={resetInviteModal}
        transparent
        visible={invitePet !== null}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            {invite ? (
              <>
                <Text style={styles.modalTitle}>Invite created</Text>
                <Text style={styles.modalDescription}>
                  Invite created for {invite.invitedEmail}
                </Text>
                <View style={styles.inviteLinkBox}>
                  <Text selectable style={styles.inviteLinkText}>
                    {inviteLink}
                  </Text>
                </View>
                <View style={styles.modalActions}>
                  <Pressable
                    onPress={resetInviteModal}
                    style={({ pressed }) => [
                      styles.modalCancelButton,
                      pressed ? styles.addPetButtonPressed : null,
                    ]}
                  >
                    <Text style={styles.modalCancelButtonText}>Done</Text>
                  </Pressable>
                  <Pressable
                    onPress={handleShareInvite}
                    style={({ pressed }) => [
                      styles.modalSubmitButton,
                      pressed ? styles.addPetButtonPressed : null,
                    ]}
                  >
                    <Text style={styles.modalSubmitButtonText}>Share invite</Text>
                  </Pressable>
                </View>
              </>
            ) : (
              <>
                <Text style={styles.modalTitle}>Invite another owner</Text>
                <Text style={styles.modalDescription}>
                  Send an owner invite for {invitePet?.name ?? 'this pet'}.
                </Text>
                <TextInput
                  autoCapitalize="none"
                  autoComplete="email"
                  editable={!creatingInvite}
                  keyboardType="email-address"
                  onChangeText={setInviteEmail}
                  placeholder="Email address"
                  placeholderTextColor="#94a3b8"
                  style={styles.input}
                  value={inviteEmail}
                />
                <View style={styles.modalActions}>
                  <Pressable
                    disabled={creatingInvite}
                    onPress={resetInviteModal}
                    style={({ pressed }) => [
                      styles.modalCancelButton,
                      pressed && !creatingInvite ? styles.addPetButtonPressed : null,
                    ]}
                  >
                    <Text style={styles.modalCancelButtonText}>Cancel</Text>
                  </Pressable>
                  <Pressable
                    disabled={creatingInvite}
                    onPress={handleCreateInvite}
                    style={({ pressed }) => [
                      styles.modalSubmitButton,
                      creatingInvite ? styles.buttonDisabled : null,
                      pressed && !creatingInvite ? styles.addPetButtonPressed : null,
                    ]}
                  >
                    {creatingInvite ? (
                      <ActivityIndicator color="#ffffff" />
                    ) : (
                      <Text style={styles.modalSubmitButtonText}>Create invite</Text>
                    )}
                  </Pressable>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  screen: {
    backgroundColor: '#f8fafc',
    flex: 1,
  },
  content: {
    gap: 16,
    padding: 20,
    paddingBottom: 24,
  },
  heroCard: {
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderColor: '#e2e8f0',
    borderRadius: 28,
    borderWidth: 1,
    padding: 24,
  },
  heroBadge: {
    alignItems: 'center',
    backgroundColor: '#ede9fe',
    borderRadius: 40,
    height: 80,
    justifyContent: 'center',
    width: 80,
  },
  heroBadgeIcon: {
    color: '#8b5cf6',
    fontSize: 40,
    fontWeight: '700',
  },
  title: {
    color: '#0f172a',
    fontSize: 30,
    fontWeight: '700',
    marginTop: 16,
  },
  subtitle: {
    color: '#475569',
    fontSize: 16,
    marginTop: 8,
    textAlign: 'center',
  },
  countPill: {
    backgroundColor: '#f5f3ff',
    borderRadius: 999,
    marginTop: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  countPillText: {
    color: '#6d28d9',
    fontSize: 13,
    fontWeight: '600',
  },
  loadingCard: {
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderColor: '#e2e8f0',
    borderRadius: 28,
    borderWidth: 1,
    padding: 28,
  },
  loadingText: {
    color: '#64748b',
    fontSize: 15,
    lineHeight: 22,
    marginTop: 12,
    textAlign: 'center',
  },
  emptyCard: {
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderColor: '#e2e8f0',
    borderRadius: 28,
    borderStyle: 'dashed',
    borderWidth: 1,
    padding: 28,
  },
  emptyBadge: {
    alignItems: 'center',
    backgroundColor: '#faf5ff',
    borderRadius: 36,
    height: 72,
    justifyContent: 'center',
    width: 72,
  },
  emptyBadgeIcon: {
    fontSize: 28,
  },
  emptyTitle: {
    color: '#0f172a',
    fontSize: 22,
    fontWeight: '700',
    marginTop: 16,
  },
  emptyDescription: {
    color: '#64748b',
    fontSize: 15,
    lineHeight: 22,
    marginTop: 8,
    textAlign: 'center',
  },
  petList: {
    gap: 14,
  },
  petCard: {
    backgroundColor: '#ffffff',
    borderColor: '#e2e8f0',
    borderRadius: 24,
    borderWidth: 1,
    overflow: 'hidden',
  },
  petImage: {
    height: 220,
    width: '100%',
  },
  petImagePlaceholder: {
    alignItems: 'center',
    backgroundColor: '#ede9fe',
    height: 220,
    justifyContent: 'center',
  },
  petImagePlaceholderIcon: {
    fontSize: 44,
  },
  petBody: {
    padding: 18,
  },
  petHeader: {
    gap: 4,
  },
  petNameRow: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  petName: {
    color: '#0f172a',
    flexShrink: 1,
    fontSize: 20,
    fontWeight: '700',
  },
  sharedBadge: {
    backgroundColor: '#ecfdf5',
    borderColor: '#bbf7d0',
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  sharedBadgeText: {
    color: '#047857',
    fontSize: 11,
    fontWeight: '700',
  },
  petBreed: {
    color: '#6d28d9',
    fontSize: 14,
    fontWeight: '600',
  },
  petBio: {
    color: '#475569',
    fontSize: 15,
    lineHeight: 22,
    marginTop: 12,
  },
  petBioPlaceholder: {
    color: '#94a3b8',
    fontSize: 14,
    fontStyle: 'italic',
    lineHeight: 20,
    marginTop: 12,
  },
  inviteOwnerButton: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#f8fafc',
    borderColor: '#cbd5e1',
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 14,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  inviteOwnerButtonText: {
    color: '#334155',
    fontSize: 13,
    fontWeight: '700',
  },
  addPetButton: {
    alignItems: 'center',
    backgroundColor: '#8b5cf6',
    borderRadius: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    minHeight: 54,
    paddingHorizontal: 20,
    width: '100%',
  },
  addPetButtonPressed: {
    opacity: 0.9,
  },
  addPetButtonIcon: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '700',
    marginRight: 8,
  },
  addPetButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  modalBackdrop: {
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.42)',
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    gap: 14,
    padding: 20,
    width: '100%',
  },
  modalTitle: {
    color: '#0f172a',
    fontSize: 22,
    fontWeight: '700',
  },
  modalDescription: {
    color: '#64748b',
    fontSize: 15,
    lineHeight: 22,
  },
  input: {
    backgroundColor: '#ffffff',
    borderColor: '#e2e8f0',
    borderRadius: 14,
    borderWidth: 1,
    color: '#0f172a',
    fontSize: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  inviteLinkBox: {
    backgroundColor: '#f8fafc',
    borderColor: '#e2e8f0',
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
  },
  inviteLinkText: {
    color: '#334155',
    fontSize: 13,
    lineHeight: 19,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'flex-end',
  },
  modalCancelButton: {
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderColor: '#e2e8f0',
    borderRadius: 14,
    borderWidth: 1,
    flex: 1,
    justifyContent: 'center',
    minHeight: 48,
  },
  modalCancelButtonText: {
    color: '#475569',
    fontSize: 15,
    fontWeight: '700',
  },
  modalSubmitButton: {
    alignItems: 'center',
    backgroundColor: '#8b5cf6',
    borderRadius: 14,
    flex: 1,
    justifyContent: 'center',
    minHeight: 48,
  },
  modalSubmitButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});
