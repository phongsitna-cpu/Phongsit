import React, { useState, useEffect } from 'react';
import {
  ScrollView,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { getAuth, signOut } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { API_BASE_URL } from '../config';

export default function ProfileScreen({ navigation }) {
  const [userName, setUserName] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [mangaCount, setMangaCount] = useState(0);

  useEffect(() => {
    const load = async () => {
      const auth = getAuth();
      const currentUser = auth.currentUser;
      if (!currentUser) {
        setIsLoading(false);
        return;
      }

      try {
        const userDoc = await getDoc(doc(db, "users", currentUser.uid));
        setUserName(userDoc.exists() ? userDoc.data().username : (currentUser.email || 'ผู้ใช้'));
      } catch (error) {
        console.error("ดึงข้อมูลผู้ใช้ไม่สำเร็จ:", error);
        setUserName(currentUser.email || 'ผู้ใช้');
      }

      try {
        const response = await fetch(`${API_BASE_URL}/api/diaries/mine?firebase_uid=${currentUser.uid}`);
        const data = await response.json();
        setMangaCount(Array.isArray(data) ? data.length : 0);
      } catch (error) {
        console.error("ดึงจำนวนมังงะไม่สำเร็จ:", error);
      } finally {
        setIsLoading(false);
      }
    };

    load();
  }, []);

  const handleEditToggle = async () => {
    if (isEditing) {
      const auth = getAuth();
      const currentUser = auth.currentUser;
      if (currentUser) {
        try {
          await setDoc(doc(db, "users", currentUser.uid), { username: userName }, { merge: true });

          await fetch(`${API_BASE_URL}/api/users/update-username`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              firebase_uid: currentUser.uid,
              username: userName,
            }),
          });
        } catch (error) {
          console.error("บันทึกชื่อไม่สำเร็จ:", error);
        }
      }
    }
    setIsEditing(!isEditing);
  };

  const handleLogout = async () => {
    try {
      await signOut(getAuth());
    } catch (error) {
      console.error("ออกจากระบบไม่สำเร็จ:", error);
    }
    navigation.navigate('Login');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.pageContainer}>
        <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>

          <Text style={styles.titleText}>โปรไฟล์</Text>

          <View style={styles.avatarCircle}>
            <Feather name="user" size={90} color="black" />
          </View>

          <View style={styles.nameContainer}>
            <Text style={styles.namePrefixText}>ชื่อ : </Text>
            {isEditing ? (
              <TextInput
                style={styles.nameInput}
                value={userName}
                onChangeText={setUserName}
                autoFocus={true}
              />
            ) : (
              <Text style={styles.nameText}>{userName}</Text>
            )}
          </View>

          <View style={styles.statsBox}>
            {isLoading ? (
              <ActivityIndicator size="small" color="#4287f5" />
            ) : (
              <Text style={styles.statsText}>มังงะที่สร้างทั้งหมด : {mangaCount}</Text>
            )}
          </View>

          <TouchableOpacity
            style={styles.editButton}
            activeOpacity={0.8}
            onPress={handleEditToggle}
          >
            <Text style={styles.editButtonText}>
              {isEditing ? 'บันทึก' : 'แก้ไขโปรไฟล์'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.logoutButton}
            activeOpacity={0.8}
            onPress={handleLogout}
          >
            <Text style={styles.logoutButtonText}>ออกจากระบบ</Text>
          </TouchableOpacity>

        </ScrollView>

        <View style={styles.bottomTabContainer}>
          <View style={styles.bottomTab}>
            <TouchableOpacity style={styles.tabItem} onPress={() => navigation.navigate('Home')}>
              <Feather name="home" size={26} color="#343a40" />
            </TouchableOpacity>

            <TouchableOpacity style={styles.tabItem} onPress={() => navigation.navigate('Like')}>
              <Feather name="heart" size={26} color="#343a40" />
            </TouchableOpacity>

            <View style={styles.tabItemPlaceholder} />

            <TouchableOpacity style={styles.tabItem} onPress={() => navigation.navigate('List')}>
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
  container: {
    padding: 20,
    alignItems: 'center',
    paddingTop: 40,
    paddingBottom: 100,
  },
  titleText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#4287f5',
    marginBottom: 30,
    textShadowColor: 'rgba(66, 135, 245, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  avatarCircle: {
    width: 150,
    height: 150,
    borderRadius: 75,
    borderWidth: 2,
    borderColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    marginBottom: 15,
  },
  nameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    height: 30,
  },
  namePrefixText: {
    fontSize: 22,
    fontWeight: '500',
    color: '#000',
  },
  nameText: {
    fontSize: 22,
    fontWeight: '500',
    color: '#000',
  },
  nameInput: {
    fontSize: 22,
    fontWeight: '500',
    color: '#000',
    borderBottomWidth: 2,
    borderColor: '#4287f5',
    minWidth: 100,
    padding: 0,
    textAlign: 'center',
  },
  statsBox: {
    width: '95%',
    backgroundColor: '#fff',
    borderWidth: 2.5,
    borderColor: '#000',
    borderRadius: 30,
    paddingVertical: 20,
    paddingHorizontal: 25,
    marginBottom: 30,
  },
  statsText: {
    fontSize: 20,
    color: '#000',
    marginBottom: 5,
  },
  editButton: {
    width: '95%',
    backgroundColor: '#4287f5',
    borderWidth: 3,
    borderColor: '#000',
    borderRadius: 30,
    paddingVertical: 15,
    alignItems: 'center',
    marginBottom: 20,
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 1,
    shadowRadius: 0,
  },
  editButtonText: {
    fontSize: 20,
    color: '#fff',
    fontWeight: '600',
  },
  logoutButton: {
    width: '95%',
    backgroundColor: '#ff3b30',
    borderWidth: 3,
    borderColor: '#000',
    borderRadius: 30,
    paddingVertical: 15,
    alignItems: 'center',
    marginBottom: 20,
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 1,
    shadowRadius: 0,
  },
  logoutButtonText: {
    fontSize: 20,
    color: '#000',
    fontWeight: '600',
  },
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
});