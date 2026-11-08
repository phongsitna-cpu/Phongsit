import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert, // 👈 นำเข้า Alert
} from 'react-native';

import { auth, db } from '../firebaseConfig';
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";

export default function LoginNewScreen({ navigation }) {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleRegister = async () => {
    setErrorMsg('');

    // 1. ตรวจสอบข้อมูลเบื้องต้น
    if (!username.trim() || !email.trim() || !password.trim() || !confirmPassword.trim()) {
      setErrorMsg('กรุณากรอกข้อมูลให้ครบทุกช่อง');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMsg('รหัสผ่านไม่ตรงกัน');
      return;
    }

    setIsSubmitting(true);
    try {
      // 2. สร้าง User ใน Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // 3. บันทึกข้อมูลเพิ่ม (Username) ลงใน Firestore
      await setDoc(doc(db, "users", user.uid), {
        username: username,
        email: email,
        createdAt: new Date(),
      });

      // 👈 เพิ่มการแจ้งเตือนเมื่อสมัครสมาชิกสำเร็จ
      Alert.alert("สำเร็จ", "สมัครสมาชิกสำเร็จเรียบร้อยแล้ว", [
        {
          text: "ตกลง",
          onPress: () => navigation.navigate('Login'),
        },
      ]);

    } catch (error) {
      // จัดการ Error เช่น อีเมลซ้ำ หรือ รหัสผ่านสั้นไป
      let errorMessage = "เกิดข้อผิดพลาดในการสมัคร";
      if (error.code === 'auth/email-already-in-use') errorMessage = "อีเมลนี้มีผู้ใช้งานแล้ว";
      else if (error.code === 'auth/weak-password') errorMessage = "รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร";
      else if (error.code === 'auth/invalid-email') errorMessage = "รูปแบบอีเมลไม่ถูกต้อง";
      else if (error.code === 'auth/operation-not-allowed') errorMessage = "ระบบสมัครด้วยอีเมล/รหัสผ่านยังไม่ถูกเปิดใช้งานใน Firebase Console (ต้องไปเปิด Authentication > Sign-in method > Email/Password)";

      setErrorMsg(`${errorMessage} (${error.code || 'ไม่ทราบสาเหตุ'})`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.container}
      >
        <View style={styles.inner}>
          <View style={styles.card}>
            <Text style={styles.titleShadow}>สมัครสมาชิก</Text>

            <TextInput
              style={styles.inputShadow}
              placeholder="ชื่อผู้ใช้ (Username)"
              value={username}
              onChangeText={setUsername}
            />

            <TextInput
              style={styles.inputShadow}
              placeholder="อีเมล (Email)"
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
            />

            <TextInput
              style={styles.inputShadow}
              placeholder="รหัสผ่าน"
              secureTextEntry
              value={password}
              onChangeText={setPassword}
            />

            <TextInput
              style={styles.inputShadow}
              placeholder="ยืนยันรหัสผ่าน"
              secureTextEntry
              value={confirmPassword}
              onChangeText={setConfirmPassword}
            />

            {errorMsg ? <Text style={styles.errorText}>{errorMsg}</Text> : null}

            <Pressable
              style={[styles.buttonShadow, isSubmitting && styles.buttonDisabled]}
              onPress={handleRegister}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>สมัครสมาชิก</Text>
              )}
            </Pressable>

            <Pressable onPress={() => navigation.goBack()} style={{ marginTop: 15 }}>
              <Text style={{ color: '#007bff', textAlign: 'center' }}>ย้อนกลับไปหน้าเข้าสู่ระบบ</Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#ffffff" },
  inner: { flex: 1, justifyContent: "center", alignItems: "center", padding: 16 },
  card: { width: "100%", maxWidth: 480, padding: 20, gap: 12 },
  titleShadow: { color: '#007bff', fontSize: 28, fontWeight: '700', marginBottom: 16, textAlign: 'center' },
  inputShadow: { height: 48, borderColor: '#000', borderWidth: 2, borderRadius: 12, paddingHorizontal: 15, backgroundColor: '#fff', marginBottom: 10 },
  buttonShadow: { backgroundColor: '#007bff', height: 50, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginTop: 10 },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#fff', fontSize: 18, fontWeight: '600' },
  errorText: { color: 'red', fontSize: 14, textAlign: 'center' },
});