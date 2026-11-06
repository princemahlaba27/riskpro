import { useState, type ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  type StyleProp,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, layout } from './theme';

type IconName = React.ComponentProps<typeof Feather>['name'];

export function ScreenScroll({
  children,
  footer,
  extraBottom = 0,
}: {
  children: ReactNode;
  footer?: ReactNode;
  extraBottom?: number;
}) {
  const insets = useSafeAreaInsets();
  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        style={styles.scroll}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: insets.top || layout.screenPadding,
            paddingBottom: footer ? layout.screenPadding : (insets.bottom || layout.screenPadding) + extraBottom,
          },
        ]}
      >
        <View style={styles.column}>{children}</View>
      </ScrollView>
      {footer ? (
        <View style={[styles.footer, { paddingBottom: insets.bottom || layout.screenPadding }]}>
          <View style={styles.footerRow}>{footer}</View>
        </View>
      ) : null}
    </KeyboardAvoidingView>
  );
}

export function Field({
  value,
  onChangeText,
  placeholder,
  multiline = false,
  autoCapitalize = 'sentences',
}: {
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  multiline?: boolean;
  autoCapitalize?: TextInputProps['autoCapitalize'];
}) {
  const [focused, setFocused] = useState(false);
  return (
    <TextInput
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={colors.placeholder}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      multiline={multiline}
      autoCorrect={false}
      autoCapitalize={autoCapitalize}
      autoComplete="off"
      underlineColorAndroid="transparent"
      selectionColor={colors.orange}
      cursorColor={colors.orange}
      style={[styles.input, multiline ? styles.inputTall : null, focused ? styles.inputFocused : null]}
    />
  );
}

export function Label({ children }: { children: string }) {
  return <Text style={styles.label}>{children}</Text>;
}

export function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{title}</Text>
      <View style={styles.cardBody}>{children}</View>
    </View>
  );
}

export function ActionButton({
  label,
  icon,
  onPress,
  disabled = false,
  tone = 'primary',
  flex = false,
}: {
  label: string;
  icon: IconName;
  onPress: () => void;
  disabled?: boolean;
  tone?: 'primary' | 'secondary';
  flex?: boolean;
}) {
  return (
    <TouchableOpacity
      style={[
        styles.action,
        flex ? styles.actionFlex : null,
        tone === 'secondary' ? styles.actionSecondary : styles.actionPrimary,
        disabled ? styles.actionDisabled : null,
      ]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.85}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
    >
      <Feather name={icon} size={20} color={colors.text} />
      <Text style={styles.actionText}>{label}</Text>
    </TouchableOpacity>
  );
}

export function ChoiceButton({
  label,
  selected,
  onPress,
  style,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <TouchableOpacity
      style={[styles.choice, selected ? styles.choiceOn : styles.choiceOff, style]}
      onPress={onPress}
      activeOpacity={0.85}
      accessibilityRole="button"
      accessibilityState={{ selected }}
    >
      <Text style={styles.choiceText}>{label}</Text>
    </TouchableOpacity>
  );
}

export function StatusPill({ status }: { status: 'DRAFT' | 'READY' | 'SYNCED' }) {
  const label = status === 'SYNCED' ? 'Submitted' : status === 'READY' ? 'Ready' : 'Draft';
  return (
    <View
      style={[
        styles.pill,
        status === 'SYNCED' ? styles.pillSynced : null,
        status === 'READY' ? styles.pillReady : null,
        status === 'DRAFT' ? styles.pillDraft : null,
      ]}
    >
      <Text style={styles.pillText}>{label}</Text>
    </View>
  );
}

export function BodyText({ children }: { children: string }) {
  return <Text style={styles.body}>{children}</Text>;
}

export function MutedText({ children }: { children: string }) {
  return <Text style={styles.muted}>{children}</Text>;
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scroll: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: layout.screenPadding,
  },
  column: {
    width: '100%',
    maxWidth: layout.contentMaxWidth,
    alignSelf: 'center',
  },
  footer: {
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingHorizontal: layout.screenPadding,
    paddingTop: 12,
  },
  footerRow: {
    width: '100%',
    maxWidth: layout.contentMaxWidth,
    alignSelf: 'center',
    flexDirection: 'row',
    gap: 12,
  },
  input: {
    minHeight: layout.inputHeight,
    backgroundColor: colors.input,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    borderRadius: 8,
    color: colors.text,
    fontSize: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  inputTall: {
    minHeight: 120,
    textAlignVertical: 'top',
  },
  inputFocused: {
    borderColor: colors.orange,
  },
  label: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.4,
    marginTop: 16,
    marginBottom: 8,
  },
  card: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: layout.cardPadding,
    marginBottom: layout.cardGap,
  },
  cardTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 10,
  },
  cardBody: {
    gap: 10,
  },
  action: {
    height: layout.actionHeight,
    minHeight: layout.actionHeight,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
  },
  actionFlex: {
    flex: 1,
  },
  actionPrimary: {
    backgroundColor: colors.orange,
  },
  actionSecondary: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  actionDisabled: {
    backgroundColor: '#2A2A2A',
    borderColor: '#2A2A2A',
  },
  actionText: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'center',
    includeFontPadding: false,
  },
  choice: {
    minHeight: layout.actionHeight,
    minWidth: 64,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  choiceOn: {
    backgroundColor: colors.orange,
  },
  choiceOff: {
    backgroundColor: colors.input,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    borderRadius: 8,
  },
  choiceText: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'center',
    includeFontPadding: false,
  },
  pill: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
  },
  pillDraft: {
    borderColor: colors.orange,
    backgroundColor: 'transparent',
  },
  pillReady: {
    borderColor: colors.orange,
    backgroundColor: colors.orange,
  },
  pillSynced: {
    borderColor: colors.green,
    backgroundColor: '#14532D',
  },
  pillText: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '700',
    includeFontPadding: false,
  },
  body: {
    color: colors.text,
    fontSize: 15,
    lineHeight: 22,
  },
  muted: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 20,
  },
});
