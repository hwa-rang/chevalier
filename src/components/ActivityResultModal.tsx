import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Colors } from '../theme/colors';
import { Fonts } from '../theme/fonts';
import type { ChangeLine } from '../utils/statLabels';

interface Props {
  visible: boolean;
  title: string;
  lines: ChangeLine[];
  /** Optional flavour note shown below the stat list. */
  note?: string;
  onClose: () => void;
}

export default function ActivityResultModal({
  visible,
  title,
  lines,
  note,
  onClose,
}: Props) {
  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.title}>{title}</Text>

          {lines.length === 0 && !note ? (
            <Text style={styles.empty}>Rien de notable ne s'est produit.</Text>
          ) : null}

          {lines.length > 0 ? (
            <View style={styles.list}>
              {lines.map((l, i) => (
                <View key={`${l.label}-${i}`} style={styles.row}>
                  <Text style={styles.rowLabel}>{l.label}</Text>
                  <Text
                    style={[
                      styles.rowValue,
                      l.value >= 0 ? styles.valuePos : styles.valueNeg,
                    ]}
                  >
                    {l.value > 0 ? `+${l.value}` : l.value}
                  </Text>
                </View>
              ))}
            </View>
          ) : null}

          {note ? <Text style={styles.note}>{note}</Text> : null}

          <TouchableOpacity style={styles.btn} onPress={onClose} activeOpacity={0.85}>
            <Text style={styles.btnText}>Continuer</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  card: {
    width: '100%',
    backgroundColor: Colors.parchment,
    borderRadius: 0,
    borderWidth: 2,
    borderColor: Colors.border,
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 16,
  },
  title: {
    fontFamily: Fonts.title,
    fontSize: 22,
    color: Colors.textPrimary,
    textAlign: 'center',
    marginBottom: 14,
  },
  empty: {
    fontFamily: Fonts.body,
    fontSize: 14,
    fontStyle: 'italic',
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: 14,
  },
  list: {
    gap: 6,
    marginBottom: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surface,
    borderRadius: 0,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  rowLabel: {
    fontFamily: Fonts.body,
    fontSize: 14,
    color: Colors.textPrimary,
  },
  rowValue: {
    fontFamily: Fonts.bodyBold,
    fontSize: 15,
    fontWeight: '700',
  },
  valuePos: { color: '#5A8A3A' },
  valueNeg: { color: '#9A3A2A' },
  note: {
    fontFamily: Fonts.body,
    fontSize: 13,
    fontStyle: 'italic',
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 4,
    lineHeight: 18,
  },
  btn: {
    backgroundColor: Colors.buttonBg,
    borderRadius: 0,
    paddingVertical: 13,
    alignItems: 'center',
    marginTop: 12,
  },
  btnText: {
    fontFamily: Fonts.bodyBold,
    fontSize: 15,
    fontWeight: '700',
    color: Colors.buttonText,
    letterSpacing: 0.5,
  },
});
