/**
 * Screen 2: IntentConfirmScreen
 * Shows parsed intent: Service, Location, Time, Confidence %
 * Premium glassmorphic design matching the rest of Asaaniyat.
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView, Animated,
  Modal, Platform, TextInput
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, RADII, SHADOWS, FONTS } from '../theme';
import LiquidGlass from '../components/LiquidGlass';
import DateTimePicker from '@react-native-community/datetimepicker';

const SERVICE_ICON_MAP = {
  electrician: 'flash',
  plumber: 'water',
  'ac repair': 'snow',
  ac: 'snow',
  carpenter: 'hammer',
  painter: 'brush',
  cleaning: 'sparkles',
  handyman: 'construct',
  mechanic: 'car',
  pest: 'bug',
  gardening: 'leaf',
  maid: 'home',
  default: 'build',
};

function getServiceIcon(serviceType = '') {
  const key = serviceType.toLowerCase();
  return Object.entries(SERVICE_ICON_MAP).find(([k]) => key.includes(k))?.[1] || SERVICE_ICON_MAP.default;
}

function formatTimePreference(tp) {
  if (!tp) return 'Earliest available';
  return tp
    .replace(/_/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase())
    .replace(/(\d{3,4})$/, match => {
      const h = match.length === 3 ? `0${match[0]}:${match.slice(1)}` : `${match.slice(0, 2)}:${match.slice(2)}`;
      const [hh, mm] = h.split(':').map(Number);
      const period = hh >= 12 ? 'PM' : 'AM';
      const h12 = hh % 12 || 12;
      return `${h12}:${String(mm).padStart(2, '0')} ${period}`;
    });
}

export default function IntentConfirmScreen({ route, navigation }) {
  const { parsedIntent, fullResult } = route.params;
  const insets = useSafeAreaInsets();
  const slideAnim = useRef(new Animated.Value(40)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.92)).current;

  // ── Editable state ────────────────────────────────────────────────────
  const [editedService, setEditedService] = useState(parsedIntent.service_type || '');
  const [showServiceModal, setShowServiceModal] = useState(false);

  // Build initial Date object from time_preference
  const buildInitialDate = () => {
    const tp = parsedIntent.time_preference;
    if (!tp) return new Date();
    const timeMatch = String(tp).trim().match(/(\d{1,2})(?::(\d{2}))?\s*(AM|PM)?/i);
    if (timeMatch) {
      const hours = Number(timeMatch[1]);
      const minutes = Number(timeMatch[2] || '0');
      const period = (timeMatch[3] || '').toUpperCase();
      let h = hours;
      if (period === 'PM' && hours < 12) h += 12;
      if (period === 'AM' && hours === 12) h = 0;
      const d = new Date();
      d.setHours(h, minutes, 0, 0);
      return d;
    }
    return new Date();
  };

  const [selectedDate, setSelectedDate] = useState(buildInitialDate);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [datePickerMode, setDatePickerMode] = useState('date'); // 'date' or 'time'
  const [userEditedTime, setUserEditedTime] = useState(false);

  const confidence = Math.round((parsedIntent.confidence || 0) * 100);
  const isLowConfidence = confidence < 70;
  const isHighConfidence = confidence >= 85;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 380, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, damping: 18, stiffness: 160, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, damping: 16, stiffness: 140, useNativeDriver: true }),
    ]).start();
  }, []);

  const confidenceColor = isHighConfidence ? COLORS.primary : isLowConfidence ? COLORS.danger : COLORS.warning;

  // Format the edited date nicely
  const formatEditedTime = () => {
    if (!userEditedTime && parsedIntent.time_preference) {
      return formatTimePreference(parsedIntent.time_preference);
    }
    if (!userEditedTime && !parsedIntent.time_preference) {
      return 'Earliest available';
    }
    const opts = { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' };
    return selectedDate.toLocaleDateString('en-PK', opts);
  };

  // Open date picker — first pick date, then time
  const openDatePicker = () => {
    setDatePickerMode('date');
    setShowDatePicker(true);
  };

  const onDateTimeChange = (event, date) => {
    if (event.type === 'dismissed') {
      setShowDatePicker(false);
      return;
    }
    if (date) {
      setSelectedDate(date);
      setUserEditedTime(true);
    }
    if (Platform.OS === 'android') {
      if (datePickerMode === 'date') {
        // After picking date, switch to time
        setDatePickerMode('time');
      } else {
        setShowDatePicker(false);
      }
    }
  };

  // Build updated fullResult with edits applied
  const getUpdatedResult = () => {
    const updatedIntent = {
      ...fullResult.parsed_intent,
      service_type: editedService || parsedIntent.service_type,
    };
    if (userEditedTime) {
      updatedIntent.time_preference = selectedDate.toISOString();
    }
    return {
      ...fullResult,
      parsed_intent: updatedIntent,
    };
  };

  const rows = [
    {
      icon: getServiceIcon(editedService || parsedIntent.service_type),
      label: 'SERVICE REQUESTED',
      value: editedService || parsedIntent.service_type || null,
      missing: 'Could not detect service',
      success: !!(editedService || parsedIntent.service_type),
      editable: 'service',
    },
    {
      icon: 'location',
      label: 'LOCATION',
      value: parsedIntent.location || null,
      missing: 'Using GPS / city selection',
      success: true,
      soft: !parsedIntent.location,
    },
    {
      icon: 'time',
      label: 'PREFERRED TIME',
      value: formatEditedTime(),
      missing: 'Earliest available',
      success: true,
      soft: !parsedIntent.time_preference && !userEditedTime,
      editable: 'time',
    },
    {
      icon: 'language',
      label: 'LANGUAGE DETECTED',
      value: (parsedIntent.language || 'English').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
      success: true,
    },
  ];

  if (parsedIntent.urgency === 'high') {
    rows.push({ icon: 'warning', label: 'URGENCY', value: 'High Priority', success: true, urgent: true });
  }

  return (
    <View style={styles.container}>
      {/* Ambient Background */}
      <View style={styles.ambientTop} />
      <View style={styles.ambientBottom} />

      {/* Header */}
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 16) }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.82}>
          <Ionicons name="chevron-back" size={22} color={COLORS.primary} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.stepLabel}>STEP 2 OF 5</Text>
          <Text style={styles.headerTitle}>Confirm Intent</Text>
        </View>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 120 }]}
        showsVerticalScrollIndicator={false}
        bounces={true}
        overScrollMode="never"
      >
        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }, { scale: scaleAnim }] }}>
          
          {/* AI Parsed Badge */}
          <View style={styles.aiBadgeRow}>
            <View style={styles.aiBadge}>
              <Ionicons name="sparkles" size={12} color={COLORS.primary} style={{ marginRight: 5 }} />
              <Text style={styles.aiBadgeText}>AI Parsed Your Request</Text>
              <Text style={[styles.aiBadgeText, { fontFamily: FONTS.urduCaption.fontFamily, fontSize: 10, marginTop: 2, marginLeft: 6 }]}>
                مصنوعی ذہانت نے آپ کی درخواست کا تجزیہ کیا ہے
              </Text>
            </View>
          </View>

          {/* Main Intent Card */}
          <LiquidGlass style={styles.intentCard} radius={20} strong>
            {rows.map((row, index) => (
              <View key={index}>
                {index > 0 && <View style={styles.rowDivider} />}
                <View style={styles.intentRow}>
                  <View style={[
                    styles.iconCircle,
                    row.urgent && styles.iconCircleUrgent,
                    !row.success && styles.iconCircleMissing,
                  ]}>
                    <Ionicons
                      name={row.icon}
                      size={18}
                      color={row.urgent ? COLORS.danger : row.soft ? COLORS.textMuted : COLORS.primary}
                    />
                  </View>
                  <View style={styles.rowContent}>
                    <Text style={styles.rowLabel}>{row.label}</Text>
                    {/* Inline service editing */}
                    {row.editable === 'service' ? (
                      <Text style={[
                        styles.rowValue,
                        row.soft && styles.rowValueSoft,
                        row.urgent && styles.rowValueUrgent,
                        !row.success && !row.soft && styles.rowValueMissing,
                        (editedService !== parsedIntent.service_type) && styles.rowValueEdited,
                      ]}>
                        {row.value || row.missing}
                      </Text>
                    ) : (
                      <Text style={[
                        styles.rowValue,
                        row.soft && styles.rowValueSoft,
                        row.urgent && styles.rowValueUrgent,
                        !row.success && !row.soft && styles.rowValueMissing,
                        (userEditedTime && row.editable === 'time') && styles.rowValueEdited,
                        (editedService !== parsedIntent.service_type && row.editable === 'service') && styles.rowValueEdited,
                      ]}>
                        {row.value || row.missing}
                      </Text>
                    )}
                  </View>

                  {/* Edit buttons */}
                  {row.editable === 'time' && (
                    <TouchableOpacity
                      style={styles.editIconBtn}
                      onPress={openDatePicker}
                      activeOpacity={0.7}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Ionicons name="calendar-outline" size={18} color={COLORS.primary} />
                    </TouchableOpacity>
                  )}
                  {row.editable === 'service' && (
                    <TouchableOpacity
                      style={styles.editIconBtn}
                      onPress={() => setShowServiceModal(true)}
                      activeOpacity={0.7}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Ionicons name="chevron-down-outline" size={16} color={COLORS.primary} />
                    </TouchableOpacity>
                  )}

                  {!row.editable && (
                    <View style={[styles.statusDot, { backgroundColor: row.success ? COLORS.primary : COLORS.danger }]} />
                  )}
                </View>
              </View>
            ))}
          </LiquidGlass>

          {/* Confidence Panel */}
          <LiquidGlass style={styles.confidenceCard} radius={16}>
            <View style={styles.confidenceRow}>
              <View>
                <Text style={styles.confidenceLabel}>AI CONFIDENCE</Text>
                <Text style={[styles.confidenceValue, { color: confidenceColor }]}>{confidence}%</Text>
              </View>
              <View style={styles.confidenceBarTrack}>
                <View style={[styles.confidenceBarFill, { width: `${confidence}%`, backgroundColor: confidenceColor }]} />
              </View>
            </View>
            {isLowConfidence && (
              <View style={styles.warningRow}>
                <Ionicons name="warning-outline" size={14} color={COLORS.warning} style={{ marginRight: 6 }} />
                <Text style={styles.warningText}>
                  Some details may be incomplete. Review above before continuing.
                </Text>
              </View>
            )}
          </LiquidGlass>

        </Animated.View>
      </ScrollView>

      {/* Sticky Actions */}
      <View style={[styles.stickyActions, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        <TouchableOpacity
          style={styles.confirmButton}
          onPress={() => navigation.navigate('ProviderResults', { fullResult: getUpdatedResult() })}
          activeOpacity={0.84}
        >
          <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
          <View style={{ flexDirection: 'column', alignItems: 'center' }}>
            <Text style={styles.confirmButtonText}>Confirm & Find Providers</Text>
            <Text style={[styles.confirmButtonText, { fontFamily: FONTS.urduCaption.fontFamily, fontSize: 11, marginTop: 2 }]}>
              تصدیق کریں اور فراہم کنندگان تلاش کریں
            </Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.editButton}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <Ionicons name="create-outline" size={16} color={COLORS.primary} style={{ marginRight: 6 }} />
          <View style={{ flexDirection: 'column', alignItems: 'center' }}>
            <Text style={styles.editButtonText}>Edit Request</Text>
            <Text style={[styles.editButtonText, { fontFamily: FONTS.urduCaption.fontFamily, fontSize: 10, marginTop: 0 }]}>
              درخواست میں ترمیم کریں
            </Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* Native DateTimePicker */}
      {showDatePicker && (
        Platform.OS === 'ios' ? (
          <Modal transparent animationType="fade" visible={showDatePicker}>
            <View style={styles.datePickerOverlay}>
              <View style={styles.datePickerSheet}>
                <View style={styles.datePickerHeader}>
                  <View>
                    <Text style={styles.datePickerTitle}>Select Date & Time</Text>
                    <Text style={[styles.datePickerTitle, { fontFamily: FONTS.urduCaption.fontFamily, fontSize: 11, color: COLORS.textMuted, marginTop: -4 }]}>
                      تاریخ اور وقت کا انتخاب کریں
                    </Text>
                  </View>
                  <TouchableOpacity onPress={() => setShowDatePicker(false)} activeOpacity={0.8}>
                    <Text style={styles.datePickerDone}>Done</Text>
                  </TouchableOpacity>
                </View>
                <DateTimePicker
                  value={selectedDate}
                  mode="datetime"
                  display="spinner"
                  minimumDate={new Date()}
                  onChange={(e, date) => {
                    if (date) {
                      setSelectedDate(date);
                      setUserEditedTime(true);
                    }
                  }}
                  style={{ height: 200 }}
                />
              </View>
            </View>
          </Modal>
        ) : (
          <DateTimePicker
            value={selectedDate}
            mode={datePickerMode}
            display="default"
            minimumDate={new Date()}
            onChange={onDateTimeChange}
          />
        )
      )}

      {/* Service Selection Modal */}
      <Modal transparent animationType="slide" visible={showServiceModal}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Select Service Type</Text>
                <Text style={[styles.modalTitle, { fontFamily: FONTS.urduCaption.fontFamily, fontSize: 11, color: COLORS.textMuted, marginTop: -2 }]}>
                  سروس کا انتخاب کریں
                </Text>
              </View>
              <TouchableOpacity onPress={() => setShowServiceModal(false)}>
                <Ionicons name="close" size={24} color={COLORS.textPrimary} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalList} showsVerticalScrollIndicator={false}>
              {Object.keys(SERVICE_ICON_MAP).filter(k => k !== 'default').map(key => (
                <TouchableOpacity
                  key={key}
                  style={styles.modalListItem}
                  onPress={() => {
                    setEditedService(key.charAt(0).toUpperCase() + key.slice(1));
                    setShowServiceModal(false);
                  }}
                >
                  <Ionicons name={SERVICE_ICON_MAP[key]} size={20} color={COLORS.primary} />
                  <Text style={styles.modalListItemText}>
                    {key.charAt(0).toUpperCase() + key.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },

  ambientTop: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    height: '40%',
    backgroundColor: '#EFF6FF',
    opacity: 0.55,
  },
  ambientBottom: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    height: '30%',
    backgroundColor: '#EAF8EF',
    opacity: 0.5,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 10,
    zIndex: 10,
  },
  backBtn: {
    width: 38, height: 38,
    borderRadius: RADII.sm,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.72)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.94)',
    ...SHADOWS.card,
  },
  headerCenter: { alignItems: 'center' },
  stepLabel: {
    color: COLORS.primary,
    fontSize: 10,
    fontFamily: FONTS.heading.fontFamily,
    letterSpacing: 1.2,
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: FONTS.heading.fontFamily,
    color: COLORS.textPrimary,
    letterSpacing: -0.3,
    marginTop: 2,
  },
  headerSpacer: { width: 38, height: 38 },

  content: { paddingHorizontal: 18, paddingTop: 12 },

  aiBadgeRow: { alignItems: 'center', marginBottom: 14 },
  aiBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(14,143,70,0.08)',
    borderRadius: RADII.pill,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: 'rgba(14,143,70,0.12)',
  },
  aiBadgeText: {
    color: COLORS.primary,
    fontSize: 12,
    fontFamily: FONTS.subheading.fontFamily,
    letterSpacing: 0.3,
  },

  intentCard: {
    marginBottom: 14,
    padding: 6,
  },
  intentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    gap: 12,
  },
  rowDivider: {
    height: 1,
    backgroundColor: 'rgba(14,143,70,0.06)',
    marginHorizontal: 14,
  },
  iconCircle: {
    width: 42, height: 42,
    borderRadius: RADII.sm,
    backgroundColor: '#EAF8EF',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  iconCircleUrgent: { backgroundColor: 'rgba(220,38,38,0.08)' },
  iconCircleMissing: { backgroundColor: 'rgba(220,38,38,0.06)' },
  rowContent: { flex: 1 },
  rowLabel: {
    color: COLORS.textMuted,
    fontSize: 10,
    fontFamily: FONTS.heading.fontFamily,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  rowValue: {
    color: COLORS.textPrimary,
    fontSize: 16,
    fontFamily: FONTS.subheading.fontFamily,
    marginTop: 3,
    lineHeight: 22,
  },
  rowValueSoft: { color: COLORS.textSecondary, fontFamily: FONTS.bold.fontFamily, fontStyle: 'italic' },
  rowValueUrgent: { color: COLORS.danger },
  rowValueMissing: { color: COLORS.danger },
  statusDot: {
    width: 8, height: 8,
    borderRadius: 4,
    flexShrink: 0,
  },

  confidenceCard: {
    marginBottom: 18,
    padding: 16,
  },
  confidenceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  confidenceLabel: {
    color: COLORS.textMuted,
    fontSize: 10,
    fontFamily: FONTS.heading.fontFamily,
    letterSpacing: 1,
  },
  confidenceValue: {
    fontSize: 26,
    fontFamily: FONTS.heading.fontFamily,
    marginTop: 2,
  },
  confidenceBarTrack: {
    flex: 1,
    height: 8,
    backgroundColor: 'rgba(14,143,70,0.08)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  confidenceBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  warningRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(217,119,6,0.12)',
  },
  warningText: {
    flex: 1,
    fontSize: 13,
    color: COLORS.warning,
    lineHeight: 19,
    fontFamily: FONTS.bold.fontFamily,
  },

  // Sticky bottom actions
  stickyActions: {
    paddingHorizontal: 18,
    paddingTop: 12,
    backgroundColor: COLORS.bg,
    borderTopWidth: 1,
    borderTopColor: 'rgba(14,143,70,0.06)',
    gap: 10,
  },
  confirmButton: {
    backgroundColor: COLORS.primary,
    borderRadius: RADII.lg,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    ...SHADOWS.card,
  },
  confirmButtonText: {
    fontSize: 16,
    fontFamily: FONTS.heading.fontFamily,
    color: '#FFFFFF',
  },
  editButton: {
    backgroundColor: 'rgba(255,255,255,0.72)',
    borderRadius: RADII.lg,
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: 'rgba(14,143,70,0.12)',
  },
  editButtonText: {
    fontSize: 14,
    fontFamily: FONTS.subheading.fontFamily,
    color: COLORS.primary,
  },

  // Inline editing styles
  editIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(14,143,70,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(14,143,70,0.12)',
    flexShrink: 0,
  },
  editInput: {
    fontSize: 16,
    fontFamily: FONTS.subheading.fontFamily,
    color: COLORS.textPrimary,
    borderBottomWidth: 1.5,
    borderBottomColor: COLORS.primary,
    paddingVertical: 4,
    marginTop: 2,
  },
  rowValueEdited: {
    color: COLORS.primary,
    fontFamily: FONTS.heading.fontFamily,
  },

  // Date picker modal (iOS)
  datePickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(16, 37, 26, 0.45)',
    justifyContent: 'flex-end',
  },
  datePickerSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 40,
    borderWidth: 1.5,
    borderColor: 'rgba(14,143,70,0.12)',
  },
  datePickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(14,143,70,0.06)',
  },
  datePickerTitle: {
    fontSize: 17,
    fontFamily: FONTS.heading.fontFamily,
    color: COLORS.textPrimary,
  },
  datePickerDone: {
    fontSize: 16,
    fontFamily: FONTS.heading.fontFamily,
    color: COLORS.primary,
  },

  // Service Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '85%',
    maxHeight: '70%',
    backgroundColor: '#FFFFFF',
    borderRadius: RADII.xl,
    padding: 20,
    ...SHADOWS.card,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: FONTS.heading.fontFamily,
    color: COLORS.textPrimary,
  },
  modalList: {
    flexGrow: 0,
  },
  modalListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
    gap: 12,
  },
  modalListItemText: {
    fontSize: 16,
    fontFamily: FONTS.subheading.fontFamily,
    color: COLORS.textPrimary,
  },
});
