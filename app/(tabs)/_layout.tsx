import { Tabs } from 'expo-router';
import { Text } from 'react-native';
import { COLORS } from '@/lib/constants';

function TabIcon({ emoji, focused }: { emoji: string; focused: boolean }) {
  return (
    <Text style={{ fontSize: focused ? 22 : 20, opacity: focused ? 1 : 0.5 }}>{emoji}</Text>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#111111',
          borderTopColor: '#262626',
          borderTopWidth: 1,
          height: 64,
        },
        tabBarActiveTintColor: '#3b82f6',
        tabBarInactiveTintColor: '#737373',
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ focused }) => <TabIcon emoji="⚔️" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="muscles"
        options={{
          title: 'Muscles',
          tabBarIcon: ({ focused }) => <TabIcon emoji="💪" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="stats"
        options={{
          title: 'Stats',
          tabBarIcon: ({ focused }) => <TabIcon emoji="🧙" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: 'History',
          tabBarIcon: ({ focused }) => <TabIcon emoji="📜" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ focused }) => <TabIcon emoji="⚙️" focused={focused} />,
        }}
      />
      {/* Hidden tabs — kept for file existence, not shown in tab bar */}
      <Tabs.Screen
        name="dungeon"
        options={{ href: null }}
      />
      <Tabs.Screen
        name="character"
        options={{ href: null }}
      />
    </Tabs>
  );
}
