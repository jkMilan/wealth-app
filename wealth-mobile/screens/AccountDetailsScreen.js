import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';

export default function AccountDetailsScreen({ route, navigation }) {
  const { accountId, accountName } = route.params || {};

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [account, setAccount] = useState(null);
  const [transactions, setTransactions] = useState([]);

  const fetchAccountDetails = async () => {
    if (!accountId) return;
    
    try {
      const storedSession = await SecureStore.getItemAsync('wealth_ai_session');
      const session = JSON.parse(storedSession);

      const response = await fetch(`https://wealth-app-three.vercel.app/api/mobile/accounts/${accountId}`, {
        headers: { 
          'Authorization': `Bearer ${session.token}`,
          'Content-Type': 'application/json',
        }
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setAccount(data.account);
        setTransactions(data.transactions);
      }
    } catch (err) {
      console.error('Failed to fetch account details:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAccountDetails();
  }, [accountId]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchAccountDetails();
  }, [accountId]);

  if (loading) {
    return (
      <View className="flex-1 bg-zinc-900 justify-center items-center">
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  if (!account) {
    return (
      <View className="flex-1 bg-zinc-900 justify-center items-center">
        <Text className="text-white">Account not found.</Text>
        <TouchableOpacity onPress={() => navigation.goBack()} className="mt-4 p-3 bg-zinc-800 rounded-lg">
          <Text className="text-blue-500">Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-zinc-900">
      {/* Custom Header */}
      <View className="px-4 pt-12 pb-4 flex-row items-center justify-between border-b border-zinc-800">
        <TouchableOpacity onPress={() => navigation.goBack()} className="p-2 -ml-2">
          <Ionicons name="chevron-back" size={28} color="#ffffff" />
        </TouchableOpacity>
        <Text className="text-white font-bold text-lg">{accountName || account.name}</Text>
        <TouchableOpacity className="p-2 -mr-2">
          <Ionicons name="ellipsis-horizontal" size={24} color="#ffffff" />
        </TouchableOpacity>
      </View>

      <ScrollView 
        className="flex-1 px-4 pt-6"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#ffffff" />}
      >
        {/* Big Balance Card */}
        <View className="bg-gradient-to-br from-blue-900 to-zinc-900 p-6 rounded-3xl border border-blue-800/50 mb-8 shadow-lg">
          <Text className="text-blue-200 font-bold uppercase tracking-wider text-xs mb-2">Available Balance</Text>
          <Text className="text-white text-4xl font-black mb-1">
            LKR {Number(account.balance).toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </Text>
          <View className="flex-row items-center mt-2">
            <View className={`px-2 py-1 rounded-md ${account.isDefault ? 'bg-green-500/20' : 'bg-zinc-800'}`}>
              <Text className={`text-xs font-bold ${account.isDefault ? 'text-green-400' : 'text-zinc-400'}`}>
                {account.isDefault ? 'Default Account' : 'Secondary Account'}
              </Text>
            </View>
          </View>
        </View>

        <Text className="text-white text-xl font-bold mb-4 px-1">Recent Transactions</Text>

        {/* Transactions List */}
        {transactions.length === 0 ? (
          <View className="bg-zinc-800/50 p-8 rounded-2xl items-center justify-center border border-zinc-800 mt-2">
            <Ionicons name="receipt-outline" size={48} color="#52525b" className="mb-4" />
            <Text className="text-white font-bold text-lg mb-1">No transactions yet</Text>
            <Text className="text-zinc-500 text-center">Transactions linked to this account will appear here.</Text>
          </View>
        ) : (
          <View className="pb-10">
            {transactions.map((txn) => (
              <View key={txn.id} className="bg-zinc-800/80 p-4 rounded-2xl mb-3 border border-zinc-700/50 flex-row items-center">
                <View className={`w-12 h-12 rounded-full items-center justify-center mr-4 ${txn.type === 'INCOME' ? 'bg-green-500/20' : 'bg-zinc-700'}`}>
                  <Ionicons 
                    name={txn.type === 'INCOME' ? 'arrow-down' : 'arrow-up'} 
                    size={20} 
                    color={txn.type === 'INCOME' ? '#4ade80' : '#ffffff'} 
                  />
                </View>

                <View className="flex-1">
                  <Text className="text-white font-bold text-base mb-1" numberOfLines={1}>
                    {txn.description}
                  </Text>
                  <Text className="text-zinc-400 text-xs">
                    {new Date(txn.date).toLocaleDateString()}
                  </Text>
                </View>

                <View className="items-end">
                  <Text className={`font-bold text-base ${txn.type === 'INCOME' ? 'text-green-400' : 'text-white'}`}>
                    {txn.type === 'INCOME' ? '+' : '-'} {Number(txn.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}