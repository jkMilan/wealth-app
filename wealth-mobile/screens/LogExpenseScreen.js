import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Switch, ActivityIndicator, Alert, Modal, KeyboardAvoidingView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { defaultCategories } from '../../data/categories';

const INTERVALS = [
  { id: 'DAILY', label: 'Daily' },
  { id: 'WEEKLY', label: 'Weekly' },
  { id: 'MONTHLY', label: 'Monthly' },
  { id: 'YEARLY', label: 'Yearly' },
];

const getIconName = (lucideName) => {
  const map = {
    'Wallet': 'wallet', 'Laptop': 'laptop', 'TrendingUp': 'trending-up',
    'Building': 'business', 'Home': 'home', 'Plus': 'add', 'Car': 'car',
    'Shopping': 'cart', 'Zap': 'flash', 'Film': 'film', 'UtensilsCrossed': 'restaurant',
    'ShoppingBag': 'bag', 'HeartPulse': 'medkit', 'GraduationCap': 'school',
    'Smile': 'happy', 'Plane': 'airplane', 'Shield': 'shield-checkmark',
    'Gift': 'gift', 'Receipt': 'receipt', 'MoreHorizontal': 'ellipsis-horizontal'
  };
  return map[lucideName] || 'pricetag'; 
};

export default function LogExpenseScreen({ navigation }) {
  const [loading, setLoading] = useState(false);
  const [accounts, setAccounts] = useState([]);
  
  const [type, setType] = useState('EXPENSE');
  const [amount, setAmount] = useState('');
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [description, setDescription] = useState('');
  
  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);

  const [isRecurring, setIsRecurring] = useState(false);
  const [recurringInterval, setRecurringInterval] = useState(INTERVALS[2]);

  const [modalVisible, setModalVisible] = useState(false);
  const [modalType, setModalType] = useState(null);

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
        const defaultAcc = data.accounts.find(a => a.isDefault) || data.accounts[0];
        if (defaultAcc) setSelectedAccount(defaultAcc);
      }
    } catch (err) {
      console.error('Failed to fetch accounts:', err);
    }
  };

  const handleClearForm = () => {
    setAmount('');
    setDescription('');
    setSelectedCategory(null);
    setDate(new Date());
    setIsRecurring(false);
    setType('EXPENSE');
    
    if (accounts.length > 0) {
      const defaultAcc = accounts.find(a => a.isDefault) || accounts[0];
      setSelectedAccount(defaultAcc);
    }
  };

  const handleTypeChange = (newType) => {
    setType(newType);
    setSelectedCategory(null);
  };

  const onChangeDate = (event, selectedDate) => {
    if (Platform.OS === 'android') setShowDatePicker(false);
    if (selectedDate) setDate(selectedDate);
  };

  const handleScanReceipt = async () => {
    Alert.alert("Scan Receipt", "Choose an option", [
      {
        text: "Camera",
        onPress: async () => {
          const permission = await ImagePicker.requestCameraPermissionsAsync();
          if (permission.granted) {
            let result = await ImagePicker.launchCameraAsync({ 
              mediaTypes: ['images'], // FIXED: Modern Expo ImagePicker syntax
              allowsEditing: true, 
              quality: 0.7 
            });
            if (!result.canceled) processReceiptImage(result.assets[0]);
          }
        }
      },
      {
        text: "Gallery",
        onPress: async () => {
          const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
          if (permission.granted) {
            let result = await ImagePicker.launchImageLibraryAsync({ 
              mediaTypes: ['images'], // FIXED: Modern Expo ImagePicker syntax
              allowsEditing: true, 
              quality: 0.7 
            });
            if (!result.canceled) processReceiptImage(result.assets[0]);
          }
        }
      },
      { text: "Cancel", style: "cancel" }
    ]);
  };

  const processReceiptImage = async (imageAsset) => {
    setLoading(true);
    try {
      const ML_API_URL = 'http://192.168.1.14:8000/api/ml/ocr'; 

      const uploadResponse = await FileSystem.uploadAsync(ML_API_URL, imageAsset.uri, {
        httpMethod: 'POST',
        uploadType: FileSystem.FileSystemUploadType.MULTIPART,
        fieldName: 'file',
        mimeType: 'image/jpeg',
      });

      const data = JSON.parse(uploadResponse.body);

      if (uploadResponse.status === 200 && data.success) {
        if (data.amount) setAmount(data.amount.toString());
        if (data.description || data.merchantName) setDescription(data.merchantName || data.description);
        if (data.type) setType(data.type.toUpperCase());
        
        if (data.date) {
           const parsedDate = new Date(data.date);
           if (!isNaN(parsedDate)) setDate(parsedDate);
        }

        if (data.category) {
          const matchedCat = defaultCategories.find(c => c.id.toLowerCase() === data.category.toLowerCase());
          if (matchedCat) {
            setSelectedCategory(matchedCat);
          }
        }

        Alert.alert("AI Success", "Receipt scanned successfully! Please verify the details.");
      } else {
        Alert.alert("AI Error", data.detail || "Could not read the receipt clearly.");
      }
    } catch (error) {
      console.error("Native Upload Error:", error);
      Alert.alert("Connection Error", "Failed to connect to ML Service.");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveTransaction = async () => {
    if (!amount || !selectedAccount || !selectedCategory) {
      Alert.alert("Missing Fields", "Please fill out the amount, account, and category.");
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
          date: date.toISOString(),
          description,
          isRecurring,
          recurringInterval: isRecurring ? recurringInterval.id : null 
        }),
      });

      if (response.ok) {
        Alert.alert("Success", "Transaction added successfully!", [
          { text: "Dashboard", onPress: () => {
            handleClearForm();
            navigation.navigate('Dashboard'); 
          }},
          { text: "Add Another", onPress: () => {
            handleClearForm(); 
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

  const activeCategories = defaultCategories ? defaultCategories.filter(cat => cat.type === type) : [];

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} className="flex-1 bg-zinc-900">
      <ScrollView className="flex-1 px-4 pt-4" contentContainerStyle={{ paddingBottom: 40 }}>
        
        <TouchableOpacity 
          className="w-full bg-pink-500 py-4 rounded-xl flex-row justify-center items-center mb-6 shadow-lg shadow-pink-500/30"
          onPress={handleScanReceipt}
        >
          <Ionicons name="camera-outline" size={24} color="white" className="mr-2" />
          <Text className="text-white font-bold text-lg ml-2">Scan Receipt with AI</Text>
        </TouchableOpacity>

        <View className="flex-row bg-zinc-800 p-1 rounded-xl mb-6 border border-zinc-700/50">
          <TouchableOpacity 
            className={`flex-1 py-3 rounded-lg items-center ${type === 'EXPENSE' ? 'bg-zinc-700 shadow-sm' : ''}`}
            onPress={() => handleTypeChange('EXPENSE')}
          >
            <Text className={`font-bold ${type === 'EXPENSE' ? 'text-white' : 'text-zinc-500'}`}>Expense</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            className={`flex-1 py-3 rounded-lg items-center ${type === 'INCOME' ? 'bg-zinc-700 shadow-sm' : ''}`}
            onPress={() => handleTypeChange('INCOME')}
          >
            <Text className={`font-bold ${type === 'INCOME' ? 'text-white' : 'text-zinc-500'}`}>Income</Text>
          </TouchableOpacity>
        </View>

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

        <View className="mb-4">
          <Text className="text-zinc-400 text-xs font-bold uppercase mb-2 ml-1">Category</Text>
          <TouchableOpacity 
            className="w-full bg-zinc-800 px-4 py-4 rounded-xl border border-zinc-700 flex-row justify-between items-center"
            onPress={() => openModal('category')}
          >
            {selectedCategory ? (
              <View className="flex-row items-center">
                <View className="w-8 h-8 rounded-full items-center justify-center mr-3" style={{ backgroundColor: (selectedCategory.color || '#9ca3af') + '33' }}>
                  <Ionicons name={getIconName(selectedCategory.icon)} size={16} color={selectedCategory.color || '#9ca3af'} />
                </View>
                <Text className="text-white text-base font-medium">{selectedCategory.name || selectedCategory.label}</Text>
              </View>
            ) : (
              <Text className="text-zinc-400 text-base">Select Category...</Text>
            )}
            <Ionicons name="chevron-down" size={20} color="#9ca3af" />
          </TouchableOpacity>
        </View>

        <View className="mb-4">
          <Text className="text-zinc-400 text-xs font-bold uppercase mb-2 ml-1">Date</Text>
          <TouchableOpacity 
            className="w-full bg-zinc-800 px-4 py-4 rounded-xl border border-zinc-700 flex-row justify-between items-center"
            onPress={() => setShowDatePicker(true)}
          >
            <Text className="text-white text-base">{date.toISOString().split('T')[0]}</Text>
            <Ionicons name="calendar-outline" size={20} color="#9ca3af" />
          </TouchableOpacity>
        </View>

        {Platform.OS === 'android' && showDatePicker && (
          <DateTimePicker
            value={date}
            mode="date"
            display="default"
            onChange={onChangeDate}
            maximumDate={new Date()}
          />
        )}

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

        <View className={`bg-zinc-800 p-4 rounded-xl border border-zinc-700/50 ${isRecurring ? 'mb-4' : 'mb-8'}`}>
          <View className="flex-row justify-between items-center">
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
        </View>

        {isRecurring && (
          <View className="mb-8">
            <Text className="text-zinc-400 text-xs font-bold uppercase mb-2 ml-1">Recurring Interval</Text>
            <TouchableOpacity 
              className="w-full bg-zinc-800 px-4 py-4 rounded-xl border border-zinc-700 flex-row justify-between items-center"
              onPress={() => openModal('interval')}
            >
              <Text className="text-white text-base capitalize">{recurringInterval.label}</Text>
              <Ionicons name="chevron-down" size={20} color="#9ca3af" />
            </TouchableOpacity>
          </View>
        )}

        <View className="flex-row justify-between mb-8">
          <TouchableOpacity 
            className="flex-1 bg-zinc-800 py-4 rounded-xl items-center border border-zinc-700 mr-2"
            onPress={handleClearForm}
          >
            <Text className="text-white font-bold text-lg">Clear</Text>
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

              {modalType === 'category' && activeCategories.map(cat => (
                <TouchableOpacity 
                  key={cat.id} 
                  className="py-4 border-b border-zinc-800 flex-row items-center"
                  onPress={() => { setSelectedCategory(cat); setModalVisible(false); }}
                >
                  <View className="w-10 h-10 rounded-full items-center justify-center mr-4" style={{ backgroundColor: (cat.color || '#9ca3af') + '33' }}>
                    <Ionicons name={getIconName(cat.icon)} size={20} color={cat.color || '#9ca3af'} />
                  </View>
                  <Text className="text-white text-lg">{cat.name || cat.label}</Text>
                </TouchableOpacity>
              ))}

              {modalType === 'interval' && INTERVALS.map(int => (
                <TouchableOpacity 
                  key={int.id} 
                  className="py-4 border-b border-zinc-800"
                  onPress={() => { setRecurringInterval(int); setModalVisible(false); }}
                >
                  <Text className="text-white text-lg">{int.label}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {Platform.OS === 'ios' && (
        <Modal visible={showDatePicker} transparent={true} animationType="slide">
          <View className="flex-1 justify-end bg-black/60">
            <View className="bg-zinc-900 rounded-t-3xl p-6 border-t border-zinc-700">
              <View className="flex-row justify-between items-center mb-4">
                <Text className="text-white font-bold text-lg">Select Date</Text>
                <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                  <Text className="text-blue-500 font-bold text-lg">Done</Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={date}
                mode="date"
                display="spinner"
                textColor="white" 
                onChange={onChangeDate}
                maximumDate={new Date()}
              />
            </View>
          </View>
        </Modal>
      )}

    </KeyboardAvoidingView>
  );
}