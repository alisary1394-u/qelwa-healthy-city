
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
