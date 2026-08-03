import { Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { RegisterDeviceScreen } from '../screens/RegisterDeviceScreen';
import { InboxScreen } from '../screens/InboxScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { EditProposalScreen } from '../screens/EditProposalScreen';
import { ArchiveSearchScreen } from '../screens/ArchiveSearchScreen';
import { ConversationsScreen } from '../screens/ConversationsScreen';
import { ThreadScreen } from '../screens/ThreadScreen';
import { useDevice } from '../../state/device-store';
import { HIT_SLOP, useColors } from '../theme';
import type { RootStackParamList, TabParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tabs = createBottomTabNavigator<TabParamList>();

// Gated on device registration: the register flow until a device key is stored, then the tabs
// (Inbox / Archive) with Settings and the detail screens pushed over them.
export function RootStack() {
  const registered = useDevice((s) => s.registered);

  return (
    <Stack.Navigator>
      {registered ? (
        <>
          <Stack.Screen name="Tabs" component={TabLayout} options={{ headerShown: false }} />
          <Stack.Screen name="Settings" component={SettingsScreen} options={{ title: 'Settings' }} />
          <Stack.Screen name="EditProposal" component={EditProposalScreen} options={{ title: 'Edit proposal' }} />
          <Stack.Screen name="Conversations" component={ConversationsScreen} options={{ title: 'Conversations' }} />
          <Stack.Screen name="Thread" component={ThreadScreen} options={{ title: 'Thread' }} />
        </>
      ) : (
        <Stack.Screen name="RegisterDevice" component={RegisterDeviceScreen} options={{ headerShown: false }} />
      )}
    </Stack.Navigator>
  );
}

function TabLayout() {
  const c = useColors();
  return (
    <Tabs.Navigator
      screenOptions={({ navigation }) => ({
        tabBarActiveTintColor: c.primary,
        tabBarInactiveTintColor: c.textMuted,
        headerRight: () => (
          <Pressable
            onPress={() => navigation.getParent()?.navigate('Settings')}
            hitSlop={HIT_SLOP}
            accessibilityRole="button"
            accessibilityLabel="Settings"
          >
            <Ionicons name="settings-outline" size={22} color={c.text} />
          </Pressable>
        ),
      })}
    >
      <Tabs.Screen
        name="InboxTab"
        component={InboxScreen}
        options={{
          title: 'Inbox',
          headerTitle: 'Lupira Assistant',
          tabBarIcon: ({ color, size }) => <Ionicons name="mail-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="ArchiveTab"
        component={ArchiveSearchScreen}
        options={{
          title: 'Archive',
          headerTitle: 'Archive',
          tabBarIcon: ({ color, size }) => <Ionicons name="search-outline" size={size} color={color} />,
        }}
      />
    </Tabs.Navigator>
  );
}
