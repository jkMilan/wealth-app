import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, ActivityIndicator, RefreshControl, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';

export default function AccountsScreen() {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchAccounts = async () => {
    try {
      const storedSession = await SecureStore.getItemAsync('wealth_ai_session');
      if (!storedSession) return;
      const session = JSON.parse(storedSession);

      const response = await fetch('https://wealth-app-three.vercel.app/api/mobile/dashboard', {
        headers: {
          'Authorization': `Bearer ${session.token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      
      if (response.ok) {
        setAccounts(data.accounts || []);
      } else {
        console.error("Failed to fetch accounts:", data.error);
      }
    } catch (err) {
      console.error('Network Error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAccounts();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchAccounts();
  };

  const renderAccountCard = ({ item }) => (
    <TouchableOpacity className="bg-zinc-800 rounded-3xl p-5 mb-4 border border-zinc-700/50 flex-row justify-between items-center shadow-sm">
      <View className="flex-1 flex-row items-center">
        <View className="w-12 h-12 rounded-full bg-blue-500/20 items-center justify-center mr-4">
          <Ionicons name="wallet" size={24} color="#3b82f6" />
        </View>
        <View>
          <Text className="text-white font-bold text-lg">{item.name}</Text>
          <Text className="text-zinc-400 text-sm capitalize">{item.type || 'Current Account'}</Text>
        </View>
      </View>
      
      <View className="items-end">
        <Text className="text-white text-xl font-bold">
          LKR {Number(item.balance).toFixed(2)}
        </Text>
        {item.isDefault && (
          <View className="bg-blue-500/20 px-2 py-1 rounded mt-1">
            <Text className="text-blue-400 text-xs font-bold uppercase tracking-wider">Default</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View className="flex-1 bg-zinc-900 justify-center items-center">
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-zinc-900 px-4 pt-6">
      <View className="flex-row justify-between items-center mb-6">
        <Text className="text-2xl font-bold text-white">My Accounts</Text>
        <TouchableOpacity className="w-10 h-10 rounded-full bg-blue-600 items-center justify-center shadow-lg shadow-blue-500/30">
          <Ionicons name="add" size={24} color="white" />
        </TouchableOpacity>
      </View>

      {accounts.length === 0 ? (
        <View className="flex-1 justify-center items-center">
          <Ionicons name="card-outline" size={64} color="#52525b" className="mb-4" />
          <Text className="text-zinc-400 text-lg">No accounts found.</Text>
        </View>
      ) : (
        <FlatList
          data={accounts}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderAccountCard}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#3b82f6" />
          }
          contentContainerStyle={{ paddingBottom: 30 }}
        />
      )}
    </View>
  );
}