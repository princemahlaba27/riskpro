import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, BackHandler, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Feather, Ionicons } from '@expo/vector-icons';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator, type BottomTabBarButtonProps } from '@react-navigation/bottom-tabs';
import {
  createNativeStackNavigator,
  type NativeStackNavigationProp,
  type NativeStackScreenProps,
} from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { AssessmentReviewScreen } from './AssessmentReview';
import { DashboardScreen } from './DashboardScreen';
import { initDatabase } from './db';
import type { RootStackParamList, TabParamList } from './navigation';
import { ProfileScreen } from './ProfileScreen';
import { RecordsScreen } from './RecordsScreen';
import { startSyncEngine } from './SyncEngine';
import { SubmitScreen } from './SubmitScreen';
import { colors } from './theme';
import { useAssessmentStore } from './useAssessmentStore';
import { WizardContainer } from './WizardContainer';

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<TabParamList>();

const TAB_ICONS = {
  Dashboard: 'grid',
  Records: 'file-text',
  New: 'plus-circle',
  Submit: 'upload-cloud',
  Profile: 'user',
} as const;

function NewTab() {
  return null;
}

function NewTabButton({ children, href, style, ...props }: BottomTabBarButtonProps) {
  return (
    <TouchableOpacity
      {...props}
      accessibilityRole="button"
      style={[style, styles.newTabButton]}
    >
      <View style={styles.newTabFace}>
        <Ionicons name="add" size={32} color="#FFF" />
      </View>
    </TouchableOpacity>
  );
}

function MainTabs() {
  const insets = useSafeAreaInsets();
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.orange,
        tabBarInactiveTintColor: '#8A8A8A',
        tabBarStyle: {
          backgroundColor: '#161616',
          borderTopColor: '#282828',
          height: 72 + insets.bottom,
          paddingBottom: 10 + insets.bottom,
          paddingTop: 8,
          overflow: 'visible',
        },
        tabBarIcon: ({ color, size }) => (
          <Feather name={TAB_ICONS[route.name]} color={color} size={size} />
        ),
      })}
    >
      <Tab.Screen name="Dashboard" component={DashboardScreen} />
      <Tab.Screen name="Records" component={RecordsScreen} />
      <Tab.Screen
        name="New"
        component={NewTab}
        options={{ tabBarButton: (props) => <NewTabButton {...props} /> }}
        listeners={({ navigation }) => ({
          tabPress: (e) => {
            e.preventDefault();
            navigation.getParent<NativeStackNavigationProp<RootStackParamList>>()?.navigate('WizardModal');
          },
        })}
      />
      <Tab.Screen name="Submit" component={SubmitScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

function WizardModalScreen({ navigation }: NativeStackScreenProps<RootStackParamList, 'WizardModal'>) {
  const allowLeave = useRef(false);

  const leaveQuietly = () => {
    allowLeave.current = true;
    navigation.goBack();
  };

  const confirmDiscard = () => {
    if (allowLeave.current) {
      return;
    }
    Alert.alert('Discard changes?', 'Unsaved progress in this step will be lost.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Discard',
        style: 'destructive',
        onPress: () => {
          useAssessmentStore.getState().reset();
          leaveQuietly();
        },
      },
    ]);
  };

  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (allowLeave.current) {
        return false;
      }
      confirmDiscard();
      return true;
    });
    return () => subscription.remove();
  }, [navigation]);

  return <WizardContainer onDraftSaved={leaveQuietly} onRequestDiscard={confirmDiscard} />;
}

export default function App() {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let stop = () => {};
    let alive = true;
    initDatabase()
      .then(() => {
        if (!alive) {
          return;
        }
        stop = startSyncEngine();
        setReady(true);
      })
      .catch((initError: unknown) => {
        if (!alive) {
          return;
        }
        setError(initError instanceof Error ? initError.message : String(initError));
      });
    return () => {
      alive = false;
      stop();
    };
  }, []);

  if (!ready) {
    return (
      <View style={styles.loading}>
        <StatusBar style="light" />
        <ActivityIndicator size="large" color={colors.orange} />
        {error ? <Text style={styles.error}>{error}</Text> : null}
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <NavigationContainer>
        <Stack.Navigator
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: colors.background },
          }}
        >
          <Stack.Screen name="MainTabs" component={MainTabs} />
          <Stack.Screen
            name="WizardModal"
            component={WizardModalScreen}
            options={{ presentation: 'fullScreenModal', gestureEnabled: false }}
          />
          <Stack.Screen
            name="AssessmentReview"
            component={AssessmentReviewScreen}
            options={{ presentation: 'fullScreenModal' }}
          />
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  error: {
    color: colors.text,
    marginTop: 16,
    textAlign: 'center',
  },
  newTabButton: {
    top: -20,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#FF5E00',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 6,
  },
  newTabFace: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FF5E00',
    borderWidth: 3,
    borderColor: '#121212',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
