import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../../api.config';

export default function TransactionHistoryScreen({ navigation }) {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchTransactionHistory();
  }, []);

  const fetchTransactionHistory = async () => {
    try {
      const sitId = await AsyncStorage.getItem('userSitId');

      if (!sitId) {
        Alert.alert('Error', 'User not logged in');
        navigation.replace('Login');
        return;
      }

      const response = await api.get(`/transactions/user/${sitId}`);

      if (response.data.success) {
        // Filter for completed, cancelled, and expired transactions only
        const historyTransactions = response.data.data.filter(
          (t) => t.status === 'completed' || t.status === 'cancelled' || t.status === 'expired'
        );
        // Sort by most recent first
        historyTransactions.sort((a, b) => new Date(b.return_time || b.created_at) - new Date(a.return_time || a.created_at));
        setTransactions(historyTransactions);
      }
    } catch (error) {
      console.error('Error fetching transaction history:', error);
      Alert.alert('Error', 'Failed to load transaction history');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchTransactionHistory();
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return '#4CAF50';
      case 'cancelled':
        return '#FF9800';
      case 'expired':
        return '#F44336';
      default:
        return '#999';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'completed':
        return 'RETURNED';
      case 'cancelled':
        return 'CANCELLED';
      case 'expired':
        return 'EXPIRED';
      default:
        return status.toUpperCase();
    }
  };

  const calculateDuration = (borrowTime, returnTime) => {
    if (!borrowTime || !returnTime) return 'N/A';
    const borrow = new Date(borrowTime);
    const returnDate = new Date(returnTime);
    const diffTime = Math.abs(returnDate - borrow);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return `${diffDays} day${diffDays !== 1 ? 's' : ''}`;
  };

  const renderHistoryCard = ({ item }) => {
    const statusColor = getStatusColor(item.status);
    const statusText = getStatusText(item.status);
    const duration = calculateDuration(item.borrow_time, item.return_time);

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.equipmentName} numberOfLines={1}>
            {item.equipment_name}
          </Text>
          <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
            <Text style={styles.statusText}>{statusText}</Text>
          </View>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.label}>Locker:</Text>
          <Text style={styles.value}>Compartment {item.compartment_number}</Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.label}>Borrowed:</Text>
          <Text style={styles.value}>
            {item.borrow_time ? new Date(item.borrow_time).toLocaleDateString() : 'N/A'}
          </Text>
        </View>

        {item.return_time && (
          <View style={styles.infoRow}>
            <Text style={styles.label}>Returned:</Text>
            <Text style={styles.value}>
              {new Date(item.return_time).toLocaleDateString()}
            </Text>
          </View>
        )}

        {item.status === 'completed' && (
          <View style={styles.infoRow}>
            <Text style={styles.label}>Duration:</Text>
            <Text style={styles.value}>{duration}</Text>
          </View>
        )}

        {item.due_date && (
          <View style={styles.infoRow}>
            <Text style={styles.label}>Due Date:</Text>
            <Text style={styles.value}>
              {new Date(item.due_date).toLocaleDateString()}
            </Text>
          </View>
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading history...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Transaction History</Text>
        <Text style={styles.subtitle}>
          {transactions.length} {transactions.length === 1 ? 'transaction' : 'transactions'}
        </Text>
      </View>

      {transactions.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>📜</Text>
          <Text style={styles.emptyTitle}>No History</Text>
          <Text style={styles.emptyText}>
            Your completed transactions will appear here.
          </Text>
        </View>
      ) : (
        <FlatList
          data={transactions}
          renderItem={renderHistoryCard}
          keyExtractor={(item) => item.transaction_id.toString()}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#007AFF"
            />
          }
        />
      )}
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
    marginTop: 12,
    fontSize: 14,
    color: '#666',
  },
  header: {
    backgroundColor: '#fff',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  listContent: {
    padding: 16,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  equipmentName: {
    flex: 1,
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginRight: 8,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  statusText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  label: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  value: {
    fontSize: 14,
    color: '#333',
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
});
