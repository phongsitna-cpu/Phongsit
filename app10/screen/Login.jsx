import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  ActivityIndicator,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Image,
  Alert,
} from "react-native";

// --- 1. นำเข้า Firebase Auth ---
import { auth } from "../firebaseConfig";
import { signInWithEmailAndPassword } from "firebase/auth";

const logo = require("../assets/LOGO.png"); 

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  // --- 2. ฟังก์ชันจัดการการเข้าสู่ระบบด้วย Firebase ---
  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert("แจ้งเตือน", "กรุณากรอกอีเมลและรหัสผ่าน");
      return;
    }

    setLoading(true);
    try {
      // เรียกใช้ Firebase เพื่อตรวจสอบอีเมลและรหัสผ่าน
      await signInWithEmailAndPassword(auth, email, password);
      
      setLoading(false);
      // ถ้าผ่าน ให้ไปหน้า Home
      navigation.replace("Home"); 
    } catch (error) {
      setLoading(false);
      
      // จัดการข้อความ Error ให้เข้าใจง่าย
      let errorMessage = "อีเมลหรือรหัสผ่านไม่ถูกต้อง";
      if (error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential') {
        errorMessage = "ไม่มีข้อมูลในระบบ"; // 👈 เพิ่มการแจ้งเตือนตรงนี้กรณีไม่มีข้อมูล
      } else if (error.code === 'auth/wrong-password') {
        errorMessage = "รหัสผ่านไม่ถูกต้อง";
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = "รูปแบบอีเมลไม่ถูกต้อง";
      }
      
      Alert.alert("เข้าสู่ระบบไม่สำเร็จ", errorMessage);
      console.error(error.code);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      <View style={styles.card}>
        <Image source={logo} style={styles.logo} /> 
        <Text style={styles.titleShadow}>AI Manga Diary</Text>

        <TextInput
          style={styles.inputShadow}
          placeholder="อีเมล (Email)"
          placeholderTextColor="#888"
          keyboardType="email-address"
          autoCapitalize="none"
          value={email}
          onChangeText={setEmail}
        />

        <TextInput
          style={styles.inputShadow}
          placeholder="รหัสผ่าน (Password)"
          placeholderTextColor="#888"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />

        {/* ปุ่มลืมรหัสผ่าน (เพิ่ม onPress นำทางไป ForgotPassword) */}
        <Pressable 
          style={styles.forgotPasswordContainer}
          onPress={() => navigation.navigate("ForgotPassword")}
        >
          <Text style={styles.forgotPasswordText}>ลืมรหัสผ่าน?</Text>
        </Pressable>

        {/* ปุ่มเข้าสู่ระบบ */}
        <Pressable 
          style={[styles.buttonShadow, loading && { backgroundColor: '#ccc' }]} 
          onPress={handleLogin}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>เข้าสู่ระบบ</Text>
          )}
        </Pressable>

        {/* ปุ่มไปหน้าสมัครสมาชิก */}
        <Pressable 
          style={styles.registerButton} 
          onPress={() => navigation.navigate("LoginNew")}
        >
          <Text style={styles.registerText}>
            ยังไม่มีบัญชี? <Text style={styles.registerTextBold}>สมัครสมาชิก</Text>
          </Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#ffffff",
    justifyContent: "center",
    alignItems: "center",
  }, // ✅ ปิดแค่ปีกกาของ container
  card: {
    width: "100%",
    maxWidth: 400,
    padding: 20,
  },
  logo: {
    width: 100,
    height: 100,
    alignSelf: 'center',
    marginBottom: 20,
  },
  titleShadow: {
    color: '#007bff',
    fontSize: 28,
    fontWeight: "700",
    marginBottom: 20,
    textAlign: 'center',
  },
  inputShadow: {
    height: 48,
    borderColor: '#000',
    borderWidth: 2,
    borderRadius: 12,
    paddingHorizontal: 15,
    backgroundColor: '#fff',
    marginBottom: 10,
  },
  forgotPasswordContainer: {
    alignSelf: 'flex-end',
    marginBottom: 20,
  },
  forgotPasswordText: {
    color: '#000',
    fontSize: 14,
  },
  buttonShadow: {
    backgroundColor: '#007bff',
    height: 50,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  registerButton: {
    marginTop: 20,
    alignItems: 'center',
  },
  registerText: {
    color: '#000',
    fontSize: 14,
  },
  registerTextBold: {
    color: '#007bff',
    fontWeight: '700',
  },
}); // ✅ ปิด StyleSheet.create ที่บรรทัดสุดท้ายที่เดียว