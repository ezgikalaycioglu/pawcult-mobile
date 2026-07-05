import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import * as Linking from 'expo-linking';

import { useAuth } from '../context/AuthContext';
import { CreatePetScreen } from '../screens/CreatePetScreen';
import { ForgotPasswordScreen } from '../screens/ForgotPasswordScreen';
import { LoginScreen } from '../screens/LoginScreen';
import { PetOwnerInviteScreen } from '../screens/PetOwnerInviteScreen';
import { ResetPasswordScreen } from '../screens/ResetPasswordScreen';
import { SignedInShell } from '../screens/SignedInShell';
import { SignupScreen } from '../screens/SignupScreen';

export type RootStackParamList = {
  Login: undefined;
  Signup: undefined;
  ForgotPassword: undefined;
  ResetPassword: undefined;
  App: undefined;
  CreatePet: undefined;
  Invite: { token: string };
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const linking = {
  prefixes: [Linking.createURL('/'), 'pawcult://', 'https://pawcult.app'],
  config: {
    screens: {
      Login: 'login',
      Signup: 'signup',
      ForgotPassword: 'forgot-password',
      ResetPassword: 'reset-password',
      App: 'home',
      CreatePet: 'pets/create',
      Invite: 'invite/:token',
    },
  },
};

const AuthLoadingScreen = () => (
  <View style={styles.loadingContainer}>
    <ActivityIndicator size="large" color="#2563eb" />
    <Text style={styles.loadingText}>Loading session...</Text>
  </View>
);

export const AppNavigator = () => {
  const { isRecoverySession, loading, pendingInviteToken, user } = useAuth();

  if (loading) {
    return <AuthLoadingScreen />;
  }

  if (user) {
    return (
      <NavigationContainer
        key={isRecoverySession ? 'signed-in-recovery' : 'signed-in'}
        linking={linking}
      >
        <Stack.Navigator
          initialRouteName={
            isRecoverySession
              ? 'ResetPassword'
              : pendingInviteToken
                ? 'Invite'
                : 'App'
          }
          screenOptions={{ headerBackTitle: 'Back' }}
        >
          <Stack.Screen
            name="App"
            component={SignedInShell}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="CreatePet"
            component={CreatePetScreen}
            options={{
              title: 'Add Pet',
              headerShadowVisible: false,
              headerStyle: { backgroundColor: '#f8fafc' },
              headerTintColor: '#8b5cf6',
              headerTitleStyle: { color: '#0f172a', fontWeight: '700' },
            }}
          />
          <Stack.Screen
            name="ResetPassword"
            component={ResetPasswordScreen}
            options={{ title: 'Reset Password' }}
          />
          <Stack.Screen
            name="Invite"
            component={PetOwnerInviteScreen}
            initialParams={
              pendingInviteToken ? { token: pendingInviteToken } : undefined
            }
            options={{
              title: 'Pet Invite',
              headerShadowVisible: false,
              headerStyle: { backgroundColor: '#f8fafc' },
              headerTintColor: '#8b5cf6',
              headerTitleStyle: { color: '#0f172a', fontWeight: '700' },
            }}
          />
        </Stack.Navigator>
      </NavigationContainer>
    );
  }

  return (
    <NavigationContainer key="signed-out" linking={linking}>
      <Stack.Navigator
        initialRouteName="Login"
        screenOptions={{ headerBackTitle: 'Back' }}
      >
        <Stack.Screen
          name="Invite"
          component={PetOwnerInviteScreen}
          options={{ title: 'Pet Invite' }}
        />
        <Stack.Screen
          name="Login"
          component={LoginScreen}
          options={{ title: 'Log In' }}
        />
        <Stack.Screen
          name="Signup"
          component={SignupScreen}
          options={{ title: 'Sign Up' }}
        />
        <Stack.Screen
          name="ForgotPassword"
          component={ForgotPasswordScreen}
          options={{ title: 'Forgot Password' }}
        />
        <Stack.Screen
          name="ResetPassword"
          component={ResetPasswordScreen}
          options={{ title: 'Reset Password' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#fff',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#334155',
  },
});
