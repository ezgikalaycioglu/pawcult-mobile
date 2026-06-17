import { useEffect, useMemo, useState } from 'react';
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
import { MobilePetProfile, PetOwnerInvite, PetOwnerSummary } from '../types/pets';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const formatDate = (date: string | null) => {
  if (!date) {
    return 'Not recorded';
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
  }).format(new Date(date));
};

export const ProfileScreen = () => {
  const {
    createPetOwnerInvite,
    getPetOwners,
    pets,
    loading,
    error,
    updatePet,
  } = usePetProfiles();
  const navigation = useNavigation<NavigationProp>();
  const [selectedPet, setSelectedPet] = useState<MobilePetProfile | null>(null);
  const [petParents, setPetParents] = useState<PetOwnerSummary[]>([]);
  const [parentsLoading, setParentsLoading] = useState(false);
  const [parentsError, setParentsError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editBreed, setEditBreed] = useState('');
  const [editBio, setEditBio] = useState('');
  const [savingPet, setSavingPet] = useState(false);
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

  useEffect(() => {
    let isMounted = true;

    const fetchParents = async () => {
      if (!selectedPet) {
        setPetParents([]);
        setParentsError(null);
        return;
      }

      setParentsLoading(true);
      setParentsError(null);

      try {
        const owners = await getPetOwners(selectedPet.id);

        if (isMounted) {
          setPetParents(owners);
        }
      } catch (ownerError) {
        const message =
          ownerError instanceof Error
            ? ownerError.message
            : 'Unable to load pet parents right now.';

        if (isMounted) {
          setParentsError(message);
          setPetParents([]);
        }
      } finally {
        if (isMounted) {
          setParentsLoading(false);
        }
      }
    };

    void fetchParents();

    return () => {
      isMounted = false;
    };
  }, [getPetOwners, selectedPet]);

  const openPetDetail = (pet: MobilePetProfile) => {
    setSelectedPet(pet);
    setEditName(pet.name);
    setEditBreed(pet.breed);
    setEditBio(pet.bio ?? '');
    setEditing(false);
    setInviteEmail('');
    setInvite(null);
  };

  const closePetDetail = () => {
    setSelectedPet(null);
    setPetParents([]);
    setParentsError(null);
    setEditing(false);
    setSavingPet(false);
    setInviteEmail('');
    setInvite(null);
    setCreatingInvite(false);
  };

  const cancelEditing = () => {
    if (!selectedPet) {
      return;
    }

    setEditName(selectedPet.name);
    setEditBreed(selectedPet.breed);
    setEditBio(selectedPet.bio ?? '');
    setEditing(false);
  };

  const handleSavePet = async () => {
    if (!selectedPet) {
      return;
    }

    const name = editName.trim();
    const breed = editBreed.trim();

    if (!name || !breed) {
      Alert.alert('Missing details', 'Name and breed are required.');
      return;
    }

    setSavingPet(true);

    try {
      const updatedPet = await updatePet(selectedPet.id, {
        bio: editBio,
        breed,
        name,
      });
      setSelectedPet(updatedPet);
      setEditing(false);
    } catch (saveError) {
      const message =
        saveError instanceof Error
          ? saveError.message
          : 'Unable to update this pet right now.';

      Alert.alert('Update failed', message);
    } finally {
      setSavingPet(false);
    }
  };

  const handleCreateInvite = async () => {
    if (!selectedPet) {
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
      const createdInvite = await createPetOwnerInvite(selectedPet.id, normalizedEmail);
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
      message: `You have been invited to share ${selectedPet?.name ?? 'a pet'} on PawCult: ${inviteLink}`,
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
            <Pressable
              key={pet.id}
              onPress={() => openPetDetail(pet)}
              style={({ pressed }) => [
                styles.petCard,
                pressed ? styles.cardPressed : null,
              ]}
            >
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
                  <Text style={styles.petBioPlaceholder}>No bio yet.</Text>
                )}
              </View>
            </Pressable>
          ))}
        </View>
      )}

      <Pressable
        onPress={() => navigation.navigate('CreatePet')}
        style={({ pressed }) => [styles.addPetButton, pressed ? styles.buttonPressed : null]}
      >
        <Text style={styles.addPetButtonIcon}>＋</Text>
        <Text style={styles.addPetButtonText}>Add Pet</Text>
      </Pressable>

      <Modal
        animationType="slide"
        onRequestClose={closePetDetail}
        transparent
        visible={selectedPet !== null}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.detailSheet}>
            <ScrollView contentContainerStyle={styles.detailContent}>
              {selectedPet ? (
                <>
                  {selectedPet.profilePhotoUri ? (
                    <Image
                      source={{ uri: selectedPet.profilePhotoUri }}
                      style={styles.detailImage}
                    />
                  ) : (
                    <View style={styles.detailImagePlaceholder}>
                      <Text style={styles.detailImagePlaceholderIcon}>🐾</Text>
                    </View>
                  )}

                  <View style={styles.detailHeader}>
                    <View style={styles.detailTitleBlock}>
                      <Text style={styles.detailTitle}>{selectedPet.name}</Text>
                      <Text style={styles.detailSubtitle}>{selectedPet.breed}</Text>
                    </View>
                    {selectedPet.isShared ? (
                      <View style={styles.sharedBadge}>
                        <Text style={styles.sharedBadgeText}>Shared</Text>
                      </View>
                    ) : null}
                  </View>

                  <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                      <Text style={styles.sectionTitle}>Pet details</Text>
                      {editing ? null : (
                        <Pressable
                          onPress={() => setEditing(true)}
                          style={({ pressed }) => [
                            styles.smallButton,
                            pressed ? styles.buttonPressed : null,
                          ]}
                        >
                          <Text style={styles.smallButtonText}>Edit</Text>
                        </Pressable>
                      )}
                    </View>

                    {editing ? (
                      <View style={styles.form}>
                        <TextInput
                          autoCapitalize="words"
                          editable={!savingPet}
                          onChangeText={setEditName}
                          placeholder="Name"
                          placeholderTextColor="#94a3b8"
                          style={styles.input}
                          value={editName}
                        />
                        <TextInput
                          autoCapitalize="words"
                          editable={!savingPet}
                          onChangeText={setEditBreed}
                          placeholder="Breed"
                          placeholderTextColor="#94a3b8"
                          style={styles.input}
                          value={editBreed}
                        />
                        <TextInput
                          editable={!savingPet}
                          multiline
                          onChangeText={setEditBio}
                          placeholder="Bio"
                          placeholderTextColor="#94a3b8"
                          style={[styles.input, styles.bioInput]}
                          textAlignVertical="top"
                          value={editBio}
                        />
                        <View style={styles.rowActions}>
                          <Pressable
                            disabled={savingPet}
                            onPress={cancelEditing}
                            style={({ pressed }) => [
                              styles.secondaryButton,
                              pressed && !savingPet ? styles.buttonPressed : null,
                            ]}
                          >
                            <Text style={styles.secondaryButtonText}>Cancel</Text>
                          </Pressable>
                          <Pressable
                            disabled={savingPet}
                            onPress={handleSavePet}
                            style={({ pressed }) => [
                              styles.primaryButton,
                              savingPet ? styles.buttonDisabled : null,
                              pressed && !savingPet ? styles.buttonPressed : null,
                            ]}
                          >
                            {savingPet ? (
                              <ActivityIndicator color="#ffffff" />
                            ) : (
                              <Text style={styles.primaryButtonText}>Save</Text>
                            )}
                          </Pressable>
                        </View>
                      </View>
                    ) : (
                      <View style={styles.detailsGrid}>
                        <View style={styles.detailField}>
                          <Text style={styles.detailLabel}>Name</Text>
                          <Text style={styles.detailValue}>{selectedPet.name}</Text>
                        </View>
                        <View style={styles.detailField}>
                          <Text style={styles.detailLabel}>Breed</Text>
                          <Text style={styles.detailValue}>{selectedPet.breed}</Text>
                        </View>
                        <View style={styles.detailField}>
                          <Text style={styles.detailLabel}>Bio</Text>
                          <Text style={styles.detailValue}>
                            {selectedPet.bio ?? 'No bio yet.'}
                          </Text>
                        </View>
                        <View style={styles.detailField}>
                          <Text style={styles.detailLabel}>Created</Text>
                          <Text style={styles.detailValue}>
                            {formatDate(selectedPet.createdAt)}
                          </Text>
                        </View>
                        <View style={styles.detailField}>
                          <Text style={styles.detailLabel}>Pet parents</Text>
                          <Text style={styles.detailValue}>
                            {selectedPet.activeOwnerCount}
                          </Text>
                        </View>
                      </View>
                    )}
                  </View>

                  <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Pet parents</Text>
                    {parentsLoading ? (
                      <View style={styles.inlineLoading}>
                        <ActivityIndicator color="#8b5cf6" />
                        <Text style={styles.helperText}>Loading parents...</Text>
                      </View>
                    ) : parentsError ? (
                      <Text style={styles.errorText}>{parentsError}</Text>
                    ) : (
                      <View style={styles.parentList}>
                        {petParents.map((parent) => (
                          <View key={parent.id} style={styles.parentRow}>
                            <View style={styles.parentAvatar}>
                              <Text style={styles.parentAvatarText}>
                                {parent.displayName.slice(0, 1).toUpperCase()}
                              </Text>
                            </View>
                            <View style={styles.parentBody}>
                              <View style={styles.parentNameRow}>
                                <Text style={styles.parentName}>
                                  {parent.displayName}
                                </Text>
                                {parent.isCurrentUser ? (
                                  <View style={styles.youBadge}>
                                    <Text style={styles.youBadgeText}>You</Text>
                                  </View>
                                ) : null}
                              </View>
                              <Text style={styles.parentMeta}>
                                {parent.email ?? 'No email'} · {parent.role}
                              </Text>
                              <Text style={styles.parentMeta}>
                                Joined {formatDate(parent.acceptedAt)}
                              </Text>
                            </View>
                          </View>
                        ))}
                      </View>
                    )}
                  </View>

                  <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Invite another owner</Text>
                    {invite ? (
                      <View style={styles.form}>
                        <Text style={styles.helperText}>
                          Invite created for {invite.invitedEmail}
                        </Text>
                        <View style={styles.inviteLinkBox}>
                          <Text selectable style={styles.inviteLinkText}>
                            {inviteLink}
                          </Text>
                        </View>
                        <View style={styles.rowActions}>
                          <Pressable
                            onPress={() => {
                              setInvite(null);
                              setInviteEmail('');
                            }}
                            style={({ pressed }) => [
                              styles.secondaryButton,
                              pressed ? styles.buttonPressed : null,
                            ]}
                          >
                            <Text style={styles.secondaryButtonText}>New invite</Text>
                          </Pressable>
                          <Pressable
                            onPress={handleShareInvite}
                            style={({ pressed }) => [
                              styles.primaryButton,
                              pressed ? styles.buttonPressed : null,
                            ]}
                          >
                            <Text style={styles.primaryButtonText}>Share invite</Text>
                          </Pressable>
                        </View>
                      </View>
                    ) : (
                      <View style={styles.form}>
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
                        <Pressable
                          disabled={creatingInvite}
                          onPress={handleCreateInvite}
                          style={({ pressed }) => [
                            styles.primaryButton,
                            creatingInvite ? styles.buttonDisabled : null,
                            pressed && !creatingInvite ? styles.buttonPressed : null,
                          ]}
                        >
                          {creatingInvite ? (
                            <ActivityIndicator color="#ffffff" />
                          ) : (
                            <Text style={styles.primaryButtonText}>Create invite</Text>
                          )}
                        </Pressable>
                      </View>
                    )}
                  </View>
                </>
              ) : null}
            </ScrollView>

            <View style={styles.sheetFooter}>
              <Pressable
                onPress={closePetDetail}
                style={({ pressed }) => [
                  styles.footerButton,
                  pressed ? styles.buttonPressed : null,
                ]}
              >
                <Text style={styles.footerButtonText}>Done</Text>
              </Pressable>
            </View>
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
  cardPressed: {
    opacity: 0.92,
    transform: [{ scale: 0.995 }],
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
    backgroundColor: 'rgba(15, 23, 42, 0.42)',
    flex: 1,
    justifyContent: 'flex-end',
  },
  detailSheet: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '92%',
    overflow: 'hidden',
  },
  detailContent: {
    gap: 18,
    padding: 20,
    paddingBottom: 12,
  },
  detailImage: {
    borderRadius: 18,
    height: 220,
    width: '100%',
  },
  detailImagePlaceholder: {
    alignItems: 'center',
    backgroundColor: '#ede9fe',
    borderRadius: 18,
    height: 220,
    justifyContent: 'center',
    width: '100%',
  },
  detailImagePlaceholderIcon: {
    fontSize: 44,
  },
  detailHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'space-between',
  },
  detailTitleBlock: {
    flex: 1,
    gap: 3,
  },
  detailTitle: {
    color: '#0f172a',
    fontSize: 26,
    fontWeight: '700',
  },
  detailSubtitle: {
    color: '#6d28d9',
    fontSize: 15,
    fontWeight: '700',
  },
  section: {
    borderTopColor: '#e2e8f0',
    borderTopWidth: 1,
    gap: 12,
    paddingTop: 16,
  },
  sectionHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    color: '#0f172a',
    fontSize: 17,
    fontWeight: '700',
  },
  smallButton: {
    backgroundColor: '#f8fafc',
    borderColor: '#cbd5e1',
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  smallButtonText: {
    color: '#334155',
    fontSize: 13,
    fontWeight: '700',
  },
  form: {
    gap: 10,
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
  bioInput: {
    minHeight: 110,
  },
  rowActions: {
    flexDirection: 'row',
    gap: 10,
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: '#8b5cf6',
    borderRadius: 14,
    flex: 1,
    justifyContent: 'center',
    minHeight: 48,
    paddingHorizontal: 12,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
  secondaryButton: {
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderColor: '#e2e8f0',
    borderRadius: 14,
    borderWidth: 1,
    flex: 1,
    justifyContent: 'center',
    minHeight: 48,
    paddingHorizontal: 12,
  },
  secondaryButtonText: {
    color: '#475569',
    fontSize: 15,
    fontWeight: '700',
  },
  detailsGrid: {
    gap: 10,
  },
  detailField: {
    backgroundColor: '#f8fafc',
    borderColor: '#e2e8f0',
    borderRadius: 14,
    borderWidth: 1,
    gap: 4,
    padding: 12,
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
    lineHeight: 21,
  },
  inlineLoading: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  parentList: {
    gap: 10,
  },
  parentRow: {
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderColor: '#e2e8f0',
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    padding: 12,
  },
  parentAvatar: {
    alignItems: 'center',
    backgroundColor: '#ede9fe',
    borderRadius: 20,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  parentAvatarText: {
    color: '#6d28d9',
    fontSize: 16,
    fontWeight: '700',
  },
  parentBody: {
    flex: 1,
    gap: 3,
  },
  parentNameRow: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  parentName: {
    color: '#0f172a',
    flexShrink: 1,
    fontSize: 15,
    fontWeight: '700',
  },
  parentMeta: {
    color: '#64748b',
    fontSize: 13,
  },
  youBadge: {
    backgroundColor: '#eff6ff',
    borderColor: '#bfdbfe',
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  youBadgeText: {
    color: '#1d4ed8',
    fontSize: 11,
    fontWeight: '700',
  },
  helperText: {
    color: '#64748b',
    fontSize: 14,
    lineHeight: 20,
  },
  errorText: {
    color: '#dc2626',
    fontSize: 14,
    lineHeight: 20,
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
  sheetFooter: {
    borderTopColor: '#e2e8f0',
    borderTopWidth: 1,
    padding: 14,
  },
  footerButton: {
    alignItems: 'center',
    backgroundColor: '#0f172a',
    borderRadius: 14,
    justifyContent: 'center',
    minHeight: 50,
  },
  footerButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  buttonPressed: {
    opacity: 0.88,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});
