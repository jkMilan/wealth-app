import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store'; 

export default function AuthScreen({ onLoginSuccess, navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function signInWithEmail() {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter both email and password.');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('https://wealth-app-three.vercel.app/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.toLowerCase(),
          password: password,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        await SecureStore.setItemAsync('wealth_ai_session', JSON.stringify(data));
        Alert.alert('Success!', 'Logged in securely!');

        if (onLoginSuccess) onLoginSuccess(data);
        
      } else {
        Alert.alert('Login Failed', data.error || data.message || 'Invalid credentials');
      }
    } catch (error) {
      Alert.alert('Network Error', 'Could not connect to the server.');
    } finally {
      setLoading(false);
    }
  }

  async function signUpWithEmail() {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter both email and password.');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('https://wealth-app-three.vercel.app/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.toLowerCase(),
          password: password,
          name: "Mobile User" 
        }),
      });

      const data = await response.json();

      if (response.ok) {
        Alert.alert('Account Created!', 'You can now tap Sign In.');
      } else {
        Alert.alert('Sign Up Failed', data.error || data.message || 'Could not create account');
      }
    } catch (error) {
      Alert.alert('Network Error', 'Could not connect to the server.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} className="flex-1 justify-center items-center bg-zinc-900 p-6">
      <View className="w-full max-w-sm p-6 bg-zinc-800 rounded-3xl shadow-lg">
        <Text className="text-3xl font-bold text-white mb-2 text-center">Wealth AI</Text>
        <Text className="text-zinc-400 mb-8 text-center">Sign in to sync your finances.</Text>

        <TextInput
          className="w-full bg-zinc-700 text-white px-4 py-4 rounded-xl mb-4 text-lg"
          placeholder="Email address"
          placeholderTextColor="#9ca3af"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />
        <TextInput
          className="w-full bg-zinc-700 text-white px-4 py-4 rounded-xl mb-6 text-lg"
          placeholder="Password"
          placeholderTextColor="#9ca3af"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        <TouchableOpacity className="w-full bg-blue-500 py-4 rounded-xl items-center mb-4" onPress={signInWithEmail} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text className="text-white font-bold text-lg">Sign In</Text>}
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigation.navigate('Register')}>
          <Text className="text-blue-400 text-center font-bold">Need an account? Create one</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}