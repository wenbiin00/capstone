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
  SafeAreaView,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../../api.config';

export default function StaffDashboardScreen({ navigation }) {
  const [equipmentList, setEquipmentList] = useState([]);
  const [lockers, setLockers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [alertExpanded, setAlertExpanded] = useState(true);

  // Dropdown menu state
  const [menuOpen, setMenuOpen] = useState(false);

  // Stock Up modal state
  const [stockModal, setStockModal] = useState(false);
  const [selectedEquipment, setSelectedEquipment] = useState(null);
  const [addQty, setAddQty] = useState('');
  const [stockLoading, setStockLoading] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [eqRes, lockRes] = await Promise.all([
        api.get('/equipment'),
        api.get('/lockers'),
      ]);

      const eqData = eqRes.data.data;
      const lockData = lockRes.data.data;

      // Merge: attach compartment_number to each equipment item
      const merged = eqData.map((eq) => {
        const locker = lockData.find((l) => l.assigned_equipment_id === eq.equipment_id);
        return { ...eq, compartment_number: locker?.compartment_number ?? null, locker_id: locker?.locker_id ?? null };
      });

      setEquipmentList(merged);
      setLockers(lockData);
    } catch (error) {
      Alert.alert('Error', 'Failed to load equipment data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Load on focus
  React.useEffect(() => {
    const unsubscribe = navigation.addListener('focus', fetchData);
    return unsubscribe;
  }, [navigation, fetchData]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const openStockModal = (item) => {
    setSelectedEquipment(item);
    setAddQty('');
    setStockModal(true);
  };

  const handleStockUp = async () => {
    const qty = parseInt(addQty, 10);
    if (!qty || qty <= 0) {
      Alert.alert('Invalid', 'Please enter a positive number');
      return;
    }

    setStockLoading(true);
    try {
      await api.patch(`/equipment/${selectedEquipment.equipment_id}/stock`, {
        add_quantity: qty,
      });
      setStockModal(false);
      Alert.alert('Success', `Added ${qty} unit(s) to ${selectedEquipment.name}`);
      fetchData();
    } catch (error) {
      Alert.alert('Error', error.response?.data?.error || 'Stock update failed');
    } finally {
      setStockLoading(false);
    }
  };

  const handleLogout = async () => {
    await AsyncStorage.multiRemove(['userToken', 'userEmail', 'userName', 'userSitId', 'userRole']);
    navigation.replace('Login');
  };

  const getStockColor = (item) => {
    if (item.available_quantity === 0) return '#FF3B30';
    if (item.available_quantity <= item.low_stock_threshold) return '#FF9500';
    return '#34C759';
  };

  // Low-stock items computed from fetched data
  const lowStockItems = equipmentList.filter(
    (item) => item.available_quantity <= item.low_stock_threshold
  );

  const renderLowStockRow = (item) => (
    <View key={item.equipment_id} style={styles.alertRow}>
      <View style={styles.alertRowInfo}>
        <Text style={styles.alertRowName}>{item.name}</Text>
        <Text style={styles.alertRowQty}>
          {item.available_quantity} / {item.total_quantity} remaining
          {item.available_quantity === 0 ? ' — OUT OF STOCK' : ''}
        </Text>
      </View>
      <TouchableOpacity
        style={styles.alertRestockBtn}
        onPress={() => openStockModal(item)}
      >
        <Text style={styles.alertRestockText}>Restock</Text>
      </TouchableOpacity>
    </View>
  );

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.cardTitleRow}>
          <Text style={styles.equipmentName}>{item.name}</Text>
          <View style={[styles.stockBadge, { backgroundColor: getStockColor(item) }]}>
            <Text style={styles.stockBadgeText}>
              {item.available_quantity}/{item.total_quantity}
            </Text>
          </View>
        </View>
        <Text style={styles.category}>{item.category}</Text>
      </View>

      <View style={styles.lockerRow}>
        <Text style={styles.lockerLabel}>Locker Compartment:</Text>
        <Text style={styles.lockerValue}>
          {item.compartment_number != null ? `#${item.compartment_number}` : 'Unassigned'}
        </Text>
      </View>

      <View style={styles.cardActions}>
        <TouchableOpacity
          style={styles.stockButton}
          onPress={() => openStockModal(item)}
        >
          <Text style={styles.stockButtonText}>Stock Up</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.editButton}
          onPress={() => navigation.navigate('StaffEditEquipment', { equipment: item, lockers })}
        >
          <Text style={styles.editButtonText}>Edit</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#34C759" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Staff Dashboard</Text>
          <Text style={styles.headerSubtitle}>Inventory Management</Text>
        </View>
        <TouchableOpacity style={styles.menuButton} onPress={() => setMenuOpen(true)}>
          <Text style={styles.menuButtonText}>⋮</Text>
        </TouchableOpacity>
      </View>

      {/* Low-Stock Alert Banner */}
      {lowStockItems.length > 0 && (
        <View style={styles.alertBanner}>
          <TouchableOpacity
            style={styles.alertHeader}
            onPress={() => setAlertExpanded((v) => !v)}
            activeOpacity={0.8}
          >
            <View style={styles.alertHeaderLeft}>
              <Text style={styles.alertIcon}>⚠</Text>
              <Text style={styles.alertTitle}>
                {lowStockItems.length} item{lowStockItems.length > 1 ? 's' : ''} need restocking
              </Text>
            </View>
            <Text style={styles.alertChevron}>{alertExpanded ? '▲' : '▼'}</Text>
          </TouchableOpacity>

          {alertExpanded && (
            <View style={styles.alertList}>
              {lowStockItems.map(renderLowStockRow)}
            </View>
          )}
        </View>
      )}

      {/* Equipment List */}
      <FlatList
        data={equipmentList}
        keyExtractor={(item) => item.equipment_id.toString()}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
        ListHeaderComponent={
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => navigation.navigate('StaffAddEquipment', { lockers })}
          >
            <Text style={styles.addButtonText}>+ Add New Equipment</Text>
          </TouchableOpacity>
        }
        ListEmptyComponent={<Text style={styles.emptyText}>No equipment found</Text>}
      />

      {/* Dropdown Menu */}
      <Modal visible={menuOpen} transparent animationType="fade">
        <TouchableOpacity
          style={styles.menuOverlay}
          activeOpacity={1}
          onPress={() => setMenuOpen(false)}
        >
          <View style={styles.menuDropdown}>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => { setMenuOpen(false); navigation.navigate('StaffActiveBorrows'); }}
            >
              <Text style={styles.menuItemText}>Borrows</Text>
            </TouchableOpacity>
            <View style={styles.menuDivider} />
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => { setMenuOpen(false); navigation.navigate('StaffUsers'); }}
            >
              <Text style={styles.menuItemText}>User Management</Text>
            </TouchableOpacity>
            <View style={styles.menuDivider} />
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => { setMenuOpen(false); handleLogout(); }}
            >
              <Text style={[styles.menuItemText, styles.menuItemLogout]}>Logout</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Stock Up Modal */}
      <Modal visible={stockModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Stock Up</Text>
            <Text style={styles.modalEquipmentName}>{selectedEquipment?.name}</Text>
            <Text style={styles.modalCurrent}>
              Current stock: {selectedEquipment?.available_quantity}/{selectedEquipment?.total_quantity}
            </Text>

            <TextInput
              style={styles.modalInput}
              placeholder="Units to add"
              placeholderTextColor="#999"
              keyboardType="number-pad"
              value={addQty}
              onChangeText={setAddQty}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setStockModal(false)}
                disabled={stockLoading}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalConfirmBtn}
                onPress={handleStockUp}
                disabled={stockLoading}
              >
                {stockLoading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.modalConfirmText}>Confirm</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
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
  header: {
    backgroundColor: '#34C759',
    paddingHorizontal: 20,
    paddingVertical: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#d4f5de',
    marginTop: 2,
  },
  menuButton: {
    padding: 8,
  },
  menuButtonText: {
    color: '#fff',
    fontSize: 26,
    fontWeight: 'bold',
    lineHeight: 26,
  },
  menuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  menuDropdown: {
    position: 'absolute',
    top: 60,
    right: 12,
    backgroundColor: '#fff',
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
    minWidth: 180,
    overflow: 'hidden',
  },
  menuItem: {
    paddingVertical: 14,
    paddingHorizontal: 20,
  },
  menuItemText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  menuItemLogout: {
    color: '#FF3B30',
  },
  menuDivider: {
    height: 1,
    backgroundColor: '#f0f0f0',
  },
  // Low-stock alert banner
  alertBanner: {
    backgroundColor: '#FFF3CD',
    borderBottomWidth: 1,
    borderBottomColor: '#FFD966',
    marginBottom: 2,
  },
  alertHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  alertHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  alertIcon: {
    fontSize: 16,
    color: '#FF9500',
  },
  alertTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#7D4E00',
  },
  alertChevron: {
    fontSize: 11,
    color: '#7D4E00',
  },
  alertList: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 8,
  },
  alertRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FFD966',
    padding: 10,
  },
  alertRowInfo: {
    flex: 1,
  },
  alertRowName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  alertRowQty: {
    fontSize: 12,
    color: '#FF9500',
    marginTop: 2,
  },
  alertRestockBtn: {
    backgroundColor: '#FF9500',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    marginLeft: 10,
  },
  alertRestockText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  list: {
    padding: 16,
  },
  addButton: {
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#34C759',
    borderStyle: 'dashed',
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 12,
  },
  addButtonText: {
    color: '#34C759',
    fontWeight: '700',
    fontSize: 15,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: {
    marginBottom: 10,
  },
  cardTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  equipmentName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1a1a1a',
    flex: 1,
    marginRight: 8,
  },
  stockBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
  },
  stockBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  category: {
    fontSize: 12,
    color: '#888',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  lockerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  lockerLabel: {
    fontSize: 13,
    color: '#666',
    marginRight: 6,
  },
  lockerValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333',
  },
  cardActions: {
    flexDirection: 'row',
    gap: 10,
  },
  stockButton: {
    flex: 1,
    backgroundColor: '#34C759',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  stockButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
  editButton: {
    flex: 1,
    backgroundColor: '#007AFF',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  editButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
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
  modalEquipmentName: {
    fontSize: 15,
    color: '#333',
    marginBottom: 4,
  },
  modalCurrent: {
    fontSize: 13,
    color: '#888',
    marginBottom: 16,
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
