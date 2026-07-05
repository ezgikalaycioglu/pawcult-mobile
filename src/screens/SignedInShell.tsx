import { useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { MobileBottomNav, MobileTabKey } from '../components/MobileBottomNav';
import { MobileTopNav } from '../components/MobileTopNav';
import { MoreMenuModal } from '../components/MoreMenuModal';
import { RequestsModal } from '../components/RequestsModal';
import { AdminReportsModal } from '../components/AdminReportsModal';
import { LegalDocumentModal } from '../components/LegalDocumentModal';
import { SettingsModal } from '../components/SettingsModal';
import { useAuth } from '../context/AuthContext';
import { useModeration } from '../context/ModerationContext';
import { LegalDocumentType } from '../legal/legalText';
import { CheckInScreen } from './CheckInScreen';
import { ProfileScreen } from './ProfileScreen';

export const SignedInShell = () => {
  const { deleteAccount, signOut } = useAuth();
  const { isAdmin } = useModeration();
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<MobileTabKey>('check-in');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isRequestsOpen, setIsRequestsOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isAdminReportsOpen, setIsAdminReportsOpen] = useState(false);
  const [legalDocument, setLegalDocument] = useState<LegalDocumentType | null>(
    null
  );

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unable to sign out right now.';

      Alert.alert('Sign out failed', message);
    }
  };

  const handleCloseSettings = () => {
    setIsSettingsOpen(false);
    setLegalDocument(null);
  };

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
        isAdmin={isAdmin}
        onClose={() => setIsMenuOpen(false)}
        onLogOut={handleSignOut}
        onOpenAdminReports={() => setIsAdminReportsOpen(true)}
        onOpenRequests={() => setIsRequestsOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        topInset={insets.top}
        visible={isMenuOpen}
      />

      <RequestsModal
        onClose={() => setIsRequestsOpen(false)}
        visible={isRequestsOpen}
      />

      <SettingsModal
        isAdmin={isAdmin}
        onClose={handleCloseSettings}
        onDeleteAccount={deleteAccount}
        onLogOut={handleSignOut}
        onOpenAdminReports={() => setIsAdminReportsOpen(true)}
        onOpenLegalDocument={setLegalDocument}
        visible={isSettingsOpen}
      />

      <AdminReportsModal
        onClose={() => setIsAdminReportsOpen(false)}
        visible={isAdminReportsOpen}
      />

      <LegalDocumentModal
        documentType={legalDocument}
        onClose={() => setLegalDocument(null)}
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
