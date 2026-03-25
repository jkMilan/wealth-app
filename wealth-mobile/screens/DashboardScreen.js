import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, ActivityIndicator, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';

export default function DashboardScreen() {
  const [dashboardData, setDashboardData] = useState({ balance: 0, income: 0, expense: 0, transactions: [] });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchDashboardData = async () => {
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
        setDashboardData(data);
      } else {
        console.error("Failed to fetch:", data.error);
      }
    } catch (err) {
      console.error('Network Error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchDashboardData();
  };

  const renderTransaction = ({ item }) => {
    const isIncome = item.type === 'INCOME' || item.amount > 0;

    return (
      <View className="flex-row justify-between items-center bg-zinc-800 p-4 mb-3 rounded-2xl shadow-sm border border-zinc-700/50">
        <View className="flex-row items-center flex-1">
          <View className={`w-12 h-12 rounded-full items-center justify-center mr-4 ${isIncome ? 'bg-green-500/20' : 'bg-red-500/20'}`}>
            <Ionicons name={isIncome ? 'arrow-down' : 'arrow-up'} size={20} color={isIncome ? '#4ade80' : '#f87171'} />
          </View>
          <View className="flex-1 pr-4">
            <Text className="text-white font-bold text-base" numberOfLines={1}>
              {item.name || item.description || 'Transaction'}
            </Text>
            <Text className="text-zinc-400 text-sm mt-1 capitalize">
              {item.category || 'General'}
            </Text>
          </View>
        </View>
        <Text className={`font-bold text-lg ${isIncome ? 'text-green-400' : 'text-red-400'}`}>
          {isIncome ? '+' : '-'}LKR {Math.abs(item.amount).toFixed(2)}
        </Text>
      </View>
    );
  };

  if (loading) {
    return (
      <View className="flex-1 bg-zinc-900 justify-center items-center">
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-zinc-900 px-4 pt-6">
      
      {/* 1. Total Balance Card */}
      <View className="bg-zinc-800 rounded-3xl p-6 mb-4 border border-zinc-700/50">
        <Text className="text-zinc-400 text-sm font-medium mb-1">Total Balance</Text>
        <Text className="text-white text-4xl font-bold">LKR {dashboardData.balance.toFixed(2)}</Text>
      </View>

      {/* 2. Income / Expense Mini Cards */}
      <View className="flex-row justify-between mb-8">
        <View className="bg-zinc-800 rounded-2xl p-4 flex-1 mr-2 border border-zinc-700/50">
          <View className="flex-row items-center mb-2">
            <Ionicons name="trending-up" size={16} color="#4ade80" />
            <Text className="text-zinc-400 text-xs ml-2">Income</Text>
          </View>
          <Text className="text-green-400 text-xl font-bold">LKR {dashboardData.income.toFixed(2)}</Text>
        </View>

        <View className="bg-zinc-800 rounded-2xl p-4 flex-1 ml-2 border border-zinc-700/50">
          <View className="flex-row items-center mb-2">
            <Ionicons name="trending-down" size={16} color="#f87171" />
            <Text className="text-zinc-400 text-xs ml-2">Expenses</Text>
          </View>
          <Text className="text-red-400 text-xl font-bold">LKR {dashboardData.expense.toFixed(2)}</Text>
        </View>
      </View>

      {/* 3. Recent Transactions List */}
      <Text className="text-xl font-bold text-white mb-4">Recent Transactions</Text>
      
      {dashboardData.transactions.length === 0 ? (
        <View className="flex-1 justify-center items-center">
          <Text className="text-zinc-500 text-lg">No transactions yet.</Text>
        </View>
      ) : (
        <FlatList
          data={dashboardData.transactions}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderTransaction}
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