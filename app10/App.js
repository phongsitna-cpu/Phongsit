import 'react-native-gesture-handler';
import React from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';

// นำเข้าหน้าต่างๆ
import Login from './screen/Login'; 
import LoginNew from './screen/LoginNew'; 
import ForgotPassword from './screen/ForgotPassword'; // เพิ่มการนำเข้าหน้า ForgotPassword
import Home from './screen/Home'; 
import Example from './screen/Example'; 
import Like from './screen/Like'; 
import Create from './screen/Create'; 
import Create2 from './screen/Create2'; 
import List from './screen/List'; 
import Profile from './screen/Profile'; 

const Stack = createStackNavigator();

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <NavigationContainer>
          <Stack.Navigator initialRouteName="Login">

            <Stack.Screen name="Login" component={Login} options={{ headerShown: false }} />
            <Stack.Screen name="LoginNew" component={LoginNew} options={{ headerShown: false }} />
            {/* เพิ่ม Route หน้า ForgotPassword */}
            <Stack.Screen name="ForgotPassword" component={ForgotPassword} options={{ headerShown: false }} />

            <Stack.Screen name="Home" component={Home} options={{ headerShown: false }} />
            <Stack.Screen name="Example" component={Example} options={{ headerShown: false }} />
            <Stack.Screen name="Like" component={Like} options={{ headerShown: false }} />

            <Stack.Screen name="Create" component={Create} options={{ headerShown: false }} />
            <Stack.Screen name="Create2" component={Create2} options={{ headerShown: false }} />

            <Stack.Screen name="List" component={List} options={{ headerShown: false }} />

            <Stack.Screen name="Profile" component={Profile} options={{ headerShown: false }} />

          </Stack.Navigator>
        </NavigationContainer>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}