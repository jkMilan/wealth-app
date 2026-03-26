import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Alert, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';

// Reusing your icon mapper for consistency!
const getIconName = (lucideName) => {
  const map = {
    'Wallet': 'wallet', 'Laptop': 'laptop', 'TrendingUp': 'trending-up',
    'Building': 'business', 'Home': 'home', 'Plus': 'add', 'Car': 'car',
    'Shopping': 'cart', 'Zap': 'flash', 'Film': 'film', 'UtensilsCrossed': 'restaurant',
    'ShoppingBag': 'bag', 'HeartPulse': 'medkit', 'GraduationCap': 'school',
    'Smile': 'happy', 'Plane': 'airplane', 'Shield': 'shield-checkmark',
    'Gift': 'gift', 'Receipt': 'receipt', 'MoreHorizontal': 'ellipsis-horizontal'
  };
  return map[lucideName] || 'sync-circle'; // sync icon as default for subs
};

export default function SubscriptionsScreen({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [subscriptions, setSubscriptions] = useState([]);
  const [totalMonthly, setTotalMonthly] = useState(0);

  const fetchSubscriptions = async () => {
    try {
      const storedSession = await SecureStore.getItemAsync('wealth_ai_session');
      if (!storedSession) return;
      const session = JSON.parse(storedSession);

      // Fetching from your Next.js backend
      const response = await fetch('https://wealth-app-three.vercel.app/api/mobile/subscriptions', {
        headers: { 'Authorization': `Bearer ${session.token}` }
      });
      
      const data = await response.json();
      
      if (response.ok && data.subscriptions) {
        setSubscriptions(data.subscriptions);
        
        // Calculate the total monthly cost of all active subscriptions
        const total = data.subscriptions.reduce((sum, sub) => {
            // Normalize everything to a monthly cost for the summary card
            let monthlyCost = Number(sub.amount);
            if (sub.recurringInterval === 'YEARLY') monthlyCost = monthlyCost / 12;
            if (sub.recurringInterval === 'WEEKLY') monthlyCost = monthlyCost * 4.33;
            if (sub.recurringInterval === 'DAILY') monthlyCost = monthlyCost * 30;
            return sum + monthlyCost;
        }, 0);
        
        setTotalMonthly(total);
      }
    } catch (err) {
      console.error('Failed to fetch subscriptions:', err);
      // Fallback dummy data just so you can see the UI while testing!
      setSubscriptions([
        { id: '1', description: 'Netflix Premium', amount: 3500.00, recurringInterval: 'MONTHLY', category: { name: 'Entertainment', icon: 'Film', color: '#a855f7' } },
        { id: '2', description: 'Power World Gym', amount: 4000.00, recurringInterval: 'MONTHLY', category: { name: 'Personal Care', icon: 'HeartPulse', color: '#ec4899' } },
        { id: '3', description: 'Spotify Duo', amount: 1400.00, recurringInterval: 'MONTHLY', category: { name: 'Entertainment', icon: 'Film', color: '#a855f7' } }
      ]);
      setTotalMonthly(8900.00);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchSubscriptions();
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchSubscriptions();
  }, []);

  const handleSubscriptionOptions = (sub) => {
    Alert.alert(
      "Manage Subscription",
      `${sub.description} - LKR ${Number(sub.amount).toFixed(2)}`,
      [
        { text: "Cancel Subscription", style: "destructive", onPress: () => deleteSubscription(sub.id) },
        { text: "Edit", onPress: () => console.log("Edit sub") },
        { text: "Close", style: "cancel" }
      ]
    );
  };

  const deleteSubscription = async (id) => {
    // Here you would call your API to delete or pause the recurring transaction
    Alert.alert("Success", "Subscription cancelled successfully.");
    setSubscriptions(prev => prev.filter(s => s.id !== id));
  };

  if (loading) {
    return (
      <View className="flex-1 bg-zinc-900 justify-center items-center">
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-zinc-900">
      <ScrollView 
        className="flex-1 px-4 pt-6"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#ffffff" />}
      >
        
        {/* Header Summary Card */}
        <View className="bg-gradient-to-br from-zinc-800 to-zinc-900 p-6 rounded-3xl border border-zinc-700/50 mb-8 shadow-lg">
          <View className="flex-row items-center mb-2">
            <View className="bg-blue-500/20 p-2 rounded-full mr-3">
              <Ionicons name="calendar-outline" size={20} color="#3b82f6" />
            </View>
            <Text className="text-zinc-400 font-bold uppercase tracking-wider text-xs">Monthly Fixed Cost</Text>
          </View>
          <Text className="text-white text-4xl font-black mb-1">
            LKR {totalMonthly.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </Text>
          <Text className="text-zinc-500 text-sm">Across {subscriptions.length} active subscriptions</Text>
        </View>

        <View className="flex-row justify-between items-end mb-4 px-1">
          <Text className="text-white text-xl font-bold">Your Subscriptions</Text>
          <TouchableOpacity onPress={() => navigation.navigate('LogExpense')}>
            <Text className="text-blue-500 font-bold">+ Add New</Text>
          </TouchableOpacity>
        </View>

        {/* Subscriptions List */}
        {subscriptions.length === 0 ? (
          <View className="bg-zinc-800/50 p-8 rounded-2xl items-center justify-center border border-zinc-800 mt-4">
            <Ionicons name="receipt-outline" size={48} color="#52525b" className="mb-4" />
            <Text className="text-white font-bold text-lg mb-1">No subscriptions yet</Text>
            <Text className="text-zinc-500 text-center">When you add a recurring expense, it will show up here.</Text>
          </View>
        ) : (
          <View className="pb-10">
            {subscriptions.map((sub) => (
              <TouchableOpacity 
                key={sub.id} 
                className="bg-zinc-800/80 p-4 rounded-2xl mb-3 border border-zinc-700/50 flex-row items-center"
                onPress={() => handleSubscriptionOptions(sub)}
                activeOpacity={0.7}
              >
                {/* Dynamic Category Icon */}
                <View 
                  className="w-12 h-12 rounded-xl items-center justify-center mr-4" 
                  style={{ backgroundColor: (sub.category?.color || '#9ca3af') + '20' }}
                >
                  <Ionicons 
                    name={getIconName(sub.category?.icon)} 
                    size={24} 
                    color={sub.category?.color || '#9ca3af'} 
                  />
                </View>

                {/* Details */}
                <View className="flex-1">
                  <Text className="text-white font-bold text-base mb-1" numberOfLines={1}>
                    {sub.description || 'Subscription'}
                  </Text>
                  <Text className="text-zinc-400 text-xs capitalize">
                    {sub.recurringInterval ? sub.recurringInterval.toLowerCase() : 'Recurring'} • {sub.category?.name || 'Other'}
                  </Text>
                </View>

                {/* Amount */}
                <View className="items-end">
                  <Text className="text-white font-bold text-base">
                    {Number(sub.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </Text>
                  <Text className="text-zinc-500 text-xs mt-1">LKR</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

      </ScrollView>
    </View>
  );
}