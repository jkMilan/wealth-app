import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';

export default function ProfileScreen() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(true);

  // Load the user's current info from the saved session
  useEffect(() => {
    async function loadUserData() {
      try {
        const storedSession = await SecureStore.getItemAsync('wealth_ai_session');
        if (storedSession) {
          const session = JSON.parse(storedSession);
          // Fallbacks in case the session doesn't contain the exact fields yet
          setName(session.user?.name || 'JKMilan'); 
          setEmail(session.user?.email || 'jeyakumarmilan@gmail.com');
        }
      } catch (error) {
        console.error("Failed to load session", error);
      } finally {
        setInitializing(false);
      }
    }
    loadUserData();
  }, []);

  const handleSave = async () => {
    setLoading(true);
    // TODO: You will need to create a PUT /api/mobile/profile endpoint on Vercel
    // to actually save this data to your Prisma database!
    setTimeout(() => {
      setLoading(false);
      Alert.alert("Success", "Profile updated successfully!");
    }, 1000); // Simulated network delay
  };

  const handleLogout = async () => {
    Alert.alert(
      "Log Out",
      "Are you sure you want to log out?",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Log Out", 
          style: "destructive",
          onPress: async () => {
            // We delete the token, and App.js will automatically kick us back to AuthScreen
            await SecureStore.deleteItemAsync('wealth_ai_session');
            // A tiny hack to force a reload if state doesn't catch it immediately:
            Alert.alert("Logged Out", "Please restart the app to clear session."); 
          }
        }
      ]
    );
  };

  if (initializing) {
    return (
      <View className="flex-1 bg-zinc-900 justify-center items-center">
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} className="flex-1 bg-zinc-900">
      <ScrollView className="flex-1 px-4 pt-6" contentContainerStyle={{ paddingBottom: 40 }}>
        
        {/* Header */}
        <Text className="text-2xl font-bold text-white mb-6">Account Settings</Text>

        {/* Profile Card */}
        <View className="bg-zinc-800 rounded-3xl p-6 border border-zinc-700/50 mb-6 items-center shadow-sm">
          
          {/* Avatar Component */}
          <View className="relative mb-6">
            <View className="w-24 h-24 bg-blue-100 rounded-full items-center justify-center border-4 border-zinc-800 shadow-md">
              <Text className="text-blue-600 text-4xl font-bold">{name.charAt(0).toUpperCase()}</Text>
            </View>
            <TouchableOpacity className="absolute bottom-0 right-0 bg-zinc-700 w-8 h-8 rounded-full items-center justify-center border-2 border-zinc-800 shadow-sm">
              <Ionicons name="camera" size={16} color="white" />
            </TouchableOpacity>
          </View>

          <Text className="text-white text-xl font-bold mb-1">{name}</Text>
          <Text className="text-zinc-400 text-sm mb-6">{email}</Text>

          {/* Input Fields */}
          <View className="w-full mb-4">
            <Text className="text-zinc-400 text-xs font-bold uppercase tracking-wider mb-2 ml-1">Full Name</Text>
            <TextInput
              className="w-full bg-zinc-900/50 text-white px-4 py-4 rounded-xl border border-zinc-700 focus:border-blue-500 text-base"
              value={name}
              onChangeText={setName}
              placeholder="Enter your full name"
              placeholderTextColor="#71717a"
            />
          </View>

          <View className="w-full mb-6">
            <Text className="text-zinc-400 text-xs font-bold uppercase tracking-wider mb-2 ml-1">Email Address</Text>
            <TextInput
              className="w-full bg-zinc-900/50 text-white px-4 py-4 rounded-xl border border-zinc-700 focus:border-blue-500 text-base"
              value={email}
              onChangeText={setEmail}
              placeholder="Enter your email"
              placeholderTextColor="#71717a"
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          {/* Save Button */}
          <TouchableOpacity 
            className="w-full bg-blue-600 py-4 rounded-xl items-center shadow-lg shadow-blue-500/30"
            onPress={handleSave}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text className="text-white font-bold text-lg">Save Changes</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Danger Zone / Extra Settings */}
        <View className="bg-zinc-800 rounded-3xl p-4 border border-zinc-700/50">
          <TouchableOpacity 
            className="flex-row items-center justify-between p-4"
            onPress={handleLogout}
          >
            <View className="flex-row items-center">
              <Ionicons name="log-out-outline" size={24} color="#ef4444" />
              <Text className="text-red-400 font-bold text-lg ml-3">Log Out</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#52525b" />
          </TouchableOpacity>
        </View>

      </ScrollView>
    </KeyboardAvoidingView>
  );
}