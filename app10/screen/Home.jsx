import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Platform,
  Alert,
  Modal,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { getAuth } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { API_BASE_URL } from '../config';

const UserAvatar = ({ letter, username }) => (
  <View style={styles.avatarContainer}>
    <View style={styles.avatarCircle}>
      <Text style={styles.avatarLetter}>{letter}</Text>
    </View>
    <Text style={styles.usernameText}>{username}</Text>
  </View>
);

export default function DiaryFeedScreen({ navigation }) {
  const [username, setUsername] = useState('');
  const [entries, setEntries] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // State สำหรับจัดการเมนู Option (3 จุด)
  const [optionModalVisible, setOptionModalVisible] = useState(false);
  const [selectedPost, setSelectedPost] = useState(null);

  // State เพิ่มเติมสำหรับ Modal รายงานปัญหา
  const [reportModalVisible, setReportModalVisible] = useState(false);
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);

  const auth = getAuth();
  const currentUser = auth.currentUser;

  useEffect(() => {
    const load = async () => {
      if (!currentUser) {
        setIsLoading(false);
        return;
      }

      try {
        const userDoc = await getDoc(doc(db, "users", currentUser.uid));
        setUsername(userDoc.exists() ? userDoc.data().username : (currentUser.email || 'ผู้ใช้'));
      } catch (error) {
        console.error("ดึงข้อมูลผู้ใช้ไม่สำเร็จ:", error);
        setUsername(currentUser.email || 'ผู้ใช้');
      }

      fetchFeed();
    };

    load();
  }, [currentUser]);

  const fetchFeed = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/diaries?firebase_uid=${currentUser?.uid || ''}`);
      const data = await response.json();
      setEntries(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("ดึงข้อมูลไดอารี่ไม่สำเร็จ:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenOptions = (post) => {
    setSelectedPost(post);
    setOptionModalVisible(true);
  };

  const [removeConfirmVisible, setRemoveConfirmVisible] = useState(false);
  const [removeError, setRemoveError] = useState('');
  const [isRemoving, setIsRemoving] = useState(false);

  const handleRemoveFromFeed = () => {
    setOptionModalVisible(false);
    setRemoveError('');
    setRemoveConfirmVisible(true);
  };

  const confirmRemoveFromFeed = async () => {
    if (!selectedPost) return;
    setIsRemoving(true);
    setRemoveError('');

    try {
      const res = await fetch(`${API_BASE_URL}/api/posts/${selectedPost.post_id}/unpublish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ firebase_uid: currentUser?.uid }),
      });
      const data = await res.json();

      if (data.success) {
        setRemoveConfirmVisible(false);
        fetchFeed();
      } else {
        setRemoveError(data.error || 'เอาโพสต์ออกจากฟีดไม่สำเร็จ');
      }
    } catch (err) {
      setRemoveError('เชื่อมต่อเซิร์ฟเวอร์ไม่ได้');
    } finally {
      setIsRemoving(false);
    }
  };

  // --- เปิด Modal รายงานปัญหา ---
  const handleOpenReportModal = () => {
    setOptionModalVisible(false);
    setReportModalVisible(true);
  };

  // --- ส่งข้อมูลรายงานปัญหากลับไปยังเซิร์ฟเวอร์ ---
  const handleSendReport = async (reason) => {
    if (!selectedPost || !currentUser) return;

    setIsSubmittingReport(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/reports`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          post_id: selectedPost.post_id,
          reporter_uid: currentUser.uid,
          reason: reason,
        }),
      });

      const data = await res.json();

      if (data.success || res.ok) {
        setReportModalVisible(false);
        const successText = 'รายงานปัญหาไปยังผู้ดูแลระบบเรียบร้อยแล้ว ขอบคุณสำหรับข้อมูลครับ';
        if (Platform.OS === 'web') {
          alert(successText);
        } else {
          Alert.alert('รายงานสำเร็จ', successText);
        }
      } else {
        const errorText = data.error || 'เกิดข้อผิดพลาดในการส่งรายงานปัญหา';
        if (Platform.OS === 'web') {
          alert(errorText);
        } else {
          Alert.alert('เกิดข้อผิดพลาด', errorText);
        }
      }
    } catch (error) {
      console.error('ส่งรายงานปัญหาไม่สำเร็จ:', error);
      const connErr = 'ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้';
      if (Platform.OS === 'web') {
        alert(connErr);
      } else {
        Alert.alert('เกิดข้อผิดพลาด', connErr);
      }
    } finally {
      setIsSubmittingReport(false);
    }
  };

  const handleLike = async (postId) => {
    if (!currentUser) {
      Alert.alert("แจ้งเตือน", "กรุณาเข้าสู่ระบบก่อนกดไลก์");
      return;
    }

    setEntries((prev) =>
      prev.map((entry) =>
        entry.post_id === postId
          ? {
              ...entry,
              liked_by_me: !entry.liked_by_me,
              like_count: (entry.like_count || 0) + (entry.liked_by_me ? -1 : 1),
            }
          : entry
      )
    );

    try {
      const res = await fetch(`${API_BASE_URL}/api/posts/${postId}/like`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ firebase_uid: currentUser.uid }),
      });
      const data = await res.json();

      if (data.success) {
        setEntries((prev) =>
          prev.map((entry) =>
            entry.post_id === postId
              ? { ...entry, liked_by_me: data.liked, like_count: data.like_count }
              : entry
          )
        );
      } else {
        fetchFeed();
      }
    } catch (error) {
      console.error("กดไลก์ไม่สำเร็จ:", error);
      fetchFeed();
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>

          {isLoading ? (
            <ActivityIndicator size="large" color="#343a40" style={{ marginTop: 50 }} />
          ) : entries.length > 0 ? (
            entries.map((entry, index) => (
              <View key={entry.post_id || index} style={styles.postBlock}>
                <View style={styles.postHeader}>
                  <UserAvatar 
                    letter={entry.username ? entry.username.charAt(0).toUpperCase() : '?'} 
                    username={entry.username || 'ผู้ใช้งาน'} 
                  />
                  
                  <TouchableOpacity onPress={() => handleOpenOptions(entry)} style={{ padding: 5 }}>
                    <Feather name="more-vertical" size={24} color="#343a40" />
                  </TouchableOpacity>
                </View>

                <View style={styles.postImageContainer}>
                  <Image
                    source={{ uri: entry.image_url }}
                    style={styles.postImage}
                  />
                </View>

                <View style={styles.postActions}>
                  <TouchableOpacity onPress={() => handleLike(entry.post_id)} style={styles.actionButton}>
                    <Feather
                      name="heart"
                      size={24}
                      color={entry.liked_by_me ? '#ff3b30' : '#343a40'}
                    />
                    <Text style={styles.actionText}>{entry.like_count || 0}</Text>
                  </TouchableOpacity>
                </View>
                
                <View style={styles.postTextContainer}>
                    <Text style={styles.postText}>
                      <Text style={{fontWeight: 'bold'}}>{entry.username || 'ผู้ใช้งาน'} </Text>
                      {entry.diary_text}
                    </Text>
                </View>
              </View>
            ))
          ) : (
            <Text style={styles.emptyText}>ยังไม่มีใครเขียนไดอารี่เลย เป็นคนแรกสิ!</Text>
          )}

          <View style={{ height: 150 }} />
        </ScrollView>

        {/* แถบนำทางด้านล่าง */}
        <View style={styles.bottomTabContainer}>
          <View style={styles.bottomTab}>
            <TouchableOpacity style={styles.tabItem}>
              <Feather name="home" size={26} color="#343a40" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.tabItem} onPress={() => navigation.navigate("Like")}>
              <Feather name="heart" size={26} color="#343a40" />
            </TouchableOpacity>
            <View style={styles.tabItemPlaceholder} />
            <TouchableOpacity style={styles.tabItem} onPress={() => navigation.navigate("List")}>
              <Feather name="clock" size={26} color="#343a40" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.tabItem} onPress={() => navigation.navigate("Profile")}>
              <Feather name="user" size={26} color="#343a40" />
            </TouchableOpacity>
          </View>
          <TouchableOpacity style={styles.floatingActionButton} onPress={() => navigation.navigate("Create")}>
            <View style={styles.plusCircle}>
              <Feather name="plus" size={32} color="#fff" />
            </View>
          </TouchableOpacity>
        </View>
      </View>

      {/* Modal สำหรับเมนู 3 จุด */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={optionModalVisible}
        onRequestClose={() => setOptionModalVisible(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay} 
          activeOpacity={1} 
          onPress={() => setOptionModalVisible(false)}
        >
          <View style={styles.modalContent}>
            {selectedPost && currentUser && (selectedPost.firebase_uid === currentUser.uid || selectedPost.user_id?.toString() === currentUser.uid) ? (
              <TouchableOpacity style={styles.modalOption} onPress={handleRemoveFromFeed}>
                <Feather name="eye-off" size={20} color="red" />
                <Text style={[styles.modalOptionText, { color: 'red' }]}>เอาออกจากฟีด</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={styles.modalOption} onPress={handleOpenReportModal}>
                <Feather name="alert-triangle" size={20} color="#ff9800" />
                <Text style={styles.modalOptionText}>รายงานปัญหา</Text>
              </TouchableOpacity>
            )}
            
            <View style={styles.modalDivider} />
            
            <TouchableOpacity style={styles.modalOption} onPress={() => setOptionModalVisible(false)}>
              <Text style={styles.modalOptionText}>ยกเลิก</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Modal ยืนยันเอาโพสต์ออกจากฟีด */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={removeConfirmVisible}
        onRequestClose={() => setRemoveConfirmVisible(false)}
      >
        <View style={styles.confirmOverlay}>
          <View style={styles.confirmBox}>
            <Text style={styles.confirmTitle}>เอาโพสต์ออกจากฟีด</Text>
            <Text style={styles.confirmMessage}>
              โพสต์นี้จะหายไปจากฟีดสาธารณะ แต่ไดอารี่ยังอยู่ใน "ไดอารี่ของฉัน" เหมือนเดิม
            </Text>

            {removeError ? <Text style={styles.confirmErrorText}>{removeError}</Text> : null}

            <View style={styles.confirmButtonRow}>
              <TouchableOpacity
                style={styles.confirmCancelButton}
                onPress={() => setRemoveConfirmVisible(false)}
                disabled={isRemoving}
              >
                <Text style={styles.confirmCancelText}>ยกเลิก</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.confirmDeleteButton}
                onPress={confirmRemoveFromFeed}
                disabled={isRemoving}
              >
                {isRemoving ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.confirmDeleteText}>เอาออกจากฟีด</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal เลือกลักษณะเนื้อหาที่รายงาน */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={reportModalVisible}
        onRequestClose={() => setReportModalVisible(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay} 
          activeOpacity={1} 
          onPress={() => setReportModalVisible(false)}
        >
          <View style={styles.modalContent}>
            <Text style={styles.reportModalTitle}>รายงานปัญหา</Text>
            <Text style={styles.reportModalSubTitle}>โปรดเลือกลักษณะเนื้อหาที่ไม่เหมาะสม</Text>

            <TouchableOpacity 
              style={styles.reportOption} 
              onPress={() => handleSendReport('เนื้อหาที่แสดงออกถึงความเกลียดชัง')}
              disabled={isSubmittingReport}
            >
              <Feather name="slash" size={20} color="#ff3b30" />
              <Text style={styles.reportOptionText}>เนื้อหาที่แสดงออกถึงความเกลียดชัง</Text>
            </TouchableOpacity>

            <View style={styles.modalDivider} />

            <TouchableOpacity 
              style={styles.reportOption} 
              onPress={() => handleSendReport('การกลั่นแกล้ง')}
              disabled={isSubmittingReport}
            >
              <Feather name="frown" size={20} color="#ff9800" />
              <Text style={styles.reportOptionText}>การกลั่นแกล้ง</Text>
            </TouchableOpacity>

            <View style={styles.modalDivider} />

            <TouchableOpacity 
              style={styles.reportOption} 
              onPress={() => handleSendReport('เนื้อหาที่มีความรุนแรง')}
              disabled={isSubmittingReport}
            >
              <Feather name="alert-circle" size={20} color="#ff3b30" />
              <Text style={styles.reportOptionText}>เนื้อหาที่มีความรุนแรง</Text>
            </TouchableOpacity>

            <View style={styles.modalDivider} />

            {isSubmittingReport ? (
              <ActivityIndicator color="#4287f5" style={{ marginVertical: 18 }} />
            ) : (
              <TouchableOpacity 
                style={styles.modalOption} 
                onPress={() => setReportModalVisible(false)}
              >
                <Text style={styles.modalOptionText}>ยกเลิก</Text>
              </TouchableOpacity>
            )}
          </View>
        </TouchableOpacity>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    height: Platform.OS === 'web' ? '100vh' : '100%',
  },
  container: {
    flex: 1,
    minHeight: 0,
    backgroundColor: '#fff',
    width: '100%',
    maxWidth: 480,
  },
  scrollView: { flex: 1, minHeight: 0 },
  postBlock: { marginBottom: 30, marginTop: 10, borderBottomWidth: 1, borderBottomColor: '#eee', paddingBottom: 15 },
  postHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 15, paddingVertical: 10, backgroundColor: '#fff', justifyContent: 'space-between' },
  avatarContainer: { flexDirection: 'row', alignItems: 'center' },
  avatarCircle: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#fff', borderColor: '#343a40', borderWidth: 2, justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  avatarLetter: { fontSize: 20, fontWeight: 'bold', color: '#343a40' },
  usernameText: { fontSize: 16, fontWeight: '600', color: '#343a40' },
  emptyText: { textAlign: 'center', marginTop: 50, fontSize: 18, color: '#343a40' },
  postImageContainer: { width: '100%', paddingHorizontal: 10, marginVertical: 5 },
  postImage: { width: '100%', height: 550, resizeMode: 'contain', borderRadius: 8, borderWidth: 2, borderColor: '#343a40' },
  
  postActions: { flexDirection: 'row', paddingHorizontal: 15, paddingTop: 10, paddingBottom: 5 },
  actionButton: { flexDirection: 'row', alignItems: 'center', marginRight: 15 },
  actionText: { marginLeft: 5, fontSize: 16, fontWeight: 'bold', color: '#343a40' },
  postTextContainer: { paddingHorizontal: 15, paddingTop: 5 },
  postText: { fontSize: 15, color: '#333', lineHeight: 22 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#fff', paddingBottom: 30, paddingTop: 10, borderTopLeftRadius: 20, borderTopRightRadius: 20 },
  modalOption: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 18 },
  modalOptionText: { fontSize: 18, fontWeight: '600', marginLeft: 10 },
  modalDivider: { height: 1, backgroundColor: '#eee' },

  reportModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#343a40',
    textAlign: 'center',
    marginTop: 10,
  },
  reportModalSubTitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 15,
    marginTop: 4,
  },
  reportOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 18,
    paddingHorizontal: 25,
  },
  reportOptionText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#333',
    marginLeft: 12,
  },

  confirmOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  confirmBox: { width: '100%', maxWidth: 340, backgroundColor: '#fff', borderRadius: 20, padding: 24 },
  confirmTitle: { fontSize: 18, fontWeight: 'bold', color: '#343a40', textAlign: 'center', marginBottom: 8 },
  confirmMessage: { fontSize: 15, color: '#555', textAlign: 'center', marginBottom: 16 },
  confirmErrorText: { fontSize: 13, color: 'red', textAlign: 'center', marginBottom: 12 },
  confirmButtonRow: { flexDirection: 'row', gap: 12 },
  confirmCancelButton: { flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: 'center', backgroundColor: '#f0f0f0' },
  confirmCancelText: { fontSize: 15, fontWeight: '600', color: '#343a40' },
  confirmDeleteButton: { flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: 'center', backgroundColor: 'red' },
  confirmDeleteText: { fontSize: 15, fontWeight: '600', color: '#fff' },

  bottomTabContainer: { position: 'absolute', bottom: 20, left: 10, right: 10, backgroundColor: 'transparent' },
  bottomTab: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', height: 60, paddingHorizontal: 10, backgroundColor: 'rgba(255, 255, 255, 0.95)', borderRadius: 30, elevation: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.2, shadowRadius: 10 },
  tabItem: { flex: 1, alignItems: 'center', justifyContent: 'center', height: '100%' },
  tabItemPlaceholder: { flex: 1 },
  floatingActionButton: { position: 'absolute', alignSelf: 'center', top: -30, elevation: 11 },
  plusCircle: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#343a40', justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.3, shadowRadius: 5 },
});