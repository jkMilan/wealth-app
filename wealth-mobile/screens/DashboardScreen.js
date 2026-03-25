import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, ActivityIndicator, RefreshControl } from 'react-native';
import { supabase } from '../supabase'; // Your database connection

export default function DashboardScreen() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // The function that talks to Supabase
  const fetchTransactions = async () => {
    try {
      // 1. Get the currently logged-in user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // 2. Fetch their data from the Prisma-generated 'transactions' table
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        // .eq('userId', user.id) // <- Uncomment this if your Prisma schema links transactions to users via userId
        .order('createdAt', { ascending: false }); // Sorts by newest first

      if (error) {
        console.error('Database Error:', error);
      } else {
        setTransactions(data);
      }
    } catch (err) {
      console.error('Network Error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Run the fetch function as soon as the screen loads
  useEffect(() => {
    fetchTransactions();
  }, []);

  // Handle the "Pull to Refresh" action
  const onRefresh = () => {
    setRefreshing(true);
    fetchTransactions();
  };

  // The design blueprint for a single transaction row
  const renderTransaction = ({ item }) => {
    // Determine if it's income or an expense to color the text red/green
    // (Adjust this logic if your Prisma schema uses a 'type' column instead of positive/negative amounts)
    const isIncome = item.amount > 0; 

    return (
      <View className="flex-row justify-between items-center bg-zinc-800 p-4 mb-3 rounded-2xl shadow-sm">
        <View className="flex-1 pr-4">
          <Text className="text-white font-bold text-base" numberOfLines={1}>
            {item.description || 'Unknown Merchant'}
          </Text>
          <Text className="text-zinc-400 text-sm mt-1">
            {new Date(item.createdAt).toLocaleDateString()}
          </Text>
        </View>
        
        <View className="items-end">
          <Text className={`font-bold text-lg ${isIncome ? 'text-green-400' : 'text-red-400'}`}>
            {isIncome ? '+' : ''}LKR {Math.abs(item.amount).toFixed(2)}
          </Text>
          <Text className="text-zinc-500 text-xs mt-1 capitalize">
            {item.category || 'General'}
          </Text>
        </View>
      </View>
    );
  };

  // Show a blue loading spinner while fetching data
  if (loading) {
    return (
      <View className="flex-1 bg-zinc-900 justify-center items-center">
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-zinc-900 px-4 pt-6">
      <Text className="text-3xl font-bold text-white mb-6">Recent Transactions</Text>
      
      {transactions.length === 0 ? (
        <View className="flex-1 justify-center items-center">
          <Text className="text-zinc-500 text-lg">No transactions yet.</Text>
        </View>
      ) : (
        <FlatList
          data={transactions}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderTransaction}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl 
              refreshing={refreshing} 
              onRefresh={onRefresh} 
              tintColor="#3b82f6" 
            />
          }
          contentContainerStyle={{ paddingBottom: 30 }}
        />
      )}
    </View>
  );
}