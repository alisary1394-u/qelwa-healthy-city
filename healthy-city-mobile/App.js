
import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { StatusBar } from 'expo-status-bar';
import { 
  SafeAreaView, 
  View, 
  Text, 
  StyleSheet, 
  ActivityIndicator 
} from 'react-native';
import { supabase } from './src/database/supabase';
import { AuthProvider } from './src/contexts/AuthContext';
import { ThemeProvider } from './src/contexts/ThemeContext';

// شاشات التطبيق
import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import DashboardScreen from './src/screens/DashboardScreen';
import StandardsScreen from './src/screens/StandardsScreen';
import ReportsScreen from './src/screens/ReportsScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import CameraScreen from './src/screens/CameraScreen';
import DocumentsScreen from './src/screens/DocumentsScreen';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

// ===== Stack Navigator =====
function MainStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
      <Stack.Screen name="Main" component={MainTabs} />
      <Stack.Screen name="Camera" component={CameraScreen} />
    </Stack.Navigator>
  );
}

// ===== Tab Navigator =====
function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;
          
          if (route.name === 'Dashboard') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'Standards') {
            iconName = focused ? 'list' : 'list-outline';
          } else if (route.name === 'Reports') {
            iconName = focused ? 'bar-chart' : 'bar-chart-outline';
          } else if (route.name === 'Documents') {
            iconName = focused ? 'document' : 'document-outline';
          } else if (route.name === 'Profile') {
            iconName = focused ? 'person' : 'person-outline';
          }
          
          return <Icon name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#3B82F6',
        tabBarInactiveTintColor: 'gray',
        headerShown: true,
        headerStyle: {
          backgroundColor: '#3B82F6',
        },
        headerTintColor: '#fff',
      })}
    >
      <Tab.Screen 
        name="Dashboard" 
        component={DashboardScreen}
        options={{ title: 'لوحة التحكم' }}
      />
      <Tab.Screen 
        name="Standards" 
        component={StandardsScreen}
        options={{ title: 'المعايير' }}
      />
      <Tab.Screen 
        name="Reports" 
        component={ReportsScreen}
        options={{ title: 'التقارير' }}
      />
      <Tab.Screen 
        name="Documents" 
        component={DocumentsScreen}
        options={{ title: 'المستندات' }}
      />
      <Tab.Screen 
        name="Profile" 
        component={ProfileScreen}
        options={{ title: 'الملف الشخصي' }}
      />
    </Tab.Navigator>
  );
}

// ===== المكون الرئيسي =====
export default function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // التحقق من الجلسة الحالية
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    // الاستماع لتغيرات المصادقة
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text style={styles.loadingText}>جاري التحميل...</Text>
      </View>
    );
  }

  return (
    <ThemeProvider>
      <AuthProvider>
        <NavigationContainer>
          <SafeAreaView style={styles.container}>
            <StatusBar style="light" />
            <MainStack />
          </SafeAreaView>
        </NavigationContainer>
      </AuthProvider>
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
});
