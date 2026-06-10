import { View, ActivityIndicator } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';
import { Jacquard12_400Regular } from '@expo-google-fonts/jacquard-12';
import { NotoSans_400Regular, NotoSans_700Bold } from '@expo-google-fonts/noto-sans';
import RootNavigator from './src/navigation/RootNavigator';
import EventOverlay from './src/components/EventOverlay';
import TimeTransition from './src/components/TimeTransition';
import { Colors } from './src/theme/colors';

export default function App() {
  const [fontsLoaded, fontError] = useFonts({
    Jacquard12_400Regular,
    NotoSans_400Regular,
    NotoSans_700Bold,
  });

  if (!fontsLoaded && !fontError) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.parchment }}>
        <ActivityIndicator color={Colors.accent} />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <RootNavigator />
      <EventOverlay />
      <TimeTransition />
    </SafeAreaProvider>
  );
}
