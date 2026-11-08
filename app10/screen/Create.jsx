import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Modal,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getAuth } from 'firebase/auth';
import { API_BASE_URL } from '../config';

export default function CreateScreen({ route, navigation }) {
  const [story, setStory] = useState('');
  const [layout, setLayout] = useState('4');
  const [artStyle, setArtStyle] = useState('doraemon');
  
  const [modalVisible, setModalVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleConfirmCreate = async () => {
    setModalVisible(false);

    if (!story.trim()) {
      Alert.alert("แจ้งเตือน", "กรุณากรอกข้อความไดอารี่ก่อนนะครับ");
      return;
    }

    const auth = getAuth();
    const currentUser = auth.currentUser;

    if (!currentUser) {
      Alert.alert("เกิดข้อผิดพลาด", "ไม่พบข้อมูลผู้ใช้งาน กรุณาล็อกอินใหม่อีกครั้ง");
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/api/generate-diary`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firebase_uid: currentUser.uid,
          diary_text: story,
          layout: layout,
          art_style: artStyle,
        }),
      });

      const data = await response.json();

      if (data.success) {
        const savedStory = story;
        setStory('');
        
        const isRecreated = route?.params?.isRecreated || false;

        navigation.navigate('Create2', {
          imageUrl: data.imageUrl,
          postId: data.post_id,
          diaryText: savedStory,
          isRecreated: isRecreated,
        });
      } else {
        Alert.alert("ล้มเหลว", data.error || "มีบางอย่างผิดพลาด");
      }
    } catch (error) {
      console.error(error);
      Alert.alert("เกิดข้อผิดพลาด", "ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้");
    } finally {
      setIsLoading(false);
    }
  };

  const RadioButton = ({ selected, label, onPress }) => (
    <TouchableOpacity style={styles.radioContainer} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.radioCircle}>
        {selected && <View style={styles.radioDot} />}
      </View>
      <Text style={styles.radioLabel}>{label}</Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent} 
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.titleText}>สร้าง ไดอารี่</Text>

        <View style={styles.inputBoxContainer}>
          <TextInput
            style={styles.textInput}
            multiline
            placeholder="บรรยายเรื่องราว...เช่น เช้าวันจันทร์ที่ฝนตกโปรยปราย..."
            placeholderTextColor="#999"
            value={story}
            onChangeText={setStory}
            textAlignVertical="top"
            editable={!isLoading}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>เลือกช่องสตอรี่บอร์ดที่ต้องการ</Text>
          <View style={styles.layoutSelectorContainer}>
            <TouchableOpacity onPress={() => setLayout('4')} activeOpacity={0.8} style={styles.layoutOption}>
              <View style={[styles.layoutDrawing, layout === '4' && styles.layoutSelected]}>
                <View style={styles.layoutRow} />
                <View style={styles.layoutRow} />
                <View style={styles.layoutRow} />
                <View style={[styles.layoutRow, { borderBottomWidth: 0 }]} />
              </View>
              <Text style={styles.layoutText}>4ช่อง</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => setLayout('3')} activeOpacity={0.8} style={styles.layoutOption}>
              <View style={[styles.layoutDrawing, layout === '3' && styles.layoutSelected]}>
                <View style={[styles.layoutRow, { flex: 1 }]} />
                <View style={[styles.layoutRow, { flex: 1 }]} />
                <View style={[styles.layoutRow, { flex: 1, borderBottomWidth: 0 }]} />
              </View>
              <Text style={styles.layoutText}>3ช่อง</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>เลือกสไตล์ลายเส้นที่ต้องการ</Text>
          <View style={styles.radioGroup}>
            <RadioButton selected={artStyle === 'doraemon'} label="สไตล์โดเรมอน" onPress={() => setArtStyle('doraemon')} />
            <RadioButton selected={artStyle === 'naruto'} label="สไตล์นารูโตะ" onPress={() => setArtStyle('naruto')} />
          </View>
        </View>

        <View style={styles.buttonContainer}>
          {isLoading ? (
            <ActivityIndicator size="large" color="#4287f5" style={{ marginVertical: 10 }} />
          ) : (
            <TouchableOpacity 
              style={styles.primaryButton} 
              onPress={() => setModalVisible(true)} 
              activeOpacity={0.8}
            >
              <Text style={styles.primaryButtonText}>เริ่มสร้างไดอารี่</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity 
            style={styles.secondaryButton} 
            onPress={() => navigation.goBack()}
            activeOpacity={0.8}
            disabled={isLoading}
          >
            <Text style={styles.secondaryButtonText}>ย้อนกลับ</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <Modal
        animationType="fade"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalText}>
              หากต้องการสร้างใหม่{"\n"}
              คุณจะ<Text style={styles.modalTextRed}>แก้ได้แค่วันละ 1 ครั้ง</Text>เท่านั้น
            </Text>
            <Text style={styles.modalSubText}>คุณแน่ใจใช่หรือไม่?</Text>

            <View style={styles.modalButtonRow}>
              <TouchableOpacity style={styles.modalCancelButton} onPress={() => setModalVisible(false)} activeOpacity={0.8}>
                <Text style={styles.modalCancelText}>ยกเลิก</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.modalConfirmButton} onPress={handleConfirmCreate} activeOpacity={0.8}>
                <Text style={styles.modalConfirmText}>ยืนยันสร้าง</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 15,
    paddingBottom: 30,
  },
  titleText: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#4287f5',
    textAlign: 'center',
    marginBottom: 20,
  },
  inputBoxContainer: {
    borderWidth: 2,
    borderColor: '#4287f5',
    borderRadius: 12,
    padding: 12,
    height: 140,
    backgroundColor: '#fff',
    marginBottom: 20,
  },
  textInput: {
    flex: 1,
    fontSize: 15,
    color: '#333',
    lineHeight: 22,
  },
  section: {
    marginBottom: 20,
  },
  sectionLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 12,
  },
  layoutSelectorContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  layoutOption: {
    alignItems: 'center',
  },
  layoutDrawing: {
    width: 65,
    height: 85,
    borderWidth: 2,
    borderColor: '#000',
    backgroundColor: '#e0e0e0',
    marginBottom: 6,
  },
  layoutSelected: {
    borderColor: '#4287f5',
    borderWidth: 3,
  },
  layoutRow: {
    flex: 1,
    borderBottomWidth: 2,
    borderColor: '#000',
  },
  layoutText: {
    fontSize: 15,
    color: '#000',
  },
  radioGroup: {
    gap: 10,
  },
  radioContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  radioCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  radioDot: {
    width: 11,
    height: 11,
    borderRadius: 5.5,
    backgroundColor: '#4287f5',
  },
  radioLabel: {
    fontSize: 16,
    color: '#000',
  },
  buttonContainer: {
    marginTop: 10,
    gap: 10,
  },
  primaryButton: {
    backgroundColor: '#4287f5',
    borderWidth: 2,
    borderColor: '#000',
    borderRadius: 25,
    paddingVertical: 13,
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: 'bold',
  },
  secondaryButton: {
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#000',
    borderRadius: 25,
    paddingVertical: 13,
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  secondaryButtonText: {
    color: '#000',
    fontSize: 17,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  modalContent: {
    backgroundColor: '#fff',
    width: '100%',
    maxWidth: 320,
    padding: 20,
    borderRadius: 20,
    borderWidth: 2.5,
    borderColor: '#000',
    alignItems: 'center',
  },
  modalText: {
    fontSize: 17,
    color: '#000',
    textAlign: 'center',
    marginBottom: 8,
    fontWeight: '600',
    lineHeight: 24,
  },
  modalTextRed: {
    color: '#ff3b30',
  },
  modalSubText: {
    fontSize: 14,
    color: '#555',
    textAlign: 'center',
    marginBottom: 20,
  },
  modalButtonRow: {
    flexDirection: 'row',
    width: '100%',
    gap: 10,
  },
  modalCancelButton: {
    flex: 1,
    backgroundColor: '#f0f0f0',
    borderWidth: 2,
    borderColor: '#000',
    borderRadius: 20,
    paddingVertical: 10,
    alignItems: 'center',
  },
  modalCancelText: {
    fontSize: 15,
    color: '#000',
    fontWeight: 'bold',
  },
  modalConfirmButton: {
    flex: 1,
    backgroundColor: '#4287f5',
    borderWidth: 2,
    borderColor: '#000',
    borderRadius: 20,
    paddingVertical: 10,
    alignItems: 'center',
  },
  modalConfirmText: {
    fontSize: 15,
    color: '#fff',
    fontWeight: 'bold',
  },
});