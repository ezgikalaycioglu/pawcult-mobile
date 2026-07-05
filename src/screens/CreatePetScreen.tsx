import { useMemo, useState } from 'react';
import {
  Alert,
  Image,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import { KeyboardSafeScreen } from '../components/KeyboardSafeScreen';
import { usePetProfiles } from '../context/PetProfilesContext';
import { RootStackParamList } from '../navigation/AppNavigator';

type Props = NativeStackScreenProps<RootStackParamList, 'CreatePet'>;

const MAX_NAME_LENGTH = 50;
const MAX_BREED_LENGTH = 100;
const MAX_BIO_LENGTH = 500;

export const CreatePetScreen = ({ navigation }: Props) => {
  const { createPet, creating } = usePetProfiles();
  const [name, setName] = useState('');
  const [breed, setBreed] = useState('');
  const [bio, setBio] = useState('');
  const [profilePhotoUri, setProfilePhotoUri] = useState<string | null>(null);
  const [profilePhotoBase64, setProfilePhotoBase64] = useState<string | null>(null);
  const [profilePhotoMimeType, setProfilePhotoMimeType] = useState<string | null>(null);
  const [isPickingImage, setIsPickingImage] = useState(false);

  const trimmedName = name.trim();
  const trimmedBreed = breed.trim();
  const canSave = useMemo(
    () => Boolean(trimmedName && trimmedBreed && !isPickingImage && !creating),
    [isPickingImage, creating, trimmedBreed, trimmedName]
  );

  const handlePickImage = async () => {
    try {
      setIsPickingImage(true);
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permission.granted) {
        Alert.alert(
          'Photo access needed',
          'Allow photo library access to add a pet profile photo.'
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        allowsEditing: true,
        aspect: [1, 1],
        base64: true,
        mediaTypes: ['images'],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]?.uri) {
        const asset = result.assets[0];
        setProfilePhotoUri(asset.uri);
        setProfilePhotoBase64(asset.base64 ?? null);
        setProfilePhotoMimeType(asset.mimeType ?? 'image/jpeg');
      }
    } catch (_error) {
      Alert.alert('Photo selection failed', 'Please try choosing a photo again.');
    } finally {
      setIsPickingImage(false);
    }
  };

  const handleSave = async () => {
    if (!trimmedName || !trimmedBreed) {
      Alert.alert('Missing information', 'Pet name and breed are required.');
      return;
    }

    try {
      await createPet({
        bio,
        breed,
        name,
        profilePhotoUri,
        profilePhotoBase64,
        profilePhotoMimeType,
      });
      navigation.goBack();
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Unable to create pet profile right now.';

      Alert.alert('Save failed', message);
    }
  };

  return (
    <KeyboardSafeScreen
      contentStyle={styles.content}
      footer={
        <View style={styles.footer}>
          <Pressable
            disabled={!canSave}
            onPress={handleSave}
            style={({ pressed }) => [
              styles.saveButton,
              !canSave ? styles.saveButtonDisabled : null,
              pressed && canSave ? styles.saveButtonPressed : null,
            ]}
          >
            <Text style={styles.saveButtonText}>
              {creating ? 'Saving...' : 'Save Pet'}
            </Text>
          </Pressable>
        </View>
      }
      safeAreaEdges={['left', 'right', 'bottom']}
      style={styles.screen}
    >
      <View style={styles.headerCard}>
        <Text style={styles.headerTitle}>Create Pet Profile</Text>
        <Text style={styles.headerSubtitle}>
          Add your pet to your mobile profile and save it to PawCult.
        </Text>
      </View>

      <View style={styles.sectionCard}>
        <Text style={styles.sectionLabel}>Profile Photo</Text>
        <Pressable
          onPress={handlePickImage}
          style={({ pressed }) => [styles.photoPicker, pressed ? styles.photoPressed : null]}
        >
          {profilePhotoUri ? (
            <Image source={{ uri: profilePhotoUri }} style={styles.photoPreview} />
          ) : (
            <View style={styles.photoPlaceholder}>
              <Text style={styles.photoPlaceholderIcon}>◌</Text>
              <Text style={styles.photoPlaceholderTitle}>
                {isPickingImage ? 'Opening library...' : 'Add a photo'}
              </Text>
              <Text style={styles.photoPlaceholderHint}>
                Choose a square profile image for your pet
              </Text>
            </View>
          )}
        </Pressable>
        {profilePhotoUri ? (
          <Pressable
            onPress={handlePickImage}
            style={({ pressed }) => [styles.secondaryAction, pressed ? styles.secondaryActionPressed : null]}
          >
            <Text style={styles.secondaryActionText}>Change Photo</Text>
          </Pressable>
        ) : null}
      </View>

      <View style={styles.sectionCard}>
        <Text style={styles.inputLabel}>Pet Name *</Text>
        <TextInput
          maxLength={MAX_NAME_LENGTH}
          onChangeText={setName}
          placeholder="Enter your pet's name"
          placeholderTextColor="#94a3b8"
          style={styles.input}
          value={name}
        />
        <Text style={styles.counter}>{name.length}/{MAX_NAME_LENGTH}</Text>

        <Text style={[styles.inputLabel, styles.inputLabelSpaced]}>Breed or Mix *</Text>
        <TextInput
          maxLength={MAX_BREED_LENGTH}
          onChangeText={setBreed}
          placeholder="e.g. Golden Retriever or Mixed Breed"
          placeholderTextColor="#94a3b8"
          style={styles.input}
          value={breed}
        />
        <Text style={styles.counter}>{breed.length}/{MAX_BREED_LENGTH}</Text>

        <Text style={[styles.inputLabel, styles.inputLabelSpaced]}>Bio</Text>
        <TextInput
          maxLength={MAX_BIO_LENGTH}
          multiline
          onChangeText={setBio}
          placeholder="Tell us a little about your pet"
          placeholderTextColor="#94a3b8"
          style={styles.textarea}
          textAlignVertical="top"
          value={bio}
        />
        <Text style={styles.counter}>{bio.length}/{MAX_BIO_LENGTH}</Text>
      </View>
    </KeyboardSafeScreen>
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
    paddingBottom: 140,
  },
  headerCard: {
    backgroundColor: '#ffffff',
    borderColor: '#e2e8f0',
    borderRadius: 24,
    borderWidth: 1,
    padding: 20,
  },
  headerTitle: {
    color: '#0f172a',
    fontSize: 28,
    fontWeight: '700',
  },
  headerSubtitle: {
    color: '#64748b',
    fontSize: 15,
    lineHeight: 22,
    marginTop: 8,
  },
  sectionCard: {
    backgroundColor: '#ffffff',
    borderColor: '#e2e8f0',
    borderRadius: 24,
    borderWidth: 1,
    padding: 20,
  },
  sectionLabel: {
    color: '#0f172a',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 14,
  },
  photoPicker: {
    alignItems: 'center',
    alignSelf: 'center',
    backgroundColor: '#faf5ff',
    borderColor: '#ddd6fe',
    borderRadius: 80,
    borderStyle: 'dashed',
    borderWidth: 2,
    height: 160,
    justifyContent: 'center',
    overflow: 'hidden',
    width: 160,
  },
  photoPressed: {
    opacity: 0.9,
  },
  photoPreview: {
    height: '100%',
    width: '100%',
  },
  photoPlaceholder: {
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  photoPlaceholderIcon: {
    color: '#8b5cf6',
    fontSize: 40,
    marginBottom: 8,
  },
  photoPlaceholderTitle: {
    color: '#5b21b6',
    fontSize: 16,
    fontWeight: '700',
  },
  photoPlaceholderHint: {
    color: '#7c3aed',
    fontSize: 13,
    lineHeight: 18,
    marginTop: 4,
    textAlign: 'center',
  },
  secondaryAction: {
    alignItems: 'center',
    alignSelf: 'center',
    marginTop: 14,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  secondaryActionPressed: {
    opacity: 0.8,
  },
  secondaryActionText: {
    color: '#8b5cf6',
    fontSize: 14,
    fontWeight: '700',
  },
  inputLabel: {
    color: '#0f172a',
    fontSize: 15,
    fontWeight: '600',
  },
  inputLabelSpaced: {
    marginTop: 18,
  },
  input: {
    backgroundColor: '#ffffff',
    borderColor: '#e2e8f0',
    borderRadius: 14,
    borderWidth: 1,
    color: '#0f172a',
    fontSize: 16,
    marginTop: 8,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  textarea: {
    backgroundColor: '#ffffff',
    borderColor: '#e2e8f0',
    borderRadius: 14,
    borderWidth: 1,
    color: '#0f172a',
    fontSize: 16,
    marginTop: 8,
    minHeight: 120,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  counter: {
    color: '#64748b',
    fontSize: 12,
    marginTop: 6,
    textAlign: 'right',
  },
  footer: {
    backgroundColor: '#ffffff',
    borderTopColor: '#e2e8f0',
    borderTopWidth: 1,
    bottom: 0,
    left: 0,
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 28,
    position: 'absolute',
    right: 0,
  },
  saveButton: {
    alignItems: 'center',
    backgroundColor: '#8b5cf6',
    borderRadius: 16,
    justifyContent: 'center',
    minHeight: 56,
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonPressed: {
    opacity: 0.9,
  },
  saveButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
});
