import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { getAuth } from 'firebase/auth';
import { API_BASE_URL } from '../config';

export default function Create2Screen({ route, navigation }) {
  // รับข้อมูลจากหน้า Create รวมถึงตัวแปร isRecreated (ถ้าไม่มีให้ default เป็น false)
  const { imageUrl, diaryText, postId, isRecreated = false } = route.params || {};
  const [isPosting, setIsPosting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // ❗️ ฟังก์ชันปุ่ม "สร้างใหม่" (สีแดง)
  const handleRecreate = async () => {
    // เช็คก่อนว่าเคยใช้สิทธิ์สร้างใหม่ของวันนี้ไปแล้วหรือยัง
    if (isRecreated) {
      Alert.alert(
        "สิทธิ์หมดแล้ว",
        "คุณได้ใช้สิทธิ์สร้างใหม่ของวันนี้ไปแล้วครับ (1 วันสามารถแก้ไข/สร้างใหม่ได้แค่ 1 ครั้งเท่านั้น)"
      );
      return;
    }

    const currentUser = getAuth().currentUser;
    if (!postId || !currentUser) {
      navigation.navigate('Create', { isRecreated: true });
      return;
    }

    Alert.alert(
      "ยืนยันการสร้างใหม่",
      "รูปภาพนี้จะถูกลบทิ้ง และคุณจะกลับไปเขียนเรื่องราวใหม่ (สิทธิ์สร้างใหม่ครั้งสุดท้ายของวันนี้)",
      [
        { text: "ยกเลิก", style: "cancel" },
        { 
          text: "ลบและสร้างใหม่", 
          style: "destructive",
          onPress: async () => {
            setIsPosting(true);
            try {
              // ลบโพสต์เดิมทิ้ง
              await fetch(`${API_BASE_URL}/api/posts/${postId}`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ firebase_uid: currentUser.uid }),
              });
              // ส่งกลับหน้า Create พร้อมติดธง isRecreated: true
              navigation.replace('Create', { isRecreated: true });
            } catch (err) {
              console.error(err);
              navigation.replace('Create', { isRecreated: true });
            } finally {
              setIsPosting(false);
            }
          }
        }
      ]
    );
  };

  // ❗️ ฟังก์ชันปุ่ม "บันทึกไดอารี่" (สีฟ้า)
  const handlePublish = async () => {
    setErrorMsg('');
    const currentUser = getAuth().currentUser;
    if (!postId || !currentUser) {
      setErrorMsg('ไม่พบข้อมูลโพสต์ ลองสร้างไดอารี่ใหม่อีกครั้งนะครับ');
      return;
    }

    setIsPosting(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/posts/${postId}/publish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ firebase_uid: currentUser.uid }),
      });
      const data = await res.json();

      if (data.success) {
        navigation.navigate('Home');
      } else {
        setErrorMsg(data.error || 'บันทึกไม่สำเร็จ ลองใหม่อีกครั้งนะครับ');
      }
    } catch (error) {
      console.error('โพสต์ไม่สำเร็จ:', error);
      setErrorMsg('เชื่อมต่อเซิร์ฟเวอร์ไม่ได้ ลองใหม่อีกครั้งนะครับ');
    } finally {
      setIsPosting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent} 
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.titleText}>สร้างสำเร็จ!</Text>

        {/* รูปภาพมังงะ */}
        <View style={styles.imageWrapper}>
          <Image 
            source={imageUrl ? { uri: imageUrl } : require('../assets/do.png')} 
            style={styles.mangaImage}
            resizeMode="contain"
          />
        </View>

        {/* กล่องข้อความ */}
        <View style={styles.comicTextBox}>
          <Text style={styles.comicText}>
            {diaryText ? diaryText : "ไม่มีข้อความบรรยาย..."}
          </Text>
        </View>

        {errorMsg ? <Text style={styles.errorText}>{errorMsg}</Text> : null}

        {/* ข้อความแจ้งเตือนสีแดง */}
        <View style={styles.warningBox}>
          <Text style={styles.warningText}>
            {isRecreated 
              ? "* คุณได้ใช้สิทธิ์สร้างใหม่ของวันนี้ไปแล้ว (1 วันแก้ได้แค่วันละ 1 ครั้ง)" 
              : "* หนึ่งวันจะแก้ไขสร้างใหม่ได้แค่ 1 ครั้งเท่านั้น"}
          </Text>
        </View>

        {/* ปุ่มบันทึกไดอารี่ (สีฟ้า) */}
        <TouchableOpacity
          style={[styles.saveButton, isPosting && styles.buttonDisabled]}
          onPress={handlePublish}
          activeOpacity={0.8}
          disabled={isPosting}
        >
          {isPosting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.saveButtonText}>บันทึกไดอารี่</Text>
          )}
        </TouchableOpacity>

        {/* ปุ่มสร้างใหม่ (สีแดง) - ปรับเป็นสีจางถ้าใช้สิทธิ์ไปแล้ว */}
        <TouchableOpacity
          style={[
            styles.recreateButton, 
            (isPosting || isRecreated) && styles.buttonDisabled
          ]}
          onPress={handleRecreate}
          activeOpacity={0.8}
          disabled={isPosting}
        >
          <Text style={styles.recreateButtonText}>
            {isRecreated ? "สร้างใหม่ (ใช้สิทธิ์แล้ว)" : "สร้างใหม่"}
          </Text>
        </TouchableOpacity>
      </ScrollView>
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
    marginBottom: 15,
  },
  imageWrapper: {
    width: '100%',
    height: 380,
    backgroundColor: '#f8f8f8',
    borderWidth: 2.5,
    borderColor: '#000',
    borderRadius: 12,
    marginBottom: 15,
    overflow: 'hidden',
  },
  mangaImage: {
    width: '100%',
    height: '100%',
  },
  comicTextBox: {
    borderWidth: 2,
    borderColor: '#000',
    borderRadius: 12,
    padding: 12,
    backgroundColor: '#fff',
    marginBottom: 15,
  },
  comicText: {
    fontSize: 15,
    color: '#333',
    lineHeight: 22,
    textAlign: 'center',
  },
  warningBox: {
    backgroundColor: '#ffebe6',
    borderWidth: 1,
    borderColor: '#ffbdad',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginBottom: 15,
  },
  warningText: {
    color: '#d32f2f',
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  saveButton: {
    backgroundColor: '#4287f5',
    borderWidth: 2,
    borderColor: '#000',
    borderRadius: 25,
    paddingVertical: 13,
    alignItems: 'center',
    marginBottom: 10,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  saveButtonText: {
    fontSize: 17,
    color: '#fff',
    fontWeight: 'bold',
  },
  recreateButton: {
    backgroundColor: '#ff3b30',
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
  recreateButtonText: {
    fontSize: 17,
    color: '#fff',
    fontWeight: 'bold',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  errorText: {
    color: '#ff3b30',
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 10,
  },
});