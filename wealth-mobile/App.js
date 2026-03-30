import React, { useState, useEffect } from 'react';
import { View, Text, ActivityIndicator, TouchableOpacity } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import AccountDetailsScreen from './screens/AccountDetailsScreen';
import LogExpenseScreen from './screens/LogExpenseScreen';
import DashboardScreen from './screens/DashboardScreen';
import AuthScreen from './screens/AuthScreen';
import AccountsScreen from './screens/AccountsScreen';
import SubscriptionsScreen from './screens/SubscriptionsScreen';
import ProfileScreen from './screens/ProfileScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const PlaceholderScreen = ({ title }) => (
  <View className="flex-1 bg-zinc-900 items-center justify-center p-6">
    <Ionicons name="construct-outline" size={64} color="#71717a" className="mb-4" />
    <Text className="text-2xl font-bold text-white mb-2">{title}</Text>
    <Text className="text-zinc-400 text-center">This screen is under construction.</Text>
  </View>
);

export default function App() {
  const [session, setSession] = useState(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    async function checkSession() {
      const storedSession = await SecureStore.getItemAsync('wealth_ai_session');
      if (storedSession) {
        setSession(JSON.parse(storedSession)); 
      }
      setIsReady(true);
    }
    checkSession();
  }, []);

  const handleLogout = async () => {
    await SecureStore.deleteItemAsync('wealth_ai_session');
    setSession(null);
  };

  if (!isReady) {
    return (
      <View className="flex-1 bg-zinc-900 items-center justify-center">
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  if (!session) {
    return <AuthScreen onLoginSuccess={(data) => setSession(data)} />;
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        
        {/* The Main App with the Bottom Tabs */}
        <Stack.Screen name="MainTabs">
          {() => (
            <Tab.Navigator
              screenOptions={{
                tabBarActiveTintColor: '#3b82f6', 
                tabBarInactiveTintColor: '#71717a', 
                tabBarStyle: { 
                  backgroundColor: '#18181b', 
                  borderTopWidth: 1,
                  borderTopColor: '#27272a', 
                  paddingBottom: 8,
                  paddingTop: 8,
                  height: 65,
                },
                headerStyle: { 
                  backgroundColor: '#18181b', 
                  shadowColor: 'transparent',
                  borderBottomWidth: 1,
                  borderBottomColor: '#27272a'
                },
                headerTintColor: '#ffffff',
                headerTitleStyle: { fontWeight: 'bold' },
              }}
            >
              <Tab.Screen name="Dashboard" component={DashboardScreen} options={{ tabBarIcon: ({ color, size }) => <Ionicons name="home" size={size} color={color} /> }} />
              <Tab.Screen name="Accounts" component={AccountsScreen} options={{ tabBarIcon: ({ color, size }) => <Ionicons name="wallet" size={size} color={color} /> }} />
              
              <Tab.Screen 
                name="Add" 
                component={LogExpenseScreen} 
                options={{
                  tabBarLabel: () => null,
                  tabBarLabel: "Add",
                  headerTitle: "Add Transaction",
                  tabBarIcon: ({ focused }) => (
                    <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: '#3b82f6', justifyContent: 'center', alignItems: 'center', marginBottom: 25, shadowColor: '#3b82f6', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 5, elevation: 5 }}>
                      <Ionicons name="scan" size={28} color="#ffffff" />
                    </View>
                  )
                }}
              />
              
              <Tab.Screen name="Subs" component={SubscriptionsScreen} options={{ tabBarIcon: ({ color, size }) => <Ionicons name="sync-circle" size={size} color={color} /> }} />
              <Tab.Screen 
                name="Profile" 
                component={ProfileScreen} 
                options={{
                  tabBarIcon: ({ color, size }) => <Ionicons name="person" size={size} color={color} />,
                  headerRight: () => (
                    <TouchableOpacity onPress={handleLogout} style={{ marginRight: 16 }}>
                      <Ionicons name="log-out-outline" size={24} color="#ef4444" />
                    </TouchableOpacity>
                  )
                }}
              />
            </Tab.Navigator>
          )}
        </Stack.Screen>

        {/* The New Account Details Screen (Slides over the tabs!) */}
        <Stack.Screen 
          name="AccountDetails" 
          component={AccountDetailsScreen} 
        />

      </Stack.Navigator>
    </NavigationContainer>
  );
}