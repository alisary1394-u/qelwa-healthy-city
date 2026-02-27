/**
 * إعداد تطبيقات الموبايل باستخدام React Native + Supabase
 * يعمل على أندرويد و iOS بنفس الكود
 */

// ===== package.json للتطبيق المحمول =====

const mobilePackageJson = {
  "name": "healthy-city-mobile",
  "version": "1.0.0",
  "main": "node_modules/expo/AppEntry.js",
  "scripts": {
    "start": "expo start",
    "android": "expo start --android",
    "ios": "expo start --ios",
    "web": "expo start --web",
    "build:android": "expo build:android",
    "build:ios": "expo build:ios",
    "test": "jest"
  },
  "dependencies": {
    "@expo/vector-icons": "^13.0.0",
    "@react-navigation/bottom-tabs": "^6.5.11",
    "@react-navigation/native": "^6.1.9",
    "@react-navigation/stack": "^6.3.20",
    "@supabase/supabase-js": "^2.38.5",
    "expo": "~50.0.0",
    "expo-camera": "~13.4.4",
    "expo-document-picker": "~11.5.4",
    "expo-file-system": "~15.4.5",
    "expo-image-picker": "~14.3.2",
    "expo-linear-gradient": "~12.3.0",
    "expo-linking": "~5.0.2",
    "expo-notifications": "~0.27.7",
    "expo-splash-screen": "~0.22.5",
    "expo-status-bar": "~1.11.1",
    "react": "18.2.0",
    "react-native": "0.73.6",
    "react-native-chart-kit": "^6.12.0",
    "react-native-gesture-handler": "~2.12.0",
    "react-native-paper": "^5.11.6",
    "react-native-reanimated": "~3.3.0",
    "react-native-safe-area-context": "4.6.3",
    "react-native-screens": "~3.22.0",
    "react-native-svg": "14.1.0"
  },
  "devDependencies": {
    "@babel/core": "^7.20.0",
    "@types/react": "~18.2.45",
    "@types/react-native": "~0.73.0",
    "jest": "^29.2.1",
    "react-test-renderer": "18.2.0",
    "typescript": "^5.1.3"
  }
};

// ===== App.js الرئيسي للتطبيق المحمول =====

const mobileAppCode = `
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
`;

// ===== شاشة لوحة التحكم للموبايل =====

const dashboardScreenCode = `
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Dimensions,
  TouchableOpacity,
} from 'react-native';
import { Card, Button, ProgressBar } from 'react-native-paper';
import { LineChart, BarChart, PieChart } from 'react-native-chart-kit';
import { supabase } from '../database/supabase';

const { width: screenWidth } = Dimensions.get('window');

export default function DashboardScreen({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [dashboardData, setDashboardData] = useState({
    axes: [],
    overallScore: 0,
    completedStandards: 0,
    totalStandards: 0,
    recentActivity: [],
    notifications: []
  });

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      // جلب بيانات المحاور
      const { data: axes } = await supabase
        .from('axes')
        .select('*')
        .order('order');

      // جلب بيانات المعايير
      const { data: standards } = await supabase
        .from('standards')
        .select('*');

      // حساب الإحصائيات
      const completedStandards = standards?.filter(s => s.status === 'completed').length || 0;
      const totalStandards = standards?.length || 0;
      const overallScore = totalStandards > 0 ? (completedStandards / totalStandards) * 100 : 0;

      setDashboardData({
        axes: axes || [],
        overallScore,
        completedStandards,
        totalStandards,
        recentActivity: [],
        notifications: []
      });
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadDashboardData();
    setRefreshing(false);
  };

  const renderScoreCard = () => (
    <Card style={styles.scoreCard}>
      <Card.Content>
        <Text style={styles.scoreTitle}>مجموع النقاط</Text>
        <Text style={styles.scoreValue}>{dashboardData.overallScore.toFixed(1)}%</Text>
        <ProgressBar
          progress={dashboardData.overallScore / 100}
          color={dashboardData.overallScore >= 80 ? '#10B981' : 
                 dashboardData.overallScore >= 60 ? '#F59E0B' : '#EF4444'}
          style={styles.progressBar}
        />
        <Text style={styles.scoreSubtitle}>
          {dashboardData.completedStandards} من {dashboardData.totalStandards} معيار مكتمل
        </Text>
      </Card.Content>
    </Card>
  );

  const renderAxesCards = () => (
    <View style={styles.axesContainer}>
      <Text style={styles.sectionTitle}>المحاور</Text>
      {dashboardData.axes.map((axis) => (
        <TouchableOpacity
          key={axis.id}
          style={styles.axisCard}
          onPress={() => navigation.navigate('Standards', { axisId: axis.id })}
        >
          <View style={styles.axisHeader}>
            <Text style={styles.axisName}>{axis.short_name || axis.name}</Text>
            <Text style={styles.axisOrder}>محور {axis.order}</Text>
          </View>
          <ProgressBar
            progress={0.7} // سيتم حسابها لاحقاً
            color={axis.color || '#3B82F6'}
            style={styles.axisProgressBar}
          />
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderQuickActions = () => (
    <View style={styles.actionsContainer}>
      <Text style={styles.sectionTitle}>إجراءات سريعة</Text>
      <View style={styles.actionsRow}>
        <Button
          mode="contained"
          style={[styles.actionButton, { backgroundColor: '#3B82F6' }]}
          onPress={() => navigation.navigate('Camera')}
        >
          التقاط صورة
        </Button>
        <Button
          mode="contained"
          style={[styles.actionButton, { backgroundColor: '#10B981' }]}
          onPress={() => navigation.navigate('Documents')}
        >
          رفع مستند
        </Button>
      </View>
      <View style={styles.actionsRow}>
        <Button
          mode="outlined"
          style={styles.actionButton}
          onPress={() => navigation.navigate('Reports')}
        >
          عرض التقارير
        </Button>
        <Button
          mode="outlined"
          style={styles.actionButton}
          onPress={() => navigation.navigate('Standards')}
        >
          المعايير
        </Button>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text>جاري التحميل...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {renderScoreCard()}
      {renderAxesCards()}
      {renderQuickActions()}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scoreCard: {
    margin: 16,
    elevation: 4,
  },
  scoreTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  scoreValue: {
    fontSize: 36,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#3B82F6',
    marginBottom: 16,
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
    marginBottom: 8,
  },
  scoreSubtitle: {
    textAlign: 'center',
    color: '#666',
  },
  axesContainer: {
    margin: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#333',
  },
  axisCard: {
    backgroundColor: '#fff',
    padding: 16,
    marginBottom: 12,
    borderRadius: 8,
    elevation: 2,
  },
  axisHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  axisName: {
    fontSize: 16,
    fontWeight: 'bold',
    flex: 1,
  },
  axisOrder: {
    fontSize: 12,
    color: '#666',
  },
  axisProgressBar: {
    height: 6,
    borderRadius: 3,
  },
  actionsContainer: {
    margin: 16,
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  actionButton: {
    flex: 1,
    marginHorizontal: 4,
  },
});
`;

// ===== Context للمصادقة =====

const authContextCode = `
import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../database/supabase';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // التحقق من الجلسة الحالية
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // الاستماع لتغيرات المصادقة
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email, password, metadata) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: metadata }
    });
    return { data, error };
  };

  const signIn = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    return { data, error };
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    return { error };
  };

  const value = {
    user,
    loading,
    signUp,
    signIn,
    signOut,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
`;

export {
  mobilePackageJson,
  mobileAppCode,
  dashboardScreenCode,
  authContextCode
};
