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

export default function StaffEditEquipmentScreen({ route, navigation }) {
  const { equipment, lockers } = route.params;

  const [name, setName] = useState(equipment.name);
  const [description, setDescription] = useState(equipment.description || '');
  const [category, setCategory] = useState(equipment.category || '');
  const [selectedLockerId, setSelectedLockerId] = useState(equipment.locker_id ?? null);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Build locker options: all lockers that are either unassigned or already assigned to this equipment
  const lockerOptions = lockers.filter(
    (l) => l.assigned_equipment_id == null || l.assigned_equipment_id === equipment.equipment_id
  );

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Validation', 'Equipment name is required');
      return;
    }

    setLoading(true);
    try {
      const detailsChanged =
        name.trim() !== equipment.name ||
        description.trim() !== (equipment.description || '') ||
        category.trim() !== (equipment.category || '');

      const lockerChanged = selectedLockerId !== equipment.locker_id;

      if (!detailsChanged && !lockerChanged) {
        Alert.alert('No Changes', 'Nothing was modified.');
        setLoading(false);
        return;
      }

      // Update equipment details if changed
      if (detailsChanged) {
        await api.put(`/equipment/${equipment.equipment_id}`, {
          name: name.trim(),
          description: description.trim(),
          category: category.trim(),
        });
      }

      // Reassign locker if changed
      if (lockerChanged) {
        if (selectedLockerId) {
          // Assign selected locker to this equipment
          await api.patch(`/lockers/${selectedLockerId}/assign`, {
            equipment_id: equipment.equipment_id,
          });
        } else if (equipment.locker_id) {
          // Unassign current locker
          await api.patch(`/lockers/${equipment.locker_id}/assign`, {
            equipment_id: null,
          });
        }
      }

      Alert.alert('Success', 'Equipment updated successfully', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (error) {
      Alert.alert('Error', error.response?.data?.error || 'Failed to save changes');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Equipment',
      `Permanently delete "${equipment.name}"?\n\nThis cannot be undone. The locker assignment will also be cleared.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setDeleting(true);
            try {
              await api.delete(`/equipment/${equipment.equipment_id}`);
              Alert.alert('Deleted', `${equipment.name} has been removed.`, [
                { text: 'OK', onPress: () => navigation.goBack() },
              ]);
            } catch (error) {
              Alert.alert('Cannot Delete', error.response?.data?.error || 'Failed to delete equipment');
            } finally {
              setDeleting(false);
            }
          },
        },
      ]
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.sectionTitle}>Equipment Details</Text>

      <Text style={styles.label}>Name *</Text>
      <TextInput
        style={styles.input}
        value={name}
        onChangeText={setName}
        placeholder="Equipment name"
        placeholderTextColor="#999"
        editable={!loading}
      />

      <Text style={styles.label}>Description</Text>
      <TextInput
        style={[styles.input, styles.multiline]}
        value={description}
        onChangeText={setDescription}
        placeholder="Description"
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
        placeholder="Category (e.g. Electronics)"
        placeholderTextColor="#999"
        editable={!loading}
      />

      <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Locker Assignment</Text>
      <Text style={styles.hint}>
        Current: {equipment.compartment_number != null ? `Compartment #${equipment.compartment_number}` : 'Unassigned'}
      </Text>

      {/* Unassign option */}
      <TouchableOpacity
        style={[styles.lockerOption, selectedLockerId === null && styles.lockerOptionSelected]}
        onPress={() => setSelectedLockerId(null)}
        disabled={loading}
      >
        <View style={styles.lockerOptionInner}>
          <Text style={[styles.lockerOptionText, selectedLockerId === null && styles.lockerOptionTextSelected]}>
            Unassigned
          </Text>
          <Text style={styles.lockerOptionSub}>Remove from locker</Text>
        </View>
        {selectedLockerId === null && <Text style={styles.checkmark}>✓</Text>}
      </TouchableOpacity>

      {/* Available locker options */}
      {lockerOptions.map((locker) => (
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
            <Text style={styles.lockerOptionSub}>
              {locker.assigned_equipment_id === equipment.equipment_id ? 'Current locker' : 'Available'}
            </Text>
          </View>
          {selectedLockerId === locker.locker_id && <Text style={styles.checkmark}>✓</Text>}
        </TouchableOpacity>
      ))}

      {lockerOptions.length === 0 && (
        <Text style={styles.noLockers}>No available lockers. All compartments are in use.</Text>
      )}

      <TouchableOpacity
        style={[styles.saveButton, loading && styles.saveButtonDisabled]}
        onPress={handleSave}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.saveButtonText}>Save Changes</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.cancelButton}
        onPress={() => navigation.goBack()}
        disabled={loading || deleting}
      >
        <Text style={styles.cancelButtonText}>Cancel</Text>
      </TouchableOpacity>

      <View style={styles.deleteDivider} />

      <TouchableOpacity
        style={[styles.deleteButton, deleting && styles.deleteButtonDisabled]}
        onPress={handleDelete}
        disabled={loading || deleting}
      >
        {deleting ? (
          <ActivityIndicator color="#FF3B30" />
        ) : (
          <Text style={styles.deleteButtonText}>Delete Equipment</Text>
        )}
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
    fontSize: 14,
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
  deleteDivider: {
    height: 1,
    backgroundColor: '#e0e0e0',
    marginTop: 24,
    marginBottom: 16,
  },
  deleteButton: {
    borderWidth: 1.5,
    borderColor: '#FF3B30',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 8,
  },
  deleteButtonDisabled: {
    borderColor: '#ffb3af',
  },
  deleteButtonText: {
    color: '#FF3B30',
    fontSize: 15,
    fontWeight: '700',
  },
});
