export type FriendRequestDirection = 'incoming' | 'sent';

export type FriendRequestStatus =
  | 'pending'
  | 'accepted'
  | 'declined'
  | 'cancelled'
  | 'blocked';

export type SendFriendRequestStatus =
  | 'accepted'
  | 'already_friends'
  | 'no_account'
  | 'request_pending'
  | 'self'
  | 'sent';

export type SendFriendRequestResult = {
  status: SendFriendRequestStatus;
  friendshipId: string | null;
  friendUserId: string | null;
  friendDisplayName: string | null;
  friendEmail: string | null;
};

export type FriendRequest = {
  id: string;
  requesterUserId: string;
  requesterDisplayName: string;
  requesterEmail: string | null;
  addresseeUserId: string;
  addresseeDisplayName: string;
  addresseeEmail: string | null;
  status: FriendRequestStatus;
  createdAt: string;
  acceptedAt: string | null;
};

export type FriendSummary = {
  friendshipId: string;
  friendUserId: string;
  displayName: string;
  email: string | null;
  acceptedAt: string | null;
  petCount: number;
  activeCheckInCount: number;
};

export type FriendProfilePet = {
  id: string;
  name: string;
  breed: string;
  bio: string | null;
  profilePhotoUri: string | null;
};

export type FriendProfileCheckIn = {
  id: string;
  dogParkId: string;
  dogParkName: string;
  petId: string;
  petName: string;
  startsAt: string;
  endsAt: string;
};

export type FriendProfile = {
  userId: string;
  displayName: string;
  email: string | null;
  pets: FriendProfilePet[];
  checkIns: FriendProfileCheckIn[];
};
