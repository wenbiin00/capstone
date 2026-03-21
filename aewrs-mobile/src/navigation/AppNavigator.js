import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';

import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import EquipmentListScreen from '../screens/EquipmentListScreen';
import BorrowEquipmentScreen from '../screens/BorrowEquipmentScreen';
import ActiveTransactionsScreen from '../screens/ActiveTransactionsScreen';
import TransactionHistoryScreen from '../screens/TransactionHistoryScreen';
import StaffDashboardScreen from '../screens/StaffDashboardScreen';
import StaffEditEquipmentScreen from '../screens/StaffEditEquipmentScreen';
import StaffActiveBorrowsScreen from '../screens/StaffActiveBorrowsScreen';
import StaffAddEquipmentScreen from '../screens/StaffAddEquipmentScreen';
import StaffUsersScreen from '../screens/StaffUsersScreen';

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
        <Stack.Screen
          name="TransactionHistory"
          component={TransactionHistoryScreen}
          options={{ title: 'History' }}
        />
        <Stack.Screen
          name="StaffDashboard"
          component={StaffDashboardScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="StaffEditEquipment"
          component={StaffEditEquipmentScreen}
          options={{
            title: 'Edit Equipment',
            headerStyle: { backgroundColor: '#34C759' },
          }}
        />
        <Stack.Screen
          name="StaffActiveBorrows"
          component={StaffActiveBorrowsScreen}
          options={{
            title: 'Active Borrows',
            headerStyle: { backgroundColor: '#34C759' },
          }}
        />
        <Stack.Screen
          name="StaffAddEquipment"
          component={StaffAddEquipmentScreen}
          options={{
            title: 'Add Equipment',
            headerStyle: { backgroundColor: '#34C759' },
          }}
        />
        <Stack.Screen
          name="StaffUsers"
          component={StaffUsersScreen}
          options={{
            title: 'User Management',
            headerStyle: { backgroundColor: '#34C759' },
          }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
