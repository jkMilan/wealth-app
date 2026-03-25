import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

export default function LogExpenseScreen() {
  const [expense, setExpense] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');

  const sendToWealthAI = async () => {
    if (!expense) return;
    setLoading(true);
    setStatus('Sending to AWS Brain...');

    try {
      const storedSession = await SecureStore.getItemAsync('wealth_ai_session');
      if (!storedSession) {
        setStatus('❌ You are not logged in!');
        setLoading(false);
        return;
      }
      
      const session = JSON.parse(storedSession);

      const response = await fetch('https://wealth-app-three.vercel.app/api/ingest/sms', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.token}`
        },
        body: JSON.stringify({
          message: expense,
          sender: '+1234567890'
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setStatus(`✅ Logged ${data.type}: LKR ${data.parsedAmount}`);
        setExpense('');
      } else {
        setStatus(`❌ Error: ${data.error || 'Failed to process'}`);
      }
    } catch (error) {
      setStatus('❌ Network Error. Is Vercel down?');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} className="flex-1 items-center justify-center bg-zinc-900 p-6">
      <View className="w-full max-w-sm p-6 bg-zinc-800 rounded-3xl shadow-lg items-center border border-zinc-700/50">
        <Text className="text-3xl font-bold text-white mb-2">Wealth AI</Text>
        <Text className="text-zinc-400 mb-8 text-center">Mobile connection established.</Text>

        <TextInput
          className="w-full bg-zinc-700 text-white px-4 py-4 rounded-xl mb-4 text-lg border border-zinc-600 focus:border-blue-500"
          placeholder="e.g. Spent $15 on Starbucks"
          placeholderTextColor="#9ca3af"
          value={expense}
          onChangeText={setExpense}
        />

        <TouchableOpacity 
          className="w-full bg-blue-500 py-4 rounded-xl flex-row justify-center items-center mb-4"
          onPress={sendToWealthAI}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text className="text-white font-bold text-lg">Send to Database</Text>
          )}
        </TouchableOpacity>

        {status ? (
          <Text className={`mt-2 font-medium text-center ${status.includes('❌') ? 'text-red-400' : 'text-green-400'}`}>
            {status}
          </Text>
        ) : null}
      </View>
    </KeyboardAvoidingView>
  );
}