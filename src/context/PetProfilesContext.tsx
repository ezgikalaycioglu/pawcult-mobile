import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import { supabase } from '../lib/supabase';
import { CreateMobilePetInput, MobilePetProfile } from '../types/pets';
import { useAuth } from './AuthContext';

type PetProfilesContextType = {
  createPet: (input: CreateMobilePetInput) => Promise<void>;
  creating: boolean;
  error: string | null;
  fetchPets: () => Promise<void>;
  loading: boolean;
  pets: MobilePetProfile[];
  resetPets: () => void;
};

type PetProfileRow = {
  id: string;
  user_id: string;
  name: string;
  breed: string;
  bio: string | null;
  profile_photo_url: string | null;
  created_at: string;
};

const PetProfilesContext = createContext<PetProfilesContextType | undefined>(undefined);

const mapPetRow = (row: PetProfileRow): MobilePetProfile => ({
  id: row.id,
  userId: row.user_id,
  name: row.name,
  breed: row.breed,
  bio: row.bio,
  profilePhotoUri: row.profile_photo_url,
  createdAt: row.created_at,
});

const getFileExtension = (uri: string, mimeType: string | null) => {
  const mimeExtension = mimeType?.split('/')[1]?.toLowerCase();
  if (mimeExtension) {
    if (mimeExtension === 'jpeg') return 'jpg';
    return mimeExtension;
  }

  const cleanUri = uri.split('?')[0] ?? uri;
  const extension = cleanUri.split('.').pop()?.toLowerCase();

  if (!extension || extension.length > 5) {
    return 'jpg';
  }

  return extension;
};

const getContentType = (extension: string, mimeType: string | null) => {
  if (mimeType) {
    return mimeType;
  }

  switch (extension) {
    case 'png':
      return 'image/png';
    case 'gif':
      return 'image/gif';
    case 'webp':
      return 'image/webp';
    case 'heic':
      return 'image/heic';
    case 'jpeg':
    case 'jpg':
    default:
      return 'image/jpeg';
  }
};

const base64ToArrayBuffer = (base64: string) => {
  const binaryString = atob(base64);
  const length = binaryString.length;
  const bytes = new Uint8Array(length);

  for (let index = 0; index < length; index += 1) {
    bytes[index] = binaryString.charCodeAt(index);
  }

  return bytes.buffer;
};

export const PetProfilesProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [pets, setPets] = useState<MobilePetProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resetPets = () => {
    setPets([]);
    setError(null);
    setLoading(false);
    setCreating(false);
  };

  const fetchPets = async () => {
    if (!user?.id) {
      setPets([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('pet_profiles')
        .select('id, user_id, name, breed, bio, profile_photo_url, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (fetchError) {
        throw fetchError;
      }

      setPets((data ?? []).map((row) => mapPetRow(row as PetProfileRow)));
    } catch (fetchError) {
      const message =
        fetchError instanceof Error
          ? fetchError.message
          : 'Unable to load pet profiles right now.';

      setError(message);
      setPets([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user?.id) {
      resetPets();
      return;
    }

    void fetchPets();
  }, [user?.id]);

  const createPet = async (input: CreateMobilePetInput) => {
    if (!user?.id) {
      throw new Error('User session is required to create a pet profile.');
    }

    setCreating(true);
    setError(null);

    let uploadedPath: string | null = null;

    try {
      let profilePhotoUrl: string | null = null;

      if (input.profilePhotoUri && input.profilePhotoBase64) {
        const extension = getFileExtension(
          input.profilePhotoUri,
          input.profilePhotoMimeType
        );
        const contentType = getContentType(extension, input.profilePhotoMimeType);
        const filePath = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${extension}`;
        const arrayBuffer = base64ToArrayBuffer(input.profilePhotoBase64);

        const { error: uploadError } = await supabase.storage
          .from('pet-photos')
          .upload(filePath, arrayBuffer, {
            contentType,
            upsert: false,
          });

        if (uploadError) {
          throw uploadError;
        }

        uploadedPath = filePath;

        const { data: publicUrlData } = supabase.storage
          .from('pet-photos')
          .getPublicUrl(filePath);

        profilePhotoUrl = publicUrlData.publicUrl;
      }

      const { data, error: insertError } = await supabase
        .from('pet_profiles')
        .insert({
          bio: input.bio.trim() ? input.bio.trim() : null,
          breed: input.breed.trim(),
          name: input.name.trim(),
          profile_photo_url: profilePhotoUrl,
          user_id: user.id,
        })
        .select('id, user_id, name, breed, bio, profile_photo_url, created_at')
        .single();

      if (insertError) {
        throw insertError;
      }

      setPets((currentPets) => [mapPetRow(data as PetProfileRow), ...currentPets]);
    } catch (createError) {
      if (uploadedPath) {
        await supabase.storage.from('pet-photos').remove([uploadedPath]);
      }

      const message =
        createError instanceof Error
          ? createError.message
          : 'Unable to create pet profile right now.';

      setError(message);
      throw new Error(message);
    } finally {
      setCreating(false);
    }
  };

  const value = useMemo<PetProfilesContextType>(
    () => ({
      pets,
      loading,
      creating,
      error,
      fetchPets,
      createPet,
      resetPets,
    }),
    [pets, loading, creating, error]
  );

  return (
    <PetProfilesContext.Provider value={value}>
      {children}
    </PetProfilesContext.Provider>
  );
};

export const usePetProfiles = () => {
  const context = useContext(PetProfilesContext);

  if (!context) {
    throw new Error('usePetProfiles must be used within a PetProfilesProvider');
  }

  return context;
};
