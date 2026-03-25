import React, { useState, useEffect } from 'react';
import { View, Text, ActivityIndicator, RefreshControl, ScrollView, Dimensions, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';
import { PieChart } from 'react-native-chart-kit';

const screenWidth = Dimensions.get("window").width;

export default function DashboardScreen() {
  const [dashboardData, setDashboardData] = useState({ totalBalance: 0, accounts: [], income: 0, expense: 0, transactions: [], budgetAmount: 70000 }); 
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
        setDashboardData(prev => ({ ...prev, ...data }));
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
      const cat = t.category || 'Uncategorized';
      acc[cat] = (acc[cat] || 0) + Math.abs(Number(t.amount));
      return acc;
    }, {});

    const colors = ['#f87171', '#3b82f6', '#facc15', '#a855f7', '#fb923c', '#10b981'];
    
    return Object.keys(categoryTotals).map((key, index) => ({
      name: key,
      amount: categoryTotals[key],
      color: colors[index % colors.length],
      legendFontColor: '#9ca3af',
      legendFontSize: 12
    }));
  };

  const renderTransaction = ({ item }) => {
    const isIncome = item.type === 'INCOME';

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
  const budgetLimit = dashboardData.budgetAmount || 70000;
  const budgetSpent = dashboardData.expense || 0;
  const budgetPercentage = Math.min((budgetSpent / budgetLimit) * 100, 100);

  return (
    <View className="flex-1 bg-zinc-900 px-4 pt-6">
      
      <ScrollView 
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#3b82f6" />}
      >
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-6">
          
          <View className="bg-blue-600 rounded-3xl p-6 mr-4 w-72 shadow-lg shadow-blue-500/30 justify-between">
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
          </View>

          {dashboardData.accounts?.slice(1).map((account) => (
            <View key={account.id} className="bg-zinc-800 rounded-3xl p-6 mr-4 w-64 border border-zinc-700/50 justify-between">
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
            </View>
          ))}
        </ScrollView>

        <View className="bg-zinc-800 rounded-3xl p-6 mb-6 border border-zinc-700/50">
          <View className="flex-row justify-between items-center mb-2">
            <Text className="text-white font-bold text-lg">Monthly Budget (Default)</Text>
            <Ionicons name="pencil" size={18} color="#9ca3af" />
          </View>
          <Text className="text-zinc-400 text-sm mb-4">
            LKR {budgetSpent.toFixed(2)} of LKR {budgetLimit.toFixed(2)} spent
          </Text>
          
          <View className="h-3 w-full bg-zinc-700 rounded-full overflow-hidden">
            <View 
              className={`h-full rounded-full ${budgetPercentage > 90 ? 'bg-red-500' : 'bg-yellow-400'}`}
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

        {pieData.length > 0 && (
          <View className="bg-zinc-800 rounded-3xl p-4 mb-6 border border-zinc-700/50">
            <Text className="text-white font-bold text-lg mb-2 ml-2">Expense Breakdown</Text>
            <PieChart
              data={pieData}
              width={screenWidth - 64}
              height={160}
              chartConfig={{
                color: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
              }}
              accessor={"amount"}
              backgroundColor={"transparent"}
              paddingLeft={"10"}
              absolute
            />
          </View>
        )}

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
    </View>
  );
}