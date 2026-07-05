import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { useModeration } from '../context/ModerationContext';
import { ReportContentType } from '../types/moderation';

type ReportTarget = {
  contentId: string | null;
  contentType: ReportContentType;
  reportedUserId: string | null;
  title: string;
};

type ReportUserModalProps = {
  onClose: () => void;
  target: ReportTarget | null;
};

const reasons = ['Harassment', 'Inappropriate content', 'Spam', 'Safety concern'];

export const ReportUserModal = ({ onClose, target }: ReportUserModalProps) => {
  const { createUserReport } = useModeration();
  const [reason, setReason] = useState(reasons[0]);
  const [details, setDetails] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (target) {
      setReason(reasons[0]);
      setDetails('');
      setSubmitting(false);
    }
  }, [target]);

  const handleSubmit = async () => {
    if (!target) {
      return;
    }

    setSubmitting(true);

    try {
      await createUserReport({
        contentId: target.contentId,
        contentType: target.contentType,
        details,
        reason,
        reportedUserId: target.reportedUserId,
      });
      Alert.alert('Report submitted', 'Thanks. PawCult will review this report.');
      onClose();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unable to submit this report.';

      Alert.alert('Report failed', message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      animationType="slide"
      onRequestClose={onClose}
      transparent
      visible={target !== null}
    >
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <Text style={styles.title}>Report</Text>
          <Text style={styles.description}>{target?.title}</Text>

          <View style={styles.reasonList}>
            {reasons.map((item) => {
              const selected = item === reason;

              return (
                <Pressable
                  key={item}
                  disabled={submitting}
                  onPress={() => setReason(item)}
                  style={[
                    styles.reasonButton,
                    selected ? styles.reasonButtonSelected : null,
                  ]}
                >
                  <Text
                    style={[
                      styles.reasonButtonText,
                      selected ? styles.reasonButtonTextSelected : null,
                    ]}
                  >
                    {item}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <TextInput
            editable={!submitting}
            maxLength={1000}
            multiline
            onChangeText={setDetails}
            placeholder="Add optional details"
            placeholderTextColor="#94a3b8"
            style={styles.textarea}
            textAlignVertical="top"
            value={details}
          />

          <View style={styles.actions}>
            <Pressable
              disabled={submitting}
              onPress={onClose}
              style={styles.cancelButton}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </Pressable>
            <Pressable
              disabled={submitting}
              onPress={handleSubmit}
              style={[styles.submitButton, submitting ? styles.buttonDisabled : null]}
            >
              {submitting ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text style={styles.submitButtonText}>Submit Report</Text>
              )}
            </Pressable>
          </View>
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
    gap: 14,
    padding: 20,
    paddingBottom: 30,
  },
  title: {
    color: '#0f172a',
    fontSize: 24,
    fontWeight: '700',
  },
  description: {
    color: '#475569',
    fontSize: 14,
    lineHeight: 20,
  },
  reasonList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  reasonButton: {
    borderColor: '#e2e8f0',
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  reasonButtonSelected: {
    backgroundColor: '#ede9fe',
    borderColor: '#8b5cf6',
  },
  reasonButtonText: {
    color: '#334155',
    fontSize: 13,
    fontWeight: '700',
  },
  reasonButtonTextSelected: {
    color: '#6d28d9',
  },
  textarea: {
    borderColor: '#e2e8f0',
    borderRadius: 14,
    borderWidth: 1,
    color: '#0f172a',
    fontSize: 15,
    minHeight: 110,
    padding: 14,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
  },
  cancelButton: {
    alignItems: 'center',
    borderColor: '#e2e8f0',
    borderRadius: 14,
    borderWidth: 1,
    flex: 1,
    paddingVertical: 14,
  },
  cancelButtonText: {
    color: '#334155',
    fontSize: 15,
    fontWeight: '700',
  },
  submitButton: {
    alignItems: 'center',
    backgroundColor: '#8b5cf6',
    borderRadius: 14,
    flex: 1,
    justifyContent: 'center',
    minHeight: 48,
  },
  submitButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
  buttonDisabled: {
    opacity: 0.65,
  },
});

export type { ReportTarget };
