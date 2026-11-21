import React, { useCallback, useEffect, useState } from 'react';
import { BackHandler, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { DEFAULT_SETTINGS, loadSettings, saveSettings, type Lang, type Settings } from './src/services/storage';
import type { CallScript } from './src/data/scripts';
import { HomeScreen } from './src/screens/HomeScreen';
import { LiveScreen } from './src/screens/LiveScreen';
import { AwarenessScreen } from './src/screens/AwarenessScreen';
import { SettingsScreen } from './src/screens/SettingsScreen';
import { RecoveryScreen } from './src/screens/RecoveryScreen';
import { IncidentsScreen } from './src/screens/IncidentsScreen';
import { PrivacyScreen } from './src/screens/PrivacyScreen';
import { CheckScreen } from './src/screens/CheckScreen';
import { BusinessScreen } from './src/screens/BusinessScreen';
import { PlansScreen } from './src/screens/PlansScreen';
import { C } from './src/ui/theme';

type Route =
  | { name: 'home' }
  | { name: 'live'; script?: CallScript }
  | { name: 'awareness' }
  | { name: 'demo' }
  | { name: 'settings' }
  | { name: 'recovery' }
  | { name: 'incidents'; openId?: string }
  | { name: 'privacy' }
  | { name: 'check' }
  | { name: 'business' }
  | { name: 'plans' };

export default function App() {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [ready, setReady] = useState(false);
  const [route, setRoute] = useState<Route>({ name: 'home' });

  useEffect(() => {
    loadSettings().then((s) => {
      setSettings(s);
      setReady(true);
    });
  }, []);

  const update = useCallback((s: Settings) => {
    setSettings(s);
    saveSettings(s);
  }, []);

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (route.name === 'home') return false;
      setRoute({ name: 'home' });
      return true;
    });
    return () => sub.remove();
  }, [route]);

  if (!ready) return <View style={{ flex: 1, backgroundColor: C.bg }} />;
  const home = () => setRoute({ name: 'home' });

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <StatusBar style="light" />
      {route.name === 'home' && (
        <HomeScreen
          settings={settings}
          onLang={(l: Lang) => update({ ...settings, lang: l })}
          go={(s) => setRoute(s === 'incidents' ? { name: 'incidents' } : ({ name: s } as Route))}
        />
      )}
      {route.name === 'live' && <LiveScreen settings={settings} script={route.script} onBack={home} onRecovery={() => setRoute({ name: 'recovery' })} />}
      {(route.name === 'awareness' || route.name === 'demo') && (
        <AwarenessScreen lang={settings.lang} demoOnly={route.name === 'demo'} onBack={home} onPick={(script) => setRoute({ name: 'live', script })} />
      )}
      {route.name === 'settings' && <SettingsScreen settings={settings} onChange={update} onBack={home} />}
      {route.name === 'recovery' && <RecoveryScreen settings={settings} onBack={home} onOpenIncident={(id) => setRoute({ name: 'incidents', openId: id })} />}
      {route.name === 'incidents' && <IncidentsScreen settings={settings} openId={route.openId} onBack={home} onNew={() => setRoute({ name: 'recovery' })} />}
      {route.name === 'check' && <CheckScreen settings={settings} onBack={home} onRecovery={() => setRoute({ name: 'recovery' })} />}
      {route.name === 'plans' && <PlansScreen settings={settings} onChange={update} onBack={home} />}
      {route.name === 'business' && <BusinessScreen settings={settings} onBack={home} />}
      {route.name === 'privacy' && <PrivacyScreen settings={settings} onChange={update} onBack={home} onWiped={() => setSettings(DEFAULT_SETTINGS)} />}
    </View>
  );
}
