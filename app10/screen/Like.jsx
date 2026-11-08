import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { getAuth } from 'firebase/auth';
import { API_BASE_URL } from '../config';

const formatRelativeTime = (dateString) => {
  const then = new Date(dateString.replace(' ', 'T'));
  const diffMs = Date.now() - then.getTime();
  const diffMin = Math.floor(diffMs / 60000);

  if (diffMin < 1) return 'เมื่อสักครู่';
  if (diffMin < 60) return `${diffMin} นาทีที่แล้ว`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour} ชั่วโมงที่แล้ว`;
  const diffDay = Math.floor(diffHour / 24);
  if (diffDay < 30) return `${diffDay} วันที่แล้ว`;
  return then.toLocaleDateString('th-TH-u-ca-buddhist', { day: 'numeric', month: 'short', year: 'numeric' });
};

const NotificationItem = ({ item }) => (
  <View style={styles.notifCard}>
    <View style={styles.notifIconCircle}>
      <Feather name="heart" size={20} color="#ff3b30" />
    </View>

    <View style={styles.notifTextBox}>
      <Text style={styles.notifText}>
        <Text style={styles.notifName}>{item.liker_username || 'ผู้ใช้งาน'}</Text> กดไลก์โพสต์ของคุณ
      </Text>
      <Text style={styles.notifTime}>{formatRelativeTime(item.created_at)}</Text>
    </View>

    {item.image_url ? (
      <Image source={{ uri: item.image_url }} style={styles.notifThumb} />
    ) : null}
  </View>
);

export default function LikeScreen({ navigation }) {
  const [notifications, setNotifications] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchNotifications = useCallback(async () => {
    const currentUser = getAuth().currentUser;
    if (!currentUser) {
      setNotifications([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/notifications?firebase_uid=${currentUser.uid}`);
      const data = await res.json();
      setNotifications(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('ดึงการแจ้งเตือนไม่สำเร็จ:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView 
        contentContainerStyle={styles.scrollContent} 
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.mainContent}>
          <View style={styles.headerRow}>
            <Text style={styles.headerTitle}>การแจ้งเตือน</Text>
          </View>

          {isLoading ? (
            <ActivityIndicator size="large" color="#4287f5" style={{ marginTop: 40 }} />
          ) : notifications.length > 0 ? (
            <View style={styles.notifList}>
              {notifications.map((item) => (
                <NotificationItem key={item.like_id} item={item} />
              ))}
            </View>
          ) : (
            <View style={styles.emptyContainer}>
              <Feather name="bell-off" size={60} color="#999" />
              <Text style={styles.emptyText}>ยังไม่มีการแจ้งเตือน</Text>
            </View>
          )}
        </View>

        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          activeOpacity={0.8}
        >
          <Text style={styles.backButtonText}>ย้อนกลับ</Text>
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  scrollContent: {
    flexGrow: 1,
    paddingTop: 50, 
    paddingBottom: 40,
    justifyContent: 'space-between', 
    alignItems: 'center',
  },
  mainContent: {
    width: '90%',
    maxWidth: 480,
    alignItems: 'center',
  },
  headerRow: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 40, 
  },
  headerTitle: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#4287f5', 
    textShadowColor: 'rgba(66, 135, 245, 0.3)', 
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  notifList: {
    width: '100%',
    gap: 15,
  },
  notifCard: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#000',
    borderRadius: 20,
    paddingVertical: 18,
    paddingHorizontal: 15,
    backgroundColor: '#fff',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  notifIconCircle: {
    width: 45,
    height: 45,
    borderRadius: 22.5,
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: '#ff3b30',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 15,
  },
  notifTextBox: { flex: 1, justifyContent: 'center' },
  notifText: { fontSize: 16, color: '#333' },
  notifName: { fontWeight: 'bold', color: '#000', fontSize: 18 },
  notifTime: { fontSize: 14, color: '#666', marginTop: 4 },
  notifThumb: {
    width: 50,
    height: 50,
    borderRadius: 12,
    marginLeft: 12,
    borderWidth: 1.5,
    borderColor: '#000',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 50,
  },
  emptyText: {
    fontSize: 18,
    color: '#999',
    marginTop: 15,
    fontWeight: '500',
  },
  backButton: {
    width: 150, 
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#000',
    borderRadius: 35, 
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
    marginTop: 40,
  },
  backButtonText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000',
  },
});