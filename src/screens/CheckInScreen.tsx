import { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import MapView, { MapPressEvent, Marker, Region } from 'react-native-maps';

import { useDogParks } from '../context/DogParksContext';
import { MobileDogPark } from '../types/dogParks';

const STOCKHOLM_REGION: Region = {
  latitude: 59.3293,
  longitude: 18.0686,
  latitudeDelta: 0.18,
  longitudeDelta: 0.18,
};

const FOCUSED_PARK_DELTA = 0.025;
const MAX_PARK_NAME_LENGTH = 100;

export const CheckInScreen = () => {
  const mapRef = useRef<MapView | null>(null);
  const {
    approvedParks,
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
              }}
              pinColor={isFavorite ? '#ef4444' : '#8b5cf6'}
            >
              {isFavorite ? (
                <View style={styles.favoriteMarker}>
                  <Text style={styles.favoriteMarkerText}>♥</Text>
                </View>
              ) : (
                <View style={styles.parkMarker}>
                  <Text style={styles.parkMarkerText}>•</Text>
                </View>
              )}
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
        onRequestClose={() => setSelectedPark(null)}
        transparent
        visible={selectedPark !== null}
      >
        <Pressable
          onPress={() => setSelectedPark(null)}
          style={styles.modalBackdrop}
        >
          <Pressable
            onPress={(event) => event.stopPropagation()}
            style={styles.modalCard}
          >
            <Text style={styles.modalTitle}>{selectedPark?.name}</Text>
            <Text style={styles.modalDescription}>
              {selectedPark && favoriteParkIds.includes(selectedPark.id)
                ? 'This park is saved in your favorites.'
                : 'Save this park to your favorites for quick access.'}
            </Text>
            <View style={styles.modalActions}>
              <Pressable
                disabled={favoritingParkId !== null}
                onPress={() => setSelectedPark(null)}
                style={({ pressed }) => [
                  styles.modalCancelButton,
                  pressed ? styles.buttonPressed : null,
                ]}
              >
                <Text style={styles.modalCancelButtonText}>Close</Text>
              </Pressable>
              <Pressable
                disabled={favoritingParkId !== null}
                onPress={handleToggleFavorite}
                style={({ pressed }) => [
                  styles.modalSubmitButton,
                  favoritingParkId !== null ? styles.buttonDisabled : null,
                  pressed && favoritingParkId === null ? styles.buttonPressed : null,
                ]}
              >
                <Text style={styles.modalSubmitButtonText}>
                  {favoritingParkId === selectedPark?.id
                    ? 'Saving...'
                    : selectedPark && favoriteParkIds.includes(selectedPark.id)
                      ? 'Remove Favorite'
                      : 'Save Favorite'}
                </Text>
              </Pressable>
            </View>
          </Pressable>
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
  parkMarkerText: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: '700',
    lineHeight: 24,
  },
  favoriteMarker: {
    alignItems: 'center',
    backgroundColor: '#ef4444',
    borderColor: '#ffffff',
    borderRadius: 18,
    borderWidth: 2,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  favoriteMarkerText: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '700',
    lineHeight: 22,
  },
  topControls: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 10,
    left: 14,
    position: 'absolute',
    right: 14,
    justifyContent: 'space-between',
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
});
