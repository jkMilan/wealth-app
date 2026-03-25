import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Switch, ActivityIndicator, Alert, Modal, KeyboardAvoidingView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';

// Hardcoded categories matching your web app
const CATEGORIES = [
  { id: 'housing', label: 'Housing' },
  { id: 'transportation', label: 'Transportation' },
  { id: 'groceries', label: 'Groceries' },
  { id: 'food', label: 'Food & Dining' },
  { id: 'entertainment', label: 'Entertainment' },
  { id: 'utilities', label: 'Utilities' },
  { id: 'shopping', label: 'Shopping' },
  { id: 'other', label: 'Other' },
];

export default function LogExpenseScreen({ navigation }) {
  const [loading, setLoading] = useState(false);
  const [accounts, setAccounts] = useState([]);
  
  // Form State
  const [type, setType] = useState('EXPENSE'); // 'EXPENSE' or 'INCOME'
  const [amount, setAmount] = useState('');
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]); // YYYY-MM-DD
  const [description, setDescription] = useState('');
  const [isRecurring, setIsRecurring] = useState(false);

  // Modal State for custom dropdowns
  const [modalVisible, setModalVisible] = useState(false);
  const [modalType, setModalType] = useState(null); // 'account' or 'category'

  useEffect(() => {
    fetchAccounts();
  }, []);

  const fetchAccounts = async () => {
    try {
      const storedSession = await SecureStore.getItemAsync('wealth_ai_session');
      if (!storedSession) return;
      const session = JSON.parse(storedSession);

      const response = await fetch('https://wealth-app-three.vercel.app/api/mobile/dashboard', {
        headers: { 'Authorization': `Bearer ${session.token}` }
      });
      const data = await response.json();
      if (response.ok && data.accounts) {
        setAccounts(data.accounts);
        // Auto-select the default account
        const defaultAcc = data.accounts.find(a => a.isDefault) || data.accounts[0];
        if (defaultAcc) setSelectedAccount(defaultAcc);
      }
    } catch (err) {
      console.error('Failed to fetch accounts:', err);
    }
  };

  const handleSaveTransaction = async () => {
    if (!amount || !selectedAccount || !selectedCategory || !date) {
      Alert.alert("Missing Fields", "Please fill out the amount, account, category, and date.");
      return;
    }

    setLoading(true);
    try {
      const storedSession = await SecureStore.getItemAsync('wealth_ai_session');
      const session = JSON.parse(storedSession);

      const response = await fetch('https://wealth-app-three.vercel.app/api/mobile/transactions', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.token}`
        },
        body: JSON.stringify({
          type,
          amount: parseFloat(amount),
          accountId: selectedAccount.id,
          category: selectedCategory.id,
          date: new Date(date).toISOString(),
          description,
          isRecurring
        }),
      });

      if (response.ok) {
        Alert.alert("Success", "Transaction added successfully!", [
          { text: "OK", onPress: () => {
            // Reset form and go to dashboard
            setAmount('');
            setDescription('');
            navigation.navigate('Dashboard'); 
          }}
        ]);
      } else {
        const data = await response.json();
        Alert.alert("Error", data.error || "Failed to create transaction.");
      }
    } catch (error) {
      Alert.alert("Network Error", "Could not connect to the server.");
    } finally {
      setLoading(false);
    }
  };

  const openModal = (type) => {
    setModalType(type);
    setModalVisible(true);
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} className="flex-1 bg-zinc-900">
      <ScrollView className="flex-1 px-4 pt-4" contentContainerStyle={{ paddingBottom: 40 }}>
        
        {/* Web-Style Pink AI Button */}
        <TouchableOpacity className="w-full bg-pink-500 py-4 rounded-xl flex-row justify-center items-center mb-6 shadow-lg shadow-pink-500/30">
          <Ionicons name="camera-outline" size={24} color="white" className="mr-2" />
          <Text className="text-white font-bold text-lg ml-2">Scan Receipt with AI</Text>
        </TouchableOpacity>

        {/* Type Segmented Control */}
        <View className="flex-row bg-zinc-800 p-1 rounded-xl mb-6 border border-zinc-700/50">
          <TouchableOpacity 
            className={`flex-1 py-3 rounded-lg items-center ${type === 'EXPENSE' ? 'bg-zinc-700 shadow-sm' : ''}`}
            onPress={() => setType('EXPENSE')}
          >
            <Text className={`font-bold ${type === 'EXPENSE' ? 'text-white' : 'text-zinc-500'}`}>Expense</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            className={`flex-1 py-3 rounded-lg items-center ${type === 'INCOME' ? 'bg-zinc-700 shadow-sm' : ''}`}
            onPress={() => setType('INCOME')}
          >
            <Text className={`font-bold ${type === 'INCOME' ? 'text-white' : 'text-zinc-500'}`}>Income</Text>
          </TouchableOpacity>
        </View>

        {/* Amount */}
        <View className="mb-4">
          <Text className="text-zinc-400 text-xs font-bold uppercase mb-2 ml-1">Amount</Text>
          <TextInput
            className="w-full bg-zinc-800 text-white px-4 py-4 rounded-xl border border-zinc-700 focus:border-blue-500 text-xl font-bold"
            placeholder="0.00"
            placeholderTextColor="#52525b"
            keyboardType="numeric"
            value={amount}
            onChangeText={setAmount}
          />
        </View>

        {/* Account Selector */}
        <View className="mb-4">
          <Text className="text-zinc-400 text-xs font-bold uppercase mb-2 ml-1">Account</Text>
          <TouchableOpacity 
            className="w-full bg-zinc-800 px-4 py-4 rounded-xl border border-zinc-700 flex-row justify-between items-center"
            onPress={() => openModal('account')}
          >
            <Text className="text-white text-base">{selectedAccount ? selectedAccount.name : 'Select Account...'}</Text>
            <Ionicons name="chevron-down" size={20} color="#9ca3af" />
          </TouchableOpacity>
        </View>

        {/* Category Selector */}
        <View className="mb-4">
          <Text className="text-zinc-400 text-xs font-bold uppercase mb-2 ml-1">Category</Text>
          <TouchableOpacity 
            className="w-full bg-zinc-800 px-4 py-4 rounded-xl border border-zinc-700 flex-row justify-between items-center"
            onPress={() => openModal('category')}
          >
            <Text className="text-white text-base capitalize">{selectedCategory ? selectedCategory.label : 'Select Category...'}</Text>
            <Ionicons name="chevron-down" size={20} color="#9ca3af" />
          </TouchableOpacity>
        </View>

        {/* Date (Simple text input for now, YYYY-MM-DD) */}
        <View className="mb-4">
          <Text className="text-zinc-400 text-xs font-bold uppercase mb-2 ml-1">Date (YYYY-MM-DD)</Text>
          <TextInput
            className="w-full bg-zinc-800 text-white px-4 py-4 rounded-xl border border-zinc-700 focus:border-blue-500 text-base"
            value={date}
            onChangeText={setDate}
            keyboardType="numbers-and-punctuation"
          />
        </View>

        {/* Description */}
        <View className="mb-6">
          <Text className="text-zinc-400 text-xs font-bold uppercase mb-2 ml-1">Description</Text>
          <TextInput
            className="w-full bg-zinc-800 text-white px-4 py-4 rounded-xl border border-zinc-700 focus:border-blue-500 text-base"
            placeholder="Enter Description"
            placeholderTextColor="#52525b"
            value={description}
            onChangeText={setDescription}
          />
        </View>

        {/* Recurring Toggle Container */}
        <View className="bg-zinc-800 p-4 rounded-xl border border-zinc-700/50 flex-row justify-between items-center mb-8">
          <View>
            <Text className="text-white font-bold text-base mb-1">Recurring Transaction</Text>
            <Text className="text-zinc-400 text-xs">Set up a recurring schedule</Text>
          </View>
          <Switch 
            value={isRecurring} 
            onValueChange={setIsRecurring}
            trackColor={{ false: '#3f3f46', true: '#3b82f6' }}
            thumbColor={'#ffffff'}
          />
        </View>

        {/* Submit Buttons */}
        <View className="flex-row justify-between mb-8">
          <TouchableOpacity 
            className="flex-1 bg-zinc-800 py-4 rounded-xl items-center border border-zinc-700 mr-2"
            onPress={() => navigation.goBack()}
          >
            <Text className="text-white font-bold text-lg">Cancel</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            className="flex-1 bg-white py-4 rounded-xl items-center ml-2 shadow-lg shadow-white/20"
            onPress={handleSaveTransaction}
            disabled={loading}
          >
            {loading ? <ActivityIndicator color="#000" /> : <Text className="text-black font-bold text-lg">Create</Text>}
          </TouchableOpacity>
        </View>

      </ScrollView>

      {/* Custom Bottom Sheet Modal for Selectors */}
      <Modal visible={modalVisible} transparent={true} animationType="slide">
        <View className="flex-1 justify-end bg-black/60">
          <View className="bg-zinc-900 rounded-t-3xl p-6 min-h-[50%] border-t border-zinc-700">
            <View className="flex-row justify-between items-center mb-6">
              <Text className="text-xl font-bold text-white capitalize">Select {modalType}</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close-circle" size={28} color="#71717a" />
              </TouchableOpacity>
            </View>
            
            <ScrollView showsVerticalScrollIndicator={false}>
              {modalType === 'account' && accounts.map(acc => (
                <TouchableOpacity 
                  key={acc.id} 
                  className="py-4 border-b border-zinc-800"
                  onPress={() => { setSelectedAccount(acc); setModalVisible(false); }}
                >
                  <Text className="text-white text-lg">{acc.name} (LKR {Number(acc.balance).toFixed(2)})</Text>
                </TouchableOpacity>
              ))}

              {modalType === 'category' && CATEGORIES.map(cat => (
                <TouchableOpacity 
                  key={cat.id} 
                  className="py-4 border-b border-zinc-800"
                  onPress={() => { setSelectedCategory(cat); setModalVisible(false); }}
                >
                  <Text className="text-white text-lg">{cat.label}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

    </KeyboardAvoidingView>
  );
}