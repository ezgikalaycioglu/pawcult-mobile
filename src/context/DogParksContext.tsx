import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import { supabase } from '../lib/supabase';
import {
  CreateDogParkInput,
  DogParkStatus,
  MobileDogPark,
  MobileDogParkFavorite,
} from '../types/dogParks';
import { useAuth } from './AuthContext';

type DogParksContextType = {
  approvedParks: MobileDogPark[];
  createDogPark: (input: CreateDogParkInput) => Promise<void>;
  creating: boolean;
  error: string | null;
  favoriteParkIds: string[];
  favoriteParks: MobileDogPark[];
  favoritingParkId: string | null;
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

export const DogParksProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [parks, setParks] = useState<MobileDogPark[]>([]);
  const [favorites, setFavorites] = useState<MobileDogParkFavorite[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [favoritingParkId, setFavoritingParkId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchDogParks = async () => {
    if (!user?.id) {
      setParks([]);
      setFavorites([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const [parksResult, favoritesResult] = await Promise.all([
        supabase
          .from('dog_parks')
          .select('id, name, latitude, longitude, status, created_by, created_at')
          .order('created_at', { ascending: false }),
        supabase
          .from('dog_park_favorites')
          .select('dog_park_id, created_at')
          .order('created_at', { ascending: false }),
      ]);

      if (parksResult.error) {
        throw parksResult.error;
      }

      if (favoritesResult.error) {
        throw favoritesResult.error;
      }

      setParks((parksResult.data ?? []).map((row) => mapDogParkRow(row as DogParkRow)));
      setFavorites(
        (favoritesResult.data ?? []).map((row) =>
          mapDogParkFavoriteRow(row as DogParkFavoriteRow)
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
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user?.id) {
      setParks([]);
      setFavorites([]);
      setError(null);
      setLoading(false);
      setCreating(false);
      setFavoritingParkId(null);
      return;
    }

    void fetchDogParks();
  }, [user?.id]);

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
      parks,
      parkRequests,
      favoriteParkIds,
      favoriteParks,
      loading,
      creating,
      favoritingParkId,
      error,
      fetchDogParks,
      createDogPark,
      toggleFavoritePark,
    }),
    [
      approvedParks,
      parks,
      parkRequests,
      favoriteParkIds,
      favoriteParks,
      loading,
      creating,
      favoritingParkId,
      error,
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
