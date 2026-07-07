import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

type MoreMenuModalProps = {
  isAdmin: boolean;
  onClose: () => void;
  onLogOut: () => Promise<void>;
  onOpenAdminReports: () => void;
  onOpenRequests: () => void;
  onOpenSettings: () => void;
  requestNotificationCount?: number;
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
  requestNotificationCount = 0,
  topInset,
  visible,
}: MoreMenuModalProps) => {
  const badgeLabel =
    requestNotificationCount > 99 ? '99+' : String(requestNotificationCount);

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
            {requestNotificationCount > 0 ? (
              <View style={styles.requestBadge}>
                <Text style={styles.requestBadgeText}>{badgeLabel}</Text>
              </View>
            ) : null}
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
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
  },
  requestBadge: {
    alignItems: 'center',
    backgroundColor: '#ef4444',
    borderRadius: 999,
    minWidth: 22,
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  requestBadgeText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
    lineHeight: 13,
  },
  separator: {
    backgroundColor: '#f3f4f6',
    height: StyleSheet.hairlineWidth,
    marginHorizontal: 12,
  },
});
