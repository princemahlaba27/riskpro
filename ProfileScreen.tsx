import { useEffect, useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import Constants from 'expo-constants';
import { getOperatorName, getOrCreateDeviceId, setOperatorName } from './db';
import { colors } from './theme';
import { Field, Label, MutedText, ScreenScroll } from './ui';

const APP_VERSION = Constants.expoConfig?.version ?? '1.0.0';

export function ProfileScreen() {
  const [deviceId, setDeviceId] = useState('');
  const [operator, setOperator] = useState('');

  useEffect(() => {
    let alive = true;
    void (async () => {
      const [id, name] = await Promise.all([getOrCreateDeviceId(), getOperatorName()]);
      if (!alive) {
        return;
      }
      setDeviceId(id);
      setOperator(name);
    })();
    return () => {
      alive = false;
    };
  }, []);

  const onChangeOperator = (value: string) => {
    setOperator(value);
    void setOperatorName(value);
  };

  return (
    <ScreenScroll>
      <Text style={styles.title}>Profile</Text>
      <MutedText>This name is the greeting on the dashboard. There is no login in the pilot.</MutedText>
      <Label>OPERATOR NAME</Label>
      <Field
        value={operator}
        onChangeText={onChangeOperator}
        placeholder="Operator"
        autoCapitalize="words"
      />
      <Label>APP VERSION</Label>
      <Text style={styles.value}>{APP_VERSION}</Text>
      <Label>DEVICE ID</Label>
      <Text selectable style={styles.value}>
        {deviceId || 'Creating device id…'}
      </Text>
    </ScreenScroll>
  );
}

const styles = StyleSheet.create({
  title: {
    color: colors.text,
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 8,
  },
  value: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
  },
});
