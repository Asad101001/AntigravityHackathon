import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';

import HomeScreen from './screens/HomeScreen';
import IntentConfirmScreen from './screens/IntentConfirmScreen';
import LoadingScreen from './screens/LoadingScreen';
import ProviderResultsScreen from './screens/ProviderResultsScreen';
import BookingConfirmScreen from './screens/BookingConfirmScreen';
import ConfirmationScreen from './screens/ConfirmationScreen';
import AgentTraceScreen from './screens/AgentTraceScreen';
import ReviewBookingScreen from './screens/ReviewBookingScreen';
import ProviderChatScreen from './screens/ProviderChatScreen';
import LocationPickerScreen from './screens/LocationPickerScreen';
import SplashScreen from './screens/SplashScreen';
import { TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from './config';

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <StatusBar style="dark" />
      <Stack.Navigator
        initialRouteName="Splash"
        screenOptions={{
          headerStyle: { backgroundColor: COLORS.bgCard },
          headerTintColor: COLORS.textPrimary,
          headerTitleStyle: { fontWeight: '700', fontSize: 17 },
          contentStyle: { backgroundColor: COLORS.bg },
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen
          name="Splash"
          component={SplashScreen}
          options={{ headerShown: false, animation: 'fade' }}
        />
        <Stack.Screen
          name="Home"
          component={HomeScreen}
          options={({ navigation }) => ({ 
            headerShown: true,
            title: 'Asaaniyat',
            headerRight: () => (
              <TouchableOpacity onPress={() => navigation.navigate('AgentTrace')}>
                <Ionicons name="terminal-outline" size={24} color={COLORS.primary} />
              </TouchableOpacity>
            )
          })}
        />
        <Stack.Screen
          name="IntentConfirm"
          component={IntentConfirmScreen}
          options={{ title: 'Confirm Request' }}
        />
        <Stack.Screen
          name="Loading"
          component={LoadingScreen}
          options={{ headerShown: false, gestureEnabled: false }}
        />
        <Stack.Screen
          name="ProviderResults"
          component={ProviderResultsScreen}
          options={{ title: 'Available Providers' }}
        />
        <Stack.Screen
          name="BookingConfirm"
          component={BookingConfirmScreen}
          options={{ title: 'Confirm Booking' }}
        />
        <Stack.Screen
          name="ReviewBooking"
          component={ReviewBookingScreen}
          options={{ title: 'Review Booking' }}
        />
        <Stack.Screen
          name="ProviderChat"
          component={ProviderChatScreen}
          options={{ title: 'Provider Chat' }}
        />
        <Stack.Screen
          name="LocationPicker"
          component={LocationPickerScreen}
          options={{ title: 'Pick Location' }}
        />
        <Stack.Screen
          name="Confirmation"
          component={ConfirmationScreen}
          options={{ headerShown: false, gestureEnabled: false }}
        />
        <Stack.Screen
          name="AgentTrace"
          component={AgentTraceScreen}
          options={{ title: 'Agent Trace Logs' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

