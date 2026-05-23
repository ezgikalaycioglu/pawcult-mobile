import { StyleSheet, Text, View } from 'react-native';

export const CheckInScreen = () => {
  return (
    <View style={styles.container}>
      <View style={styles.badge}>
        <Text style={styles.badgeIcon}>✓</Text>
      </View>
      <Text style={styles.title}>Check-in</Text>
      <Text style={styles.description}>
        This section is a placeholder for now. The mobile check-in experience will live here.
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  badge: {
    alignItems: 'center',
    backgroundColor: '#ede9fe',
    borderRadius: 28,
    height: 56,
    justifyContent: 'center',
    width: 56,
  },
  badgeIcon: {
    color: '#8b5cf6',
    fontSize: 28,
    fontWeight: '700',
  },
  title: {
    color: '#0f172a',
    fontSize: 28,
    fontWeight: '700',
    marginTop: 18,
  },
  description: {
    color: '#475569',
    fontSize: 16,
    lineHeight: 24,
    marginTop: 10,
    textAlign: 'center',
  },
});
