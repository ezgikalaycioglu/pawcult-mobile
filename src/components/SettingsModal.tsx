import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableWithoutFeedback,
  View,
} from 'react-native';

import { SUPPORT_EMAIL, LegalDocumentType } from '../legal/legalText';

type SettingsModalProps = {
  isAdmin: boolean;
  onClose: () => void;
  onDeleteAccount: () => Promise<void>;
  onLogOut: () => Promise<void>;
  onOpenAdminReports: () => void;
  onOpenLegalDocument: (documentType: LegalDocumentType) => void;
  visible: boolean;
};

export const SettingsModal = ({
  isAdmin,
  onClose,
  onDeleteAccount,
  onLogOut,
  onOpenAdminReports,
  onOpenLegalDocument,
  visible,
}: SettingsModalProps) => {
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [deleting, setDeleting] = useState(false);

  const handleContact = async () => {
    const url = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(
      'PawCult Support'
    )}`;
    const canOpen = await Linking.canOpenURL(url);

    if (!canOpen) {
      Alert.alert('Contact PawCult', `Email us at ${SUPPORT_EMAIL}.`);
      return;
    }

    await Linking.openURL(url);
  };

  const handleOpenLegalDocument = (documentType: LegalDocumentType) => {
    onClose();
    requestAnimationFrame(() => {
      onOpenLegalDocument(documentType);
    });
  };

  const handleOpenAdminReports = () => {
    onClose();
    requestAnimationFrame(() => {
      onOpenAdminReports();
    });
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmation !== 'DELETE') {
      Alert.alert('Confirmation required', 'Type DELETE to delete your account.');
      return;
    }

    setDeleting(true);

    try {
      await onDeleteAccount();
      setDeleteConfirmation('');
      onClose();
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Unable to delete your account right now.';

      Alert.alert('Delete account failed', message);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Modal
      animationType="slide"
      onRequestClose={onClose}
      transparent
      visible={visible}
    >
      <Pressable onPress={onClose} style={styles.backdrop}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.keyboardView}
        >
          <Pressable onPress={(event) => event.stopPropagation()} style={styles.sheet}>
            <View style={styles.header}>
              <Text style={styles.title}>Settings</Text>
              <Pressable disabled={deleting} onPress={onClose} style={styles.closeButton}>
                <Text style={styles.closeButtonText}>Close</Text>
              </Pressable>
            </View>

            <ScrollView
              contentContainerStyle={styles.scrollContent}
              keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'none'}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <TouchableWithoutFeedback accessible={false} onPress={Keyboard.dismiss}>
                <View style={styles.content}>
                  <View style={styles.group}>
                    <Pressable onPress={handleContact} style={styles.item}>
                      <Text style={styles.itemTitle}>Contact Support</Text>
                      <Text style={styles.itemDescription}>{SUPPORT_EMAIL}</Text>
                    </Pressable>
                    <Pressable
                      onPress={() => handleOpenLegalDocument('privacy')}
                      style={styles.item}
                    >
                      <Text style={styles.itemTitle}>Privacy Policy</Text>
                      <Text style={styles.itemDescription}>
                        Review how PawCult uses data.
                      </Text>
                    </Pressable>
                    <Pressable
                      onPress={() => handleOpenLegalDocument('terms')}
                      style={styles.item}
                    >
                      <Text style={styles.itemTitle}>Terms of Service</Text>
                      <Text style={styles.itemDescription}>Review PawCult rules.</Text>
                    </Pressable>
                    {isAdmin ? (
                      <Pressable onPress={handleOpenAdminReports} style={styles.item}>
                        <Text style={styles.itemTitle}>Admin Reports</Text>
                        <Text style={styles.itemDescription}>
                          Review user-submitted moderation reports.
                        </Text>
                      </Pressable>
                    ) : null}
                  </View>

                  <View style={styles.group}>
                    <Pressable
                      disabled={deleting}
                      onPress={onLogOut}
                      style={styles.secondaryButton}
                    >
                      <Text style={styles.secondaryButtonText}>Log Out</Text>
                    </Pressable>
                  </View>

                  <View style={styles.dangerGroup}>
                    <Text style={styles.dangerTitle}>Delete Account</Text>
                    <Text style={styles.dangerDescription}>
                      This deletes your PawCult account and removes app data tied to your
                      user. Type DELETE to confirm.
                    </Text>
                    <TextInput
                      autoCapitalize="characters"
                      editable={!deleting}
                      onChangeText={setDeleteConfirmation}
                      placeholder="DELETE"
                      placeholderTextColor="#94a3b8"
                      style={styles.input}
                      value={deleteConfirmation}
                    />
                    <Pressable
                      disabled={deleting}
                      onPress={handleDeleteAccount}
                      style={[
                        styles.deleteButton,
                        deleting ? styles.buttonDisabled : null,
                      ]}
                    >
                      {deleting ? (
                        <ActivityIndicator color="#ffffff" />
                      ) : (
                        <Text style={styles.deleteButtonText}>Delete Account</Text>
                      )}
                    </Pressable>
                  </View>
                </View>
              </TouchableWithoutFeedback>
            </ScrollView>
          </Pressable>
        </KeyboardAvoidingView>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    backgroundColor: 'rgba(15, 23, 42, 0.24)',
    flex: 1,
    justifyContent: 'flex-end',
  },
  keyboardView: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '92%',
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  scrollContent: {
    paddingBottom: 56,
  },
  content: {
    gap: 16,
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
  group: {
    borderColor: '#e2e8f0',
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  item: {
    borderBottomColor: '#e2e8f0',
    borderBottomWidth: StyleSheet.hairlineWidth,
    padding: 16,
  },
  itemTitle: {
    color: '#0f172a',
    fontSize: 16,
    fontWeight: '700',
  },
  itemDescription: {
    color: '#64748b',
    fontSize: 13,
    lineHeight: 18,
    marginTop: 4,
  },
  secondaryButton: {
    alignItems: 'center',
    padding: 16,
  },
  secondaryButtonText: {
    color: '#0f172a',
    fontSize: 16,
    fontWeight: '700',
  },
  dangerGroup: {
    backgroundColor: '#fef2f2',
    borderColor: '#fecaca',
    borderRadius: 16,
    borderWidth: 1,
    gap: 10,
    padding: 16,
  },
  dangerTitle: {
    color: '#991b1b',
    fontSize: 17,
    fontWeight: '700',
  },
  dangerDescription: {
    color: '#7f1d1d',
    fontSize: 13,
    lineHeight: 19,
  },
  input: {
    backgroundColor: '#ffffff',
    borderColor: '#fecaca',
    borderRadius: 12,
    borderWidth: 1,
    color: '#0f172a',
    fontSize: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  deleteButton: {
    alignItems: 'center',
    backgroundColor: '#dc2626',
    borderRadius: 12,
    justifyContent: 'center',
    minHeight: 46,
  },
  deleteButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
  buttonDisabled: {
    opacity: 0.65,
  },
});
