import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AuthProvider } from './src/context/AuthContext';
import { PetProfilesProvider } from './src/context/PetProfilesContext';
import { AppNavigator } from './src/navigation/AppNavigator';

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <PetProfilesProvider>
          <AppNavigator />
        </PetProfilesProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
