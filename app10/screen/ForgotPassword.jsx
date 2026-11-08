import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { getAuth, sendPasswordResetEmail } from 'firebase/auth';

export default function ForgotPasswordScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleResetPassword = async () => {
    if (!email.trim()) {
      if (Platform.OS === 'web') {
        alert('กรุณากรอกอีเมลของคุณเพื่อรับลิงก์เปลี่ยนรหัสผ่าน');
      } else {
        Alert.alert('กรุณากรอกข้อมูล', 'โปรดกรอกอีเมลของคุณเพื่อรับลิงก์เปลี่ยนรหัสผ่าน');
      }
      return;
    }

    setIsLoading(true);
    try {
      const auth = getAuth();
      await sendPasswordResetEmail(auth, email.trim());
      
      const successMsg = 'ระบบได้ส่งลิงก์สำหรับเปลี่ยนรหัสผ่านไปยังอีเมลของคุณเรียบร้อยแล้ว กรุณาตรวจสอบในกล่องข้อความหรือขยะ (Spam)';

      if (Platform.OS === 'web') {
        alert(`ส่งลิงก์สำเร็จ!\n${successMsg}`);
        navigation.goBack();
      } else {
        Alert.alert(
          'ส่งลิงก์สำเร็จ',
          successMsg,
          [
            {
              text: 'ตกลง',
              onPress: () => navigation.goBack(),
            },
          ]
        );
      }
    } catch (error) {
      console.error('Reset Password Error:', error);
      let errorMsg = 'เกิดข้อผิดพลาดในการส่งอีเมล ลองใหม่อีกครั้ง';
      
      if (error.code === 'auth/user-not-found') {
        errorMsg = 'ไม่พบบัญชีผู้ใช้ที่ใช้อีเมลนี้';
      } else if (error.code === 'auth/invalid-email') {
        errorMsg = 'รูปแบบอีเมลไม่ถูกต้อง';
      }

      if (Platform.OS === 'web') {
        alert(`เกิดข้อผิดพลาด: ${errorMsg}`);
      } else {
        Alert.alert('เกิดข้อผิดพลาด', errorMsg);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.mainContent}>
        {/* หัวข้อ */}
        <View style={styles.headerRow}>
          <View style={styles.iconCircle}>
            <Feather name="key" size={32} color="#4287f5" />
          </View>
          <Text style={styles.headerTitle}>ลืมรหัสผ่าน</Text>
          <Text style={styles.subTitle}>
            กรอกอีเมลที่ใช้ลงทะเบียนเพื่อรับลิงก์สำหรับตั้งรหัสผ่านใหม่
          </Text>
        </View>

        {/* ฟอร์มกรอกอีเมล */}
        <View style={styles.formContainer}>
          <Text style={styles.label}>อีเมลของคุณ</Text>
          <View style={styles.inputBox}>
            <Feather name="mail" size={20} color="#666" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="example@email.com"
              placeholderTextColor="#aaa"
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
            />
          </View>

          {/* ปุ่มส่งลิงก์ */}
          <TouchableOpacity
            style={styles.submitButton}
            onPress={handleResetPassword}
            disabled={isLoading}
            activeOpacity={0.8}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.submitButtonText}>ส่งลิงก์เปลี่ยนรหัสผ่าน</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* ปุ่มย้อนกลับ */}
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          activeOpacity={0.8}
        >
          <Text style={styles.backButtonText}>ย้อนกลับ</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mainContent: {
    width: '90%',
    maxWidth: 400,
    alignItems: 'center',
    paddingVertical: 20,
  },
  headerRow: {
    alignItems: 'center',
    marginBottom: 30,
  },
  iconCircle: {
    width: 70,
    height: 70,
    borderRadius: 35,
    borderWidth: 2,
    borderColor: '#000',
    backgroundColor: '#eaf2ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 15,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#4287f5',
    marginBottom: 8,
    textShadowColor: 'rgba(66, 135, 245, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  subTitle: {
    fontSize: 15,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 10,
  },
  formContainer: {
    width: '100%',
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 8,
  },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#000',
    borderRadius: 20,
    paddingHorizontal: 15,
    height: 55,
    backgroundColor: '#fff',
    marginBottom: 20,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#000',
  },
  submitButton: {
    width: '100%',
    height: 55,
    backgroundColor: '#4287f5',
    borderWidth: 2,
    borderColor: '#000',
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 0,
  },
  submitButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  backButton: {
    width: 150,
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#000',
    borderRadius: 35,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
    marginTop: 10,
  },
  backButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
  },
});