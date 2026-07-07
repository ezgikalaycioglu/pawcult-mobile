import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { useDogParks } from '../context/DogParksContext';
import { useFriends } from '../context/FriendsContext';
import { usePetProfiles } from '../context/PetProfilesContext';
import { DogParkStatus } from '../types/dogParks';
import { FriendRequest, FriendRequestDirection } from '../types/friends';
import {
  PetOwnerRequest,
  PetOwnerRequestDirection,
  PetOwnerRequestStatus,
} from '../types/pets';

type RequestsModalProps = {
  onRequestsChanged?: () => void;
  onClose: () => void;
  requestNotificationCounts?: {
    friends: number;
    petOwners: number;
  };
  visible: boolean;
};

type RequestTab = 'parks' | 'petOwners' | 'friends';

type BadgeStatus =
  | 'accepted'
  | 'approved'
  | 'canceled'
  | 'declined'
  | 'expired'
  | 'pending';

const topTabs: { key: RequestTab; label: string }[] = [
  { key: 'parks', label: 'Parks' },
  { key: 'petOwners', label: 'Pet Owners' },
  { key: 'friends', label: 'Friends' },
];

const requestDirections: { key: PetOwnerRequestDirection; label: string }[] = [
  { key: 'incoming', label: 'Incoming' },
  { key: 'sent', label: 'Sent' },
];

const parkStatusToBadge: Record<DogParkStatus, BadgeStatus> = {
  approved: 'approved',
  pending: 'pending',
  rejected: 'declined',
};

const ownerStatusToBadge: Record<PetOwnerRequestStatus, BadgeStatus> = {
  accepted: 'accepted',
  canceled: 'canceled',
  declined: 'declined',
  expired: 'expired',
  pending: 'pending',
  revoked: 'declined',
};

const statusLabels: Record<BadgeStatus, string> = {
  accepted: 'Accepted',
  approved: 'Approved',
  canceled: 'Canceled',
  declined: 'Declined',
  expired: 'Expired',
  pending: 'Pending',
};

const statusStyles: Record<BadgeStatus, { backgroundColor: string; color: string }> = {
  accepted: {
    backgroundColor: '#dcfce7',
    color: '#166534',
  },
  approved: {
    backgroundColor: '#dcfce7',
    color: '#166534',
  },
  canceled: {
    backgroundColor: '#f1f5f9',
    color: '#475569',
  },
  declined: {
    backgroundColor: '#fee2e2',
    color: '#991b1b',
  },
  expired: {
    backgroundColor: '#f1f5f9',
    color: '#475569',
  },
  pending: {
    backgroundColor: '#ffedd5',
    color: '#9a3412',
  },
};

const formatDate = (date: string | null) => {
  if (!date) {
    return 'Not available';
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
  }).format(new Date(date));
};

const StatusBadge = ({ status }: { status: BadgeStatus }) => {
  const statusStyle = statusStyles[status];

  return (
    <View style={[styles.statusPill, { backgroundColor: statusStyle.backgroundColor }]}>
      <Text style={[styles.statusText, { color: statusStyle.color }]}>
        {statusLabels[status]}
      </Text>
    </View>
  );
};

export const RequestsModal = ({
  onClose,
  onRequestsChanged,
  requestNotificationCounts = { friends: 0, petOwners: 0 },
  visible,
}: RequestsModalProps) => {
  const { fetchDogParks, loading: parksLoading, parkRequests } = useDogParks();
  const {
    acceptPetOwnerRequest,
    cancelPetOwnerInvite,
    declinePetOwnerRequest,
    fetchPetOwnerRequests,
  } = usePetProfiles();
  const {
    cancelFriendRequest,
    fetchFriendRequests,
    respondFriendRequest,
  } = useFriends();
  const [activeTab, setActiveTab] = useState<RequestTab>('parks');
  const [ownerDirection, setOwnerDirection] =
    useState<PetOwnerRequestDirection>('incoming');
  const [friendDirection, setFriendDirection] =
    useState<FriendRequestDirection>('incoming');
  const [ownerRequestsByDirection, setOwnerRequestsByDirection] = useState<
    Record<PetOwnerRequestDirection, PetOwnerRequest[]>
  >({
    incoming: [],
    sent: [],
  });
  const [friendRequestsByDirection, setFriendRequestsByDirection] = useState<
    Record<FriendRequestDirection, FriendRequest[]>
  >({
    incoming: [],
    sent: [],
  });
  const [ownerLoading, setOwnerLoading] = useState(false);
  const [ownerError, setOwnerError] = useState<string | null>(null);
  const [friendLoading, setFriendLoading] = useState(false);
  const [friendError, setFriendError] = useState<string | null>(null);
  const [activeOwnerActionId, setActiveOwnerActionId] = useState<string | null>(null);
  const [activeFriendActionId, setActiveFriendActionId] = useState<string | null>(null);

  const activeOwnerRequests = ownerRequestsByDirection[ownerDirection];
  const activeFriendRequests = friendRequestsByDirection[friendDirection];

  const subtitle = useMemo(() => {
    if (activeTab === 'parks') return 'Park requests';
    if (activeTab === 'petOwners') return 'Pet owner requests';
    return 'Friend requests';
  }, [activeTab]);

  const loadOwnerRequests = async (direction = ownerDirection) => {
    setOwnerLoading(true);
    setOwnerError(null);

    try {
      const requests = await fetchPetOwnerRequests(direction);
      setOwnerRequestsByDirection((currentRequests) => ({
        ...currentRequests,
        [direction]: requests,
      }));
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Unable to load pet owner requests right now.';

      setOwnerError(message);
    } finally {
      setOwnerLoading(false);
    }
  };

  const loadFriendRequests = async (direction = friendDirection) => {
    setFriendLoading(true);
    setFriendError(null);

    try {
      const requests = await fetchFriendRequests(direction);
      setFriendRequestsByDirection((currentRequests) => ({
        ...currentRequests,
        [direction]: requests,
      }));
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Unable to load friend requests right now.';

      setFriendError(message);
    } finally {
      setFriendLoading(false);
    }
  };

  useEffect(() => {
    if (!visible) {
      return;
    }

    setActiveTab('parks');
    setOwnerDirection('incoming');
    setFriendDirection('incoming');
    setOwnerError(null);
    setFriendError(null);
  }, [visible]);

  useEffect(() => {
    if (!visible || activeTab !== 'petOwners') {
      return;
    }

    void loadOwnerRequests(ownerDirection);
  }, [activeTab, ownerDirection, visible]);

  useEffect(() => {
    if (!visible || activeTab !== 'friends') {
      return;
    }

    void loadFriendRequests(friendDirection);
  }, [activeTab, friendDirection, visible]);

  const handleRefresh = () => {
    if (activeTab === 'parks') {
      void fetchDogParks();
      return;
    }

    if (activeTab === 'petOwners') {
      void loadOwnerRequests();
      return;
    }

    if (activeTab === 'friends') {
      void loadFriendRequests();
    }
  };

  const handleOwnerAction = async (
    request: PetOwnerRequest,
    action: 'accept' | 'cancel' | 'decline'
  ) => {
    setActiveOwnerActionId(`${action}:${request.id}`);

    try {
      if (action === 'accept') {
        await acceptPetOwnerRequest(request.id);
      } else if (action === 'decline') {
        await declinePetOwnerRequest(request.id);
      } else {
        await cancelPetOwnerInvite(request.id);
      }

      await loadOwnerRequests(ownerDirection);
      onRequestsChanged?.();
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Unable to update this request right now.';

      Alert.alert('Request update failed', message);
    } finally {
      setActiveOwnerActionId(null);
    }
  };

  const handleFriendAction = async (
    request: FriendRequest,
    action: 'accept' | 'cancel' | 'decline'
  ) => {
    setActiveFriendActionId(`${action}:${request.id}`);

    try {
      if (action === 'accept') {
        await respondFriendRequest(request.id, 'accept');
      } else if (action === 'decline') {
        await respondFriendRequest(request.id, 'decline');
      } else {
        await cancelFriendRequest(request.id);
      }

      await loadFriendRequests(friendDirection);
      onRequestsChanged?.();
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Unable to update this friend request right now.';

      Alert.alert('Request update failed', message);
    } finally {
      setActiveFriendActionId(null);
    }
  };

  const renderTopTabs = () => (
    <View style={styles.segmentedControl}>
      {topTabs.map((tab) => {
        const selected = activeTab === tab.key;
        const badgeCount =
          tab.key === 'petOwners'
            ? requestNotificationCounts.petOwners
            : tab.key === 'friends'
              ? requestNotificationCounts.friends
              : 0;

        return (
          <Pressable
            key={tab.key}
            onPress={() => setActiveTab(tab.key)}
            style={({ pressed }) => [
              styles.segmentButton,
              selected ? styles.segmentButtonActive : null,
              pressed ? styles.buttonPressed : null,
            ]}
          >
            <View style={styles.segmentLabelRow}>
              <Text
                numberOfLines={1}
                style={[
                  styles.segmentButtonText,
                  selected ? styles.segmentButtonTextActive : null,
                ]}
              >
                {tab.label}
              </Text>
              {badgeCount > 0 ? (
                <View style={styles.tabBadge}>
                  <Text style={styles.tabBadgeText}>{badgeCount}</Text>
                </View>
              ) : null}
            </View>
          </Pressable>
        );
      })}
    </View>
  );

  const renderDirectionTabs = (
    directionValue: PetOwnerRequestDirection | FriendRequestDirection,
    onDirectionChange: (direction: PetOwnerRequestDirection) => void
  ) => (
    <View style={styles.secondarySegmentedControl}>
      {requestDirections.map((direction) => {
        const selected = directionValue === direction.key;

        return (
          <Pressable
            key={direction.key}
            onPress={() => onDirectionChange(direction.key)}
            style={({ pressed }) => [
              styles.secondarySegmentButton,
              selected ? styles.secondarySegmentButtonActive : null,
              pressed ? styles.buttonPressed : null,
            ]}
          >
            <Text
              style={[
                styles.secondarySegmentText,
                selected ? styles.secondarySegmentTextActive : null,
              ]}
            >
              {direction.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );

  const renderParkRequests = () =>
    parkRequests.length === 0 ? (
      <View style={styles.emptyState}>
        <Text style={styles.emptyTitle}>No park requests yet</Text>
        <Text style={styles.emptyText}>
          Dog parks you submit from the map will appear here while they are reviewed.
        </Text>
      </View>
    ) : (
      <View style={styles.requestList}>
        {parkRequests.map((request) => (
          <View key={request.id} style={styles.requestCard}>
            <View style={styles.requestHeader}>
              <Text numberOfLines={2} style={styles.requestName}>
                {request.name}
              </Text>
              <StatusBadge status={parkStatusToBadge[request.status]} />
            </View>
            <Text style={styles.coordinateText}>
              {request.latitude.toFixed(5)}, {request.longitude.toFixed(5)}
            </Text>
          </View>
        ))}
      </View>
    );

  const renderOwnerActions = (request: PetOwnerRequest) => {
    if (request.status !== 'pending') {
      return null;
    }

    if (ownerDirection === 'incoming') {
      return (
        <View style={styles.actionRow}>
          <Pressable
            disabled={activeOwnerActionId !== null}
            onPress={() => void handleOwnerAction(request, 'decline')}
            style={({ pressed }) => [
              styles.secondaryActionButton,
              activeOwnerActionId !== null ? styles.buttonDisabled : null,
              pressed ? styles.buttonPressed : null,
            ]}
          >
            {activeOwnerActionId === `decline:${request.id}` ? (
              <ActivityIndicator color="#475569" />
            ) : (
              <Text style={styles.secondaryActionText}>Decline</Text>
            )}
          </Pressable>
          <Pressable
            disabled={activeOwnerActionId !== null}
            onPress={() => void handleOwnerAction(request, 'accept')}
            style={({ pressed }) => [
              styles.primaryActionButton,
              activeOwnerActionId !== null ? styles.buttonDisabled : null,
              pressed ? styles.buttonPressed : null,
            ]}
          >
            {activeOwnerActionId === `accept:${request.id}` ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.primaryActionText}>Accept</Text>
            )}
          </Pressable>
        </View>
      );
    }

    return (
      <View style={styles.actionRow}>
        <Pressable
          disabled={activeOwnerActionId !== null}
          onPress={() => void handleOwnerAction(request, 'cancel')}
          style={({ pressed }) => [
            styles.secondaryActionButton,
            activeOwnerActionId !== null ? styles.buttonDisabled : null,
            pressed ? styles.buttonPressed : null,
          ]}
        >
          {activeOwnerActionId === `cancel:${request.id}` ? (
            <ActivityIndicator color="#475569" />
          ) : (
            <Text style={styles.secondaryActionText}>Cancel invite</Text>
          )}
        </Pressable>
      </View>
    );
  };

  const renderOwnerRequests = () => (
    <>
      {renderDirectionTabs(ownerDirection, setOwnerDirection)}

      {ownerLoading ? (
        <View style={styles.loadingState}>
          <ActivityIndicator color="#8b5cf6" />
          <Text style={styles.emptyText}>Loading pet owner requests...</Text>
        </View>
      ) : ownerError ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>Could not load requests</Text>
          <Text style={styles.emptyText}>{ownerError}</Text>
        </View>
      ) : activeOwnerRequests.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>No pet owner requests yet.</Text>
        </View>
      ) : (
        <View style={styles.requestList}>
          {activeOwnerRequests.map((request) => (
            <View key={request.id} style={styles.requestCard}>
              <View style={styles.requestHeader}>
                <Text numberOfLines={2} style={styles.requestName}>
                  {request.petName}
                </Text>
                <StatusBadge status={ownerStatusToBadge[request.status]} />
              </View>

              {ownerDirection === 'incoming' ? (
                <View style={styles.detailList}>
                  <Text style={styles.detailText}>
                    From {request.inviterDisplayName ?? 'Another owner'}
                  </Text>
                  <Text style={styles.detailText}>
                    {request.inviterEmail ?? 'No email available'}
                  </Text>
                  <Text style={styles.detailText}>
                    Created {formatDate(request.createdAt)}
                  </Text>
                </View>
              ) : (
                <View style={styles.detailList}>
                  <Text style={styles.detailText}>To {request.invitedEmail}</Text>
                  <Text style={styles.detailText}>
                    Expires {formatDate(request.expiresAt)}
                  </Text>
                </View>
              )}

              {renderOwnerActions(request)}
            </View>
          ))}
        </View>
      )}
    </>
  );

  const renderFriendRequests = () => (
    <>
      {renderDirectionTabs(friendDirection, setFriendDirection)}

      {friendLoading ? (
        <View style={styles.loadingState}>
          <ActivityIndicator color="#8b5cf6" />
          <Text style={styles.emptyText}>Loading friend requests...</Text>
        </View>
      ) : friendError ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>Could not load requests</Text>
          <Text style={styles.emptyText}>{friendError}</Text>
        </View>
      ) : activeFriendRequests.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>No friend requests yet.</Text>
        </View>
      ) : (
        <View style={styles.requestList}>
          {activeFriendRequests.map((request) => {
            const displayName =
              friendDirection === 'incoming'
                ? request.requesterDisplayName
                : request.addresseeDisplayName;
            const email =
              friendDirection === 'incoming'
                ? request.requesterEmail
                : request.addresseeEmail;

            return (
              <View key={request.id} style={styles.requestCard}>
                <View style={styles.requestHeader}>
                  <Text numberOfLines={2} style={styles.requestName}>
                    {displayName}
                  </Text>
                  <StatusBadge status="pending" />
                </View>
                <View style={styles.detailList}>
                  <Text style={styles.detailText}>{email ?? 'No email'}</Text>
                  <Text style={styles.detailText}>
                    Created {formatDate(request.createdAt)}
                  </Text>
                </View>

                {friendDirection === 'incoming' ? (
                  <View style={styles.actionRow}>
                    <Pressable
                      disabled={activeFriendActionId !== null}
                      onPress={() => void handleFriendAction(request, 'decline')}
                      style={({ pressed }) => [
                        styles.secondaryActionButton,
                        activeFriendActionId !== null ? styles.buttonDisabled : null,
                        pressed ? styles.buttonPressed : null,
                      ]}
                    >
                      {activeFriendActionId === `decline:${request.id}` ? (
                        <ActivityIndicator color="#475569" />
                      ) : (
                        <Text style={styles.secondaryActionText}>Decline</Text>
                      )}
                    </Pressable>
                    <Pressable
                      disabled={activeFriendActionId !== null}
                      onPress={() => void handleFriendAction(request, 'accept')}
                      style={({ pressed }) => [
                        styles.primaryActionButton,
                        activeFriendActionId !== null ? styles.buttonDisabled : null,
                        pressed ? styles.buttonPressed : null,
                      ]}
                    >
                      {activeFriendActionId === `accept:${request.id}` ? (
                        <ActivityIndicator color="#ffffff" />
                      ) : (
                        <Text style={styles.primaryActionText}>Accept</Text>
                      )}
                    </Pressable>
                  </View>
                ) : (
                  <View style={styles.actionRow}>
                    <Pressable
                      disabled={activeFriendActionId !== null}
                      onPress={() => void handleFriendAction(request, 'cancel')}
                      style={({ pressed }) => [
                        styles.secondaryActionButton,
                        activeFriendActionId !== null ? styles.buttonDisabled : null,
                        pressed ? styles.buttonPressed : null,
                      ]}
                    >
                      {activeFriendActionId === `cancel:${request.id}` ? (
                        <ActivityIndicator color="#475569" />
                      ) : (
                        <Text style={styles.secondaryActionText}>Cancel</Text>
                      )}
                    </Pressable>
                  </View>
                )}
              </View>
            );
          })}
        </View>
      )}
    </>
  );

  const isRefreshing =
    activeTab === 'parks'
      ? parksLoading
      : activeTab === 'petOwners'
        ? ownerLoading
        : friendLoading;

  return (
    <Modal
      animationType="slide"
      onRequestClose={onClose}
      transparent
      visible={visible}
    >
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <View style={styles.header}>
            <View style={styles.headerText}>
              <Text style={styles.title}>Requests</Text>
              <Text style={styles.subtitle}>{subtitle}</Text>
            </View>
            <Pressable
              accessibilityLabel="Close requests"
              onPress={onClose}
              style={({ pressed }) => [
                styles.closeButton,
                pressed ? styles.buttonPressed : null,
              ]}
            >
              <Text style={styles.closeButtonText}>×</Text>
            </Pressable>
          </View>

          {renderTopTabs()}

          <Pressable
            disabled={isRefreshing}
            onPress={handleRefresh}
            style={({ pressed }) => [
              styles.refreshButton,
              isRefreshing ? styles.buttonDisabled : null,
              pressed && !isRefreshing ? styles.buttonPressed : null,
            ]}
          >
            <Text style={styles.refreshButtonText}>
              {isRefreshing ? 'Refreshing...' : 'Refresh'}
            </Text>
          </Pressable>

          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {activeTab === 'parks'
              ? renderParkRequests()
              : activeTab === 'petOwners'
                ? renderOwnerRequests()
                : renderFriendRequests()}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    backgroundColor: 'rgba(15, 23, 42, 0.38)',
    flex: 1,
    justifyContent: 'flex-end',
  },
  card: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '86%',
    padding: 20,
    paddingBottom: 28,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 14,
    justifyContent: 'space-between',
  },
  headerText: {
    flex: 1,
  },
  title: {
    color: '#0f172a',
    fontSize: 26,
    fontWeight: '700',
  },
  subtitle: {
    color: '#64748b',
    fontSize: 15,
    marginTop: 4,
  },
  closeButton: {
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 18,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  closeButtonText: {
    color: '#334155',
    fontSize: 24,
    fontWeight: '700',
    lineHeight: 26,
  },
  segmentedControl: {
    backgroundColor: '#f1f5f9',
    borderRadius: 16,
    flexDirection: 'row',
    gap: 4,
    marginTop: 18,
    padding: 4,
  },
  segmentButton: {
    alignItems: 'center',
    borderRadius: 12,
    flex: 1,
    justifyContent: 'center',
    minHeight: 42,
    paddingHorizontal: 8,
  },
  segmentButtonActive: {
    backgroundColor: '#ffffff',
    shadowColor: '#0f172a',
    shadowOffset: { height: 1, width: 0 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
  },
  segmentButtonText: {
    color: '#64748b',
    fontSize: 13,
    fontWeight: '700',
  },
  segmentButtonTextActive: {
    color: '#6d28d9',
  },
  segmentLabelRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
    justifyContent: 'center',
  },
  tabBadge: {
    alignItems: 'center',
    backgroundColor: '#ef4444',
    borderRadius: 999,
    minWidth: 18,
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  tabBadgeText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
    lineHeight: 13,
  },
  secondarySegmentedControl: {
    alignSelf: 'flex-start',
    backgroundColor: '#f8fafc',
    borderColor: '#e2e8f0',
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 4,
    padding: 4,
  },
  secondarySegmentButton: {
    alignItems: 'center',
    borderRadius: 10,
    minHeight: 36,
    minWidth: 96,
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  secondarySegmentButtonActive: {
    backgroundColor: '#ede9fe',
  },
  secondarySegmentText: {
    color: '#64748b',
    fontSize: 13,
    fontWeight: '700',
  },
  secondarySegmentTextActive: {
    color: '#6d28d9',
  },
  refreshButton: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#f5f3ff',
    borderRadius: 14,
    marginTop: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  refreshButtonText: {
    color: '#6d28d9',
    fontSize: 14,
    fontWeight: '700',
  },
  scrollContent: {
    paddingTop: 16,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 36,
  },
  loadingState: {
    alignItems: 'center',
    gap: 10,
    paddingVertical: 36,
  },
  emptyTitle: {
    color: '#0f172a',
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
  emptyText: {
    color: '#64748b',
    fontSize: 15,
    lineHeight: 22,
    marginTop: 8,
    textAlign: 'center',
  },
  requestList: {
    gap: 12,
  },
  requestCard: {
    backgroundColor: '#f8fafc',
    borderColor: '#e2e8f0',
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
  },
  requestHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'space-between',
  },
  requestName: {
    color: '#0f172a',
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 22,
  },
  statusPill: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
  },
  coordinateText: {
    color: '#64748b',
    fontSize: 13,
    marginTop: 8,
  },
  detailList: {
    gap: 4,
    marginTop: 10,
  },
  detailText: {
    color: '#64748b',
    fontSize: 13,
    lineHeight: 19,
  },
  actionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 14,
  },
  primaryActionButton: {
    alignItems: 'center',
    backgroundColor: '#8b5cf6',
    borderRadius: 14,
    flexGrow: 1,
    justifyContent: 'center',
    minHeight: 44,
    minWidth: 126,
    paddingHorizontal: 14,
  },
  primaryActionText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  secondaryActionButton: {
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderColor: '#e2e8f0',
    borderRadius: 14,
    borderWidth: 1,
    flexGrow: 1,
    justifyContent: 'center',
    minHeight: 44,
    minWidth: 126,
    paddingHorizontal: 14,
  },
  secondaryActionText: {
    color: '#475569',
    fontSize: 14,
    fontWeight: '700',
  },
  buttonPressed: {
    opacity: 0.82,
  },
  buttonDisabled: {
    opacity: 0.55,
  },
});
