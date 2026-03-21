import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Modal,
  TextInput,
  RefreshControl,
} from 'react-native';
import api from '../../api.config';

export default function StaffUsersScreen({ navigation }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // RFID modal state
  const [rfidModal, setRfidModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [rfidInput, setRfidInput] = useState('');
  const [rfidLoading, setRfidLoading] = useState(false);

  const fetchUsers = useCallback(async () => {
    try {
      const res = await api.get('/users');
      setUsers(res.data.data);
    } catch (error) {
      Alert.alert('Error', error.response?.data?.error || 'Failed to load users');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  React.useEffect(() => {
    const unsubscribe = navigation.addListener('focus', fetchUsers);
    return unsubscribe;
  }, [navigation, fetchUsers]);

  const openRfidModal = (user) => {
    setSelectedUser(user);
    setRfidInput('');
    setRfidModal(true);
  };

  const handleAssignRfid = async () => {
    const uid = rfidInput.trim();
    if (!uid) {
      Alert.alert('Validation', 'Please enter an RFID UID');
      return;
    }
    setRfidLoading(true);
    try {
      await api.patch(`/users/${selectedUser.user_id}/rfid`, { rfid_uid: uid });
      setRfidModal(false);
      Alert.alert('Success', `RFID assigned to ${selectedUser.name}`);
      fetchUsers();
    } catch (error) {
      Alert.alert('Error', error.response?.data?.error || 'Failed to assign RFID');
    } finally {
      setRfidLoading(false);
    }
  };

  const handleClearRfid = (user) => {
    Alert.alert(
      'Clear RFID',
      `Remove RFID card from ${user.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.patch(`/users/${user.user_id}/rfid`, { rfid_uid: null });
              Alert.alert('Done', 'RFID cleared');
              fetchUsers();
            } catch (error) {
              Alert.alert('Error', error.response?.data?.error || 'Failed to clear RFID');
            }
          },
        },
      ]
    );
  };

  const renderUser = ({ item }) => {
    const isStaff = item.role === 'staff' || item.role === 'admin';
    return (
      <View style={styles.card}>
        <View style={styles.cardTop}>
          <View style={styles.userInfo}>
            <Text style={styles.userName}>{item.name}</Text>
            <Text style={styles.userSitId}>SIT ID: {item.sit_id}</Text>
            <Text style={styles.userEmail} numberOfLines={1}>{item.email}</Text>
          </View>
          <View style={[styles.roleBadge, isStaff && styles.roleBadgeStaff]}>
            <Text style={styles.roleBadgeText}>{item.role.toUpperCase()}</Text>
          </View>
        </View>

        <View style={styles.rfidRow}>
          <View style={[styles.rfidStatus, item.has_rfid && styles.rfidStatusActive]}>
            <Text style={[styles.rfidStatusText, item.has_rfid && styles.rfidStatusTextActive]}>
              {item.has_rfid ? 'RFID Registered' : 'No RFID'}
            </Text>
          </View>
          <View style={styles.rfidActions}>
            <TouchableOpacity
              style={styles.assignButton}
              onPress={() => openRfidModal(item)}
            >
              <Text style={styles.assignButtonText}>
                {item.has_rfid ? 'Update' : 'Assign RFID'}
              </Text>
            </TouchableOpacity>
            {item.has_rfid && (
              <TouchableOpacity
                style={styles.clearButton}
                onPress={() => handleClearRfid(item)}
              >
                <Text style={styles.clearButtonText}>Clear</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#34C759" />
      </View>
    );
  }

  const staffCount = users.filter((u) => u.role === 'staff' || u.role === 'admin').length;
  const studentCount = users.filter((u) => u.role === 'student').length;
  const rfidCount = users.filter((u) => u.has_rfid).length;

  return (
    <View style={styles.container}>
      {/* Stats bar */}
      <View style={styles.statsBar}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{users.length}</Text>
          <Text style={styles.statLabel}>Total</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{studentCount}</Text>
          <Text style={styles.statLabel}>Students</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{staffCount}</Text>
          <Text style={styles.statLabel}>Staff</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: '#34C759' }]}>{rfidCount}</Text>
          <Text style={styles.statLabel}>RFID Set</Text>
        </View>
      </View>

      <FlatList
        data={users}
        keyExtractor={(item) => item.user_id.toString()}
        renderItem={renderUser}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); fetchUsers(); }}
            tintColor="#34C759"
          />
        }
        ListEmptyComponent={
          <Text style={styles.emptyText}>No users found</Text>
        }
      />

      {/* RFID Assignment Modal */}
      <Modal visible={rfidModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>
              {selectedUser?.has_rfid ? 'Update RFID' : 'Assign RFID'}
            </Text>
            <Text style={styles.modalUserName}>{selectedUser?.name}</Text>
            <Text style={styles.modalSitId}>SIT ID: {selectedUser?.sit_id}</Text>

            <Text style={styles.modalHint}>
              Enter the RFID UID printed on the card or read from the reader
            </Text>

            <TextInput
              style={styles.modalInput}
              placeholder="e.g. A1B2C3D4"
              placeholderTextColor="#999"
              value={rfidInput}
              onChangeText={setRfidInput}
              autoCapitalize="characters"
              autoCorrect={false}
              editable={!rfidLoading}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setRfidModal(false)}
                disabled={rfidLoading}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalConfirmBtn}
                onPress={handleAssignRfid}
                disabled={rfidLoading}
              >
                {rfidLoading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.modalConfirmText}>Save</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f4f0',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statsBar: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  statLabel: {
    fontSize: 11,
    color: '#888',
    marginTop: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  statDivider: {
    width: 1,
    backgroundColor: '#e0e0e0',
    marginVertical: 4,
  },
  list: {
    padding: 16,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.07,
    shadowRadius: 3,
    elevation: 2,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  userInfo: {
    flex: 1,
    marginRight: 10,
  },
  userName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 2,
  },
  userSitId: {
    fontSize: 13,
    color: '#555',
    marginBottom: 2,
  },
  userEmail: {
    fontSize: 12,
    color: '#999',
  },
  roleBadge: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  roleBadgeStaff: {
    backgroundColor: '#34C759',
  },
  roleBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  rfidRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rfidStatus: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  rfidStatusActive: {
    backgroundColor: '#E8F5E9',
  },
  rfidStatusText: {
    fontSize: 12,
    color: '#999',
    fontWeight: '600',
  },
  rfidStatusTextActive: {
    color: '#2E7D32',
  },
  rfidActions: {
    flexDirection: 'row',
    gap: 8,
  },
  assignButton: {
    backgroundColor: '#34C759',
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 7,
  },
  assignButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  clearButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#FF3B30',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 7,
  },
  clearButtonText: {
    color: '#FF3B30',
    fontSize: 13,
    fontWeight: '600',
  },
  emptyText: {
    textAlign: 'center',
    color: '#999',
    marginTop: 40,
    fontSize: 15,
  },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalBox: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    width: '100%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  modalUserName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  modalSitId: {
    fontSize: 13,
    color: '#888',
    marginBottom: 16,
  },
  modalHint: {
    fontSize: 13,
    color: '#666',
    marginBottom: 10,
    lineHeight: 18,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    marginBottom: 20,
    color: '#333',
    fontFamily: 'monospace',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    alignItems: 'center',
  },
  modalCancelText: {
    color: '#666',
    fontWeight: '600',
  },
  modalConfirmBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#34C759',
    alignItems: 'center',
  },
  modalConfirmText: {
    color: '#fff',
    fontWeight: '700',
  },
});
