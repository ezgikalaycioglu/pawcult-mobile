import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import { useAuth } from './AuthContext';
import { CreateMobilePetInput, MobilePetProfile } from '../types/pets';

type PetProfilesContextType = {
  addPet: (input: CreateMobilePetInput) => MobilePetProfile;
  pets: MobilePetProfile[];
  resetPets: () => void;
};

const PetProfilesContext = createContext<PetProfilesContextType | undefined>(undefined);

export const PetProfilesProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [pets, setPets] = useState<MobilePetProfile[]>([]);

  useEffect(() => {
    if (!user?.id) {
      setPets([]);
    }
  }, [user?.id]);

  const value = useMemo<PetProfilesContextType>(
    () => ({
      pets,
      addPet: (input: CreateMobilePetInput) => {
        if (!user?.id) {
          throw new Error('User session is required to create a pet profile.');
        }

        const pet: MobilePetProfile = {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          userId: user.id,
          name: input.name.trim(),
          breed: input.breed.trim(),
          bio: input.bio.trim() ? input.bio.trim() : null,
          profilePhotoUri: input.profilePhotoUri,
          createdAt: new Date().toISOString(),
        };

        setPets((currentPets) => [pet, ...currentPets]);
        return pet;
      },
      resetPets: () => setPets([]),
    }),
    [pets, user?.id]
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
