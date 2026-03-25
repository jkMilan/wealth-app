import React, { useState, useEffect } from 'react';
import { View, ActivityIndicator, TouchableOpacity } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store'; // NEW: We read the token from here!

import LogExpenseScreen from './screens/LogExpenseScreen';
import DashboardScreen from './screens/DashboardScreen';
import AuthScreen from './screens/AuthScreen';

const Tab = createBottomTabNavigator();

export default function App() {
  const [session, setSession] = useState(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // 1. Check if the user has a NextAuth token saved in the iPhone's vault
    async function checkSession() {
      const storedSession = await SecureStore.getItemAsync('wealth_ai_session');
      if (storedSession) {
        setSession(JSON.parse(storedSession)); // Token found! Log them in.
      }
      setIsReady(true);
    }
    checkSession();
  }, []);

  // Function to handle logging out
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

  // IF NO SESSION: Show the Login Screen and pass a function to update the session
  if (!session) {
    return <AuthScreen onLoginSuccess={(data) => setSession(data)} />;
  }

  // IF SESSION EXISTS: Show the tabs!
  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          tabBarIcon: ({ focused, color, size }) => {
            let iconName = route.name === 'Log Expense' ? (focused ? 'add-circle' : 'add-circle-outline') : (focused ? 'bar-chart' : 'bar-chart-outline');
            return <Ionicons name={iconName} size={size} color={color} />;
          },
          tabBarActiveTintColor: '#3b82f6',
          tabBarInactiveTintColor: '#9ca3af',
          tabBarStyle: { backgroundColor: '#27272a', borderTopWidth: 0 },
          headerStyle: { backgroundColor: '#18181b', shadowColor: 'transparent' },
          headerTintColor: '#ffffff',
          headerTitleStyle: { fontWeight: 'bold' },
          // A quick logout button added to the header
          headerRight: () => (
            <TouchableOpacity onPress={handleLogout} style={{ marginRight: 16 }}>
              <Ionicons name="log-out-outline" size={24} color="#ef4444" />
            </TouchableOpacity>
          )
        })}
      >
        <Tab.Screen name="Log Expense" component={LogExpenseScreen} />
        <Tab.Screen name="Dashboard" component={DashboardScreen} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}