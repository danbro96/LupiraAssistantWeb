import { Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { RegisterDeviceScreen } from '../screens/RegisterDeviceScreen';
import { InboxScreen } from '../screens/InboxScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { useDevice } from '../../state/device-store';
import { HIT_SLOP, useColors } from '../theme';
import type { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

// Gated on device registration: register flow until a device key is stored, then the Inbox (home)
// with Settings reachable from the header.
export function RootStack() {
  const registered = useDevice((s) => s.registered);
  const c = useColors();

  return (
    <Stack.Navigator>
      {registered ? (
        <>
          <Stack.Screen
            name="Inbox"
            component={InboxScreen}
            options={({ navigation }) => ({
              title: 'Lupira Assistant',
              headerRight: () => (
                <Pressable
                  onPress={() => navigation.navigate('Settings')}
                  hitSlop={HIT_SLOP}
                  accessibilityRole="button"
                  accessibilityLabel="Settings"
                >
                  <Ionicons name="settings-outline" size={22} color={c.text} />
                </Pressable>
              ),
            })}
          />
          <Stack.Screen name="Settings" component={SettingsScreen} options={{ title: 'Settings' }} />
        </>
      ) : (
        <Stack.Screen name="RegisterDevice" component={RegisterDeviceScreen} options={{ headerShown: false }} />
      )}
    </Stack.Navigator>
  );
}
