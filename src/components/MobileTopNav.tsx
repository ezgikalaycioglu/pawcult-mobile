import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

type MobileTopNavProps = {
  topInset: number;
  onOpenMenu: () => void;
};

const logoSource = require('../../assets/pawcult-logo.png');

export const MobileTopNav = ({ topInset, onOpenMenu }: MobileTopNavProps) => {
  return (
    <View style={[styles.wrapper, { paddingTop: Math.max(topInset, 10) }]}>
      <View style={styles.inner}>
        <View style={styles.sideSpacer} />
        <Image
          accessibilityIgnoresInvertColors
          resizeMode="contain"
          source={logoSource}
          style={styles.logo}
        />
        <Pressable
          accessibilityLabel="More options"
          accessibilityRole="button"
          onPress={onOpenMenu}
          style={({ pressed }) => [styles.menuButton, pressed ? styles.menuPressed : null]}
        >
          <Text style={styles.menuIcon}>⋯</Text>
        </Pressable>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    backgroundColor: '#ffffff',
    borderBottomColor: '#e5e7eb',
    borderBottomWidth: StyleSheet.hairlineWidth,
    elevation: 6,
    shadowColor: '#111827',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
  },
  inner: {
    alignItems: 'center',
    flexDirection: 'row',
    height: 68,
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  sideSpacer: {
    height: 44,
    width: 44,
  },
  logo: {
    height: 52,
    width: 144,
  },
  menuButton: {
    alignItems: 'center',
    borderRadius: 22,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  menuPressed: {
    backgroundColor: '#f3f4f6',
  },
  menuIcon: {
    color: '#4b5563',
    fontSize: 28,
    lineHeight: 28,
    marginTop: -6,
  },
});
