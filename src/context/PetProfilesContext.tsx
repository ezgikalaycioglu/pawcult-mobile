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
  CreateMobilePetInput,
  MobilePetProfile,
  PetOwnerInvite,
  PetOwnerInvitePreview,
  PetOwnerRequest,
  PetOwnerRequestDirection,
  PetOwnerSummary,
  UpdateMobilePetInput,
} from '../types/pets';
import { useAuth } from './AuthContext';

type PetProfilesContextType = {
  acceptPetOwnerInvite: (token: string) => Promise<string>;
  acceptPetOwnerRequest: (inviteId: string) => Promise<string>;
  cancelPetOwnerInvite: (inviteId: string) => Promise<string>;
  createPetOwnerInvite: (petId: string, invitedEmail: string) => Promise<PetOwnerInvite>;
  createPet: (input: CreateMobilePetInput) => Promise<void>;
  creating: boolean;
  declinePetOwnerRequest: (inviteId: string) => Promise<string>;
  error: string | null;
  fetchPetOwnerRequests: (
    direction: PetOwnerRequestDirection
  ) => Promise<PetOwnerRequest[]>;
  fetchPets: () => Promise<void>;
  getPetOwners: (petId: string) => Promise<PetOwnerSummary[]>;
  getPetOwnerInvitePreview: (token: string) => Promise<PetOwnerInvitePreview>;
  loading: boolean;
  pets: MobilePetProfile[];
  resetPets: () => void;
  updatePet: (petId: string, input: UpdateMobilePetInput) => Promise<MobilePetProfile>;
};

type PetProfileRow = {
  id: string;
  user_id: string;
  created_by_user_id: string | null;
  name: string;
  breed: string;
  bio: string | null;
  profile_photo_url: string | null;
  created_at: string;
};

type PetOwnerProfileRow = {
  pet_profiles: PetProfileRow | PetProfileRow[] | null;
};

type PetOwnerCountRow = {
  pet_id: string;
};

type PetOwnerInviteRow = {
  id: string;
  token: string;
  invited_email: string;
  expires_at: string;
};

type PetOwnerInvitePreviewRow = {
  pet_name: string;
  inviter_display_name: string | null;
  invited_email: string;
  expires_at: string;
  status: PetOwnerInvitePreview['status'];
};

type PetOwnerRequestRow = {
  id: string;
  pet_id: string;
  pet_name: string;
  inviter_display_name: string | null;
  inviter_email: string | null;
  invited_email: string;
  token: string | null;
  status: PetOwnerRequest['status'];
  created_at: string;
  expires_at: string;
};

type PetOwnerSummaryRow = {
  id: string;
  user_id: string;
  display_name: string;
  email: string | null;
  role: PetOwnerSummary['role'];
  status: PetOwnerSummary['status'];
  accepted_at: string | null;
  is_current_user: boolean;
};

const PetProfilesContext = createContext<PetProfilesContextType | undefined>(undefined);

const getOwnedPetProfile = (
  petProfiles: PetOwnerProfileRow['pet_profiles']
): PetProfileRow | null => {
  if (Array.isArray(petProfiles)) {
    return petProfiles[0] ?? null;
  }

  return petProfiles;
};

const mapPetRow = (
  row: PetProfileRow,
  activeOwnerCountByPetId: Record<string, number> = {}
): MobilePetProfile => {
  const activeOwnerCount = activeOwnerCountByPetId[row.id] ?? 1;

  return {
    id: row.id,
    userId: row.user_id,
    createdByUserId: row.created_by_user_id,
    name: row.name,
    breed: row.breed,
    bio: row.bio,
    profilePhotoUri: row.profile_photo_url,
    createdAt: row.created_at,
    activeOwnerCount,
    isShared: activeOwnerCount > 1,
  };
};

const getRpcRow = <TRow,>(data: TRow | TRow[] | null): TRow | null => {
  if (Array.isArray(data)) {
    return data[0] ?? null;
  }

  return data;
};

const mapInviteRow = (row: PetOwnerInviteRow): PetOwnerInvite => ({
  id: row.id,
  token: row.token,
  invitedEmail: row.invited_email,
  expiresAt: row.expires_at,
});

const mapInvitePreviewRow = (
  row: PetOwnerInvitePreviewRow
): PetOwnerInvitePreview => ({
  petName: row.pet_name,
  inviterDisplayName: row.inviter_display_name,
  invitedEmail: row.invited_email,
  expiresAt: row.expires_at,
  status: row.status,
});

const mapPetOwnerRequestRow = (row: PetOwnerRequestRow): PetOwnerRequest => ({
  id: row.id,
  petId: row.pet_id,
  petName: row.pet_name,
  inviterDisplayName: row.inviter_display_name,
  inviterEmail: row.inviter_email,
  invitedEmail: row.invited_email,
  token: row.token,
  status: row.status,
  createdAt: row.created_at,
  expiresAt: row.expires_at,
});

const mapOwnerSummaryRow = (row: PetOwnerSummaryRow): PetOwnerSummary => ({
  id: row.id,
  userId: row.user_id,
  displayName: row.display_name,
  email: row.email,
  role: row.role,
  status: row.status,
  acceptedAt: row.accepted_at,
  isCurrentUser: row.is_current_user,
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
        .from('pet_owners')
        .select(
          'pet_profiles(id, user_id, created_by_user_id, name, breed, bio, profile_photo_url, created_at)'
        )
        .eq('user_id', user.id)
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (fetchError) {
        throw fetchError;
      }

      const petRows = (data ?? [])
        .map((row) =>
          getOwnedPetProfile((row as unknown as PetOwnerProfileRow).pet_profiles)
        )
        .filter((row): row is PetProfileRow => row !== null);

      const petIds = petRows.map((pet) => pet.id);
      let activeOwnerCountByPetId: Record<string, number> = {};

      if (petIds.length > 0) {
        const { data: ownerRows, error: ownersError } = await supabase
          .from('pet_owners')
          .select('pet_id')
          .in('pet_id', petIds)
          .eq('status', 'active');

        if (ownersError) {
          throw ownersError;
        }

        activeOwnerCountByPetId = (ownerRows ?? []).reduce<
          Record<string, number>
        >((counts, row) => {
          const petId = (row as PetOwnerCountRow).pet_id;
          counts[petId] = (counts[petId] ?? 0) + 1;
          return counts;
        }, {});
      }

      setPets(
        petRows.map((row) => mapPetRow(row, activeOwnerCountByPetId))
      );
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
          created_by_user_id: user.id,
          name: input.name.trim(),
          profile_photo_url: profilePhotoUrl,
          user_id: user.id,
        })
        .select(
          'id, user_id, created_by_user_id, name, breed, bio, profile_photo_url, created_at'
        )
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

  const updatePet = async (
    petId: string,
    input: UpdateMobilePetInput
  ): Promise<MobilePetProfile> => {
    if (!user?.id) {
      throw new Error('User session is required to update a pet profile.');
    }

    const { data, error: updateError } = await supabase
      .from('pet_profiles')
      .update({
        bio: input.bio.trim() ? input.bio.trim() : null,
        breed: input.breed.trim(),
        name: input.name.trim(),
      })
      .eq('id', petId)
      .select(
        'id, user_id, created_by_user_id, name, breed, bio, profile_photo_url, created_at'
      )
      .single();

    if (updateError) {
      throw updateError;
    }

    const currentPet = pets.find((pet) => pet.id === petId);
    const updatedPet = mapPetRow(data as PetProfileRow, {
      [petId]: currentPet?.activeOwnerCount ?? 1,
    });

    setPets((currentPets) =>
      currentPets.map((pet) => (pet.id === petId ? updatedPet : pet))
    );

    return updatedPet;
  };

  const createPetOwnerInvite = async (
    petId: string,
    invitedEmail: string
  ): Promise<PetOwnerInvite> => {
    if (!user?.id) {
      throw new Error('User session is required to invite another owner.');
    }

    const { data, error: inviteError } = await supabase.rpc(
      'create_pet_owner_invite',
      {
        invited_email: invitedEmail,
        pet_id: petId,
      }
    );

    if (inviteError) {
      throw inviteError;
    }

    const row = getRpcRow(data as PetOwnerInviteRow | PetOwnerInviteRow[] | null);
    if (!row) {
      throw new Error('Unable to create invite right now.');
    }

    return mapInviteRow(row);
  };

  const getPetOwnerInvitePreview = async (
    token: string
  ): Promise<PetOwnerInvitePreview> => {
    const { data, error: previewError } = await supabase.rpc(
      'get_pet_owner_invite_preview',
      {
        invite_token: token,
      }
    );

    if (previewError) {
      throw previewError;
    }

    const row = getRpcRow(
      data as PetOwnerInvitePreviewRow | PetOwnerInvitePreviewRow[] | null
    );
    if (!row) {
      throw new Error('invite_not_found');
    }

    return mapInvitePreviewRow(row);
  };

  const getPetOwners = async (petId: string): Promise<PetOwnerSummary[]> => {
    if (!user?.id) {
      throw new Error('User session is required to view pet parents.');
    }

    const { data, error: ownersError } = await supabase.rpc(
      'get_pet_owner_summaries',
      {
        pet_id: petId,
      }
    );

    if (ownersError) {
      throw ownersError;
    }

    return ((data ?? []) as PetOwnerSummaryRow[]).map(mapOwnerSummaryRow);
  };

  const fetchPetOwnerRequests = async (
    direction: PetOwnerRequestDirection
  ): Promise<PetOwnerRequest[]> => {
    if (!user?.id) {
      throw new Error('User session is required to view pet owner requests.');
    }

    const { data, error: requestsError } = await supabase.rpc(
      'get_pet_owner_requests',
      {
        request_direction: direction,
      }
    );

    if (requestsError) {
      throw requestsError;
    }

    return ((data ?? []) as PetOwnerRequestRow[]).map(mapPetOwnerRequestRow);
  };

  const acceptPetOwnerInvite = async (token: string): Promise<string> => {
    if (!user?.id) {
      throw new Error('User session is required to accept this invite.');
    }

    const { data, error: acceptError } = await supabase.rpc(
      'accept_pet_owner_invite',
      {
        invite_token: token,
      }
    );

    if (acceptError) {
      throw acceptError;
    }

    await fetchPets();
    return data as string;
  };

  const acceptPetOwnerRequest = async (inviteId: string): Promise<string> => {
    if (!user?.id) {
      throw new Error('User session is required to accept this invite.');
    }

    const { data, error: acceptError } = await supabase.rpc(
      'accept_pet_owner_request',
      {
        invite_id: inviteId,
      }
    );

    if (acceptError) {
      throw acceptError;
    }

    await fetchPets();
    return data as string;
  };

  const declinePetOwnerRequest = async (inviteId: string): Promise<string> => {
    if (!user?.id) {
      throw new Error('User session is required to decline this invite.');
    }

    const { data, error: declineError } = await supabase.rpc(
      'decline_pet_owner_request',
      {
        invite_id: inviteId,
      }
    );

    if (declineError) {
      throw declineError;
    }

    return data as string;
  };

  const cancelPetOwnerInvite = async (inviteId: string): Promise<string> => {
    if (!user?.id) {
      throw new Error('User session is required to cancel this invite.');
    }

    const { data, error: cancelError } = await supabase.rpc(
      'cancel_pet_owner_invite',
      {
        invite_id: inviteId,
      }
    );

    if (cancelError) {
      throw cancelError;
    }

    return data as string;
  };

  const value = useMemo<PetProfilesContextType>(
    () => ({
      pets,
      loading,
      creating,
      error,
      fetchPets,
      createPet,
      updatePet,
      createPetOwnerInvite,
      getPetOwnerInvitePreview,
      getPetOwners,
      fetchPetOwnerRequests,
      acceptPetOwnerInvite,
      acceptPetOwnerRequest,
      declinePetOwnerRequest,
      cancelPetOwnerInvite,
      resetPets,
    }),
    [pets, loading, creating, error, user?.id]
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
