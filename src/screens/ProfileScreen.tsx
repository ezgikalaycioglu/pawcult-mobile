import { useMemo } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { usePetProfiles } from '../context/PetProfilesContext';
import { RootStackParamList } from '../navigation/AppNavigator';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export const ProfileScreen = () => {
  const { pets, loading, error } = usePetProfiles();
  const navigation = useNavigation<NavigationProp>();

  const petSummary = useMemo(() => {
    if (loading) {
      return 'Loading pets...';
    }

    if (pets.length === 0) {
      return 'No pets added yet';
    }

    return `${pets.length} ${pets.length === 1 ? 'pet' : 'pets'} on your profile`;
  }, [loading, pets.length]);

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
                  <Text style={styles.petName}>{pet.name}</Text>
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
  petName: {
    color: '#0f172a',
    fontSize: 20,
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
});
