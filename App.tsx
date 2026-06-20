import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AuthProvider } from './src/context/AuthContext';
import { DogParksProvider } from './src/context/DogParksContext';
import { FriendsProvider } from './src/context/FriendsContext';
import { PetProfilesProvider } from './src/context/PetProfilesContext';
import { AppNavigator } from './src/navigation/AppNavigator';

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <DogParksProvider>
          <PetProfilesProvider>
            <FriendsProvider>
              <AppNavigator />
            </FriendsProvider>
          </PetProfilesProvider>
        </DogParksProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
