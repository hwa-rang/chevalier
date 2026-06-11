import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import { Colors } from '../theme/colors';
import { Fonts } from '../theme/fonts';

interface Props {
  visible: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export default function BottomSheet({ visible, onClose, title, children }: Props) {
  const { height } = useWindowDimensions();
  // Real height via the hook (module-level Dimensions is unreliable at startup).
  const sheetH = Math.max(320, Math.round(height * 0.5));

  const [modalVisible, setModalVisible] = useState(false);
  const translateY = useRef(new Animated.Value(sheetH)).current;

  useEffect(() => {
    if (visible) {
      setModalVisible(true);
      translateY.setValue(sheetH);
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        tension: 60,
        friction: 11,
      }).start();
    } else {
      Animated.spring(translateY, {
        toValue: sheetH,
        useNativeDriver: true,
        tension: 70,
        friction: 12,
      }).start(({ finished }) => {
        if (finished) setModalVisible(false);
      });
    }
  }, [visible]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!modalVisible) return null;

  return (
    <Modal
      transparent
      animationType="none"
      visible={modalVisible}
      onRequestClose={onClose}
      statusBarTranslucent
    >
      {/* Dark backdrop */}
      <TouchableOpacity style={styles.backdrop} onPress={onClose} activeOpacity={1} />

      {/* Sheet */}
      <Animated.View style={[styles.sheet, { height: sheetH, transform: [{ translateY }] }]}>
        {/* Pill handle */}
        <View style={styles.handle} />

        {/* Header */}
        <Text style={styles.title}>{title}</Text>

        {/* Content */}
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {children}
        </ScrollView>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.52)',
  },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: Colors.parchment,
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
    borderTopWidth: 2,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: Colors.border,
    paddingTop: 10,
    paddingHorizontal: 16,
    paddingBottom: 28,
  },
  handle: {
    width: 44,
    height: 4,
    backgroundColor: Colors.border,
    borderRadius: 0,
    alignSelf: 'center',
    marginBottom: 10,
  },
  title: {
    fontFamily: Fonts.title,
    fontSize: 21,
    color: Colors.textPrimary,
    textAlign: 'center',
    marginBottom: 12,
  },
  scrollContent: {
    paddingBottom: 8,
  },
});
