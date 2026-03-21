import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  RefreshControl,
  SafeAreaView,
} from 'react-native';
import api from '../../api.config';

const FILTERS = ['All', 'Pending Pickup', 'Active', 'Overdue'];

const STATUS_META = {
  pending_pickup: { label: 'Pending Pickup', color: '#007AFF' },
  active:         { label: 'Active',          color: '#34C759' },
  pending_return: { label: 'Pending Return',  color: '#FF9500' },
};

function formatDate(dateStr) {
  if (!dateStr) return 'No due date';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-SG', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function StaffActiveBorrowsScreen({ navigation }) {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState('All');

  const fetchTransactions = useCallback(async () => {
    try {
      const res = await api.get('/transactions/active');
      setTransactions(res.data.data);
    } catch (error) {
      const msg = error.response?.data?.error || error.message || 'Unknown error';
      Alert.alert('Error', `Failed to load active borrows\n\n${msg}`);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  React.useEffect(() => {
    const unsubscribe = navigation.addListener('focus', fetchTransactions);
    return unsubscribe;
  }, [navigation, fetchTransactions]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchTransactions();
  };

  // Filter logic
  const filtered = transactions.filter((t) => {
    if (activeFilter === 'All') return true;
    if (activeFilter === 'Overdue') return t.is_overdue;
    if (activeFilter === 'Pending Pickup') return t.status === 'pending_pickup';
    if (activeFilter === 'Active') return t.status === 'active' || t.status === 'pending_return';
    return true;
  });

  // Summary counts
  const overdueCount = transactions.filter((t) => t.is_overdue).length;
  const pendingCount = transactions.filter((t) => t.status === 'pending_pickup').length;
  const activeCount = transactions.filter(
    (t) => t.status === 'active' || t.status === 'pending_return'
  ).length;

  const renderCard = ({ item }) => {
    const isOverdue = item.is_overdue;
    const meta = STATUS_META[item.status] || { label: item.status, color: '#999' };
    const badgeColor = isOverdue ? '#FF3B30' : meta.color;
    const badgeLabel = isOverdue ? 'Overdue' : meta.label;

    return (
      <View style={[styles.card, isOverdue && styles.cardOverdue]}>
        {/* Student row */}
        <View style={styles.cardHeader}>
          <View style={styles.studentInfo}>
            <Text style={styles.studentName}>{item.user_name}</Text>
            <Text style={styles.studentSit}>SIT ID: {item.sit_id}</Text>
          </View>
          <View style={[styles.badge, { backgroundColor: badgeColor }]}>
            <Text style={styles.badgeText}>{badgeLabel}</Text>
          </View>
        </View>

        {/* Equipment + locker */}
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Equipment</Text>
          <Text style={styles.detailValue}>{item.equipment_name}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Category</Text>
          <Text style={styles.detailValue}>{item.category || '—'}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Compartment</Text>
          <Text style={styles.detailValue}>
            {item.compartment_number != null ? `#${item.compartment_number}` : 'Unassigned'}
          </Text>
        </View>

        {/* Due date */}
        <View style={[styles.detailRow, styles.detailRowLast]}>
          <Text style={styles.detailLabel}>Due Date</Text>
          <Text style={[styles.detailValue, isOverdue && styles.overdueText]}>
            {formatDate(item.due_date)}
            {isOverdue ? '  ⚠ OVERDUE' : ''}
          </Text>
        </View>

        {/* Borrow time */}
        {item.borrow_time && (
          <Text style={styles.borrowTime}>
            Picked up: {formatDate(item.borrow_time)}
          </Text>
        )}
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

  return (
    <SafeAreaView style={styles.container}>
      {/* Summary stats */}
      <View style={styles.statsRow}>
        <View style={styles.statBox}>
          <Text style={styles.statNum}>{transactions.length}</Text>
          <Text style={styles.statLabel}>Total</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={[styles.statNum, { color: '#007AFF' }]}>{pendingCount}</Text>
          <Text style={styles.statLabel}>Pending</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={[styles.statNum, { color: '#34C759' }]}>{activeCount}</Text>
          <Text style={styles.statLabel}>Active</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={[styles.statNum, { color: overdueCount > 0 ? '#FF3B30' : '#999' }]}>
            {overdueCount}
          </Text>
          <Text style={styles.statLabel}>Overdue</Text>
        </View>
      </View>

      {/* Filter tabs */}
      <View style={styles.filterRow}>
        {FILTERS.map((f) => (
          <TouchableOpacity
            key={f}
            style={[styles.filterTab, activeFilter === f && styles.filterTabActive]}
            onPress={() => setActiveFilter(f)}
          >
            <Text style={[styles.filterText, activeFilter === f && styles.filterTextActive]}>
              {f}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* List */}
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.transaction_id.toString()}
        renderItem={renderCard}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
        ListEmptyComponent={
          <Text style={styles.emptyText}>
            {activeFilter === 'All' ? 'No active borrows' : `No ${activeFilter.toLowerCase()} borrows`}
          </Text>
        }
      />
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
  // Stats
  statsRow: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingVertical: 14,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
  },
  statNum: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1a1a1a',
  },
  statLabel: {
    fontSize: 11,
    color: '#888',
    marginTop: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  // Filters
  filterRow: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  filterTab: {
    flex: 1,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#f0f4f0',
    alignItems: 'center',
  },
  filterTabActive: {
    backgroundColor: '#34C759',
  },
  filterText: {
    fontSize: 11,
    color: '#666',
    fontWeight: '600',
  },
  filterTextActive: {
    color: '#fff',
  },
  // List
  list: {
    padding: 16,
  },
  emptyText: {
    textAlign: 'center',
    color: '#999',
    marginTop: 40,
    fontSize: 15,
  },
  // Card
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
    borderLeftWidth: 4,
    borderLeftColor: 'transparent',
  },
  cardOverdue: {
    borderLeftColor: '#FF3B30',
    backgroundColor: '#FFF8F8',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  studentInfo: {
    flex: 1,
    marginRight: 8,
  },
  studentName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  studentSit: {
    fontSize: 12,
    color: '#888',
    marginTop: 2,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  detailRowLast: {
    marginBottom: 0,
  },
  detailLabel: {
    fontSize: 13,
    color: '#888',
  },
  detailValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333',
    textAlign: 'right',
    flex: 1,
    marginLeft: 8,
  },
  overdueText: {
    color: '#FF3B30',
  },
  borrowTime: {
    fontSize: 11,
    color: '#bbb',
    marginTop: 8,
    textAlign: 'right',
  },
});
