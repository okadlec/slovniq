import { Tabs } from 'expo-router';
import { BottomTabBarProps, BottomTabBar } from '@react-navigation/bottom-tabs';
import Ionicons from '@expo/vector-icons/Ionicons';
import { AdBanner } from '@/src/services/AdManager';
import { useAppStore } from '@/src/stores/useAppStore';
import { useTheme } from '@/src/config/ThemeContext';
import { View } from 'react-native';

function CustomTabBar(props: BottomTabBarProps) {
  const proStatus = useAppStore((s) => s.proStatus);

  return (
    <View>
      <AdBanner isPro={proStatus === 'pro'} />
      <BottomTabBar {...props} />
    </View>
  );
}

export default function TabLayout() {
  const { colors } = useTheme();

  return (
    <Tabs
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          borderTopColor: colors.border,
          backgroundColor: colors.surface,
        },
        headerStyle: { backgroundColor: colors.primary },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: '600' },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Slovník',
          headerShown: false,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="book" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Nastavení',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="settings-outline" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
