import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import RootNavigator from './src/navigation/RootNavigator';
import EventOverlay from './src/components/EventOverlay';
import TimeTransition from './src/components/TimeTransition';

export default function App() {
  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <RootNavigator />
      <EventOverlay />
      <TimeTransition />
    </SafeAreaProvider>
  );
}
