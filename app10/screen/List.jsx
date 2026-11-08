import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Modal,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { getAuth } from 'firebase/auth';
import { API_BASE_URL } from '../config';

const MonthSection = ({ data, isInitiallyOpen, onImagePress, onTogglePublish, togglingId }) => {
  const [isOpen, setIsOpen] = useState(isInitiallyOpen);

  return (
    <View style={styles.monthContainer}>
      <TouchableOpacity
        style={styles.monthHeader}
        onPress={() => setIsOpen(!isOpen)}
        activeOpacity={0.7}
      >
        <Text style={styles.monthTitle}>{data.month}</Text>
        <View style={styles.iconCircle}>
          <Feather name={isOpen ? "chevron-up" : "chevron-down"} size={24} color="black" />
        </View>
      </TouchableOpacity>

      {isOpen && data.entries.map((entry) => {
        const isToggling = togglingId === entry.postId;
        return (
          <View key={entry.postId} style={styles.entryCard}>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => onImagePress(entry.image || 'https://via.placeholder.com/150')}
            >
              <Image
                source={{ uri: entry.image || 'https://via.placeholder.com/150' }}
                style={styles.entryImage}
              />
            </TouchableOpacity>

            <View style={styles.entryInfo}>
              <Text style={styles.entryDate}>{entry.date}</Text>

              <TouchableOpacity
                onPress={() => onTogglePublish(entry)}
                style={entry.isPublic ? styles.unpublishPill : styles.publishPill}
                disabled={isToggling}
                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
              >
                {isToggling ? (
                  <ActivityIndicator size="small" color={entry.isPublic ? '#ff3b30' : '#4287f5'} />
                ) : (
                  <>
                    <Feather
                      name={entry.isPublic ? 'x-circle' : 'upload'}
                      size={14}
                      color={entry.isPublic ? '#ff3b30' : '#4287f5'}
                    />
                    <Text style={entry.isPublic ? styles.unpublishText : styles.publishText}>
                      {entry.isPublic ? 'ยกเลิกโพสต์' : 'โพสต์'}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        );
      })}
    </View>
  );
};

export default function ListScreen({ navigation }) {
  const [diaryData, setDiaryData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);

  const [togglingId, setTogglingId] = useState(null);

  useEffect(() => {
    fetchDiaries();
  }, []);

  const formatEntryDate = (imageUrl) => {
    const match = imageUrl && imageUrl.match(/_(\d+)\.[a-zA-Z]+$/);
    if (!match) return '';
    return new Date(parseInt(match[1], 10)).toLocaleDateString('th-TH-u-ca-buddhist', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  const fetchDiaries = async () => {
    setIsLoading(true);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000); // กำหนด Timeout 8 วินาที

    try {
      console.log("กำลังดึงข้อมูลจาก API...");
      const auth = getAuth();
      const currentUser = auth.currentUser;

      if (!currentUser) {
        setDiaryData([]);
        return;
      }

      const response = await fetch(
        `${API_BASE_URL}/api/diaries/mine?firebase_uid=${currentUser.uid}`,
        { signal: controller.signal }
      );

      clearTimeout(timeoutId);
      const data = await response.json();
      const myData = Array.isArray(data) ? data : [];

      if (myData.length > 0) {
        const formattedData = [
          {
            id: 'm1',
            month: 'ไดอารี่ทั้งหมด',
            entries: myData.map((item) => ({
              postId: item.post_id,
              date: formatEntryDate(item.image_url),
              image: item.image_url,
              isPublic: !!item.is_public,
            })),
          }
        ];
        setDiaryData(formattedData);
      } else {
        setDiaryData([]);
      }
    } catch (error) {
      if (error.name === 'AbortError') {
        console.error("การเชื่อมต่อหมดเวลา (Timeout)");
      } else {
        console.error("ดึงข้อมูลไม่สำเร็จ:", error);
      }
    } finally {
      clearTimeout(timeoutId);
      setIsLoading(false); // ปิดการโหลดเสมอ ไม่ว่าจะสำเร็จหรือเกิดข้อผิดพลาด
    }
  };

  const handleOpenImage = (imageUrl) => {
    setSelectedImage(imageUrl);
    setModalVisible(true);
  };

  const handleTogglePublish = async (entry) => {
    const currentUser = getAuth().currentUser;
    if (!currentUser || !entry.postId) return;

    setTogglingId(entry.postId);
    const action = entry.isPublic ? 'unpublish' : 'publish';

    try {
      const res = await fetch(`${API_BASE_URL}/api/posts/${entry.postId}/${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ firebase_uid: currentUser.uid }),
      });
      const data = await res.json();

      if (data.success) {
        setDiaryData((prev) =>
          prev.map((month) => ({
            ...month,
            entries: month.entries.map((e) =>
              e.postId === entry.postId ? { ...e, isPublic: !e.isPublic } : e
            ),
          }))
        );
      } else {
        Alert.alert('เกิดข้อผิดพลาด', data.error || 'ทำรายการไม่สำเร็จ ลองใหม่อีกครั้งนะครับ');
      }
    } catch (error) {
      console.error(`${action} post ไม่สำเร็จ:`, error);
      Alert.alert('เกิดข้อผิดพลาด', 'เชื่อมต่อเซิร์ฟเวอร์ไม่ได้');
    } finally {
      setTogglingId(null);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.pageContainer}>
        <View style={styles.headerContainer}>
          <Text style={styles.headerTitle}>ไดอารี่ของฉัน</Text>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {isLoading ? (
            <ActivityIndicator size="large" color="#4287f5" style={{ marginTop: 50 }} />
          ) : diaryData.length > 0 && diaryData[0].entries.length > 0 ? (
            diaryData.map((monthData, index) => (
              <MonthSection
                key={monthData.id}
                data={monthData}
                isInitiallyOpen={index === 0}
                onImagePress={handleOpenImage}
                onTogglePublish={handleTogglePublish}
                togglingId={togglingId}
              />
            ))
          ) : (
            <Text style={{ textAlign: 'center', marginTop: 50, fontSize: 18 }}>ยังไม่มีไดอารี่ สร้างเลย!</Text>
          )}
          <View style={{ height: 100 }} />
        </ScrollView>

        <View style={styles.bottomTabContainer}>
          <View style={styles.bottomTab}>
            <TouchableOpacity style={styles.tabItem} onPress={() => navigation.navigate('Home')}>
              <Feather name="home" size={26} color="#343a40" />
            </TouchableOpacity>

            {/* เพิ่ม onPress นำทางไปยังหน้า Like เรียบร้อยแล้ว */}
            <TouchableOpacity style={styles.tabItem} onPress={() => navigation.navigate('Like')}>
              <Feather name="heart" size={26} color="#343a40" />
            </TouchableOpacity>

            <View style={styles.tabItemPlaceholder} />

            <TouchableOpacity style={styles.tabItem} onPress={fetchDiaries}>
              <Feather name="clock" size={26} color="#343a40" />
            </TouchableOpacity>

            <TouchableOpacity style={styles.tabItem} onPress={() => navigation.navigate('Profile')}>
              <Feather name="user" size={26} color="#343a40" />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.floatingActionButton}
            onPress={() => navigation.navigate('Create')}
          >
            <View style={styles.plusCircle}>
              <Feather name="plus" size={32} color="#fff" />
            </View>
          </TouchableOpacity>
        </View>
      </View>

      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.fullScreenContainer}>
          <TouchableOpacity 
            style={styles.closeButton} 
            onPress={() => setModalVisible(false)}
          >
            <Feather name="x" size={35} color="#fff" />
          </TouchableOpacity>
          
          {selectedImage && (
            <Image 
              source={{ uri: selectedImage }} 
              style={styles.fullScreenImage} 
              resizeMode="contain" 
            />
          )}
        </View>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    height: Platform.OS === 'web' ? '100vh' : '100%',
  },
  pageContainer: { flex: 1, minHeight: 0, width: '100%', maxWidth: 480 },
  headerContainer: { paddingVertical: 20, alignItems: 'center' },
  headerTitle: { fontSize: 32, fontWeight: 'bold', color: '#4287f5', textShadowColor: 'rgba(66, 135, 245, 0.3)', textShadowOffset: { width: 0, height: 4 }, textShadowRadius: 10 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 10 },
  monthContainer: { borderWidth: 1.5, borderColor: '#000', borderRadius: 35, padding: 20, paddingTop: 15, marginBottom: 20, backgroundColor: '#fff' },
  monthHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 },
  monthTitle: { fontSize: 22, fontWeight: 'bold', color: '#000' },
  iconCircle: { width: 36, height: 36, borderRadius: 18, borderWidth: 1.5, borderColor: '#000', alignItems: 'center', justifyContent: 'center' },
  entryCard: { flexDirection: 'row', borderWidth: 1.5, borderColor: '#000', borderRadius: 25, padding: 12, marginTop: 15, alignItems: 'center', backgroundColor: '#fff' },
  entryImage: { width: 70, height: 90, borderRadius: 15, borderWidth: 1, borderColor: '#000', marginRight: 15 },
  entryInfo: { flex: 1, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  entryDate: { fontSize: 20, fontWeight: '500', color: '#000' },
  publishPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#4287f5',
    backgroundColor: '#eaf2ff',
  },
  publishText: { fontSize: 13, fontWeight: '600', color: '#4287f5' },
  unpublishPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#ff3b30',
    backgroundColor: '#ffeceb',
  },
  unpublishText: { fontSize: 13, fontWeight: '600', color: '#ff3b30' },
  bottomTabContainer: {
    position: 'absolute',
    bottom: 20,
    left: 10,
    right: 10,
    backgroundColor: 'transparent',
  },
  bottomTab: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    height: 60,
    paddingHorizontal: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 30,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
  },
  tabItemPlaceholder: {
    flex: 1,
  },
  floatingActionButton: {
    position: 'absolute',
    alignSelf: 'center',
    top: -30,
    elevation: 11,
  },
  plusCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#343a40',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
  },
  fullScreenContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullScreenImage: {
    width: '95%',
    height: '80%',
  },
  closeButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 1,
    padding: 10,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 30,
  }
});