import { useRef } from 'react';
import { Alert, Modal, StyleSheet, Text, View } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import SignatureCanvas, { type SignatureViewRef } from 'react-native-signature-canvas';
import { ActionButton, ScreenScroll } from './ui';
import { colors } from './theme';

const SIGNATURE_WEB_STYLE = `
  .m-signature-pad { box-shadow: none; border: none; margin: 0; }
  .m-signature-pad--body { border: none; box-shadow: none; }
  .m-signature-pad--footer { display: none; margin: 0; height: 0; }
  body, html { background: #FFFFFF; margin: 0; }
`;

function errorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

export async function saveSignatureFile(payload: string): Promise<string> {
  const comma = payload.indexOf(',');
  const encoded = comma >= 0 ? payload.slice(comma + 1) : payload;
  const directory = FileSystem.documentDirectory;
  if (!directory) {
    throw new Error('Document directory unavailable');
  }
  const path = `${directory}signature-${Date.now()}.png`;
  await FileSystem.writeAsStringAsync(path, encoded, {
    encoding: FileSystem.EncodingType.Base64,
  });
  return path;
}

export function SignaturePadModal({
  visible,
  title,
  onClose,
  onSaved,
}: {
  visible: boolean;
  title: string;
  onClose: () => void;
  onSaved: (uri: string) => void;
}) {
  const signatureRef = useRef<SignatureViewRef>(null);

  const onSignature = async (payload: string) => {
    try {
      const path = await saveSignatureFile(payload);
      onSaved(path);
    } catch (error) {
      Alert.alert('Signature was not saved', errorMessage(error));
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
      <View style={styles.screen}>
        <ScreenScroll
          footer={
            <>
              <ActionButton
                flex
                tone="secondary"
                icon="x"
                label="CLEAR"
                onPress={() => signatureRef.current?.clearSignature()}
              />
              <ActionButton
                flex
                icon="check"
                label="SAVE SIGNATURE"
                onPress={() => signatureRef.current?.readSignature()}
              />
            </>
          }
        >
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.hint}>Sign in the white box. Use CLEAR to start again.</Text>
          <View style={styles.card}>
            <SignatureCanvas
              ref={signatureRef}
              onOK={(payload) => {
                void onSignature(payload);
              }}
              onEmpty={() => {
                Alert.alert('Signature is empty');
              }}
              descriptionText=""
              webStyle={SIGNATURE_WEB_STYLE}
              backgroundColor="#FFFFFF"
              penColor="#121212"
              autoClear={false}
              style={styles.canvas}
            />
          </View>
          <ActionButton tone="secondary" icon="arrow-left" label="CLOSE" onPress={onClose} />
        </ScreenScroll>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  title: {
    color: colors.text,
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 8,
  },
  hint: {
    color: colors.muted,
    fontSize: 14,
    marginBottom: 16,
  },
  card: {
    height: 320,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 16,
  },
  canvas: {
    flex: 1,
    width: '100%',
    height: 320,
    backgroundColor: '#FFFFFF',
  },
});
