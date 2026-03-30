import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

export default function RegisterScreen({ navigation, onLoginSuccess }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSignUp() {
    if (!email || !password || !name) {
      Alert.alert('Error', 'Please fill in all fields.');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('https://wealth-app-three.vercel.app/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.toLowerCase(), password, name }),
      });

      const data = await response.json();

      if (response.ok) {
        await SecureStore.setItemAsync('wealth_ai_session', JSON.stringify(data));
        Alert.alert('Success!', 'Account created and logged in!');
        if (onLoginSuccess) onLoginSuccess(data);
      } else {
        Alert.alert('Registration Failed', data.error || 'Could not create account');
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
        <Text className="text-3xl font-bold text-white mb-2 text-center">Create Account</Text>
        <Text className="text-zinc-400 mb-8 text-center">Join Wealth AI today.</Text>

        <TextInput
          className="w-full bg-zinc-700 text-white px-4 py-4 rounded-xl mb-4 text-lg"
          placeholder="Full Name"
          placeholderTextColor="#9ca3af"
          value={name}
          onChangeText={setName}
        />
        <TextInput
          className="w-full bg-zinc-700 text-white px-4 py-4 rounded-xl mb-4 text-lg"
          placeholder="Email address"
          placeholderTextColor="#9ca3af"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
        />
        <TextInput
          className="w-full bg-zinc-700 text-white px-4 py-4 rounded-xl mb-6 text-lg"
          placeholder="Password"
          placeholderTextColor="#9ca3af"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        <TouchableOpacity className="w-full bg-blue-500 py-4 rounded-xl items-center mb-4" onPress={handleSignUp} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text className="text-white font-bold text-lg">Sign Up</Text>}
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigation.navigate('Login')}>
          <Text className="text-blue-400 text-center font-bold">Already have an account? Sign In</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}