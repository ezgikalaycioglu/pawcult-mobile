import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { useModeration } from '../context/ModerationContext';
import { ReportStatus } from '../types/moderation';

type AdminReportsModalProps = {
  onClose: () => void;
  visible: boolean;
};

const statuses: (ReportStatus | 'all')[] = [
  'open',
  'reviewing',
  'resolved',
  'dismissed',
  'all',
];

const nextStatuses: ReportStatus[] = [
  'open',
  'reviewing',
  'resolved',
  'dismissed',
];

export const AdminReportsModal = ({
  onClose,
  visible,
}: AdminReportsModalProps) => {
  const {
    adminReports,
    fetchAdminReports,
    loadingAdminReports,
    updateAdminReport,
  } = useModeration();
  const [statusFilter, setStatusFilter] = useState<ReportStatus | 'all'>('open');
  const [activeReportId, setActiveReportId] = useState<string | null>(null);
  const [adminNotesByReportId, setAdminNotesByReportId] = useState<
    Record<string, string>
  >({});

  useEffect(() => {
    if (visible) {
      void fetchAdminReports(statusFilter);
    }
  }, [visible, statusFilter]);

  const handleUpdate = async (reportId: string, status: ReportStatus) => {
    setActiveReportId(reportId);

    try {
      const adminNote = adminNotesByReportId[reportId] ?? '';
      await updateAdminReport(reportId, status, adminNote);
      setAdminNotesByReportId((currentNotes) => ({
        ...currentNotes,
        [reportId]: '',
      }));
      await fetchAdminReports(statusFilter);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unable to update report.';

      Alert.alert('Update failed', message);
    } finally {
      setActiveReportId(null);
    }
  };

  return (
    <Modal
      animationType="slide"
      onRequestClose={onClose}
      transparent
      visible={visible}
    >
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>Admin Reports</Text>
            <Pressable onPress={onClose} style={styles.closeButton}>
              <Text style={styles.closeButtonText}>Close</Text>
            </Pressable>
          </View>

          <ScrollView
            contentContainerStyle={styles.filters}
            horizontal
            showsHorizontalScrollIndicator={false}
          >
            {statuses.map((status) => {
              const selected = status === statusFilter;

              return (
                <Pressable
                  key={status}
                  onPress={() => setStatusFilter(status)}
                  style={[styles.filterButton, selected ? styles.filterButtonActive : null]}
                >
                  <Text
                    style={[
                      styles.filterButtonText,
                      selected ? styles.filterButtonTextActive : null,
                    ]}
                  >
                    {status}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          {loadingAdminReports ? (
            <View style={styles.loadingState}>
              <ActivityIndicator color="#8b5cf6" />
              <Text style={styles.helperText}>Loading reports...</Text>
            </View>
          ) : (
            <ScrollView contentContainerStyle={styles.reportList}>
              {adminReports.length === 0 ? (
                <Text style={styles.helperText}>No reports found.</Text>
              ) : null}

              {adminReports.map((report) => (
                <View key={report.id} style={styles.reportCard}>
                  <View style={styles.reportHeader}>
                    <Text style={styles.reportTitle}>{report.reason}</Text>
                    <Text style={styles.statusPill}>{report.status}</Text>
                  </View>
                  <Text style={styles.reportMeta}>
                    {report.contentType} {report.contentId ? `• ${report.contentId}` : ''}
                  </Text>
                  <Text style={styles.reportMeta}>
                    Reporter: {report.reporterEmail ?? report.reporterUserId}
                  </Text>
                  <Text style={styles.reportMeta}>
                    Reported: {report.reportedEmail ?? report.reportedUserId ?? 'Not set'}
                  </Text>
                  {report.details ? (
                    <Text style={styles.reportDetails}>{report.details}</Text>
                  ) : null}
                  {report.adminNote ? (
                    <Text style={styles.reportDetails}>Admin note: {report.adminNote}</Text>
                  ) : null}

                  <TextInput
                    maxLength={1000}
                    multiline
                    onChangeText={(text) =>
                      setAdminNotesByReportId((currentNotes) => ({
                        ...currentNotes,
                        [report.id]: text,
                      }))
                    }
                    placeholder="Admin note for next update"
                    placeholderTextColor="#94a3b8"
                    style={styles.noteInput}
                    value={adminNotesByReportId[report.id] ?? ''}
                  />

                  <View style={styles.actions}>
                    {nextStatuses.map((status) => (
                      <Pressable
                        key={status}
                        disabled={activeReportId !== null}
                        onPress={() => handleUpdate(report.id, status)}
                        style={styles.actionButton}
                      >
                        <Text style={styles.actionButtonText}>
                          {activeReportId === report.id ? 'Updating...' : status}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                </View>
              ))}
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    backgroundColor: 'rgba(15, 23, 42, 0.24)',
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '92%',
    padding: 20,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  title: {
    color: '#0f172a',
    fontSize: 24,
    fontWeight: '700',
  },
  closeButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  closeButtonText: {
    color: '#8b5cf6',
    fontSize: 15,
    fontWeight: '700',
  },
  filters: {
    gap: 8,
    paddingVertical: 16,
  },
  filterButton: {
    borderColor: '#e2e8f0',
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  filterButtonActive: {
    backgroundColor: '#ede9fe',
    borderColor: '#8b5cf6',
  },
  filterButtonText: {
    color: '#334155',
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'capitalize',
  },
  filterButtonTextActive: {
    color: '#6d28d9',
  },
  loadingState: {
    alignItems: 'center',
    gap: 10,
    paddingVertical: 36,
  },
  helperText: {
    color: '#64748b',
    fontSize: 14,
    lineHeight: 20,
  },
  reportList: {
    gap: 12,
    paddingBottom: 30,
  },
  reportCard: {
    borderColor: '#e2e8f0',
    borderRadius: 16,
    borderWidth: 1,
    gap: 8,
    padding: 14,
  },
  reportHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  reportTitle: {
    color: '#0f172a',
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
  },
  statusPill: {
    color: '#6d28d9',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'capitalize',
  },
  reportMeta: {
    color: '#64748b',
    fontSize: 12,
  },
  reportDetails: {
    color: '#334155',
    fontSize: 13,
    lineHeight: 19,
  },
  noteInput: {
    borderColor: '#e2e8f0',
    borderRadius: 12,
    borderWidth: 1,
    color: '#0f172a',
    minHeight: 70,
    padding: 10,
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  actionButton: {
    backgroundColor: '#f8fafc',
    borderColor: '#e2e8f0',
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  actionButtonText: {
    color: '#334155',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'capitalize',
  },
});
