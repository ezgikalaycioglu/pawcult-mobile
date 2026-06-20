import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import { supabase } from '../lib/supabase';
import {
  FriendProfile,
  FriendRequest,
  FriendRequestDirection,
  FriendSummary,
  SendFriendRequestResult,
} from '../types/friends';
import { useAuth } from './AuthContext';

type FriendsContextType = {
  cancelFriendRequest: (friendshipId: string) => Promise<void>;
  fetchFriendRequests: (
    direction: FriendRequestDirection
  ) => Promise<FriendRequest[]>;
  fetchFriends: () => Promise<void>;
  friends: FriendSummary[];
  getFriendProfile: (friendUserId: string) => Promise<FriendProfile>;
  loading: boolean;
  respondFriendRequest: (
    friendshipId: string,
    response: 'accept' | 'decline'
  ) => Promise<void>;
  sendFriendRequestByEmail: (email: string) => Promise<SendFriendRequestResult>;
};

type FriendSummaryRow = {
  friendship_id: string;
  friend_user_id: string;
  display_name: string;
  email: string | null;
  accepted_at: string | null;
  pet_count: number;
  active_checkin_count: number;
};

type FriendRequestRow = {
  id: string;
  requester_user_id: string;
  requester_display_name: string;
  requester_email: string | null;
  addressee_user_id: string;
  addressee_display_name: string;
  addressee_email: string | null;
  status: FriendRequest['status'];
  created_at: string;
  accepted_at: string | null;
};

type SendFriendRequestResultRow = {
  status: SendFriendRequestResult['status'];
  friendship_id: string | null;
  friend_user_id: string | null;
  friend_display_name: string | null;
  friend_email: string | null;
};

const FriendsContext = createContext<FriendsContextType | undefined>(undefined);

const getRpcRow = <TRow,>(data: TRow | TRow[] | null): TRow | null => {
  if (Array.isArray(data)) {
    return data[0] ?? null;
  }

  return data;
};

const mapFriendSummaryRow = (row: FriendSummaryRow): FriendSummary => ({
  friendshipId: row.friendship_id,
  friendUserId: row.friend_user_id,
  displayName: row.display_name,
  email: row.email,
  acceptedAt: row.accepted_at,
  petCount: Number(row.pet_count),
  activeCheckInCount: Number(row.active_checkin_count),
});

const mapFriendRequestRow = (row: FriendRequestRow): FriendRequest => ({
  id: row.id,
  requesterUserId: row.requester_user_id,
  requesterDisplayName: row.requester_display_name,
  requesterEmail: row.requester_email,
  addresseeUserId: row.addressee_user_id,
  addresseeDisplayName: row.addressee_display_name,
  addresseeEmail: row.addressee_email,
  status: row.status,
  createdAt: row.created_at,
  acceptedAt: row.accepted_at,
});

const mapSendFriendRequestResultRow = (
  row: SendFriendRequestResultRow
): SendFriendRequestResult => ({
  status: row.status,
  friendshipId: row.friendship_id,
  friendUserId: row.friend_user_id,
  friendDisplayName: row.friend_display_name,
  friendEmail: row.friend_email,
});

export const FriendsProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [friends, setFriends] = useState<FriendSummary[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchFriends = useCallback(async () => {
    if (!user?.id) {
      setFriends([]);
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.rpc('get_my_friends');

      if (error) {
        throw error;
      }

      setFriends(((data ?? []) as FriendSummaryRow[]).map(mapFriendSummaryRow));
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    void fetchFriends().catch(() => {
      setFriends([]);
    });
  }, [fetchFriends]);

  const sendFriendRequestByEmail = async (
    email: string
  ): Promise<SendFriendRequestResult> => {
    if (!user?.id) {
      throw new Error('User session is required to add a friend.');
    }

    const { data, error } = await supabase.rpc('send_friend_request_by_email', {
      email,
    });

    if (error) {
      throw error;
    }

    const row = getRpcRow(
      data as SendFriendRequestResultRow | SendFriendRequestResultRow[] | null
    );
    if (!row) {
      throw new Error('Unable to send friend request right now.');
    }

    const result = mapSendFriendRequestResultRow(row);
    if (result.status === 'accepted') {
      await fetchFriends();
    }

    return result;
  };

  const fetchFriendRequests = async (
    direction: FriendRequestDirection
  ): Promise<FriendRequest[]> => {
    if (!user?.id) {
      throw new Error('User session is required to view friend requests.');
    }

    const { data, error } = await supabase.rpc('get_friend_requests', {
      direction,
    });

    if (error) {
      throw error;
    }

    return ((data ?? []) as FriendRequestRow[]).map(mapFriendRequestRow);
  };

  const respondFriendRequest = async (
    friendshipId: string,
    response: 'accept' | 'decline'
  ) => {
    if (!user?.id) {
      throw new Error('User session is required to respond to friend requests.');
    }

    const { error } = await supabase.rpc('respond_friend_request', {
      friendship_id: friendshipId,
      response,
    });

    if (error) {
      throw error;
    }

    if (response === 'accept') {
      await fetchFriends();
    }
  };

  const cancelFriendRequest = async (friendshipId: string) => {
    if (!user?.id) {
      throw new Error('User session is required to cancel friend requests.');
    }

    const { error } = await supabase.rpc('cancel_friend_request', {
      friendship_id: friendshipId,
    });

    if (error) {
      throw error;
    }
  };

  const getFriendProfile = async (
    friendUserId: string
  ): Promise<FriendProfile> => {
    if (!user?.id) {
      throw new Error('User session is required to view friends.');
    }

    const { data, error } = await supabase.rpc('get_friend_profile', {
      friend_user_id: friendUserId,
    });

    if (error) {
      throw error;
    }

    return data as FriendProfile;
  };

  const value = useMemo<FriendsContextType>(
    () => ({
      cancelFriendRequest,
      fetchFriendRequests,
      fetchFriends,
      friends,
      getFriendProfile,
      loading,
      respondFriendRequest,
      sendFriendRequestByEmail,
    }),
    [fetchFriends, friends, loading, user?.id]
  );

  return (
    <FriendsContext.Provider value={value}>{children}</FriendsContext.Provider>
  );
};

export const useFriends = () => {
  const context = useContext(FriendsContext);

  if (!context) {
    throw new Error('useFriends must be used within a FriendsProvider');
  }

  return context;
};
