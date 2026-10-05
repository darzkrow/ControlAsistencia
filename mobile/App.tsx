import React from 'react';
import { StyleSheet, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { THEME } from './src/config/constants';
import { MainKioskScreen } from './src/screens/MainKioskScreen';

export default function App() {
  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.safeArea}>
        <StatusBar style="light" backgroundColor={THEME.colors.card} />
        <View style={styles.root}>
          <MainKioskScreen />
        </View>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: THEME.colors.background,
  },
  root: {
    flex: 1,
    backgroundColor: THEME.colors.background,
  },
});
