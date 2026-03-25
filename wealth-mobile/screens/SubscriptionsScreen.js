import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, ActivityIndicator, RefreshControl, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';

export default function SubscriptionsScreen() {
  const [subscriptions, setSubscriptions] = useState([]);
  const [totalMonthly, setTotalMonthly] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchSubscriptions = async () => {
    try {
      const storedSession = await SecureStore.getItemAsync('wealth_ai_session');
      if (!storedSession) return;
      const session = JSON.parse(storedSession);

      // Pointing to a new mobile endpoint you'll need to create!
      const response = await fetch('https://wealth-app-three.vercel.app/api/mobile/subscriptions', {
        headers: {
          'Authorization': `Bearer ${session.token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setSubscriptions(data.subscriptions || []);
        
        // Calculate total monthly spend from the data
        const total = (data.subscriptions || []).reduce((sum, sub) => sum + Number(sub.amount), 0);
        setTotalMonthly(total);
      } else {
        // If the API isn't built yet, we won't crash, we'll just show empty state
        console.log("Subscription API not ready yet.");
      }
    } catch (err) {
      console.error('Network Error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchSubscriptions();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchSubscriptions();
  };

  const renderSubscriptionCard = ({ item }) => (
    <View className="bg-zinc-800 rounded-3xl p-5 mb-4 border border-zinc-700/50 flex-row justify-between items-center shadow-sm">
      <View className="flex-1 flex-row items-center">
        <View className="w-12 h-12 rounded-2xl bg-indigo-500/20 items-center justify-center mr-4">
          <Ionicons name="repeat" size={24} color="#818cf8" />
        </View>
        <View className="flex-1 pr-2">
          <Text className="text-white font-bold text-lg" numberOfLines={1}>{item.name || 'Subscription'}</Text>
          <Text className="text-zinc-400 text-sm capitalize">{item.interval || 'Monthly'}</Text>
        </View>
      </View>
      
      <View className="items-end">
        <Text className="text-red-400 text-lg font-bold">
          -LKR {Number(item.amount).toFixed(2)}
        </Text>
        {item.nextDueDate && (
          <Text className="text-zinc-500 text-xs mt-1">Due: {new Date(item.nextDueDate).toLocaleDateString()}</Text>
        )}
      </View>
    </View>
  );

  if (loading) {
    return (
      <View className="flex-1 bg-zinc-900 justify-center items-center">
        <ActivityIndicator size="large" color="#818cf8" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-zinc-900 px-4 pt-6">
      <View className="flex-row justify-between items-center mb-6">
        <Text className="text-2xl font-bold text-white">Subscriptions</Text>
        <TouchableOpacity className="w-10 h-10 rounded-full bg-indigo-600 items-center justify-center shadow-lg shadow-indigo-500/30">
          <Ionicons name="add" size={24} color="white" />
        </TouchableOpacity>
      </View>

      {/* Total Monthly Spend Card */}
      <View className="bg-indigo-600/10 rounded-3xl p-6 mb-6 border border-indigo-500/20 items-center">
        <Text className="text-indigo-300 text-sm font-medium mb-1 uppercase tracking-wider">Total Monthly Spend</Text>
        <Text className="text-white text-3xl font-bold">LKR {totalMonthly.toFixed(2)}</Text>
      </View>

      {subscriptions.length === 0 ? (
        <View className="flex-1 justify-center items-center pb-20">
          <Ionicons name="sync-circle-outline" size={80} color="#52525b" className="mb-4" />
          <Text className="text-zinc-400 text-lg font-medium">No active subscriptions.</Text>
          <Text className="text-zinc-500 text-sm text-center mt-2 px-8">
            Add your recurring expenses to track them automatically.
          </Text>
        </View>
      ) : (
        <FlatList
          data={subscriptions}
          keyExtractor={(item, index) => item.id ? item.id.toString() : index.toString()}
          renderItem={renderSubscriptionCard}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#818cf8" />
          }
          contentContainerStyle={{ paddingBottom: 100 }}
        />
      )}
    </View>
  );
}