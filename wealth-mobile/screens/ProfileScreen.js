import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, Alert, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';

export default function ProfileScreen({ onLogout }) {
  const [user, setUser] = useState(null);
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  const fetchProfile = async () => {
    try {
      const storedSession = await SecureStore.getItemAsync('wealth_ai_session');
      const session = JSON.parse(storedSession);

      const response = await fetch('https://wealth-app-three.vercel.app/api/mobile/profile', {
        headers: { 'Authorization': `Bearer ${session.token}` }
      });
      const data = await response.json();

      if (response.ok) {
        setUser(data);
        setName(data.name);
      }
    } catch (error) {
      console.error('Profile fetch failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async () => {
    if (!name.trim()) return Alert.alert("Error", "Name cannot be empty");
    setUpdating(true);
    try {
      const session = JSON.parse(await SecureStore.getItemAsync('wealth_ai_session'));
      const response = await fetch('https://wealth-app-three.vercel.app/api/mobile/profile', {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${session.token}`,
          'Content-Type': 'application/json' 
        },
        body: JSON.stringify({ name })
      });

      if (response.ok) {
        Alert.alert("Success", "Profile updated successfully!");
        fetchProfile(); // Refresh UI
      }
    } catch (error) {
      Alert.alert("Error", "Failed to update profile.");
    } finally {
      setUpdating(false);
    }
  };

  useEffect(() => { fetchProfile(); }, []);

  if (loading) return <View className="flex-1 bg-zinc-900 justify-center"><ActivityIndicator color="#3b82f6" /></View>;

  return (
    <ScrollView className="flex-1 bg-zinc-900 px-6 pt-10">
      <View className="items-center mb-10">
        <View className="w-24 h-24 bg-zinc-800 rounded-full items-center justify-center mb-4 border border-zinc-700">
           <Ionicons name="person" size={48} color="#71717a" />
        </View>
        <Text className="text-white text-2xl font-bold">{user?.name || "User"}</Text>
        <Text className="text-zinc-500">{user?.email}</Text>
      </View>

      <View className="bg-zinc-800 p-6 rounded-3xl border border-zinc-700/50 mb-6 shadow-sm">
        <Text className="text-zinc-400 mb-2 uppercase text-[10px] font-black tracking-widest">Display Name</Text>
        <TextInput 
          value={name} 
          onChangeText={setName} 
          placeholder="Enter your name"
          placeholderTextColor="#52525b"
          className="bg-zinc-900 p-4 rounded-xl text-white border border-zinc-700 mb-6 font-bold"
        />
        <TouchableOpacity 
          onPress={handleUpdate} 
          disabled={updating}
          className={`bg-blue-600 p-4 rounded-xl items-center ${updating ? 'opacity-50' : ''}`}
        >
          {updating ? <ActivityIndicator color="white" /> : <Text className="text-white font-bold text-lg">Save Changes</Text>}
        </TouchableOpacity>
      </View>
      <TouchableOpacity 
        onPress={onLogout}
        className="mt-4 mb-10 p-4 rounded-xl border border-red-500/30 items-center"
      >
        <Text className="text-red-500 font-bold text-lg">Sign Out</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}