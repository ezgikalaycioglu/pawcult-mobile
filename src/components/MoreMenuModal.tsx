import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

type MoreMenuModalProps = {
  isAdmin: boolean;
  onClose: () => void;
  onLogOut: () => Promise<void>;
  onOpenAdminReports: () => void;
  onOpenRequests: () => void;
  onOpenSettings: () => void;
  topInset: number;
  visible: boolean;
};

export const MoreMenuModal = ({
  isAdmin,
  onClose,
  onLogOut,
  onOpenAdminReports,
  onOpenRequests,
  onOpenSettings,
  topInset,
  visible,
}: MoreMenuModalProps) => {
  return (
    <Modal
      animationType="fade"
      onRequestClose={onClose}
      transparent
      visible={visible}
    >
      <Pressable onPress={onClose} style={styles.overlay}>
        <Pressable
          onPress={(event) => event.stopPropagation()}
          style={[styles.menu, { top: topInset + 60 }]}
        >
          <Pressable
            onPress={() => {
              onClose();
              onOpenRequests();
            }}
            style={({ pressed }) => [styles.item, pressed ? styles.itemPressed : null]}
          >
            <Text style={styles.itemIcon}>☰</Text>
            <Text style={styles.itemText}>Requests</Text>
          </Pressable>
          <View style={styles.separator} />
          <Pressable
            onPress={() => {
              onClose();
              onOpenSettings();
            }}
            style={({ pressed }) => [styles.item, pressed ? styles.itemPressed : null]}
          >
            <Text style={styles.itemIcon}>⚙</Text>
            <Text style={styles.itemText}>Settings</Text>
          </Pressable>
          {isAdmin ? (
            <>
              <View style={styles.separator} />
              <Pressable
                onPress={() => {
                  onClose();
                  onOpenAdminReports();
                }}
                style={({ pressed }) => [styles.item, pressed ? styles.itemPressed : null]}
              >
                <Text style={styles.itemIcon}>!</Text>
                <Text style={styles.itemText}>Admin Reports</Text>
              </Pressable>
            </>
          ) : null}
          <View style={styles.separator} />
          <Pressable
            onPress={async () => {
              onClose();
              await onLogOut();
            }}
            style={({ pressed }) => [styles.item, pressed ? styles.itemPressed : null]}
          >
            <Text style={[styles.itemIcon, styles.itemIcon]}>↩</Text>
            <Text style={[styles.itemText, styles.itemText]}>Log Out</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    backgroundColor: 'rgba(15, 23, 42, 0.16)',
    flex: 1,
  },
  menu: {
    backgroundColor: '#ffffff',
    borderColor: '#e5e7eb',
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    elevation: 10,
    position: 'absolute',
    right: 16,
    shadowColor: '#111827',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.14,
    shadowRadius: 18,
    width: 190,
  },
  item: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  itemPressed: {
    backgroundColor: '#f9fafb',
  },
  itemIcon: {
    color: '#374151',
    fontSize: 18,
    width: 20,
  },
  itemText: {
    color: '#111827',
    fontSize: 15,
    fontWeight: '500',
  },
  separator: {
    backgroundColor: '#f3f4f6',
    height: StyleSheet.hairlineWidth,
    marginHorizontal: 12,
  },
});
