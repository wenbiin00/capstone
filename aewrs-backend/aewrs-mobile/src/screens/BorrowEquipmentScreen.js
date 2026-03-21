import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../../api.config';

export default function BorrowEquipmentScreen({ route, navigation }) {
  const { equipment } = route.params;
  const [loading, setLoading] = useState(false);
  const [selectedDays, setSelectedDays] = useState(7);

  const handleBorrow = async () => {
    try {
      setLoading(true);

      // Get user SIT ID from storage
      const sitId = await AsyncStorage.getItem('userSitId');

      if (!sitId) {
        Alert.alert('Error', 'User not logged in');
        navigation.replace('Login');
        return;
      }

      // Calculate due date
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + selectedDays);
      const dueDateString = dueDate.toISOString().split('T')[0];

      // Request to borrow
      const response = await api.post('/transactions/borrow', {
        sit_id: sitId,
        equipment_id: equipment.equipment_id,
        due_date: dueDateString,
      });

      if (response.data.success) {
        const transaction = response.data.data;

        Alert.alert(
          'Success!',
          `Equipment borrowed successfully!\n\nLocker Compartment: ${transaction.compartment_number}\n\nPlease go to the locker and tap your RFID card to collect the equipment.`,
          [
            {
              text: 'OK',
              onPress: () => navigation.goBack(),
            },
          ]
        );
      }
    } catch (error) {
      console.error('Borrow error:', error);
      const errorMessage = error.response?.data?.error || 'Failed to borrow equipment. Please try again.';
      Alert.alert('Borrow Failed', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Borrow Equipment</Text>

        {/* Equipment Details Card */}
        <View style={styles.card}>
          <Text style={styles.equipmentName}>{equipment.name}</Text>
          <Text style={styles.description}>{equipment.description}</Text>

          <View style={styles.infoRow}>
            <Text style={styles.label}>Category:</Text>
            <Text style={styles.value}>{equipment.category}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.label}>Available:</Text>
            <Text style={styles.value}>
              {equipment.available_quantity} / {equipment.total_quantity}
            </Text>
          </View>
        </View>

        {/* Borrow Duration Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Select Borrow Duration</Text>

          <View style={styles.durationButtons}>
            {[3, 7, 14, 30].map((days) => (
              <TouchableOpacity
                key={days}
                style={[
                  styles.durationButton,
                  selectedDays === days && styles.durationButtonActive,
                ]}
                onPress={() => setSelectedDays(days)}
              >
                <Text
                  style={[
                    styles.durationButtonText,
                    selectedDays === days && styles.durationButtonTextActive,
                  ]}
                >
                  {days} {days === 1 ? 'day' : 'days'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.dueDateText}>
            Due date: {new Date(Date.now() + selectedDays * 24 * 60 * 60 * 1000).toLocaleDateString()}
          </Text>
        </View>

        {/* Borrow Instructions */}
        <View style={styles.instructionsBox}>
          <Text style={styles.instructionsTitle}>📋 What happens next:</Text>
          <Text style={styles.instructionText}>1. You'll be assigned a locker compartment</Text>
          <Text style={styles.instructionText}>2. Go to the physical locker</Text>
          <Text style={styles.instructionText}>3. Tap your RFID card to unlock</Text>
          <Text style={styles.instructionText}>4. Take the equipment from the locker</Text>
          <Text style={styles.instructionText}>5. Return by the due date to avoid penalties</Text>
        </View>

        {/* Borrow Button */}
        <TouchableOpacity
          style={[styles.borrowButton, loading && styles.borrowButtonDisabled]}
          onPress={handleBorrow}
          disabled={loading || equipment.available_quantity === 0}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.borrowButtonText}>
              {equipment.available_quantity === 0 ? 'Out of Stock' : 'Confirm Borrow'}
            </Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.cancelButton}
          onPress={() => navigation.goBack()}
          disabled={loading}
        >
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  equipmentName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
    lineHeight: 20,
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
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  durationButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  durationButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#ddd',
    marginHorizontal: 4,
    alignItems: 'center',
  },
  durationButtonActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  durationButtonText: {
    fontSize: 13,
    color: '#666',
    fontWeight: '600',
  },
  durationButtonTextActive: {
    color: '#fff',
  },
  dueDateText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginTop: 8,
  },
  instructionsBox: {
    backgroundColor: '#E3F2FD',
    borderRadius: 8,
    padding: 16,
    marginBottom: 20,
  },
  instructionsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1976D2',
    marginBottom: 8,
  },
  instructionText: {
    fontSize: 13,
    color: '#555',
    marginBottom: 4,
    paddingLeft: 8,
  },
  borrowButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 12,
  },
  borrowButtonDisabled: {
    backgroundColor: '#ccc',
  },
  borrowButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  cancelButton: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 14,
  },
});
