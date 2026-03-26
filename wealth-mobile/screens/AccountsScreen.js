import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator, Modal, TextInput, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';

export default function AccountsScreen({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [accounts, setAccounts] = useState([]);
  const [totalBalance, setTotalBalance] = useState(0);
  const [modalVisible, setModalVisible] = useState(false);
  const [newAccount, setNewAccount] = useState({ name: '', type: 'CURRENT', balance: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAddAccount = async () => {
    if (!newAccount.name || !newAccount.balance) {
      Alert.alert("Error", "Please fill in all fields");
      return;
    }

    setIsSubmitting(true);
    try {
      const storedSession = await SecureStore.getItemAsync('wealth_ai_session');
      const session = JSON.parse(storedSession);

      const response = await fetch('http://192.168.1.14:3000/api/mobile/accounts', {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${session.token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(newAccount)
      });

      if (response.ok) {
        setModalVisible(false);
        setNewAccount({ name: '', type: 'CURRENT', balance: '' });
        fetchAccounts(); // Refresh the list!
      } else {
        Alert.alert("Error", "Could not save account");
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const fetchAccounts = async () => {
    try {
      const storedSession = await SecureStore.getItemAsync('wealth_ai_session');
      if (!storedSession) return;
      const session = JSON.parse(storedSession);

      // Point this to your local IP for testing, then Vercel later
      const response = await fetch('http://192.168.1.14:3000/api/mobile/dashboard', {
        headers: { 'Authorization': `Bearer ${session.token}` }
      });
      
      const data = await response.json();
      if (response.ok) {
        setAccounts(data.accounts || []);
        const total = data.accounts.reduce((sum, acc) => {
        const balanceNum = parseFloat(acc.balance) || 0; 
        return sum + balanceNum;
        }, 0);

        setTotalBalance(total);
      }
    } catch (error) {
      console.error("Failed to fetch accounts:", error);
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

  if (loading) {
    return (
      <View className="flex-1 bg-zinc-950 items-center justify-center">
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-zinc-950">
    <ScrollView 
      className="flex-1 bg-zinc-950 px-4 pt-4"
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#3b82f6" />}
    >
      {/* Total Balance Header */}
      <View className="bg-zinc-900 p-6 rounded-3xl border border-zinc-800 mb-6">
        <Text className="text-zinc-400 text-sm font-medium mb-1">Total Balance</Text>
        <Text className="text-white text-3xl font-bold">
          LKR {totalBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </Text>
      </View>

      <Text className="text-white text-xl font-bold mb-4">Your Accounts</Text>

      {/* Accounts List */}
      {accounts.map((account) => (
        <TouchableOpacity 
          key={account.id}
          onPress={() => navigation.navigate('AccountDetails', { accountId: account.id, accountName: account.name })}
          className="bg-zinc-900 p-4 rounded-2xl border border-zinc-800 mb-3 flex-row items-center justify-between"
        >
          <View className="flex-row items-center flex-1 mr-2">
            <View className="w-10 h-10 bg-blue-500/10 rounded-full items-center justify-center mr-4">
              <Ionicons name="wallet-outline" size={20} color="#3b82f6" />
            </View>
            <View className="flex-1">
              <Text className="text-white font-bold text-lg">{account.name}</Text>
              <Text className="text-zinc-500 text-xs uppercase tracking-widest">{account.type || 'Bank Account'}</Text>
            </View>
          </View>
          <View className="items-end">
            <Text className="text-white font-bold text-lg">
              LKR {Number(account.balance).toLocaleString(undefined, { 
                minimumFractionDigits: 2, 
                maximumFractionDigits: 2 
              })}
            </Text>
            <Ionicons name="chevron-forward" size={16} color="#3f3f46" />
          </View>
        </TouchableOpacity>
      ))}

      {/* Add Account Button */}
      <TouchableOpacity 
          onPress={() => setModalVisible(true)}
          className="border-2 border-dashed border-zinc-800 p-4 rounded-2xl items-center justify-center mt-4 mb-10"
        >
          <View className="flex-row items-center">
            <Ionicons name="add-circle-outline" size={20} color="#71717a" className="mr-2" />
            <Text className="text-zinc-400 font-medium">Link New Account</Text>
          </View>
        </TouchableOpacity>
      </ScrollView>
      {/* Add Account Modal */}
      <Modal animationType="slide" transparent={true} visible={modalVisible}>
        <View className="flex-1 justify-end bg-black/60">
          <View className="bg-zinc-900 p-6 rounded-t-3xl border-t border-zinc-800">
            <View className="flex-row justify-between items-center mb-6">
              <Text className="text-white text-xl font-bold">Add New Account</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color="#71717a" />
              </TouchableOpacity>
            </View>

            <Text className="text-zinc-400 mb-2">Account Name</Text>
            <TextInput 
              value={newAccount.name}
              onChangeText={(text) => setNewAccount({...newAccount, name: text})}
              className="bg-zinc-800 p-4 rounded-xl text-white mb-4 border border-zinc-700"
              placeholder="e.g. Savings Account"
              placeholderTextColor="#52525b"
            />

            <Text className="text-zinc-400 mb-2">Initial Balance</Text>
            <TextInput 
              value={newAccount.balance}
              onChangeText={(text) => setNewAccount({...newAccount, balance: text})}
              keyboardType="numeric"
              className="bg-zinc-800 p-4 rounded-xl text-white mb-6 border border-zinc-700"
              placeholder="0.00"
              placeholderTextColor="#52525b"
            />

            <TouchableOpacity 
              onPress={handleAddAccount}
              disabled={isSubmitting}
              className={`bg-blue-600 p-4 rounded-xl items-center ${isSubmitting ? 'opacity-50' : ''}`}
            >
              {isSubmitting ? <ActivityIndicator color="white" /> : <Text className="text-white font-bold text-lg">Save Account</Text>}
            </TouchableOpacity>
            <View className="h-10" />
          </View>
        </View>
      </Modal>
  </View>
  );
}