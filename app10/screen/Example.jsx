import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Platform,
} from 'react-native';

export default function ExampleScreen({ navigation }) {
  // สเตตสำหรับเก็บค่าที่ผู้ใช้เลือก
  const [story, setStory] = useState('');
  const [layout, setLayout] = useState('4'); // '4' หรือ '3'
  const [language, setLanguage] = useState('th'); // 'th' หรือ 'jp'
  const [artStyle, setArtStyle] = useState('doraemon'); // 'doraemon' หรือ 'naruto'

  // คอมโพเนนต์สำหรับ Radio Button ทำเองแบบง่ายๆ ขอบหนาเหมือนในรูป
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
      {/* ❗️ เพิ่ม style={styles.scrollView} ตรงนี้ */}
      <ScrollView 
        style={styles.scrollView} 
        contentContainerStyle={styles.container} 
        showsVerticalScrollIndicator={false}
      >
        
        {/* ครอบเนื้อหาทั้งหมดด้วยกล่อง Card เพื่อจำกัดความกว้าง */}
        <View style={styles.card}>
          
          {/* หัวข้อ */}
          <Text style={styles.titleText}>ตัวอย่างการใช้งาน</Text>

          {/* ส่วนที่ 1: เขียนบรรยายเรื่องราว */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>1.เขียนบรรยายเรื่องราวชีวิตของตัวเอง</Text>
            <View style={styles.inputBox}>
              <TextInput
                style={styles.textInput}
                multiline
                placeholder="บรรยายเรื่องราว...เช่น เช้าวันจันทร์ที่ฝนตกโปรยปราย มีเสียงฝนกระทบหลังคาช่างไพเราะ ดั่งเสียงน้ำค้างที่โรยราลงกะละมัง มีชายหน้าตาดีนั่งจิบชาที่ริมหน้าต่าง"
                placeholderTextColor="#999"
                value={story}
                onChangeText={setStory}
                textAlignVertical="top" 
              />
            </View>
          </View>

          {/* ส่วนที่ 2: เลือกช่องสตอรี่บอร์ด */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>2.เลือกช่องสตอรี่บอร์ดที่ต้องการ</Text>
            <View style={styles.cardContainer}>
              
              {/* ตัวเลือก 4 ช่อง */}
              <TouchableOpacity 
                style={styles.layoutOption} 
                onPress={() => setLayout('4')}
                activeOpacity={0.7}
              >
                <View style={[styles.layoutDrawing, layout === '4' && styles.layoutSelected]}>
                  <View style={styles.layoutRow} />
                  <View style={styles.layoutRow} />
                  <View style={styles.layoutRow} />
                  <View style={[styles.layoutRow, { borderBottomWidth: 0 }]} />
                </View>
                <Text style={styles.layoutText}>4ช่อง</Text>
              </TouchableOpacity>

              {/* ตัวเลือก 3 ช่อง */}
              <TouchableOpacity 
                style={styles.layoutOption} 
                onPress={() => setLayout('3')}
                activeOpacity={0.7}
              >
                <View style={[styles.layoutDrawing, layout === '3' && styles.layoutSelected]}>
                  <View style={[styles.layoutRow, { flex: 1 }]} />
                  <View style={[styles.layoutRow, { flex: 1 }]} />
                  <View style={[styles.layoutRow, { flex: 1, borderBottomWidth: 0 }]} />
                </View>
                <Text style={styles.layoutText}>3ช่อง</Text>
              </TouchableOpacity>

            </View>
          </View>

          {/* ส่วนที่ 3: เลือกภาษา */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>3.เลือกภาษาที่ต้องการ</Text>
            <View style={styles.cardContainerVertical}>
              <RadioButton 
                selected={language === 'th'} 
                label="ภาษาไทย" 
                onPress={() => setLanguage('th')} 
              />
              <RadioButton 
                selected={language === 'jp'} 
                label="ภาษาญี่ปุ่น" 
                onPress={() => setLanguage('jp')} 
              />
            </View>
          </View>

          {/* ส่วนที่ 4: เลือกสไตล์ลายเส้น */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>4.เลือกสไตล์ลายเส้นที่ต้องการ</Text>
            <View style={styles.cardContainerVertical}>
              <RadioButton 
                selected={artStyle === 'doraemon'} 
                label="สไตล์โดเรมอน" 
                onPress={() => setArtStyle('doraemon')} 
              />
              <RadioButton 
                selected={artStyle === 'naruto'} 
                label="สไตล์นารูโตะ" 
                onPress={() => setArtStyle('naruto')} 
              />
            </View>
          </View>

          {/* ปุ่มกลับหน้าล็อกอิน */}
          <TouchableOpacity 
            style={styles.loginButton} 
            onPress={() => navigation.navigate('Login')} 
            activeOpacity={0.8}
          >
            <Text style={styles.loginButtonText}>กลับหน้าล็อกอิน</Text>
          </TouchableOpacity>

        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  // ❗️ เพิ่มสไตล์นี้เข้ามา
  scrollView: {
    flex: 1,
    width: '100%',
  },
  container: {
    flexGrow: 1, 
    alignItems: 'center', 
    padding: 16,
  },
  card: {
    width: "100%", 
    maxWidth: 480,
    paddingBottom: 40,
    backgroundColor: "transparent", 
  },
  titleText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#4287f5', 
    textAlign: 'center',
    marginBottom: 20,
    marginTop: 10,
    textShadowColor: 'rgba(0, 0, 0, 0.15)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  section: {
    marginBottom: 20,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  inputBox: {
    borderWidth: 1.5,
    borderColor: '#000',
    borderRadius: 20,
    padding: 15,
    height: 150,
    backgroundColor: '#fff',
  },
  textInput: {
    flex: 1,
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
  },
  cardContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    borderWidth: 1.5,
    borderColor: '#000',
    borderRadius: 20,
    padding: 20,
    backgroundColor: '#fff',
  },
  cardContainerVertical: {
    borderWidth: 1.5,
    borderColor: '#000',
    borderRadius: 20,
    padding: 20,
    backgroundColor: '#fff',
    gap: 10, 
  },
  layoutOption: {
    alignItems: 'center',
    width: 80,
  },
  layoutDrawing: {
    width: 70,
    height: 90,
    borderWidth: 2,
    borderColor: '#000',
    backgroundColor: '#e0e0e0', 
    marginBottom: 10,
    overflow: 'hidden',
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
    fontSize: 16,
    color: '#000',
  },
  radioContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 5,
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 3,
    borderColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#000', 
  },
  radioLabel: {
    fontSize: 16,
    color: '#000',
  },
  loginButton: {
    backgroundColor: '#4287f5', 
    borderWidth: 2,
    borderColor: '#000', 
    borderRadius: 25,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 10,
    elevation: 5, 
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});