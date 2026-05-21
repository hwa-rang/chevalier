import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { RootStackParamList } from './types';
import MainMenuScreen from '../screens/MainMenuScreen';
import CharacterCreationScreen from '../screens/CharacterCreationScreen';
import GameScreen from '../screens/GameScreen';
import ShopScreen from '../screens/ShopScreen';
import InventoryScreen from '../screens/InventoryScreen';
import RelationsScreen from '../screens/RelationsScreen';
import RelationDetailScreen from '../screens/RelationDetailScreen';
import CharacterScreen from '../screens/CharacterScreen';
import TournamentListScreen from '../screens/TournamentListScreen';
import TournamentScreen from '../screens/TournamentScreen';
import VillageMapScreen from '../screens/VillageMapScreen';
import EuropeMapScreen from '../screens/EuropeMapScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
        <Stack.Screen name="MainMenu" component={MainMenuScreen} />
        <Stack.Screen name="CharacterCreation" component={CharacterCreationScreen} />
        <Stack.Screen name="Game" component={GameScreen} />
        <Stack.Screen name="Shop" component={ShopScreen} />
        <Stack.Screen name="Inventory" component={InventoryScreen} />
        <Stack.Screen name="Relations" component={RelationsScreen} />
        <Stack.Screen name="RelationDetail" component={RelationDetailScreen} />
        <Stack.Screen name="Character" component={CharacterScreen} />
        <Stack.Screen name="TournamentList" component={TournamentListScreen} />
        <Stack.Screen name="Tournament" component={TournamentScreen} />
        <Stack.Screen name="VillageMap" component={VillageMapScreen} />
        <Stack.Screen name="EuropeMap" component={EuropeMapScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
