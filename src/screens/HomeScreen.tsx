import { StyleSheet, Text, View } from 'react-native';

import { useAuth } from '../context/AuthContext';

export const HomeScreen = () => {
  const { user } = useAuth();

  return (
    <View style={styles.container}>
      <View style={styles.avatar}>
        <Text style={styles.avatarIcon}>◉</Text>
      </View>
      <Text style={styles.title}>Profile</Text>
      <Text style={styles.subtitle}>You are signed in to PawCult.</Text>
      <View style={styles.card}>
        <Text style={styles.label}>Email</Text>
        <Text style={styles.email}>{user?.email ?? 'No email available'}</Text>
      </View>
      <Text style={styles.helper}>
        Profile details are a placeholder for now. Settings and sign out are available in the top menu.
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  avatar: {
    alignItems: 'center',
    backgroundColor: '#dcfce7',
    borderRadius: 40,
    height: 80,
    justifyContent: 'center',
    width: 80,
  },
  avatarIcon: {
    color: '#16a34a',
    fontSize: 40,
    fontWeight: '700',
  },
  title: {
    color: '#0f172a',
    fontSize: 30,
    fontWeight: '700',
    marginTop: 16,
  },
  subtitle: {
    color: '#475569',
    fontSize: 16,
    marginTop: 8,
  },
  card: {
    backgroundColor: '#ffffff',
    borderColor: '#e2e8f0',
    borderRadius: 20,
    borderWidth: 1,
    marginTop: 24,
    maxWidth: 360,
    padding: 20,
    width: '100%',
  },
  label: {
    color: '#64748b',
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  email: {
    color: '#0f172a',
    fontSize: 18,
    fontWeight: '500',
    marginTop: 8,
  },
  helper: {
    color: '#64748b',
    fontSize: 15,
    lineHeight: 22,
    marginTop: 18,
    maxWidth: 320,
    textAlign: 'center',
  },
});
