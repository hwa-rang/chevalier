import type { NativeStackScreenProps } from '@react-navigation/native-stack';

export type RootStackParamList = {
  MainMenu: undefined;
  CharacterCreation: undefined;
  Intro: undefined;
  Game: undefined;
  Shop: undefined;
  Inventory: undefined;
  Relations: undefined;
  RelationDetail: { personId: string };
  Character: undefined;
  TournamentList: undefined;
  Tournament: { tournamentId: string };
  VillageMap: undefined;
  EuropeMap: undefined;
};

export type MainMenuScreenProps = NativeStackScreenProps<RootStackParamList, 'MainMenu'>;
export type CharacterCreationScreenProps = NativeStackScreenProps<RootStackParamList, 'CharacterCreation'>;
export type GameScreenProps = NativeStackScreenProps<RootStackParamList, 'Game'>;
export type ShopScreenProps = NativeStackScreenProps<RootStackParamList, 'Shop'>;
export type InventoryScreenProps = NativeStackScreenProps<RootStackParamList, 'Inventory'>;
export type RelationsScreenProps = NativeStackScreenProps<RootStackParamList, 'Relations'>;
export type RelationDetailScreenProps = NativeStackScreenProps<RootStackParamList, 'RelationDetail'>;
export type CharacterScreenProps = NativeStackScreenProps<RootStackParamList, 'Character'>;
export type TournamentListScreenProps = NativeStackScreenProps<RootStackParamList, 'TournamentList'>;
export type TournamentScreenProps = NativeStackScreenProps<RootStackParamList, 'Tournament'>;
export type VillageMapScreenProps = NativeStackScreenProps<RootStackParamList, 'VillageMap'>;
export type EuropeMapScreenProps = NativeStackScreenProps<RootStackParamList, 'EuropeMap'>;
