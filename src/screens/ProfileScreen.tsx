import { useCallback, useEffect, useMemo, useState } from 'react';
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

import { ReportTarget, ReportUserModal } from '../components/ReportUserModal';
import { useFriends } from '../context/FriendsContext';
import { useModeration } from '../context/ModerationContext';
import { usePetProfiles } from '../context/PetProfilesContext';
import { RootStackParamList } from '../navigation/AppNavigator';
import { FriendProfile, FriendSummary } from '../types/friends';
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

const formatDateTime = (date: string) =>
  new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(date));

const getFriendRequestMessage = (status: string, email: string) => {
  switch (status) {
    case 'accepted':
      return 'You are now friends.';
    case 'already_friends':
      return 'Already friends.';
    case 'no_account':
      return 'No PawCult account found for this email yet.';
    case 'request_pending':
      return 'A friend request is already pending.';
    case 'self':
      return 'You cannot add yourself as a friend.';
    case 'sent':
      return `Friend request sent to ${email}.`;
    default:
      return 'Friend request updated.';
  }
};

export const ProfileScreen = () => {
  const {
    fetchFriends,
    friends,
    getFriendProfile,
    loading: friendsLoading,
    sendFriendRequestByEmail,
  } = useFriends();
  const {
    blockUser,
    blockedUsers,
    fetchBlockedUsers,
    unblockUser,
  } = useModeration();
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
  const [isAddFriendOpen, setIsAddFriendOpen] = useState(false);
  const [friendEmail, setFriendEmail] = useState('');
  const [sendingFriendRequest, setSendingFriendRequest] = useState(false);
  const [friendRequestMessage, setFriendRequestMessage] = useState<string | null>(null);
  const [selectedFriend, setSelectedFriend] = useState<FriendSummary | null>(null);
  const [friendProfile, setFriendProfile] = useState<FriendProfile | null>(null);
  const [friendProfileLoading, setFriendProfileLoading] = useState(false);
  const [friendProfileError, setFriendProfileError] = useState<string | null>(null);
  const [reportTarget, setReportTarget] = useState<ReportTarget | null>(null);
  const [unblockingUserIds, setUnblockingUserIds] = useState<string[]>([]);

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

  const otherPetParents = useMemo(
    () => petParents.filter((parent) => !parent.isCurrentUser),
    [petParents]
  );

  const selectedPetIsShared = (selectedPet?.activeOwnerCount ?? 0) > 1;
  const shouldShowPetParentsSection =
    selectedPetIsShared &&
    (parentsLoading || parentsError !== null || otherPetParents.length > 0);

  const loadPetParents = useCallback(
    async (pet: MobilePetProfile | null = selectedPet) => {
      if (!pet || pet.activeOwnerCount <= 1) {
        setPetParents([]);
        setParentsError(null);
        setParentsLoading(false);
        return;
      }

      setParentsLoading(true);
      setParentsError(null);

      try {
        const owners = await getPetOwners(pet.id);
        setPetParents(owners);
      } catch (ownerError) {
        console.warn('Unable to load pet parents', ownerError);
        setParentsError('Could not load pet parents.');
        setPetParents([]);
      } finally {
        setParentsLoading(false);
      }
    },
    [getPetOwners, selectedPet]
  );

  useEffect(() => {
    void loadPetParents();
  }, [loadPetParents]);


  const openPetDetail = (pet: MobilePetProfile) => {
    setSelectedPet(pet);
    setPetParents([]);
    setParentsError(null);
    setParentsLoading(false);
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

  const openAddFriend = () => {
    setFriendEmail('');
    setFriendRequestMessage(null);
    setIsAddFriendOpen(true);
  };

  const closeAddFriend = () => {
    setIsAddFriendOpen(false);
    setFriendEmail('');
    setFriendRequestMessage(null);
    setSendingFriendRequest(false);
  };

  const handleSendFriendRequest = async () => {
    const normalizedEmail = friendEmail.trim().toLowerCase();
    const emailIsValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail);

    if (!emailIsValid) {
      Alert.alert('Invalid email', 'Enter a valid email address.');
      return;
    }

    setSendingFriendRequest(true);
    setFriendRequestMessage(null);

    try {
      const result = await sendFriendRequestByEmail(normalizedEmail);
      setFriendRequestMessage(getFriendRequestMessage(result.status, normalizedEmail));

      if (result.status === 'accepted' || result.status === 'already_friends') {
        await fetchFriends();
      }
    } catch (friendError) {
      const message =
        friendError instanceof Error
          ? friendError.message
          : 'Unable to send friend request right now.';

      Alert.alert('Friend request failed', message);
    } finally {
      setSendingFriendRequest(false);
    }
  };

  const openFriendProfile = async (friend: FriendSummary) => {
    setSelectedFriend(friend);
    setFriendProfile(null);
    setFriendProfileError(null);
    setFriendProfileLoading(true);

    try {
      const profile = await getFriendProfile(friend.friendUserId);
      setFriendProfile(profile);
    } catch (profileError) {
      const message =
        profileError instanceof Error
          ? profileError.message
          : 'Unable to load this friend right now.';

      setFriendProfileError(message);
    } finally {
      setFriendProfileLoading(false);
    }
  };

  const closeFriendProfile = () => {
    setSelectedFriend(null);
    setFriendProfile(null);
    setFriendProfileError(null);
    setFriendProfileLoading(false);
  };

  const handleBlockFriend = async () => {
    if (!selectedFriend) {
      return;
    }

    try {
      await blockUser(selectedFriend.friendUserId);
      await fetchFriends();
      await fetchBlockedUsers();
      closeFriendProfile();
      Alert.alert('User blocked', 'This user has been removed from your PawCult view.');
    } catch (blockError) {
      const message =
        blockError instanceof Error ? blockError.message : 'Unable to block this user.';

      Alert.alert('Block failed', message);
    }
  };

  const openFriendReport = () => {
    if (!selectedFriend) {
      return;
    }

    const target: ReportTarget = {
      contentId: selectedFriend.friendUserId,
      contentType: 'friend_profile',
      reportedUserId: selectedFriend.friendUserId,
      title: `Report ${selectedFriend.displayName}`,
    };

    closeFriendProfile();
    requestAnimationFrame(() => {
      setReportTarget(target);
    });
  };

  const handleUnblockUser = async (targetUserId: string) => {
    setUnblockingUserIds((currentIds) => [...currentIds, targetUserId]);

    try {
      await unblockUser(targetUserId);
      await fetchFriends();
      Alert.alert(
        'User unblocked',
        'You can send or accept friend requests with this user again.'
      );
    } catch (unblockError) {
      const message =
        unblockError instanceof Error
          ? unblockError.message
          : 'Unable to unblock this user.';

      Alert.alert('Unblock failed', message);
    } finally {
      setUnblockingUserIds((currentIds) =>
        currentIds.filter((userId) => userId !== targetUserId)
      );
    }
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

      <View style={styles.friendsSection}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>My Friends</Text>
          <Pressable
            onPress={openAddFriend}
            style={({ pressed }) => [
              styles.smallButton,
              pressed ? styles.buttonPressed : null,
            ]}
          >
            <Text style={styles.smallButtonText}>Add Friend</Text>
          </Pressable>
        </View>

        {friendsLoading ? (
          <View style={styles.inlineLoading}>
            <ActivityIndicator color="#8b5cf6" />
            <Text style={styles.helperText}>Loading friends...</Text>
          </View>
        ) : friends.length === 0 ? (
          <Text style={styles.helperText}>
            Add friends by email to see their pets and check-ins here.
          </Text>
        ) : (
          <View style={styles.friendList}>
            {friends.map((friend) => (
              <Pressable
                key={friend.friendshipId}
                onPress={() => void openFriendProfile(friend)}
                style={({ pressed }) => [
                  styles.friendCard,
                  pressed ? styles.cardPressed : null,
                ]}
              >
                <View style={styles.parentAvatar}>
                  <Text style={styles.parentAvatarText}>
                    {friend.displayName.slice(0, 1).toUpperCase()}
                  </Text>
                </View>
                <View style={styles.parentBody}>
                  <Text style={styles.parentName}>{friend.displayName}</Text>
                  <Text style={styles.parentMeta}>
                    {friend.email ?? 'No email'}
                  </Text>
                  <Text style={styles.parentMeta}>
                    {friend.petCount} {friend.petCount === 1 ? 'pet' : 'pets'} ·{' '}
                    {friend.activeCheckInCount}{' '}
                    {friend.activeCheckInCount === 1 ? 'check-in' : 'check-ins'}
                  </Text>
                </View>
              </Pressable>
            ))}
          </View>
        )}
      </View>

      {blockedUsers.length > 0 ? (
        <View style={styles.friendsSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Blocked</Text>
          </View>

          <View style={styles.friendList}>
            {blockedUsers.map((blockedUser) => {
              const unblocking = unblockingUserIds.includes(
                blockedUser.blockedUserId
              );

              return (
                <View
                  key={blockedUser.blockedUserId}
                  style={styles.blockedUserRow}
                >
                  <View style={styles.parentAvatar}>
                    <Text style={styles.parentAvatarText}>
                      {blockedUser.displayName.slice(0, 1).toUpperCase()}
                    </Text>
                  </View>
                  <View style={styles.parentBody}>
                    <Text style={styles.parentName}>
                      {blockedUser.displayName}
                    </Text>
                    <Text style={styles.parentMeta}>
                      {blockedUser.email ?? 'No email'}
                    </Text>
                    <Text style={styles.parentMeta}>
                      Blocked {formatDate(blockedUser.blockedAt)}
                    </Text>
                  </View>
                  <Pressable
                    disabled={unblocking}
                    onPress={() => void handleUnblockUser(blockedUser.blockedUserId)}
                    style={({ pressed }) => [
                      styles.unblockButton,
                      unblocking ? styles.buttonDisabled : null,
                      pressed && !unblocking ? styles.buttonPressed : null,
                    ]}
                  >
                    <Text style={styles.unblockButtonText}>
                      {unblocking ? '...' : 'Unblock'}
                    </Text>
                  </Pressable>
                </View>
              );
            })}
          </View>
        </View>
      ) : null}

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

                  {shouldShowPetParentsSection ? (
                    <View style={styles.section}>
                      <Text style={styles.sectionTitle}>Pet parents</Text>
                      {parentsLoading ? (
                        <View style={styles.inlineLoading}>
                          <ActivityIndicator color="#8b5cf6" />
                          <Text style={styles.helperText}>Loading parents...</Text>
                        </View>
                      ) : parentsError ? (
                        <View style={styles.retryRow}>
                          <Text style={styles.errorText}>{parentsError}</Text>
                          <Pressable
                            onPress={() => void loadPetParents()}
                            style={({ pressed }) => [
                              styles.smallButton,
                              pressed ? styles.buttonPressed : null,
                            ]}
                          >
                            <Text style={styles.smallButtonText}>Retry</Text>
                          </Pressable>
                        </View>
                      ) : (
                        <View style={styles.parentList}>
                          {otherPetParents.map((parent) => (
                            <View key={parent.id} style={styles.parentRow}>
                              <View style={styles.parentAvatar}>
                                <Text style={styles.parentAvatarText}>
                                  {parent.displayName.slice(0, 1).toUpperCase()}
                                </Text>
                              </View>
                              <View style={styles.parentBody}>
                                <Text style={styles.parentName}>
                                  {parent.displayName}
                                </Text>
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
                  ) : null}

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

      <Modal
        animationType="slide"
        onRequestClose={closeAddFriend}
        transparent
        visible={isAddFriendOpen}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.smallSheet}>
            <Text style={styles.detailTitle}>Add Friend</Text>
            <Text style={styles.helperText}>
              Send a friend request using their PawCult account email.
            </Text>
            <TextInput
              autoCapitalize="none"
              autoComplete="email"
              editable={!sendingFriendRequest}
              keyboardType="email-address"
              onChangeText={setFriendEmail}
              placeholder="Email address"
              placeholderTextColor="#94a3b8"
              style={styles.input}
              value={friendEmail}
            />
            {friendRequestMessage ? (
              <Text style={styles.helperText}>{friendRequestMessage}</Text>
            ) : null}
            <View style={styles.rowActions}>
              <Pressable
                disabled={sendingFriendRequest}
                onPress={closeAddFriend}
                style={({ pressed }) => [
                  styles.secondaryButton,
                  pressed && !sendingFriendRequest ? styles.buttonPressed : null,
                ]}
              >
                <Text style={styles.secondaryButtonText}>Done</Text>
              </Pressable>
              <Pressable
                disabled={sendingFriendRequest}
                onPress={handleSendFriendRequest}
                style={({ pressed }) => [
                  styles.primaryButton,
                  sendingFriendRequest ? styles.buttonDisabled : null,
                  pressed && !sendingFriendRequest ? styles.buttonPressed : null,
                ]}
              >
                {sendingFriendRequest ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <Text style={styles.primaryButtonText}>Send Request</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        animationType="slide"
        onRequestClose={closeFriendProfile}
        transparent
        visible={selectedFriend !== null}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.detailSheet}>
            <ScrollView contentContainerStyle={styles.detailContent}>
              <View style={styles.detailHeader}>
                <View style={styles.detailTitleBlock}>
                  <Text style={styles.detailTitle}>
                    {friendProfile?.displayName ?? selectedFriend?.displayName ?? 'Friend'}
                  </Text>
                  <Text style={styles.detailSubtitle}>
                    {friendProfile?.email ?? selectedFriend?.email ?? 'No email'}
                  </Text>
                </View>
              </View>

              {friendProfileLoading ? (
                <View style={styles.inlineLoading}>
                  <ActivityIndicator color="#8b5cf6" />
                  <Text style={styles.helperText}>Loading friend...</Text>
                </View>
              ) : friendProfileError ? (
                <Text style={styles.errorText}>{friendProfileError}</Text>
              ) : friendProfile ? (
                <>
                  <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Pets</Text>
                    {friendProfile.pets.length === 0 ? (
                      <Text style={styles.helperText}>No pets to show yet.</Text>
                    ) : (
                      <View style={styles.parentList}>
                        {friendProfile.pets.map((pet) => (
                          <View key={pet.id} style={styles.parentRow}>
                            {pet.profilePhotoUri ? (
                              <Image
                                source={{ uri: pet.profilePhotoUri }}
                                style={styles.parentAvatar}
                              />
                            ) : (
                              <View style={styles.parentAvatar}>
                                <Text style={styles.parentAvatarText}>
                                  {pet.name.slice(0, 1).toUpperCase()}
                                </Text>
                              </View>
                            )}
                            <View style={styles.parentBody}>
                              <Text style={styles.parentName}>{pet.name}</Text>
                              <Text style={styles.parentMeta}>{pet.breed}</Text>
                              {pet.bio ? (
                                <Text style={styles.parentMeta}>{pet.bio}</Text>
                              ) : null}
                            </View>
                          </View>
                        ))}
                      </View>
                    )}
                  </View>

                  <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Checked in now</Text>
                    {friendProfile.checkIns.length === 0 ? (
                      <Text style={styles.helperText}>
                        No current check-ins to show.
                      </Text>
                    ) : (
                      <View style={styles.parentList}>
                        {friendProfile.checkIns.map((checkIn) => (
                          <View key={checkIn.id} style={styles.detailField}>
                            <Text style={styles.detailValue}>
                              {checkIn.petName} at {checkIn.dogParkName}
                            </Text>
                            <Text style={styles.parentMeta}>
                              Until {formatDateTime(checkIn.endsAt)}
                            </Text>
                          </View>
                        ))}
                      </View>
                    )}
                  </View>
                </>
              ) : null}
            </ScrollView>

            <View style={styles.sheetFooter}>
              {selectedFriend ? (
                <View style={styles.moderationFooterActions}>
                  <Pressable
                    onPress={openFriendReport}
                    style={styles.reportButton}
                  >
                    <Text style={styles.reportButtonText}>Report</Text>
                  </Pressable>
                  <Pressable onPress={handleBlockFriend} style={styles.blockButton}>
                    <Text style={styles.blockButtonText}>Block</Text>
                  </Pressable>
                </View>
              ) : null}
              <Pressable
                onPress={closeFriendProfile}
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
      <ReportUserModal
        onClose={() => setReportTarget(null)}
        target={reportTarget}
      />
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
  friendsSection: {
    backgroundColor: '#ffffff',
    borderColor: '#e2e8f0',
    borderRadius: 20,
    borderWidth: 1,
    gap: 12,
    padding: 16,
  },
  friendList: {
    gap: 10,
  },
  friendCard: {
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderColor: '#e2e8f0',
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    padding: 12,
  },
  blockedUserRow: {
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderColor: '#e2e8f0',
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    padding: 12,
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
  smallSheet: {
    backgroundColor: '#ffffff',
    borderRadius: 22,
    gap: 14,
    margin: 20,
    padding: 20,
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
  retryRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
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
    gap: 10,
    padding: 14,
  },
  moderationFooterActions: {
    flexDirection: 'row',
    gap: 10,
  },
  reportButton: {
    alignItems: 'center',
    borderColor: '#e2e8f0',
    borderRadius: 14,
    borderWidth: 1,
    flex: 1,
    paddingVertical: 12,
  },
  reportButtonText: {
    color: '#334155',
    fontSize: 14,
    fontWeight: '700',
  },
  blockButton: {
    alignItems: 'center',
    backgroundColor: '#fef2f2',
    borderColor: '#fecaca',
    borderRadius: 14,
    borderWidth: 1,
    flex: 1,
    paddingVertical: 12,
  },
  blockButtonText: {
    color: '#991b1b',
    fontSize: 14,
    fontWeight: '700',
  },
  unblockButton: {
    alignItems: 'center',
    borderColor: '#cbd5e1',
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  unblockButtonText: {
    color: '#334155',
    fontSize: 13,
    fontWeight: '700',
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
