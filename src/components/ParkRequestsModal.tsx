import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useDogParks } from '../context/DogParksContext';
import { DogParkStatus } from '../types/dogParks';

type ParkRequestsModalProps = {
  onClose: () => void;
  visible: boolean;
};

const statusLabels: Record<DogParkStatus, string> = {
  approved: 'Approved',
  pending: 'Pending',
  rejected: 'Rejected',
};

const statusStyles: Record<DogParkStatus, { backgroundColor: string; color: string }> = {
  approved: {
    backgroundColor: '#dcfce7',
    color: '#166534',
  },
  pending: {
    backgroundColor: '#ffedd5',
    color: '#9a3412',
  },
  rejected: {
    backgroundColor: '#fee2e2',
    color: '#991b1b',
  },
};

export const ParkRequestsModal = ({ onClose, visible }: ParkRequestsModalProps) => {
  const { fetchDogParks, loading, parkRequests } = useDogParks();

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
            <View>
              <Text style={styles.title}>Requests</Text>
              <Text style={styles.subtitle}>Park requests</Text>
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

          <Pressable
            disabled={loading}
            onPress={fetchDogParks}
            style={({ pressed }) => [
              styles.refreshButton,
              loading ? styles.buttonDisabled : null,
              pressed && !loading ? styles.buttonPressed : null,
            ]}
          >
            <Text style={styles.refreshButtonText}>
              {loading ? 'Refreshing...' : 'Refresh'}
            </Text>
          </Pressable>

          {parkRequests.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>No park requests yet</Text>
              <Text style={styles.emptyText}>
                Dog parks you submit from the map will appear here while they are reviewed.
              </Text>
            </View>
          ) : (
            <ScrollView contentContainerStyle={styles.requestList}>
              {parkRequests.map((request) => {
                const statusStyle = statusStyles[request.status];

                return (
                  <View key={request.id} style={styles.requestCard}>
                    <View style={styles.requestHeader}>
                      <Text numberOfLines={2} style={styles.requestName}>
                        {request.name}
                      </Text>
                      <View
                        style={[
                          styles.statusPill,
                          { backgroundColor: statusStyle.backgroundColor },
                        ]}
                      >
                        <Text style={[styles.statusText, { color: statusStyle.color }]}>
                          {statusLabels[request.status]}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.coordinateText}>
                      {request.latitude.toFixed(5)}, {request.longitude.toFixed(5)}
                    </Text>
                  </View>
                );
              })}
            </ScrollView>
          )}
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
    maxHeight: '82%',
    padding: 20,
    paddingBottom: 28,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
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
  refreshButton: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#f5f3ff',
    borderRadius: 14,
    marginTop: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  refreshButtonText: {
    color: '#6d28d9',
    fontSize: 14,
    fontWeight: '700',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 36,
  },
  emptyTitle: {
    color: '#0f172a',
    fontSize: 18,
    fontWeight: '700',
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
    paddingTop: 18,
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
  buttonPressed: {
    opacity: 0.82,
  },
  buttonDisabled: {
    opacity: 0.55,
  },
});
