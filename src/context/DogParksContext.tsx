import {
  createContext,
  useCallback,
  ReactNode,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import { supabase } from '../lib/supabase';
import {
  CreateDogParkCheckInInput,
  CreateDogParkInput,
  DogParkStatus,
  MobileDogParkCheckIn,
  MobileDogParkCheckInPet,
  MobileDogPark,
  MobileDogParkFavorite,
} from '../types/dogParks';
import { useAuth } from './AuthContext';

type DogParksContextType = {
  approvedParks: MobileDogPark[];
  checkInPets: (input: CreateDogParkCheckInInput) => Promise<void>;
  checkIns: MobileDogParkCheckIn[];
  checkInsByParkId: Record<string, MobileDogParkCheckIn[]>;
  checkInsLoading: boolean;
  checkingIn: boolean;
  checkingOutIds: string[];
  checkOutCheckIns: (checkInIds: string[]) => Promise<void>;
  createDogPark: (input: CreateDogParkInput) => Promise<void>;
  creating: boolean;
  error: string | null;
  favoriteParkIds: string[];
  favoriteParks: MobileDogPark[];
  favoritingParkId: string | null;
  fetchDogParkCheckIns: () => Promise<void>;
  fetchDogParks: () => Promise<void>;
  loading: boolean;
  parkRequests: MobileDogPark[];
  parks: MobileDogPark[];
  toggleFavoritePark: (parkId: string) => Promise<void>;
};

type DogParkRow = {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  status: DogParkStatus;
  created_by: string;
  created_at: string;
};

type DogParkFavoriteRow = {
  dog_park_id: string;
  created_at: string;
};

type DogParkCheckInPetRow = {
  id: string;
  name: string;
  breed: string;
  bio: string | null;
  profile_photo_url: string | null;
};

type DogParkCheckInRow = {
  id: string;
  dog_park_id: string;
  user_id: string;
  pet_id: string;
  starts_at: string;
  ends_at: string;
  checked_out_at: string | null;
  created_at: string;
  pet_profiles: DogParkCheckInPetRow | DogParkCheckInPetRow[] | null;
};

const DogParksContext = createContext<DogParksContextType | undefined>(undefined);

const mapDogParkRow = (row: DogParkRow): MobileDogPark => ({
  id: row.id,
  name: row.name,
  latitude: row.latitude,
  longitude: row.longitude,
  status: row.status,
  createdBy: row.created_by,
  createdAt: row.created_at,
});

const mapDogParkFavoriteRow = (
  row: DogParkFavoriteRow
): MobileDogParkFavorite => ({
  dogParkId: row.dog_park_id,
  createdAt: row.created_at,
});

const getCheckInPet = (
  petProfiles: DogParkCheckInRow['pet_profiles']
): DogParkCheckInPetRow | null => {
  if (Array.isArray(petProfiles)) {
    return petProfiles[0] ?? null;
  }

  return petProfiles;
};

const mapDogParkCheckInRow = (row: DogParkCheckInRow): MobileDogParkCheckIn => {
  const pet = getCheckInPet(row.pet_profiles);
  const mappedPet: MobileDogParkCheckInPet | null = pet
    ? {
        id: pet.id,
        name: pet.name,
        breed: pet.breed,
        bio: pet.bio,
        profilePhotoUri: pet.profile_photo_url,
      }
    : null;

  return {
    id: row.id,
    dogParkId: row.dog_park_id,
    userId: row.user_id,
    petId: row.pet_id,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    checkedOutAt: row.checked_out_at,
    createdAt: row.created_at,
    pet: mappedPet,
  };
};

export const DogParksProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [parks, setParks] = useState<MobileDogPark[]>([]);
  const [favorites, setFavorites] = useState<MobileDogParkFavorite[]>([]);
  const [checkIns, setCheckIns] = useState<MobileDogParkCheckIn[]>([]);
  const [loading, setLoading] = useState(false);
  const [checkInsLoading, setCheckInsLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [checkingIn, setCheckingIn] = useState(false);
  const [favoritingParkId, setFavoritingParkId] = useState<string | null>(null);
  const [checkingOutIds, setCheckingOutIds] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const fetchDogParkCheckIns = useCallback(async () => {
    if (!user?.id) {
      setCheckIns([]);
      return;
    }

    setCheckInsLoading(true);
    setError(null);

    try {
      const now = new Date();
      const futureCutoff = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      const { data, error: fetchError } = await supabase
        .from('dog_park_checkins')
        .select(
          'id, dog_park_id, user_id, pet_id, starts_at, ends_at, checked_out_at, created_at, pet_profiles(id, name, breed, bio, profile_photo_url)'
        )
        .is('checked_out_at', null)
        .gt('ends_at', now.toISOString())
        .lte('starts_at', futureCutoff.toISOString())
        .order('starts_at', { ascending: true });

      if (fetchError) {
        throw fetchError;
      }

      setCheckIns(
        (data ?? []).map((row) =>
          mapDogParkCheckInRow(row as unknown as DogParkCheckInRow)
        )
      );
    } catch (fetchError) {
      const message =
        fetchError instanceof Error
          ? fetchError.message
          : 'Unable to load dog park check-ins right now.';

      setError(message);
      setCheckIns([]);
    } finally {
      setCheckInsLoading(false);
    }
  }, [user?.id]);

  const fetchDogParks = useCallback(async () => {
    if (!user?.id) {
      setParks([]);
      setFavorites([]);
      setCheckIns([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const now = new Date();
      const futureCutoff = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      const [parksResult, favoritesResult, checkInsResult] = await Promise.all([
        supabase
          .from('dog_parks')
          .select('id, name, latitude, longitude, status, created_by, created_at')
          .order('created_at', { ascending: false }),
        supabase
          .from('dog_park_favorites')
          .select('dog_park_id, created_at')
          .order('created_at', { ascending: false }),
        supabase
          .from('dog_park_checkins')
          .select(
            'id, dog_park_id, user_id, pet_id, starts_at, ends_at, checked_out_at, created_at, pet_profiles(id, name, breed, bio, profile_photo_url)'
          )
          .is('checked_out_at', null)
          .gt('ends_at', now.toISOString())
          .lte('starts_at', futureCutoff.toISOString())
          .order('starts_at', { ascending: true }),
      ]);

      if (parksResult.error) {
        throw parksResult.error;
      }

      if (favoritesResult.error) {
        throw favoritesResult.error;
      }

      if (checkInsResult.error) {
        throw checkInsResult.error;
      }

      setParks((parksResult.data ?? []).map((row) => mapDogParkRow(row as DogParkRow)));
      setFavorites(
        (favoritesResult.data ?? []).map((row) =>
          mapDogParkFavoriteRow(row as DogParkFavoriteRow)
        )
      );
      setCheckIns(
        (checkInsResult.data ?? []).map((row) =>
          mapDogParkCheckInRow(row as unknown as DogParkCheckInRow)
        )
      );
    } catch (fetchError) {
      const message =
        fetchError instanceof Error
          ? fetchError.message
          : 'Unable to load dog parks right now.';

      setError(message);
      setParks([]);
      setFavorites([]);
      setCheckIns([]);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id) {
      setParks([]);
      setFavorites([]);
      setCheckIns([]);
      setError(null);
      setLoading(false);
      setCheckInsLoading(false);
      setCreating(false);
      setCheckingIn(false);
      setFavoritingParkId(null);
      setCheckingOutIds([]);
      return;
    }

    void fetchDogParks();
  }, [fetchDogParks, user?.id]);

  useEffect(() => {
    if (!user?.id) {
      return;
    }

    const channel = supabase
      .channel('dog-park-checkins')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'dog_park_checkins' },
        () => {
          void fetchDogParkCheckIns();
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [fetchDogParkCheckIns, user?.id]);

  const createDogPark = async (input: CreateDogParkInput) => {
    if (!user?.id) {
      throw new Error('User session is required to add a dog park.');
    }

    setCreating(true);
    setError(null);

    try {
      const { data, error: insertError } = await supabase
        .from('dog_parks')
        .insert({
          created_by: user.id,
          latitude: input.latitude,
          longitude: input.longitude,
          name: input.name.trim(),
        })
        .select('id, name, latitude, longitude, status, created_by, created_at')
        .single();

      if (insertError) {
        throw insertError;
      }

      setParks((currentParks) => [
        mapDogParkRow(data as DogParkRow),
        ...currentParks,
      ]);
    } catch (createError) {
      const message =
        createError instanceof Error
          ? createError.message
          : 'Unable to submit this dog park right now.';

      setError(message);
      throw new Error(message);
    } finally {
      setCreating(false);
    }
  };

  const approvedParks = useMemo(
    () => parks.filter((park) => park.status === 'approved'),
    [parks]
  );

  const parkRequests = useMemo(
    () => parks.filter((park) => park.createdBy === user?.id),
    [parks, user?.id]
  );

  const favoriteParkIds = useMemo(
    () => favorites.map((favorite) => favorite.dogParkId),
    [favorites]
  );

  const favoriteParks = useMemo(
    () => approvedParks.filter((park) => favoriteParkIds.includes(park.id)),
    [approvedParks, favoriteParkIds]
  );

  const checkInsByParkId = useMemo(
    () =>
      checkIns.reduce<Record<string, MobileDogParkCheckIn[]>>((accumulator, checkIn) => {
        const parkCheckIns = accumulator[checkIn.dogParkId] ?? [];
        accumulator[checkIn.dogParkId] = [...parkCheckIns, checkIn];
        return accumulator;
      }, {}),
    [checkIns]
  );

  const checkInPets = async (input: CreateDogParkCheckInInput) => {
    if (!user?.id) {
      throw new Error('User session is required to check in.');
    }

    const park = approvedParks.find((approvedPark) => approvedPark.id === input.dogParkId);
    if (!park) {
      throw new Error('Pets can only check in at approved dog parks.');
    }

    const uniquePetIds = [...new Set(input.petIds)];
    if (uniquePetIds.length === 0) {
      throw new Error('Choose at least one pet to check in.');
    }

    if (input.endsAt <= input.startsAt) {
      throw new Error('Check-out time must be after check-in time.');
    }

    setCheckingIn(true);
    setError(null);

    try {
      const rows = uniquePetIds.map((petId) => ({
        dog_park_id: input.dogParkId,
        ends_at: input.endsAt.toISOString(),
        pet_id: petId,
        starts_at: input.startsAt.toISOString(),
        user_id: user.id,
      }));

      const { error: insertError } = await supabase
        .from('dog_park_checkins')
        .insert(rows);

      if (insertError) {
        throw insertError;
      }

      await fetchDogParkCheckIns();
    } catch (checkInError) {
      const message =
        checkInError instanceof Error
          ? checkInError.message
          : 'Unable to check in right now.';

      setError(message);
      throw new Error(message);
    } finally {
      setCheckingIn(false);
    }
  };

  const checkOutCheckIns = async (checkInIds: string[]) => {
    if (!user?.id) {
      throw new Error('User session is required to check out.');
    }

    const uniqueCheckInIds = [...new Set(checkInIds)];
    if (uniqueCheckInIds.length === 0) {
      return;
    }

    setCheckingOutIds(uniqueCheckInIds);
    setError(null);

    try {
      const { error: updateError } = await supabase
        .from('dog_park_checkins')
        .update({ checked_out_at: new Date().toISOString() })
        .in('id', uniqueCheckInIds)
        .eq('user_id', user.id);

      if (updateError) {
        throw updateError;
      }

      setCheckIns((currentCheckIns) =>
        currentCheckIns.filter((checkIn) => !uniqueCheckInIds.includes(checkIn.id))
      );
    } catch (checkOutError) {
      const message =
        checkOutError instanceof Error
          ? checkOutError.message
          : 'Unable to check out right now.';

      setError(message);
      throw new Error(message);
    } finally {
      setCheckingOutIds([]);
    }
  };

  const toggleFavoritePark = async (parkId: string) => {
    if (!user?.id) {
      throw new Error('User session is required to update favorites.');
    }

    const park = approvedParks.find((approvedPark) => approvedPark.id === parkId);
    if (!park) {
      throw new Error('Only approved dog parks can be saved as favorites.');
    }

    const isFavorite = favoriteParkIds.includes(parkId);
    setFavoritingParkId(parkId);
    setError(null);

    try {
      if (isFavorite) {
        const { error: deleteError } = await supabase
          .from('dog_park_favorites')
          .delete()
          .eq('dog_park_id', parkId)
          .eq('user_id', user.id);

        if (deleteError) {
          throw deleteError;
        }

        setFavorites((currentFavorites) =>
          currentFavorites.filter((favorite) => favorite.dogParkId !== parkId)
        );
      } else {
        const { data, error: insertError } = await supabase
          .from('dog_park_favorites')
          .insert({
            dog_park_id: parkId,
            user_id: user.id,
          })
          .select('dog_park_id, created_at')
          .single();

        if (insertError) {
          throw insertError;
        }

        setFavorites((currentFavorites) => [
          mapDogParkFavoriteRow(data as DogParkFavoriteRow),
          ...currentFavorites,
        ]);
      }
    } catch (favoriteError) {
      const message =
        favoriteError instanceof Error
          ? favoriteError.message
          : 'Unable to update favorite parks right now.';

      setError(message);
      throw new Error(message);
    } finally {
      setFavoritingParkId(null);
    }
  };

  const value = useMemo<DogParksContextType>(
    () => ({
      approvedParks,
      checkIns,
      checkInsByParkId,
      checkInsLoading,
      checkingIn,
      checkingOutIds,
      parks,
      parkRequests,
      favoriteParkIds,
      favoriteParks,
      loading,
      creating,
      favoritingParkId,
      error,
      fetchDogParks,
      fetchDogParkCheckIns,
      createDogPark,
      checkInPets,
      checkOutCheckIns,
      toggleFavoritePark,
    }),
    [
      approvedParks,
      checkIns,
      checkInsByParkId,
      checkInsLoading,
      checkingIn,
      checkingOutIds,
      parks,
      parkRequests,
      favoriteParkIds,
      favoriteParks,
      loading,
      creating,
      favoritingParkId,
      error,
      fetchDogParks,
      fetchDogParkCheckIns,
    ]
  );

  return (
    <DogParksContext.Provider value={value}>
      {children}
    </DogParksContext.Provider>
  );
};

export const useDogParks = () => {
  const context = useContext(DogParksContext);

  if (!context) {
    throw new Error('useDogParks must be used within a DogParksProvider');
  }

  return context;
};
