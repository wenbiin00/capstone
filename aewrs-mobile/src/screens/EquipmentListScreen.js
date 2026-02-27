import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../../api.config';

export default function EquipmentListScreen({ navigation }) {
  const [equipment, setEquipment] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userEmail, setUserEmail] = useState('');

  useEffect(() => {
    loadUserInfo();
    fetchEquipment();
  }, []);

  const loadUserInfo = async () => {
    try {
      const email = await AsyncStorage.getItem('userEmail');
      setUserEmail(email || 'User');
    } catch (error) {
      console.error('Error loading user info:', error);
    }
  };

  const fetchEquipment = async () => {
    try {
      const response = await api.get('/equipment');
      
      if (response.data.success) {
        setEquipment(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching equipment:', error);
      Alert.alert('Error', 'Failed to load equipment list');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchEquipment();
  };

  const handleLogout = async () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            await AsyncStorage.removeItem('userToken');
            await AsyncStorage.removeItem('userEmail');
            navigation.replace('Login');
          },
        },
      ]
    );
  };

  const renderEquipmentCard = ({ item }) => {
   const isAvailable = item.available_quantity > 0;
  
   return (
     <TouchableOpacity
       style={[
         styles.card,
         !isAvailable && styles.cardDisabled
       ]}
       onPress={() => {
         if (isAvailable) {
           navigation.navigate('BorrowEquipment', { equipment: item });
         }
       }}
       disabled={!isAvailable}
     >
       <View style={styles.cardHeader}>
         <Text style={styles.equipmentName} numberOfLines={1}>
           {item.name || 'Unknown Equipment'}
         </Text>
         <View style={[
           styles.statusBadge,
           { backgroundColor: isAvailable ? '#4CAF50' : '#F44336' }
         ]}>
           <Text style={styles.statusText}>
             {isAvailable ? 'AVAILABLE' : 'OUT OF STOCK'}
           </Text>
         </View>
       </View>

       <Text style={styles.description} numberOfLines={2}>
         {item.description || 'No description available'}
       </Text>

       <View style={styles.cardFooter}>
         <Text style={styles.infoText}>
            Quantity: {item.available_quantity}/{item.total_quantity}
         </Text>
         <Text style={styles.infoText}>
            Category: {item.category || 'Uncategorized'}
         </Text>
       </View>
     </TouchableOpacity>
   );
 };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading equipment...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Available Equipment</Text>
          <Text style={styles.headerSubtitle}>
            {equipment.length} item{equipment.length !== 1 ? 's' : ''}
          </Text>
        </View>
        <View style={styles.headerButtons}>
          <TouchableOpacity
            style={styles.myBorrowsButton}
            onPress={() => navigation.navigate('ActiveTransactions')}
          >
            <Text style={styles.myBorrowsButtonText}>My Borrows</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.historyButton}
            onPress={() => navigation.navigate('TransactionHistory')}
          >
            <Text style={styles.historyButtonText}>History</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.logoutButton}
            onPress={handleLogout}
          >
            <Text style={styles.logoutButtonText}>Logout</Text>
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        data={equipment}
        renderItem={renderEquipmentCard}
        keyExtractor={(item) => item.equipment_id?.toString() || Math.random().toString()}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh}
            tintColor="#007AFF"
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>📦</Text>
            <Text style={styles.emptyText}>No equipment available</Text>
            <Text style={styles.emptySubtext}>
              Pull down to refresh
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  header: {
    backgroundColor: '#007AFF',
    padding: 20,
    paddingTop: 60,
    paddingBottom: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#fff',
    marginTop: 5,
    opacity: 0.9,
  },
  headerButtons: {
    gap: 8,
  },
  myBorrowsButton: {
    backgroundColor: '#fff',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
  },
  myBorrowsButtonText: {
    color: '#007AFF',
    fontSize: 14,
    fontWeight: '600',
  },
  historyButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
  },
  historyButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  logoutButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
  },
  logoutButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  listContent: {
    padding: 15,
    paddingBottom: 30,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardDisabled: {
    opacity: 0.6,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  equipmentName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
    marginRight: 10,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  statusText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: 'bold',
  },
  description: {
    fontSize: 14,
    color: '#666',
    marginBottom: 10,
    lineHeight: 20,
  },
  cardFooter: {
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingTop: 10,
    marginTop: 5,
  },
  infoText: {
    fontSize: 13,
    color: '#666',
    marginBottom: 3,
  },
  emptyContainer: {
    padding: 60,
    alignItems: 'center',
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 15,
  },
  emptyText: {
    fontSize: 18,
    color: '#999',
    fontWeight: '600',
    marginBottom: 5,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#ccc',
  },
});
