import { useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { MobileBottomNav, MobileTabKey } from '../components/MobileBottomNav';
import { MobileTopNav } from '../components/MobileTopNav';
import { MoreMenuModal } from '../components/MoreMenuModal';
import { ParkRequestsModal } from '../components/ParkRequestsModal';
import { PlaceholderModal } from '../components/PlaceholderModal';
import { useAuth } from '../context/AuthContext';
import { CheckInScreen } from './CheckInScreen';
import { ProfileScreen } from './ProfileScreen';

type PlaceholderType = 'settings' | 'contact' | null;

export const SignedInShell = () => {
  const { signOut } = useAuth();
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<MobileTabKey>('check-in');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isRequestsOpen, setIsRequestsOpen] = useState(false);
  const [placeholder, setPlaceholder] = useState<PlaceholderType>(null);

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unable to sign out right now.';

      Alert.alert('Sign out failed', message);
    }
  };

  const placeholderContent =
    placeholder === 'settings'
      ? {
          title: 'Settings',
          description:
            'Settings is a placeholder for now. It will be added to the mobile app next.',
        }
      : placeholder === 'contact'
        ? {
            title: 'Contact Us',
            description:
              'Contact Us is a placeholder for now. The support flow will be added here.',
          }
        : null;

  return (
    <SafeAreaView edges={['left', 'right']} style={styles.safeArea}>
      <View style={styles.screen}>
        <MobileTopNav onOpenMenu={() => setIsMenuOpen(true)} topInset={insets.top} />

        <View style={styles.content}>
          {activeTab === 'check-in' ? <CheckInScreen /> : <ProfileScreen />}
        </View>

        <MobileBottomNav
          activeTab={activeTab}
          bottomInset={insets.bottom}
          onTabChange={setActiveTab}
        />
      </View>

      <MoreMenuModal
        onClose={() => setIsMenuOpen(false)}
        onLogOut={handleSignOut}
        onOpenRequests={() => setIsRequestsOpen(true)}
        onOpenPlaceholder={setPlaceholder}
        topInset={insets.top}
        visible={isMenuOpen}
      />

      <ParkRequestsModal
        onClose={() => setIsRequestsOpen(false)}
        visible={isRequestsOpen}
      />

      <PlaceholderModal
        description={placeholderContent?.description ?? ''}
        onClose={() => setPlaceholder(null)}
        title={placeholderContent?.title ?? ''}
        visible={placeholder !== null}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: '#ffffff',
    flex: 1,
  },
  screen: {
    backgroundColor: '#ffffff',
    flex: 1,
  },
  content: {
    backgroundColor: '#f8fafc',
    flex: 1,
  },
});
