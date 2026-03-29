import React, { useState, useEffect, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { View, Text, ActivityIndicator, RefreshControl, ScrollView, Dimensions, TouchableOpacity, Alert, Modal, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';
import { PieChart } from 'react-native-gifted-charts';

const screenWidth = Dimensions.get("window").width;

export default function DashboardScreen({ navigation }) {
  const [dashboardData, setDashboardData] = useState({ totalBalance: 0, accounts: [], income: 0, expense: 0, transactions: [], budgetAmount: 0 }); 
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [budgetModalVisible, setBudgetModalVisible] = useState(false);
  const [newBudget, setNewBudget] = useState('');
  const [isUpdatingBudget, setIsUpdatingBudget] = useState(false);

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
        setDashboardData(prev => ({ ...prev, ...data }));
      }
    } catch (err) {
      console.error('Network Error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleSaveBudget = async () => {
    if (!newBudget) return;
    setIsUpdatingBudget(true);

    try {
      const storedSession = await SecureStore.getItemAsync('wealth_ai_session');
      const session = JSON.parse(storedSession);

      const response = await fetch('https://wealth-app-three.vercel.app/api/mobile/budget', {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${session.token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ amount: newBudget })
      });

      if (response.ok) {
        setBudgetModalVisible(false);
        setNewBudget('');
        fetchDashboardData();
      } else {
        Alert.alert("Error", "Could not save budget");
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsUpdatingBudget(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchDashboardData();
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchDashboardData();
  };

  const handleSetDefault = (accountId, accountName) => {
    Alert.alert(
      "Set Default Account",
      `Make ${accountName} your default account?`,
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Yes, Set Default", 
          onPress: async () => {
            try {
              const storedSession = await SecureStore.getItemAsync('wealth_ai_session');
              const session = JSON.parse(storedSession);
              
              const response = await fetch('https://wealth-app-three.vercel.app/api/mobile/accounts/default', {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${session.token}`,
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({ accountId })
              });

              if (response.ok) {
                Alert.alert("Success", `${accountName} is now your default account.`);
                onRefresh(); 
              } else {
                Alert.alert("Error", "Failed to update default account.");
              }
            } catch (error) {
              Alert.alert("Network Error", "Could not connect to server.");
            }
          }
        }
      ]
    );
  };

  const getPieData = () => {
    if (!dashboardData.transactions) return [];
    const expenses = dashboardData.transactions.filter(t => t.type === 'EXPENSE');
    if (expenses.length === 0) return [];

    const categoryTotals = expenses.reduce((acc, t) => {
      let rawCat = t.category || 'Uncategorized';
      let cleanCat = rawCat.toLowerCase().replace(/-/g, ' ');
      let formattedCat = cleanCat.replace(/\b\w/g, char => char.toUpperCase());

      acc[formattedCat] = (acc[formattedCat] || 0) + Math.abs(Number(t.amount));
      return acc;
    }, {});

    const colors = ['#facc15', '#ec4899', '#7f1d1d', '#000000', '#14b8a6', '#3b82f6', '#ef4444', '#f97316'];
    
    return Object.keys(categoryTotals).map((key, index) => ({
      text: key,
      value: categoryTotals[key],
      color: colors[index % colors.length],
    }));
  };

  const renderTransaction = ({ item }) => {
    const isIncome = item.type === 'INCOME';

    const pieData = [
      { value: 9100.00, color: '#ef4444', text: 'Shopping' },
      { value: 5000.00, color: '#f97316', text: 'Utilities' },
      { value: 100.00, color: '#71717a', text: 'Bills' },
  ];

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
              {item.account?.name || 'Account'} • {item.category || 'General'}
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

  const pieData = getPieData();
  const budgetLimit = dashboardData.budgetAmount || 0;
  const budgetSpent = dashboardData.expense || 0;
  const budgetPercentage = budgetLimit > 0 ? Math.min((budgetSpent / budgetLimit) * 100, 100) : 0;

  return (
    <View className="flex-1 bg-zinc-900 px-4 pt-6">
      
      <ScrollView 
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#3b82f6" />}
      >
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-6">
          
          {/* MAIN ACCOUNT CARD (Blue) */}
          <TouchableOpacity 
            activeOpacity={0.8}
            onPress={() => {
              if (dashboardData.accounts?.[0]) {
                navigation.navigate('AccountDetails', { 
                  accountId: dashboardData.accounts[0].id, 
                  accountName: dashboardData.accounts[0].name 
                });
              }
            }}
            className="bg-blue-600 rounded-3xl p-6 mr-4 w-72 shadow-lg shadow-blue-500/30 justify-between"
          >
            <View>
              <View className="flex-row justify-between items-center mb-1">
                <Text className="text-blue-200 text-sm font-medium uppercase tracking-wider">
                  {dashboardData.accounts?.[0]?.name || 'Main Account'}
                </Text>
                <View className="bg-blue-500/50 px-2 py-0.5 rounded">
                  <Text className="text-white text-[10px] font-bold uppercase tracking-wider">Default</Text>
                </View>
              </View>
              <Text className="text-white text-3xl font-bold">
                LKR {Number(dashboardData.accounts?.[0]?.balance || 0).toFixed(2)}
              </Text>
            </View>
          </TouchableOpacity>

          {/* SECONDARY ACCOUNT CARDS (Gray) */}
          {dashboardData.accounts?.slice(1).map((account) => (
            <TouchableOpacity 
              key={account.id} 
              activeOpacity={0.8}
              onPress={() => navigation.navigate('AccountDetails', { 
                accountId: account.id, 
                accountName: account.name 
              })}
              className="bg-zinc-800 rounded-3xl p-6 mr-4 w-64 border border-zinc-700/50 justify-between"
            >
              <View>
                <Text className="text-zinc-400 text-sm font-medium mb-1 uppercase tracking-wider">{account.name}</Text>
                <Text className="text-white text-2xl font-bold">LKR {Number(account.balance).toFixed(2)}</Text>
              </View>
              
              <TouchableOpacity 
                className="mt-4 bg-zinc-700/50 py-2 rounded-xl items-center border border-zinc-600"
                onPress={() => handleSetDefault(account.id, account.name)}
              >
                <Text className="text-zinc-300 text-xs font-bold uppercase tracking-wider">Set as Default</Text>
              </TouchableOpacity>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* --- MONTHLY BUDGET CARD --- */}
        <View className="bg-zinc-800 rounded-3xl p-6 mb-6 border border-zinc-700/50">
          <View className="flex-row justify-between items-center mb-2">
            <Text className="text-white font-bold text-lg">Monthly Budget</Text>
            <TouchableOpacity onPress={() => setBudgetModalVisible(true)} className="p-2 -mr-2">
              <Ionicons name="pencil" size={18} color="#9ca3af" />
            </TouchableOpacity>
          </View>
          
          <Text className="text-zinc-400 text-sm mb-4">
            LKR {budgetSpent.toFixed(2)} of LKR {budgetLimit.toFixed(2)} spent
          </Text>
          
          {/* The Progress Bar */}
          <View className="h-3 w-full bg-zinc-700 rounded-full overflow-hidden">
            <View 
              className={`h-full rounded-full ${budgetPercentage > 90 ? 'bg-red-500' : 'bg-blue-500'}`}
              style={{ width: `${budgetPercentage}%` }} 
            />
          </View>
          <Text className="text-zinc-500 text-xs text-right mt-2 font-medium">
            {budgetPercentage.toFixed(1)}% used
          </Text>
        </View>

        <View className="flex-row justify-between mb-6">
          <View className="bg-zinc-800 rounded-2xl p-4 flex-1 mr-2 border border-zinc-700/50">
            <View className="flex-row items-center mb-2">
              <Ionicons name="trending-up" size={16} color="#4ade80" />
              <Text className="text-zinc-400 text-xs ml-2 uppercase tracking-wider">Income</Text>
            </View>
            <Text className="text-green-400 text-xl font-bold">LKR {dashboardData.income?.toFixed(2) || '0.00'}</Text>
          </View>

          <View className="bg-zinc-800 rounded-2xl p-4 flex-1 ml-2 border border-zinc-700/50">
            <View className="flex-row items-center mb-2">
              <Ionicons name="trending-down" size={16} color="#f87171" />
              <Text className="text-zinc-400 text-xs ml-2 uppercase tracking-wider">Expenses</Text>
            </View>
            <Text className="text-red-400 text-xl font-bold">LKR {dashboardData.expense?.toFixed(2) || '0.00'}</Text>
          </View>
        </View>

        {/* Pie Chart Section */}
        {pieData.length > 0 && (
          <View className="bg-zinc-900 p-5 rounded-3xl border border-zinc-800 mt-6 mb-4 items-center">
            <Text className="text-white text-lg font-bold mb-8 self-start px-2">Monthly Expense Breakdown</Text>
            
            <PieChart
              data={pieData}
              donut={true}       
              radius={85}
              innerRadius={45}   
              showText={false}  
            />

            <View className="w-full mt-10 px-2">
              {pieData.map((item, index) => (
                <View key={index} className="flex-row items-center justify-between mb-4">
                  
                  <View className="flex-row items-center">
                    <View style={{ backgroundColor: item.color, width: 14, height: 14, borderRadius: 4, marginRight: 12 }} />
                    <Text className="text-zinc-300 text-[15px] font-medium capitalize">
                      {item.text}
                    </Text>
                  </View>

                  <Text className="text-white font-bold text-[15px]">
                    LKR {item.value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </Text>
                  
                </View>
              ))}
            </View>
            
          </View>
        )}

        {/* Recent Transactions Section */}
        <View className="flex-row justify-between items-center mb-4 ml-1 pr-2">
          <Text className="text-xl font-bold text-white">Recent Transactions</Text>
          <TouchableOpacity>
            <Text className="text-blue-400 text-sm font-bold">View All</Text>
          </TouchableOpacity>
        </View>
        
        {dashboardData.transactions?.length === 0 ? (
          <View className="py-10 items-center">
            <Text className="text-zinc-500 text-lg">No transactions yet.</Text>
          </View>
        ) : (
          <View className="pb-10">
            {dashboardData.transactions.slice(0, 5).map((item) => (
               <React.Fragment key={item.id}>
                 {renderTransaction({ item })}
               </React.Fragment>
            ))}
          </View>
        )}
      </ScrollView>

      {/* --- SET BUDGET MODAL (Hidden until pencil is clicked) --- */}
        <Modal animationType="slide" transparent={true} visible={budgetModalVisible}>
          <View className="flex-1 justify-end bg-black/60">
            <View className="bg-zinc-900 p-6 rounded-t-3xl border-t border-zinc-800">
              <View className="flex-row justify-between items-center mb-6">
                <Text className="text-white text-xl font-bold">Set Monthly Budget</Text>
                <TouchableOpacity onPress={() => setBudgetModalVisible(false)}>
                  <Ionicons name="close" size={24} color="#71717a" />
                </TouchableOpacity>
              </View>

              <Text className="text-zinc-400 mb-2">Target Amount (LKR)</Text>
              <TextInput 
                value={newBudget}
                onChangeText={setNewBudget}
                keyboardType="numeric"
                className="bg-zinc-800 p-4 rounded-xl text-white mb-6 border border-zinc-700 text-lg font-bold"
                placeholder="e.g. 70000"
                placeholderTextColor="#52525b"
                autoFocus
              />

              <TouchableOpacity 
                onPress={handleSaveBudget}
                disabled={isUpdatingBudget}
                className={`bg-blue-600 p-4 rounded-xl items-center ${isUpdatingBudget ? 'opacity-50' : ''}`}
              >
                {isUpdatingBudget ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text className="text-white font-bold text-lg">Save Budget</Text>
                )}
              </TouchableOpacity>
              <View className="h-10" />
            </View>
          </View>
        </Modal>
    </View>
  );
}