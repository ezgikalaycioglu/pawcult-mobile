import { useMemo, useRef, useState } from 'react';
import * as ReactNative from 'react-native';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import DateTimePicker, {
  DateTimePickerChangeEvent,
} from '@react-native-community/datetimepicker';
import MapView, { MapPressEvent, Marker, Region } from 'react-native-maps';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '../context/AuthContext';
import { useDogParks } from '../context/DogParksContext';
import { usePetProfiles } from '../context/PetProfilesContext';
import { MobileDogPark } from '../types/dogParks';

const STOCKHOLM_REGION: Region = {
  latitude: 59.3293,
  longitude: 18.0686,
  latitudeDelta: 0.18,
  longitudeDelta: 0.18,
};

const FOCUSED_PARK_DELTA = 0.025;
const MAX_PARK_NAME_LENGTH = 100;
const CHECK_IN_DURATION_MS = 60 * 60 * 1000;
const TextInput = ReactNative.TextInput;

type CheckInStartOption = 'now' | 'later';

const formatTime = (isoDate: string) =>
  new Intl.DateTimeFormat(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(isoDate));

const formatTimeRange = (startsAt: string, endsAt: string) =>
  `${formatTime(startsAt)} - ${formatTime(endsAt)}`;

const getInitialLaterStartTime = () => {
  const now = new Date();
  const startTime = new Date(now);
  startTime.setMinutes(now.getMinutes() + 30, 0, 0);
  return startTime;
};

const getTodayStartTime = (selectedTime: Date, now: Date) => {
  const startTime = new Date(now);
  startTime.setHours(selectedTime.getHours(), selectedTime.getMinutes(), 0, 0);

  return startTime;
};

const formatNameList = (names: string[]) => {
  if (names.length <= 1) {
    return names[0] ?? '';
  }

  if (names.length === 2) {
    return `${names[0]} and ${names[1]}`;
  }

  return `${names.slice(0, -1).join(', ')}, and ${names[names.length - 1]}`;
};

const getDogCountCopy = (
  count: number,
  singular: string,
  plural: string
) => `${count} ${count === 1 ? singular : plural}`;

export const CheckInScreen = () => {
  const mapRef = useRef<MapView | null>(null);
  const safeAreaInsets = useSafeAreaInsets();
  const { user } = useAuth();
  const { pets } = usePetProfiles();
  const {
    approvedParks,
    checkInPets,
    checkInsByParkId,
    checkingIn,
    cancellingCheckInIds,
    checkingOutIds,
    scheduledCheckInsByParkId,
    cancelScheduledCheckIns,
    checkOutCheckIns,
    createDogPark,
    creating,
    error,
    favoriteParkIds,
    favoriteParks,
    favoritingParkId,
    fetchDogParks,
    loading,
    toggleFavoritePark,
  } = useDogParks();
  const [isAddingPark, setIsAddingPark] = useState(false);
  const [draftCoordinate, setDraftCoordinate] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [parkName, setParkName] = useState('');
  const [selectedPark, setSelectedPark] = useState<MobileDogPark | null>(null);
  const [selectedPetIds, setSelectedPetIds] = useState<string[]>([]);
  const [isChoosingCheckInStart, setIsChoosingCheckInStart] = useState(false);
  const [selectedStartOption, setSelectedStartOption] =
    useState<CheckInStartOption>('now');
  const [laterStartTime, setLaterStartTime] = useState(() =>
    getInitialLaterStartTime()
  );
  const [startTimeError, setStartTimeError] = useState<string | null>(null);
  const [showScheduledCheckIns, setShowScheduledCheckIns] = useState(false);

  const selectedParkCheckIns = selectedPark
    ? checkInsByParkId[selectedPark.id] ?? []
    : [];
  const selectedParkScheduledCheckIns = selectedPark
    ? scheduledCheckInsByParkId[selectedPark.id] ?? []
    : [];
  const ownActiveCheckIns = user?.id
    ? selectedParkCheckIns.filter((checkIn) => checkIn.userId === user.id)
    : [];
  const otherActiveCheckIns = user?.id
    ? selectedParkCheckIns.filter((checkIn) => checkIn.userId !== user.id)
    : selectedParkCheckIns;
  const ownScheduledCheckIns = user?.id
    ? selectedParkScheduledCheckIns.filter((checkIn) => checkIn.userId === user.id)
    : [];
  const otherScheduledCheckIns = user?.id
    ? selectedParkScheduledCheckIns.filter((checkIn) => checkIn.userId !== user.id)
    : selectedParkScheduledCheckIns;
  const ownActivePetNames = ownActiveCheckIns.map(
    (checkIn) => checkIn.pet?.name ?? 'your pet'
  );
  const ownScheduledPetNames = ownScheduledCheckIns.map(
    (checkIn) => checkIn.pet?.name ?? 'your pet'
  );
  const activeSummaryText =
    ownActiveCheckIns.length > 0
      ? [
          `You are here with ${formatNameList(ownActivePetNames)}.`,
          otherActiveCheckIns.length > 0
            ? `${getDogCountCopy(
                otherActiveCheckIns.length,
                'other dog is',
                'other dogs are'
              )} checked in here.`
            : null,
        ]
          .filter(Boolean)
          .join(' ')
      : selectedParkCheckIns.length === 0
        ? 'No pets are checked in here right now.'
        : `${getDogCountCopy(
            selectedParkCheckIns.length,
            'dog is',
            'dogs are'
          )} checked in here.`;
  const scheduledSummaryText =
    ownScheduledCheckIns.length > 0
      ? [
          `You are coming later with ${formatNameList(ownScheduledPetNames)}.`,
          otherScheduledCheckIns.length > 0
            ? `${getDogCountCopy(
                otherScheduledCheckIns.length,
                'other dog is',
                'other dogs are'
              )} coming later.`
            : null,
        ]
          .filter(Boolean)
          .join(' ')
      : `${getDogCountCopy(
          selectedParkScheduledCheckIns.length,
          'dog is',
          'dogs are'
        )} coming later.`;

  const userActiveCheckInIds = useMemo(() => {
    if (!user?.id || !selectedPark) {
      return [];
    }

    return selectedParkCheckIns
      .filter((checkIn) => checkIn.userId === user.id)
      .map((checkIn) => checkIn.id);
  }, [selectedPark, selectedParkCheckIns, user?.id]);

  const userScheduledCheckInIds = useMemo(() => {
    if (!user?.id || !selectedPark) {
      return [];
    }

    return selectedParkScheduledCheckIns
      .filter((checkIn) => checkIn.userId === user.id)
      .map((checkIn) => checkIn.id);
  }, [selectedPark, selectedParkScheduledCheckIns, user?.id]);

  const selectedParkIsFavorite = selectedPark
    ? favoriteParkIds.includes(selectedPark.id)
    : false;
  const checkingOutSelectedPark = userActiveCheckInIds.some((checkInId) =>
    checkingOutIds.includes(checkInId)
  );
  const cancellingSelectedPark = userScheduledCheckInIds.some((checkInId) =>
    cancellingCheckInIds.includes(checkInId)
  );
  const favoritingSelectedPark = favoritingParkId === selectedPark?.id;

  const laterStartDate =
    selectedStartOption === 'later'
      ? getTodayStartTime(laterStartTime, new Date())
      : null;

  const handleMapPress = (event: MapPressEvent) => {
    if (!isAddingPark) {
      return;
    }

    setDraftCoordinate(event.nativeEvent.coordinate);
  };

  const resetAddPark = () => {
    setDraftCoordinate(null);
    setIsAddingPark(false);
    setParkName('');
  };

  const resetCheckInStart = () => {
    setIsChoosingCheckInStart(false);
    setSelectedStartOption('now');
    setLaterStartTime(getInitialLaterStartTime());
    setStartTimeError(null);
  };

  const resetSelectedPark = () => {
    setSelectedPark(null);
    setSelectedPetIds([]);
    setShowScheduledCheckIns(false);
    resetCheckInStart();
  };

  const focusPark = (park: MobileDogPark) => {
    mapRef.current?.animateToRegion(
      {
        latitude: park.latitude,
        longitude: park.longitude,
        latitudeDelta: FOCUSED_PARK_DELTA,
        longitudeDelta: FOCUSED_PARK_DELTA,
      },
      350
    );
    setSelectedPark(park);
    setShowScheduledCheckIns(false);
  };

  const handleSubmitPark = async () => {
    const trimmedName = parkName.trim();

    if (!draftCoordinate) {
      Alert.alert('Choose a location', 'Tap the map where this dog park is located.');
      return;
    }

    if (!trimmedName) {
      Alert.alert('Missing name', 'Enter the dog park name before submitting.');
      return;
    }

    try {
      await createDogPark({
        name: trimmedName,
        latitude: draftCoordinate.latitude,
        longitude: draftCoordinate.longitude,
      });

      Alert.alert(
        'Park submitted',
        'This dog park is pending approval. You can track it from Requests.'
      );
      resetAddPark();
    } catch (submitError) {
      const message =
        submitError instanceof Error
          ? submitError.message
          : 'Unable to submit this dog park right now.';

      Alert.alert('Submission failed', message);
    }
  };

  const handleToggleFavorite = async () => {
    if (!selectedPark) {
      return;
    }

    try {
      await toggleFavoritePark(selectedPark.id);
    } catch (favoriteError) {
      const message =
        favoriteError instanceof Error
          ? favoriteError.message
          : 'Unable to update favorite parks right now.';

      Alert.alert('Favorite update failed', message);
    }
  };

  const togglePet = (petId: string) => {
    setSelectedPetIds((currentPetIds) =>
      currentPetIds.includes(petId)
        ? currentPetIds.filter((currentPetId) => currentPetId !== petId)
        : [...currentPetIds, petId]
    );
  };

  const openCheckInStart = () => {
    if (!selectedPark) {
      return;
    }

    if (pets.length === 0) {
      Alert.alert('Add a pet first', 'Create a pet profile before checking in.');
      return;
    }

    if (selectedPetIds.length === 0) {
      Alert.alert('Choose pets', 'Select at least one pet to check in.');
      return;
    }

    setStartTimeError(null);
    setLaterStartTime(getInitialLaterStartTime());
    setIsChoosingCheckInStart(true);
  };

  const handleLaterTimeChange = (
    _event: DateTimePickerChangeEvent,
    selectedDate: Date
  ) => {
    setLaterStartTime(selectedDate);
    setStartTimeError(null);
  };

  const handleConfirmCheckIn = async () => {
    if (!selectedPark) {
      return;
    }

    const now = new Date();
    const startsAt =
      selectedStartOption === 'later'
        ? getTodayStartTime(laterStartTime, now)
        : now;

    if (selectedStartOption === 'later') {
      const next24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000);

      if (startsAt <= now) {
        setStartTimeError('Choose a start time later than now.');
        return;
      }

      if (startsAt > next24Hours) {
        setStartTimeError('Choose a start time within the next 24 hours.');
        return;
      }
    }

    const endsAt = new Date(startsAt.getTime() + CHECK_IN_DURATION_MS);

    try {
      await checkInPets({
        dogParkId: selectedPark.id,
        petIds: selectedPetIds,
        startsAt,
        endsAt,
      });
      setSelectedPetIds([]);
      resetCheckInStart();
    } catch (checkInError) {
      const message =
        checkInError instanceof Error
          ? checkInError.message
          : 'Unable to check in right now.';

      Alert.alert('Check-in failed', message);
    }
  };

  const handleCheckOut = async () => {
    try {
      await checkOutCheckIns(userActiveCheckInIds);
    } catch (checkOutError) {
      const message =
        checkOutError instanceof Error
          ? checkOutError.message
          : 'Unable to check out right now.';

      Alert.alert('Check-out failed', message);
    }
  };

  const handleCancelScheduledCheckIn = async () => {
    try {
      await cancelScheduledCheckIns(userScheduledCheckInIds);
    } catch {
      Alert.alert(
        'Cancellation failed',
        'Could not cancel scheduled check-in. Please try again.'
      );
    }
  };

  return (
    <View style={styles.screen}>
      <MapView
        initialRegion={STOCKHOLM_REGION}
        onPress={handleMapPress}
        ref={mapRef}
        style={styles.map}
      >
        {approvedParks.map((park) => {
          const isFavorite = favoriteParkIds.includes(park.id);
          const activeCheckIns = checkInsByParkId[park.id]?.length ?? 0;

          return (
            <Marker
              key={park.id}
              coordinate={{
                latitude: park.latitude,
                longitude: park.longitude,
              }}
              onPress={(event) => {
                event.stopPropagation?.();
                setSelectedPark(park);
                setShowScheduledCheckIns(false);
              }}
              pinColor={isFavorite ? '#ef4444' : '#8b5cf6'}
            >
              <View
                style={[
                  styles.parkMarker,
                  isFavorite ? styles.favoriteMarker : null,
                  activeCheckIns > 0 ? styles.activeMarker : null,
                ]}
              >
                <Text style={styles.parkMarkerText}>
                  {activeCheckIns > 0 ? activeCheckIns : isFavorite ? '♥' : '•'}
                </Text>
              </View>
            </Marker>
          );
        })}

        {draftCoordinate ? (
          <Marker
            coordinate={draftCoordinate}
            pinColor="#10b981"
            title="New dog park"
          />
        ) : null}
      </MapView>

      <View style={styles.topControls}>
        {favoriteParks.length > 0 ? (
          <ScrollView
            contentContainerStyle={styles.favoriteChipsContent}
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.favoriteChips}
          >
            {favoriteParks.map((park) => (
              <Pressable
                key={park.id}
                onPress={() => focusPark(park)}
                style={({ pressed }) => [
                  styles.favoriteChip,
                  pressed ? styles.buttonPressed : null,
                ]}
              >
                <Text style={styles.favoriteChipIcon}>♥</Text>
                <Text numberOfLines={1} style={styles.favoriteChipText}>
                  {park.name}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        ) : null}

        {loading ? (
          <View style={styles.refreshButton}>
            <ActivityIndicator color="#8b5cf6" />
          </View>
        ) : (
          <Pressable
            accessibilityLabel="Refresh dog parks"
            onPress={fetchDogParks}
            style={({ pressed }) => [
              styles.refreshButton,
              pressed ? styles.buttonPressed : null,
            ]}
          >
            <Text style={styles.refreshButtonText}>↻</Text>
          </Pressable>
        )}
      </View>

      {error ? (
        <Pressable
          onPress={fetchDogParks}
          style={({ pressed }) => [
            styles.errorBanner,
            pressed ? styles.errorBannerPressed : null,
          ]}
        >
          <Text style={styles.errorText}>{error}</Text>
          <Text style={styles.errorAction}>Retry</Text>
        </Pressable>
      ) : null}

      {isAddingPark ? (
        <View style={styles.addHint}>
          <Text style={styles.addHintTitle}>
            {draftCoordinate ? 'Confirm this location' : 'Tap the map to place the park'}
          </Text>
          <Text style={styles.addHintText}>
            Submitted parks stay pending until approved.
          </Text>
        </View>
      ) : null}

      <View style={styles.actions}>
        {isAddingPark ? (
          <Pressable
            onPress={resetAddPark}
            style={({ pressed }) => [
              styles.secondaryButton,
              pressed ? styles.buttonPressed : null,
            ]}
          >
            <Text style={styles.secondaryButtonText}>Cancel</Text>
          </Pressable>
        ) : (
          <Pressable
            onPress={() => setIsAddingPark(true)}
            style={({ pressed }) => [
              styles.primaryButton,
              pressed ? styles.buttonPressed : null,
            ]}
          >
            <Text style={styles.primaryButtonIcon}>+</Text>
            <Text style={styles.primaryButtonText}>Add Park</Text>
          </Pressable>
        )}
      </View>

      <Modal
        animationType="slide"
        onRequestClose={resetAddPark}
        transparent
        visible={draftCoordinate !== null}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Add Dog Park</Text>
            <Text style={styles.modalDescription}>
              Name this park. It will be submitted for approval before everyone can see it.
            </Text>
            <TextInput
              autoCapitalize="words"
              maxLength={MAX_PARK_NAME_LENGTH}
              onChangeText={setParkName}
              placeholder="Dog park name"
              placeholderTextColor="#94a3b8"
              style={styles.input}
              value={parkName}
            />
            <Text style={styles.counter}>
              {parkName.length}/{MAX_PARK_NAME_LENGTH}
            </Text>

            <View style={styles.modalActions}>
              <Pressable
                disabled={creating}
                onPress={resetAddPark}
                style={({ pressed }) => [
                  styles.modalCancelButton,
                  pressed ? styles.buttonPressed : null,
                ]}
              >
                <Text style={styles.modalCancelButtonText}>Cancel</Text>
              </Pressable>
              <Pressable
                disabled={creating}
                onPress={handleSubmitPark}
                style={({ pressed }) => [
                  styles.modalSubmitButton,
                  creating ? styles.buttonDisabled : null,
                  pressed && !creating ? styles.buttonPressed : null,
                ]}
              >
                <Text style={styles.modalSubmitButtonText}>
                  {creating ? 'Submitting...' : 'Submit'}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        animationType="slide"
        onRequestClose={resetSelectedPark}
        transparent
        visible={selectedPark !== null}
      >
        <Pressable onPress={resetSelectedPark} style={styles.modalBackdrop}>
          <Pressable
            onPress={(event) => event.stopPropagation()}
            style={[styles.modalCard, styles.parkModalCard]}
          >
            <View style={styles.parkHeader}>
              <Text numberOfLines={2} style={[styles.modalTitle, styles.parkTitle]}>
                {selectedPark?.name}
              </Text>
              <Pressable
                accessibilityLabel={
                  selectedParkIsFavorite
                    ? 'Remove park from favorites'
                    : 'Save park'
                }
                accessibilityRole="button"
                accessibilityState={{
                  disabled: favoritingSelectedPark,
                  selected: selectedParkIsFavorite,
                }}
                disabled={favoritingSelectedPark}
                onPress={handleToggleFavorite}
                style={({ pressed }) => [
                  styles.favoriteHeartButton,
                  selectedParkIsFavorite ? styles.favoriteHeartButtonSaved : null,
                  favoritingSelectedPark ? styles.buttonDisabled : null,
                  pressed && !favoritingSelectedPark ? styles.buttonPressed : null,
                ]}
              >
                <Text
                  style={[
                    styles.favoriteHeartText,
                    selectedParkIsFavorite ? styles.favoriteHeartTextSaved : null,
                  ]}
                >
                  {selectedParkIsFavorite ? '♥' : '♡'}
                </Text>
              </Pressable>
            </View>
            <Text style={styles.modalDescription}>
              {activeSummaryText}
            </Text>

            {selectedParkCheckIns.length > 0 ? (
              <View style={styles.checkInList}>
                {selectedParkCheckIns.map((checkIn) => (
                  <View key={checkIn.id} style={styles.checkInRow}>
                    {checkIn.pet?.profilePhotoUri ? (
                      <Image
                        source={{ uri: checkIn.pet.profilePhotoUri }}
                        style={styles.checkInPetImage}
                      />
                    ) : (
                      <View style={styles.checkInPetPlaceholder}>
                        <Text style={styles.checkInPetPlaceholderText}>•</Text>
                      </View>
                    )}
                    <View style={styles.checkInPetBody}>
                      <Text style={styles.checkInPetName}>
                        {checkIn.pet?.name ?? 'A pet'}
                      </Text>
                      <Text style={styles.checkInTime}>
                        Here until {formatTime(checkIn.endsAt)}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            ) : null}

            {selectedParkScheduledCheckIns.length > 0 ? (
              <View style={styles.scheduledBlock}>
                <Pressable
                  accessibilityRole="button"
                  onPress={() =>
                    setShowScheduledCheckIns(
                      (currentShowScheduled) => !currentShowScheduled
                    )
                  }
                  style={({ pressed }) => [
                    styles.scheduledToggle,
                    pressed ? styles.buttonPressed : null,
                  ]}
                >
                  <Text style={styles.scheduledToggleText}>
                    {showScheduledCheckIns
                      ? 'Hide dogs coming later'
                      : 'View dogs coming later'}
                  </Text>
                  <Text style={styles.scheduledCountText}>
                    {scheduledSummaryText}
                  </Text>
                </Pressable>

                {showScheduledCheckIns ? (
                  <View style={styles.checkInList}>
                    {selectedParkScheduledCheckIns.map((checkIn) => (
                      <View key={checkIn.id} style={styles.checkInRow}>
                        {checkIn.pet?.profilePhotoUri ? (
                          <Image
                            source={{ uri: checkIn.pet.profilePhotoUri }}
                            style={styles.checkInPetImage}
                          />
                        ) : (
                          <View style={styles.checkInPetPlaceholder}>
                            <Text style={styles.checkInPetPlaceholderText}>•</Text>
                          </View>
                        )}
                        <View style={styles.checkInPetBody}>
                          <Text style={styles.checkInPetName}>
                            {checkIn.pet?.name ?? 'A pet'}
                          </Text>
                          <Text style={styles.checkInTime}>
                            Scheduled{' '}
                            {formatTimeRange(checkIn.startsAt, checkIn.endsAt)}
                          </Text>
                        </View>
                      </View>
                    ))}
                  </View>
                ) : null}
              </View>
            ) : null}

            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Check in</Text>
            </View>

            {pets.length === 0 ? (
              <Text style={styles.emptyPetsText}>
                Add a pet profile before checking in.
              </Text>
            ) : (
              <ScrollView
                contentContainerStyle={styles.petChoicesContent}
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.petChoices}
              >
                {pets.map((pet) => {
                  const selected = selectedPetIds.includes(pet.id);

                  return (
                    <Pressable
                      key={pet.id}
                      onPress={() => togglePet(pet.id)}
                      style={[
                        styles.petChoice,
                        selected ? styles.petChoiceSelected : null,
                      ]}
                    >
                      <Text
                        numberOfLines={1}
                        style={[
                          styles.petChoiceText,
                          selected ? styles.petChoiceTextSelected : null,
                        ]}
                      >
                        {pet.name}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            )}

            <View style={styles.modalActions}>
              {userActiveCheckInIds.length > 0 ? (
                <Pressable
                  disabled={checkingOutSelectedPark}
                  onPress={handleCheckOut}
                  style={({ pressed }) => [
                    styles.modalSubmitButton,
                    checkingOutSelectedPark ? styles.buttonDisabled : null,
                    pressed && !checkingOutSelectedPark ? styles.buttonPressed : null,
                  ]}
                >
                  <Text style={styles.modalSubmitButtonText}>
                    {checkingOutSelectedPark ? 'Checking out...' : 'Check Out'}
                  </Text>
                </Pressable>
              ) : userScheduledCheckInIds.length > 0 ? (
                <Pressable
                  disabled={cancellingSelectedPark}
                  onPress={handleCancelScheduledCheckIn}
                  style={({ pressed }) => [
                    styles.modalSubmitButton,
                    cancellingSelectedPark ? styles.buttonDisabled : null,
                    pressed && !cancellingSelectedPark ? styles.buttonPressed : null,
                  ]}
                >
                  <Text style={styles.modalSubmitButtonText}>
                    {cancellingSelectedPark
                      ? 'Cancelling...'
                      : 'Cancel scheduled check-in'}
                  </Text>
                </Pressable>
              ) : (
                <Pressable
                  disabled={checkingIn}
                  onPress={openCheckInStart}
                  style={({ pressed }) => [
                    styles.modalSubmitButton,
                    checkingIn ? styles.buttonDisabled : null,
                    pressed && !checkingIn ? styles.buttonPressed : null,
                  ]}
                >
                  <Text style={styles.modalSubmitButtonText}>
                    {checkingIn ? 'Checking in...' : 'Check In'}
                  </Text>
                </Pressable>
              )}
            </View>
          </Pressable>
          {isChoosingCheckInStart ? (
            <View
              style={[
                styles.inlineCheckInOverlay,
                { paddingTop: safeAreaInsets.top + 12 },
              ]}
            >
              <Pressable
                onPress={(event) => {
                  event.stopPropagation();
                  resetCheckInStart();
                }}
                style={styles.inlineCheckInBackdrop}
              />
              <Pressable
                onPress={(event) => event.stopPropagation()}
                style={[
                  styles.inlineCheckInSheet,
                  { paddingBottom: Math.max(safeAreaInsets.bottom + 20, 28) },
                ]}
              >
                <View style={styles.sheetHandle} />
                <Text style={styles.modalTitle}>Check in</Text>
                <View style={styles.checkInParkRow}>
                  <View style={styles.checkInParkIcon}>
                    <Text style={styles.checkInParkIconText}>•</Text>
                  </View>
                  <Text numberOfLines={2} style={styles.checkInParkName}>
                    {selectedPark?.name ?? 'This park'}
                  </Text>
                </View>
                <Text style={styles.modalDescription}>
                  Choose when to check in at {selectedPark?.name ?? 'this park'}.
                </Text>

                <View style={styles.checkInStartOptions}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityState={{ selected: selectedStartOption === 'now' }}
                    onPress={() => {
                      setSelectedStartOption('now');
                      setStartTimeError(null);
                    }}
                    style={[
                      styles.checkInStartOption,
                      selectedStartOption === 'now'
                        ? styles.checkInStartOptionSelected
                        : null,
                    ]}
                  >
                    <Text
                      style={[
                        styles.checkInStartOptionTitle,
                        selectedStartOption === 'now'
                          ? styles.checkInStartOptionTitleSelected
                          : null,
                      ]}
                    >
                      Check in now
                    </Text>
                    <Text style={styles.checkInStartOptionDescription}>
                      Starts immediately and lasts 1 hour.
                    </Text>
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityState={{ selected: selectedStartOption === 'later' }}
                    onPress={() => {
                      setSelectedStartOption('later');
                      setStartTimeError(null);
                    }}
                    style={[
                      styles.checkInStartOption,
                      selectedStartOption === 'later'
                        ? styles.checkInStartOptionSelected
                        : null,
                    ]}
                  >
                    <Text
                      style={[
                        styles.checkInStartOptionTitle,
                        selectedStartOption === 'later'
                          ? styles.checkInStartOptionTitleSelected
                          : null,
                      ]}
                    >
                      Check in for later
                    </Text>
                    <Text style={styles.checkInStartOptionDescription}>
                      Choose a start time for today.
                    </Text>
                  </Pressable>
                </View>

                {selectedStartOption === 'later' ? (
                  <View style={styles.laterTimeBlock}>
                    <View style={styles.timePickerFrame}>
                      <DateTimePicker
                        accessibilityLabel="Later check-in start time"
                        display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                        mode="time"
                        onValueChange={handleLaterTimeChange}
                        value={laterStartTime}
                      />
                    </View>
                    <Text style={styles.laterSelectedTime}>
                      {laterStartDate
                        ? `Scheduled ${formatTime(
                            laterStartDate.toISOString()
                          )} - ${formatTime(
                            new Date(
                              laterStartDate.getTime() + CHECK_IN_DURATION_MS
                            ).toISOString()
                          )}`
                        : ''}
                    </Text>
                    <Text
                      style={[
                        styles.laterTimeHint,
                        startTimeError ? styles.laterTimeError : null,
                      ]}
                    >
                      {startTimeError ??
                        (laterStartDate
                          ? 'Scheduled check-ins last 1 hour.'
                          : 'Choose a start time for today.')}
                    </Text>
                  </View>
                ) : null}

                <View style={styles.modalActions}>
                  <Pressable
                    disabled={checkingIn}
                    onPress={resetCheckInStart}
                    style={({ pressed }) => [
                      styles.modalCancelButton,
                      pressed && !checkingIn ? styles.buttonPressed : null,
                    ]}
                  >
                    <Text style={styles.modalCancelButtonText}>Cancel</Text>
                  </Pressable>
                  <Pressable
                    disabled={checkingIn}
                    onPress={handleConfirmCheckIn}
                    style={({ pressed }) => [
                      styles.modalSubmitButton,
                      checkingIn ? styles.buttonDisabled : null,
                      pressed && !checkingIn ? styles.buttonPressed : null,
                    ]}
                  >
                    <Text style={styles.modalSubmitButtonText}>
                      {checkingIn ? 'Checking in...' : 'Confirm'}
                    </Text>
                  </Pressable>
                </View>
              </Pressable>
            </View>
          ) : null}
        </Pressable>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  screen: {
    backgroundColor: '#f8fafc',
    flex: 1,
  },
  map: {
    flex: 1,
  },
  parkMarker: {
    alignItems: 'center',
    backgroundColor: '#8b5cf6',
    borderColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 2,
    height: 32,
    justifyContent: 'center',
    width: 32,
  },
  favoriteMarker: {
    backgroundColor: '#ef4444',
  },
  activeMarker: {
    backgroundColor: '#0f766e',
  },
  parkMarkerText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
    lineHeight: 20,
  },
  topControls: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'space-between',
    left: 14,
    position: 'absolute',
    right: 14,
    top: 14,
  },
  refreshButton: {
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderColor: '#e2e8f0',
    borderRadius: 18,
    borderWidth: 1,
    elevation: 4,
    height: 36,
    justifyContent: 'center',
    shadowColor: '#111827',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    width: 36,
  },
  refreshButtonText: {
    color: '#8b5cf6',
    fontSize: 22,
    fontWeight: '700',
    lineHeight: 24,
  },
  favoriteChips: {
    flex: 1,
  },
  favoriteChipsContent: {
    gap: 8,
  },
  favoriteChip: {
    alignItems: 'center',
    backgroundColor: '#fef2f2',
    borderColor: '#fecaca',
    borderRadius: 999,
    borderWidth: 1,
    elevation: 4,
    flexDirection: 'row',
    gap: 6,
    maxWidth: 180,
    paddingHorizontal: 12,
    paddingVertical: 8,
    shadowColor: '#111827',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  favoriteChipIcon: {
    color: '#ef4444',
    fontSize: 14,
    fontWeight: '700',
  },
  favoriteChipText: {
    color: '#7f1d1d',
    fontSize: 13,
    fontWeight: '700',
  },
  errorBanner: {
    backgroundColor: '#fef2f2',
    borderColor: '#fecaca',
    borderRadius: 12,
    borderWidth: 1,
    gap: 6,
    left: 16,
    padding: 12,
    position: 'absolute',
    right: 16,
    top: 62,
  },
  errorBannerPressed: {
    opacity: 0.82,
  },
  errorText: {
    color: '#991b1b',
    fontSize: 13,
    lineHeight: 18,
  },
  errorAction: {
    color: '#7f1d1d',
    fontSize: 13,
    fontWeight: '700',
  },
  addHint: {
    backgroundColor: '#ffffff',
    borderColor: '#bbf7d0',
    borderRadius: 16,
    borderWidth: 1,
    bottom: 106,
    left: 16,
    padding: 14,
    position: 'absolute',
    right: 16,
  },
  addHintTitle: {
    color: '#14532d',
    fontSize: 15,
    fontWeight: '700',
  },
  addHintText: {
    color: '#166534',
    fontSize: 13,
    marginTop: 4,
  },
  actions: {
    alignItems: 'center',
    bottom: 20,
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'flex-end',
    left: 16,
    position: 'absolute',
    right: 16,
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: '#8b5cf6',
    borderRadius: 18,
    flexDirection: 'row',
    gap: 8,
    minHeight: 52,
    paddingHorizontal: 18,
  },
  primaryButtonIcon: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '700',
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
    borderRadius: 18,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 52,
    paddingHorizontal: 18,
  },
  secondaryButtonText: {
    color: '#334155',
    fontSize: 15,
    fontWeight: '700',
  },
  buttonPressed: {
    opacity: 0.82,
  },
  modalBackdrop: {
    backgroundColor: 'rgba(15, 23, 42, 0.38)',
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 28,
  },
  parkModalCard: {
    overflow: 'hidden',
    position: 'relative',
  },
  modalTitle: {
    color: '#0f172a',
    fontSize: 24,
    fontWeight: '700',
  },
  modalDescription: {
    color: '#64748b',
    fontSize: 15,
    lineHeight: 22,
    marginTop: 8,
  },
  input: {
    backgroundColor: '#f8fafc',
    borderColor: '#cbd5e1',
    borderRadius: 16,
    borderWidth: 1,
    color: '#0f172a',
    fontSize: 16,
    marginTop: 18,
    minHeight: 54,
    paddingHorizontal: 16,
  },
  counter: {
    alignSelf: 'flex-end',
    color: '#64748b',
    fontSize: 12,
    marginTop: 8,
  },
  checkInList: {
    gap: 10,
    marginTop: 16,
  },
  checkInRow: {
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderColor: '#e2e8f0',
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    padding: 10,
  },
  checkInPetImage: {
    borderRadius: 22,
    height: 44,
    width: 44,
  },
  checkInPetPlaceholder: {
    alignItems: 'center',
    backgroundColor: '#ede9fe',
    borderRadius: 22,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  checkInPetPlaceholderText: {
    color: '#8b5cf6',
    fontSize: 24,
    fontWeight: '700',
    lineHeight: 24,
  },
  checkInPetBody: {
    flex: 1,
  },
  checkInPetName: {
    color: '#0f172a',
    fontSize: 15,
    fontWeight: '700',
  },
  checkInTime: {
    color: '#64748b',
    fontSize: 13,
    marginTop: 2,
  },
  scheduledBlock: {
    marginTop: 14,
  },
  scheduledToggle: {
    backgroundColor: '#f8fafc',
    borderColor: '#e2e8f0',
    borderRadius: 16,
    borderWidth: 1,
    padding: 12,
  },
  scheduledToggleText: {
    color: '#6d28d9',
    fontSize: 14,
    fontWeight: '700',
  },
  scheduledCountText: {
    color: '#64748b',
    fontSize: 13,
    lineHeight: 18,
    marginTop: 4,
  },
  parkHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
  },
  parkTitle: {
    flex: 1,
  },
  favoriteHeartButton: {
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderColor: '#fecaca',
    borderRadius: 22,
    borderWidth: 1,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  favoriteHeartButtonSaved: {
    backgroundColor: '#fef2f2',
  },
  favoriteHeartText: {
    color: '#ef4444',
    fontSize: 25,
    fontWeight: '700',
    lineHeight: 27,
  },
  favoriteHeartTextSaved: {
    color: '#dc2626',
  },
  sectionHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 18,
  },
  sectionTitle: {
    color: '#0f172a',
    fontSize: 17,
    fontWeight: '700',
  },
  emptyPetsText: {
    color: '#64748b',
    fontSize: 14,
    lineHeight: 20,
    marginTop: 12,
  },
  petChoices: {
    marginTop: 12,
  },
  petChoicesContent: {
    gap: 8,
  },
  petChoice: {
    backgroundColor: '#f8fafc',
    borderColor: '#cbd5e1',
    borderRadius: 999,
    borderWidth: 1,
    maxWidth: 160,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  petChoiceSelected: {
    backgroundColor: '#f5f3ff',
    borderColor: '#8b5cf6',
  },
  petChoiceText: {
    color: '#475569',
    fontSize: 14,
    fontWeight: '700',
  },
  petChoiceTextSelected: {
    color: '#6d28d9',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 18,
  },
  modalCancelButton: {
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderColor: '#e2e8f0',
    borderRadius: 16,
    borderWidth: 1,
    flex: 1,
    justifyContent: 'center',
    minHeight: 54,
  },
  modalCancelButtonText: {
    color: '#334155',
    fontSize: 15,
    fontWeight: '700',
  },
  modalSubmitButton: {
    alignItems: 'center',
    backgroundColor: '#8b5cf6',
    borderRadius: 16,
    flex: 1,
    justifyContent: 'center',
    minHeight: 54,
  },
  modalSubmitButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
  buttonDisabled: {
    opacity: 0.55,
  },
  inlineCheckInOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
  },
  inlineCheckInBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 23, 42, 0.24)',
  },
  inlineCheckInSheet: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '100%',
    padding: 20,
    paddingTop: 14,
  },
  sheetHandle: {
    alignSelf: 'center',
    backgroundColor: '#cbd5e1',
    borderRadius: 999,
    height: 5,
    marginBottom: 18,
    width: 54,
  },
  checkInParkRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    marginTop: 18,
  },
  checkInParkIcon: {
    alignItems: 'center',
    backgroundColor: '#8b5cf6',
    borderRadius: 10,
    height: 20,
    justifyContent: 'center',
    width: 20,
  },
  checkInParkIconText: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: '700',
    lineHeight: 17,
  },
  checkInParkName: {
    color: '#0f172a',
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
  },
  checkInStartOptions: {
    gap: 10,
    marginTop: 18,
  },
  checkInStartOption: {
    backgroundColor: '#f8fafc',
    borderColor: '#cbd5e1',
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
  },
  checkInStartOptionSelected: {
    backgroundColor: '#f5f3ff',
    borderColor: '#8b5cf6',
  },
  checkInStartOptionTitle: {
    color: '#0f172a',
    fontSize: 15,
    fontWeight: '700',
  },
  checkInStartOptionTitleSelected: {
    color: '#6d28d9',
  },
  checkInStartOptionDescription: {
    color: '#64748b',
    fontSize: 13,
    lineHeight: 18,
    marginTop: 4,
  },
  laterTimeBlock: {
    marginTop: 12,
  },
  timePickerFrame: {
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderColor: '#cbd5e1',
    borderRadius: 16,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 54,
    overflow: 'hidden',
  },
  laterSelectedTime: {
    color: '#0f172a',
    fontSize: 15,
    fontWeight: '700',
    marginTop: 10,
  },
  laterTimeHint: {
    color: '#64748b',
    fontSize: 13,
    lineHeight: 18,
    marginTop: 8,
  },
  laterTimeError: {
    color: '#dc2626',
  },
});
