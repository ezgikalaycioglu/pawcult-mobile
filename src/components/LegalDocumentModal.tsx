import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { LegalDocumentType, legalDocuments } from '../legal/legalText';

type LegalDocumentModalProps = {
  documentType: LegalDocumentType | null;
  onClose: () => void;
};

export const LegalDocumentModal = ({
  documentType,
  onClose,
}: LegalDocumentModalProps) => {
  const document = documentType ? legalDocuments[documentType] : null;

  return (
    <Modal
      animationType="slide"
      onRequestClose={onClose}
      transparent
      visible={document !== null}
    >
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>{document?.title}</Text>
            <Pressable onPress={onClose} style={styles.closeButton}>
              <Text style={styles.closeButtonText}>Close</Text>
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={styles.content}>
            <Text style={styles.body}>{document?.body}</Text>
          </ScrollView>
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
    maxHeight: '88%',
    padding: 20,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  title: {
    color: '#0f172a',
    fontSize: 22,
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
  content: {
    paddingBottom: 28,
    paddingTop: 18,
  },
  body: {
    color: '#334155',
    fontSize: 15,
    lineHeight: 23,
  },
});
