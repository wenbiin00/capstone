import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import api from '../../api.config';

export default function StaffAddEquipmentScreen({ route, navigation }) {
  const { lockers } = route.params; // all lockers passed from dashboard

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [totalQty, setTotalQty] = useState('1');
  const [threshold, setThreshold] = useState('2');
  const [selectedLockerId, setSelectedLockerId] = useState(null);
  const [loading, setLoading] = useState(false);

  // Only show lockers that have no equipment assigned
  const availableLockers = lockers.filter((l) => l.assigned_equipment_id == null);

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Validation', 'Equipment name is required');
      return;
    }

    const qty = parseInt(totalQty, 10);
    if (isNaN(qty) || qty < 0) {
      Alert.alert('Validation', 'Initial quantity must be 0 or more');
      return;
    }

    const thresh = parseInt(threshold, 10);
    if (isNaN(thresh) || thresh < 0) {
      Alert.alert('Validation', 'Low stock threshold must be 0 or more');
      return;
    }

    setLoading(true);
    try {
      // 1. Create equipment
      const eqRes = await api.post('/equipment', {
        name: name.trim(),
        description: description.trim() || undefined,
        category: category.trim() || undefined,
        total_quantity: qty,
        low_stock_threshold: thresh,
      });

      const newEquipmentId = eqRes.data.data.equipment_id;

      // 2. Assign locker if selected
      if (selectedLockerId) {
        await api.patch(`/lockers/${selectedLockerId}/assign`, {
          equipment_id: newEquipmentId,
        });
      }

      Alert.alert('Success', `${name.trim()} added successfully`, [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (error) {
      Alert.alert('Error', error.response?.data?.error || 'Failed to add equipment');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.sectionTitle}>Equipment Details</Text>

      <Text style={styles.label}>Name *</Text>
      <TextInput
        style={styles.input}
        value={name}
        onChangeText={setName}
        placeholder="e.g. Arduino Uno R3"
        placeholderTextColor="#999"
        editable={!loading}
      />

      <Text style={styles.label}>Description</Text>
      <TextInput
        style={[styles.input, styles.multiline]}
        value={description}
        onChangeText={setDescription}
        placeholder="Brief description of the equipment"
        placeholderTextColor="#999"
        multiline
        numberOfLines={3}
        editable={!loading}
      />

      <Text style={styles.label}>Category</Text>
      <TextInput
        style={styles.input}
        value={category}
        onChangeText={setCategory}
        placeholder="e.g. Electronics, Tools, Measurement"
        placeholderTextColor="#999"
        editable={!loading}
      />

      <View style={styles.row}>
        <View style={styles.halfField}>
          <Text style={styles.label}>Initial Quantity *</Text>
          <TextInput
            style={styles.input}
            value={totalQty}
            onChangeText={setTotalQty}
            placeholder="1"
            placeholderTextColor="#999"
            keyboardType="number-pad"
            editable={!loading}
          />
        </View>
        <View style={styles.halfField}>
          <Text style={styles.label}>Low Stock Alert At</Text>
          <TextInput
            style={styles.input}
            value={threshold}
            onChangeText={setThreshold}
            placeholder="2"
            placeholderTextColor="#999"
            keyboardType="number-pad"
            editable={!loading}
          />
        </View>
      </View>

      <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Locker Assignment</Text>
      <Text style={styles.hint}>Optional — assign a compartment for this equipment</Text>

      {/* No locker option */}
      <TouchableOpacity
        style={[styles.lockerOption, selectedLockerId === null && styles.lockerOptionSelected]}
        onPress={() => setSelectedLockerId(null)}
        disabled={loading}
      >
        <View style={styles.lockerOptionInner}>
          <Text style={[styles.lockerOptionText, selectedLockerId === null && styles.lockerOptionTextSelected]}>
            No Locker
          </Text>
          <Text style={styles.lockerOptionSub}>Assign later via Edit Equipment</Text>
        </View>
        {selectedLockerId === null && <Text style={styles.checkmark}>✓</Text>}
      </TouchableOpacity>

      {availableLockers.map((locker) => (
        <TouchableOpacity
          key={locker.locker_id}
          style={[styles.lockerOption, selectedLockerId === locker.locker_id && styles.lockerOptionSelected]}
          onPress={() => setSelectedLockerId(locker.locker_id)}
          disabled={loading}
        >
          <View style={styles.lockerOptionInner}>
            <Text style={[styles.lockerOptionText, selectedLockerId === locker.locker_id && styles.lockerOptionTextSelected]}>
              Compartment #{locker.compartment_number}
            </Text>
            <Text style={styles.lockerOptionSub}>Available</Text>
          </View>
          {selectedLockerId === locker.locker_id && <Text style={styles.checkmark}>✓</Text>}
        </TouchableOpacity>
      ))}

      {availableLockers.length === 0 && (
        <Text style={styles.noLockers}>No free compartments available. Assign a locker later via Edit Equipment.</Text>
      )}

      <TouchableOpacity
        style={[styles.saveButton, loading && styles.saveButtonDisabled]}
        onPress={handleSave}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.saveButtonText}>Add Equipment</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.cancelButton}
        onPress={() => navigation.goBack()}
        disabled={loading}
      >
        <Text style={styles.cancelButtonText}>Cancel</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f4f0',
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 12,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#555',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  input: {
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#333',
    marginBottom: 16,
  },
  multiline: {
    height: 80,
    textAlignVertical: 'top',
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  halfField: {
    flex: 1,
  },
  hint: {
    fontSize: 13,
    color: '#888',
    marginBottom: 12,
  },
  lockerOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#e0e0e0',
    padding: 14,
    marginBottom: 8,
  },
  lockerOptionSelected: {
    borderColor: '#34C759',
    backgroundColor: '#f0faf3',
  },
  lockerOptionInner: {
    flex: 1,
  },
  lockerOptionText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
  },
  lockerOptionTextSelected: {
    color: '#34C759',
  },
  lockerOptionSub: {
    fontSize: 12,
    color: '#888',
    marginTop: 2,
  },
  checkmark: {
    fontSize: 18,
    color: '#34C759',
    fontWeight: 'bold',
  },
  noLockers: {
    fontSize: 13,
    color: '#999',
    textAlign: 'center',
    marginVertical: 12,
    fontStyle: 'italic',
  },
  saveButton: {
    backgroundColor: '#34C759',
    paddingVertical: 16,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 24,
  },
  saveButtonDisabled: {
    backgroundColor: '#aaa',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  cancelButton: {
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 14,
  },
});
