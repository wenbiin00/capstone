import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';

import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import EquipmentListScreen from '../screens/EquipmentListScreen';
import BorrowEquipmentScreen from '../screens/BorrowEquipmentScreen';
import ActiveTransactionsScreen from '../screens/ActiveTransactionsScreen';

const Stack = createStackNavigator();

export default function AppNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="Login"
        screenOptions={{
          headerStyle: {
            backgroundColor: '#007AFF',
          },
          headerTintColor: '#fff',
          headerTitleStyle: {
            fontWeight: 'bold',
          },
        }}
      >
        <Stack.Screen
          name="Login"
          component={LoginScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="Register"
          component={RegisterScreen}
          options={{ title: 'Create Account' }}
        />
        <Stack.Screen
          name="EquipmentList"
          component={EquipmentListScreen}
          options={{
            headerShown: false,
            headerLeft: () => null, // Prevent back button
          }}
        />
        <Stack.Screen
          name="BorrowEquipment"
          component={BorrowEquipmentScreen}
          options={{ title: 'Borrow Equipment' }}
        />
        <Stack.Screen
          name="ActiveTransactions"
          component={ActiveTransactionsScreen}
          options={{ title: 'My Borrows' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
