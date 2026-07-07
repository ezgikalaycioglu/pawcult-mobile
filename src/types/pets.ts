export type MobilePetProfile = {
  id: string;
  userId: string;
  createdByUserId: string | null;
  name: string;
  breed: string;
  bio: string | null;
  profilePhotoUri: string | null;
  createdAt: string;
  activeOwnerCount: number;
  isShared: boolean;
};

export type CreateMobilePetInput = {
  name: string;
  breed: string;
  bio: string;
  profilePhotoUri: string | null;
  profilePhotoBase64: string | null;
  profilePhotoMimeType: string | null;
};

export type UpdateMobilePetInput = {
  name: string;
  breed: string;
  bio: string;
};

export type PetOwnerSummary = {
  id: string;
  userId: string;
  displayName: string;
  email: string | null;
  role: 'owner' | 'caregiver';
  status: 'active' | 'invited' | 'removed';
  acceptedAt: string | null;
  isCurrentUser: boolean;
};

export type PetOwnerInvite = {
  id: string;
  token: string;
  invitedEmail: string;
  expiresAt: string;
};

export type SendPetOwnerInviteStatus =
  | 'already_owner'
  | 'no_account'
  | 'request_pending'
  | 'self'
  | 'sent';

export type SendPetOwnerInviteResult = {
  status: SendPetOwnerInviteStatus;
  inviteId: string | null;
  invitedUserId: string | null;
  invitedDisplayName: string | null;
  invitedEmail: string;
  token: string | null;
  expiresAt: string | null;
};

export type PetOwnerInvitePreview = {
  petName: string;
  inviterDisplayName: string | null;
  invitedEmail: string;
  expiresAt: string;
  status: 'pending' | 'accepted' | 'expired' | 'revoked';
};

export type PetOwnerRequestStatus =
  | 'pending'
  | 'accepted'
  | 'expired'
  | 'revoked'
  | 'declined'
  | 'canceled';

export type PetOwnerRequestDirection = 'incoming' | 'sent';

export type PetOwnerRequest = {
  id: string;
  petId: string;
  petName: string;
  inviterDisplayName: string | null;
  inviterEmail: string | null;
  invitedEmail: string;
  token: string | null;
  status: PetOwnerRequestStatus;
  createdAt: string;
  expiresAt: string;
};
