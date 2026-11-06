import { useEffect, useRef, useState } from 'react';
import { Alert, Image, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as FileSystem from 'expo-file-system/legacy';
import * as ImageManipulator from 'expo-image-manipulator';
import { CLASS_ACTIONS } from './content';
import { colors, layout } from './theme';
import { ActionButton, ChoiceButton, Field, Label, MutedText } from './ui';
import { useAssessmentStore, type SeverityClass } from './useAssessmentStore';

const CLASSES: SeverityClass[] = ['A', 'B', 'C'];
const MAX_PHOTOS = 3;

function errorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

async function storeCompressedPhoto(uri: string): Promise<string> {
  const probed = await ImageManipulator.manipulateAsync(uri, [], {
    compress: 1,
    format: ImageManipulator.SaveFormat.JPEG,
  });
  const actions = probed.width > 1024 ? [{ resize: { width: 1024 } }] : [];
  const saved = await ImageManipulator.manipulateAsync(probed.uri, actions, {
    compress: 0.6,
    format: ImageManipulator.SaveFormat.JPEG,
  });
  const directory = FileSystem.documentDirectory;
  if (!directory) {
    throw new Error('Document directory unavailable');
  }
  const destination = `${directory}hazard-${Date.now()}.jpg`;
  await FileSystem.copyAsync({ from: saved.uri, to: destination });
  return destination;
}

export function Step4Classify() {
  const hazards = useAssessmentStore((state) => state.classified_hazards);
  const setHazardSeverity = useAssessmentStore((state) => state.setHazardSeverity);
  const setHazardDescription = useAssessmentStore((state) => state.setHazardDescription);
  const setHazardControls = useAssessmentStore((state) => state.setHazardControls);
  const addHazardPhoto = useAssessmentStore((state) => state.addHazardPhoto);
  const removeHazardPhoto = useAssessmentStore((state) => state.removeHazardPhoto);
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);
  const [index, setIndex] = useState(0);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [alertMessage, setAlertMessage] = useState<string | null>(null);
  const [capturing, setCapturing] = useState(false);

  useEffect(() => {
    if (hazards.length === 0) {
      setIndex(0);
      return;
    }
    if (index > hazards.length - 1) {
      setIndex(hazards.length - 1);
    }
  }, [hazards.length, index]);

  if (hazards.length === 0) {
    return (
      <View>
        <MutedText>No hazards selected. Go back and mark the energies that apply, or continue if none apply.</MutedText>
      </View>
    );
  }

  const safeIndex = Math.min(index, hazards.length - 1);
  const hazard = hazards[safeIndex];
  if (!hazard) {
    return null;
  }
  const previousDisabled = safeIndex <= 0;
  const nextDisabled = safeIndex >= hazards.length - 1;
  const photoLimitReached = hazard.photo_uris.length >= MAX_PHOTOS;

  const onSelectSeverity = (severity: SeverityClass) => {
    setHazardSeverity(hazard.name, severity);
    if (severity === 'A') {
      Alert.alert(
        'Stop & Fix Immediately',
        'Class A is fatal or permanent harm. Acknowledge this before the task continues.',
        [{ text: 'Acknowledge' }],
      );
    }
  };

  const onTakePhoto = async () => {
    if (photoLimitReached) {
      setAlertMessage('Three photos is the maximum for this hazard.');
      return;
    }
    try {
      const current = permission?.granted ? permission : await requestPermission();
      if (!current.granted) {
        setAlertMessage('Camera permission denied');
        return;
      }
      setCameraOpen(true);
    } catch (error) {
      setAlertMessage(errorMessage(error));
    }
  };

  const onCapture = async () => {
    if (capturing) {
      return;
    }
    setCapturing(true);
    try {
      const picture = await cameraRef.current?.takePictureAsync({ base64: false, quality: 1 });
      if (!picture?.uri) {
        throw new Error('Camera did not return a photo');
      }
      const storedUri = await storeCompressedPhoto(picture.uri);
      addHazardPhoto(hazard.name, storedUri);
      setCameraOpen(false);
    } catch (error) {
      setAlertMessage(errorMessage(error));
      setCameraOpen(false);
    } finally {
      setCapturing(false);
    }
  };

  return (
    <View>
      <Text style={styles.counter}>{`Hazard ${safeIndex + 1} of ${hazards.length}`}</Text>
      <Text style={styles.hazardName}>{hazard.name}</Text>
      <View style={styles.navRow}>
        <ActionButton
          flex
          tone="secondary"
          icon="arrow-left"
          label="PREV"
          disabled={previousDisabled}
          onPress={() => {
            if (!previousDisabled) {
              setIndex(safeIndex - 1);
            }
          }}
        />
        <ActionButton
          flex
          tone="secondary"
          icon="arrow-right"
          label="NEXT"
          disabled={nextDisabled}
          onPress={() => {
            if (!nextDisabled) {
              setIndex(safeIndex + 1);
            }
          }}
        />
      </View>

      <Label>SEVERITY</Label>
      <View style={styles.classRow}>
        {CLASSES.map((severity) => (
          <ChoiceButton
            key={severity}
            label={severity}
            selected={hazard.severity_class === severity}
            onPress={() => onSelectSeverity(severity)}
            style={styles.classButton}
          />
        ))}
      </View>
      {hazard.severity_class ? (
        <View style={[styles.trigger, hazard.severity_class === 'A' ? styles.triggerA : null]}>
          <Text style={styles.triggerText}>{CLASS_ACTIONS[hazard.severity_class]}</Text>
        </View>
      ) : null}

      <Label>DESCRIPTION</Label>
      <Field
        value={hazard.description}
        onChangeText={(value) => setHazardDescription(hazard.name, value)}
        placeholder="What is the hazard and the consequence"
        multiline
        autoCapitalize="sentences"
      />

      <Label>CONTROLS</Label>
      <Field
        value={hazard.controls}
        onChangeText={(value) => setHazardControls(hazard.name, value)}
        placeholder="Action taken or control applied"
        multiline
        autoCapitalize="sentences"
      />

      <Label>{`PHOTOS ${hazard.photo_uris.length} / ${MAX_PHOTOS}`}</Label>
      <View style={styles.photos}>
        {hazard.photo_uris.map((uri) => (
          <View key={uri} style={styles.thumbWrap}>
            <Image source={{ uri }} style={styles.thumb} />
            <TouchableOpacity
              style={styles.delete}
              onPress={() => removeHazardPhoto(hazard.name, uri)}
              accessibilityRole="button"
              accessibilityLabel="Delete photo"
            >
              <Feather name="x" size={18} color={colors.danger} />
            </TouchableOpacity>
          </View>
        ))}
      </View>
      <ActionButton
        icon="camera"
        label="TAKE PHOTO"
        onPress={() => {
          void onTakePhoto();
        }}
        disabled={photoLimitReached}
      />
      {alertMessage ? <Text style={styles.alert}>{alertMessage}</Text> : null}

      <Modal visible={cameraOpen} animationType="slide" transparent={false} onRequestClose={() => setCameraOpen(false)}>
        <View style={styles.cameraScreen}>
          <CameraView ref={cameraRef} style={styles.camera} facing="back" />
          <ActionButton
            icon="camera"
            label={capturing ? 'SAVING' : 'CAPTURE'}
            disabled={capturing}
            onPress={() => {
              void onCapture();
            }}
          />
          <View style={styles.cameraClose}>
            <ActionButton tone="secondary" icon="x" label="CLOSE" onPress={() => setCameraOpen(false)} />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  counter: {
    color: colors.muted,
    fontSize: 14,
    fontWeight: '700',
    marginTop: 8,
  },
  hazardName: {
    color: colors.text,
    fontSize: 28,
    fontWeight: '700',
    marginTop: 4,
    marginBottom: 12,
  },
  navRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 8,
  },
  classRow: {
    flexDirection: 'row',
    gap: 12,
  },
  classButton: {
    flex: 1,
    height: layout.actionHeight,
  },
  trigger: {
    marginTop: 12,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 14,
  },
  triggerA: {
    backgroundColor: colors.orange,
    borderColor: colors.orange,
  },
  triggerText: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '700',
  },
  photos: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 12,
  },
  thumbWrap: {
    width: 96,
    height: 96,
  },
  thumb: {
    width: 96,
    height: 96,
    borderRadius: 8,
    backgroundColor: colors.input,
  },
  delete: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#121212',
    alignItems: 'center',
    justifyContent: 'center',
  },
  alert: {
    color: colors.orange,
    marginTop: 12,
    fontWeight: '700',
  },
  cameraScreen: {
    flex: 1,
    backgroundColor: colors.background,
    padding: 16,
    gap: 12,
  },
  camera: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  cameraClose: {
    marginBottom: 8,
  },
});
