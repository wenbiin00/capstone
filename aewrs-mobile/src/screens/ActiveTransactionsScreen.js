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

export default function ActiveTransactionsScreen({ navigation }) {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchActiveTransactions();
  }, []);

  const fetchActiveTransactions = async () => {
    try {
      const sitId = await AsyncStorage.getItem('userSitId');
      const token = await AsyncStorage.getItem('userToken');

      console.log('Fetching transactions for SIT ID:', sitId);
      console.log('Token exists:', !!token);

      if (!sitId) {
        Alert.alert('Error', 'User not logged in');
        navigation.replace('Login');
        return;
      }

      const response = await api.get(`/transactions/user/${sitId}`);

      if (response.data.success) {
        // Filter for active, pending pickup, and pending return transactions
        const activeTransactions = response.data.data.filter(
          (t) => t.status === 'active' || t.status === 'pending_pickup' || t.status === 'pending_return'
        );
        setTransactions(activeTransactions);
      }
    } catch (error) {
      console.error('Error fetching transactions:', error);
      console.error('Error details:', error.response?.data || error.message);
      Alert.alert(
        'Error Loading Transactions',
        error.response?.data?.error || error.message || 'Failed to load your transactions'
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchActiveTransactions();
  };

  const handleReturn = (transaction) => {
    Alert.alert(
      'Return Equipment',
      `Return ${transaction.equipment_name}?\n\nYou will need to:\n1. Go to Locker ${transaction.compartment_number}\n2. Place the equipment inside\n3. Tap your RFID card to lock\n\nMark as ready for return?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Mark for Return',
          onPress: async () => {
            try {
              const response = await api.post('/transactions/return', {
                transaction_id: transaction.transaction_id,
              });

              if (response.data.success) {
                Alert.alert(
                  'Success!',
                  `Please go to Locker ${transaction.compartment_number} to return the equipment.\n\nTap your RFID card to unlock and place the equipment inside.`,
                  [{ text: 'OK', onPress: () => fetchActiveTransactions() }]
                );
              }
            } catch (error) {
              console.error('Return error:', error);
              const errorMessage = error.response?.data?.error || 'Failed to process return';
              Alert.alert('Return Failed', errorMessage);
            }
          },
        },
      ]
    );
  };

  const handleCancelRequest = (transaction) => {
    Alert.alert(
      'Cancel Borrow Request',
      `Cancel your request for ${transaction.equipment_name}?\n\nThe equipment will be made available for others to borrow.`,
      [
        { text: 'Keep Request', style: 'cancel' },
        {
          text: 'Cancel Request',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await api.post('/transactions/cancel', {
                transaction_id: transaction.transaction_id,
              });

              if (response.data.success) {
                Alert.alert('Request Cancelled', 'Your borrow request has been cancelled.', [
                  { text: 'OK', onPress: () => fetchActiveTransactions() },
                ]);
              }
            } catch (error) {
              console.error('Cancel error:', error);
              const errorMessage = error.response?.data?.error || 'Failed to cancel request';
              Alert.alert('Cancel Failed', errorMessage);
            }
          },
        },
      ]
    );
  };

  const handleChangeDuration = (transaction) => {
    const durations = [
      { label: '3 days', days: 3 },
      { label: '7 days', days: 7 },
      { label: '14 days', days: 14 },
      { label: '30 days', days: 30 },
    ];

    Alert.alert(
      'Change Borrow Duration',
      'Select new duration:',
      [
        ...durations.map((duration) => ({
          text: duration.label,
          onPress: async () => {
            try {
              const newDueDate = new Date();
              newDueDate.setDate(newDueDate.getDate() + duration.days);
              const dueDateString = newDueDate.toISOString().split('T')[0];

              const response = await api.post('/transactions/update-due-date', {
                transaction_id: transaction.transaction_id,
                due_date: dueDateString,
              });

              if (response.data.success) {
                Alert.alert('Duration Updated', `New due date: ${newDueDate.toLocaleDateString()}`, [
                  { text: 'OK', onPress: () => fetchActiveTransactions() },
                ]);
              }
            } catch (error) {
              console.error('Update error:', error);
              const errorMessage = error.response?.data?.error || 'Failed to update duration';
              Alert.alert('Update Failed', errorMessage);
            }
          },
        })),
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const isOverdue = (dueDate) => {
    if (!dueDate) return false;
    return new Date(dueDate) < new Date();
  };

  const getDaysUntilDue = (dueDate) => {
    if (!dueDate) return null;
    const due = new Date(dueDate);
    const today = new Date();
    const diffTime = due - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const renderTransactionCard = ({ item }) => {
    const overdue = isOverdue(item.due_date);
    const daysUntilDue = getDaysUntilDue(item.due_date);
    const isPendingPickup = item.status === 'pending_pickup';
    const isPendingReturn = item.status === 'pending_return';

    return (
      <View style={[styles.card, overdue && styles.cardOverdue]}>
        <View style={styles.cardHeader}>
          <Text style={styles.equipmentName} numberOfLines={1}>
            {item.equipment_name}
          </Text>
          {isPendingPickup ? (
            <View style={[styles.statusBadge, { backgroundColor: '#FF9800' }]}>
              <Text style={styles.statusText}>PENDING PICKUP</Text>
            </View>
          ) : isPendingReturn ? (
            <View style={[styles.statusBadge, { backgroundColor: '#2196F3' }]}>
              <Text style={styles.statusText}>PENDING RETURN</Text>
            </View>
          ) : overdue ? (
            <View style={[styles.statusBadge, { backgroundColor: '#F44336' }]}>
              <Text style={styles.statusText}>OVERDUE</Text>
            </View>
          ) : (
            <View style={[styles.statusBadge, { backgroundColor: '#4CAF50' }]}>
              <Text style={styles.statusText}>ACTIVE</Text>
            </View>
          )}
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.label}>Locker:</Text>
          <Text style={styles.value}>Compartment {item.compartment_number}</Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.label}>
            {isPendingPickup ? 'Requested:' : 'Borrowed:'}
          </Text>
          <Text style={styles.value}>
            {isPendingPickup
              ? new Date(item.created_at).toLocaleDateString()
              : item.borrow_time
              ? new Date(item.borrow_time).toLocaleDateString()
              : 'Pending'}
          </Text>
        </View>

        {item.due_date && (
          <View style={styles.infoRow}>
            <Text style={styles.label}>Due:</Text>
            <Text style={[styles.value, overdue && styles.overdueText]}>
              {new Date(item.due_date).toLocaleDateString()}
              {daysUntilDue !== null && !overdue && ` (${daysUntilDue} days left)`}
              {overdue && ' (OVERDUE)'}
            </Text>
          </View>
        )}

        {isPendingPickup ? (
          <View style={styles.pendingPickupSection}>
            <View style={styles.detailsCard}>
              <Text style={styles.detailsTitle}>📦 Equipment Details</Text>
              {item.equipment_description && (
                <Text style={styles.detailsText}>{item.equipment_description}</Text>
              )}
              {item.equipment_category && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Category:</Text>
                  <Text style={styles.detailValue}>{item.equipment_category}</Text>
                </View>
              )}
            </View>

            <View style={styles.pendingBox}>
              <Text style={styles.pendingTitle}>🎯 Collection Instructions</Text>
              <Text style={styles.pendingText}>
                📍 Location: {item.locker_location || 'Main Lab'}
              </Text>
              <Text style={styles.pendingText}>
                🗄️ Locker Compartment: {item.compartment_number}
              </Text>
              <Text style={styles.pendingText}>
                🔑 Tap your RFID card to unlock and collect
              </Text>
            </View>

            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={[styles.actionButton, styles.changeDurationButton]}
                onPress={() => handleChangeDuration(item)}
              >
                <Text style={styles.actionButtonText}>Change Duration</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionButton, styles.cancelButton]}
                onPress={() => handleCancelRequest(item)}
              >
                <Text style={styles.cancelButtonText}>Cancel Request</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : isPendingReturn ? (
          <View style={[styles.pendingBox, { backgroundColor: '#E3F2FD' }]}>
            <Text style={[styles.pendingText, { color: '#1565C0' }]}>
              📍 Go to Locker {item.compartment_number}
            </Text>
            <Text style={[styles.pendingText, { color: '#1565C0' }]}>
              📦 Place equipment inside the locker
            </Text>
            <Text style={[styles.pendingText, { color: '#1565C0' }]}>
              🔑 Tap your RFID card to complete return
            </Text>
          </View>
        ) : (
          <TouchableOpacity
            style={[styles.returnButton, overdue && styles.returnButtonOverdue]}
            onPress={() => handleReturn(item)}
          >
            <Text style={styles.returnButtonText}>
              {overdue ? 'Return Now (Overdue!)' : 'Return Equipment'}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading your transactions...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>My Active Borrows</Text>
          <Text style={styles.subtitle}>
            {transactions.length} {transactions.length === 1 ? 'item' : 'items'}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.historyButton}
          onPress={() => navigation.navigate('TransactionHistory')}
        >
          <Text style={styles.historyButtonText}>History</Text>
        </TouchableOpacity>
      </View>

      {transactions.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>📦</Text>
          <Text style={styles.emptyTitle}>No Active Borrows</Text>
          <Text style={styles.emptyText}>
            You haven't borrowed any equipment yet.
          </Text>
          <TouchableOpacity
            style={styles.browseButton}
            onPress={() => navigation.navigate('EquipmentList')}
          >
            <Text style={styles.browseButtonText}>Browse Equipment</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={transactions}
          renderItem={renderTransactionCard}
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
  historyButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  historyButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
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
  cardOverdue: {
    borderLeftWidth: 4,
    borderLeftColor: '#F44336',
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
  overdueText: {
    color: '#F44336',
  },
  pendingPickupSection: {
    marginTop: 12,
  },
  detailsCard: {
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  detailsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  detailsText: {
    fontSize: 13,
    color: '#666',
    lineHeight: 18,
    marginBottom: 8,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  detailLabel: {
    fontSize: 13,
    color: '#666',
    fontWeight: '500',
  },
  detailValue: {
    fontSize: 13,
    color: '#333',
    fontWeight: '600',
  },
  pendingBox: {
    backgroundColor: '#FFF3E0',
    borderRadius: 8,
    padding: 12,
    marginTop: 4,
  },
  pendingTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#E65100',
    marginBottom: 8,
  },
  pendingText: {
    fontSize: 13,
    color: '#E65100',
    marginBottom: 4,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  changeDurationButton: {
    backgroundColor: '#2196F3',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  cancelButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#F44336',
  },
  cancelButtonText: {
    color: '#F44336',
    fontSize: 13,
    fontWeight: '600',
  },
  returnButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 12,
  },
  returnButtonOverdue: {
    backgroundColor: '#F44336',
  },
  returnButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
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
    marginBottom: 24,
  },
  browseButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 8,
  },
  browseButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
