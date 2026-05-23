import { Pressable, StyleSheet, Text, View } from 'react-native';

export type MobileTabKey = 'check-in' | 'profile';

type MobileBottomNavProps = {
  activeTab: MobileTabKey;
  onTabChange: (tab: MobileTabKey) => void;
  bottomInset: number;
};

const navItems = [
  {
    key: 'check-in' as const,
    label: 'Check-in',
    activeIcon: '✓',
    inactiveIcon: '○',
  },
  {
    key: 'profile' as const,
    label: 'Profile',
    activeIcon: '◉',
    inactiveIcon: '◎',
  },
];

export const MobileBottomNav = ({
  activeTab,
  onTabChange,
  bottomInset,
}: MobileBottomNavProps) => {
  return (
    <View style={[styles.wrapper, { paddingBottom: Math.max(bottomInset, 12) }]}>
      <View style={styles.nav}>
        {navItems.map((item) => {
          const active = item.key === activeTab;

          return (
            <Pressable
              key={item.key}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              onPress={() => onTabChange(item.key)}
              style={({ pressed }) => [
                styles.item,
                active ? styles.itemActive : null,
                pressed ? styles.itemPressed : null,
              ]}
            >
              <Text style={[styles.icon, active ? styles.iconActive : null]}>
                {active ? item.activeIcon : item.inactiveIcon}
              </Text>
              <Text style={[styles.label, active ? styles.labelActive : null]}>
                {item.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    backgroundColor: '#ffffff',
    borderTopColor: '#e5e7eb',
    borderTopWidth: StyleSheet.hairlineWidth,
    elevation: 12,
    paddingHorizontal: 16,
    paddingTop: 8,
    shadowColor: '#111827',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
  },
  nav: {
    flexDirection: 'row',
    gap: 8,
  },
  item: {
    alignItems: 'center',
    borderRadius: 16,
    flex: 1,
    gap: 4,
    justifyContent: 'center',
    minHeight: 60,
    paddingHorizontal: 8,
    paddingVertical: 10,
  },
  itemActive: {
    backgroundColor: '#f0fdf4',
  },
  itemPressed: {
    opacity: 0.82,
  },
  icon: {
    color: '#6b7280',
    fontSize: 24,
    fontWeight: '700',
    lineHeight: 24,
  },
  iconActive: {
    color: '#16a34a',
  },
  label: {
    color: '#6b7280',
    fontSize: 12,
    fontWeight: '600',
  },
  labelActive: {
    color: '#16a34a',
  },
});
