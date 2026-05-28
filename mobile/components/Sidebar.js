import React, { useEffect, useRef } from 'react';
import { Animated, Linking, Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import LiquidGlass from './LiquidGlass';
import { COLORS, RADII, SHADOWS, FONTS } from '../theme';

const DASHBOARD_URL = 'https://asaaniyat-admin.vercel.app/';

// Initials-based avatar — no external image dependency
function InitialsAvatar({ name, size = 72 }) {
  const initials = (name || 'A U')
    .split(' ')
    .map(w => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <View style={[avatarStyles.circle, { width: size, height: size, borderRadius: size * 0.18 }]}>
      <Text style={[avatarStyles.text, { fontSize: size * 0.36 }]}>{initials}</Text>
    </View>
  );
}

const avatarStyles = StyleSheet.create({
  circle: {
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2.5,
    borderColor: '#FFFFFF',
    ...SHADOWS.card,
  },
  text: {
    color: '#FFFFFF',
    fontFamily: FONTS.heading.fontFamily,
    letterSpacing: 0.5,
  },
});

function SidebarRow({ icon, label, helper, onPress, right, isDanger, darkMode }) {
  return (
    <TouchableOpacity style={[styles.row, darkMode && styles.rowDark]} onPress={onPress} activeOpacity={0.82} disabled={!onPress}>
      <View style={[styles.rowIcon, isDanger && styles.rowIconDanger, darkMode && !isDanger && styles.rowIconDark]}>
        <Ionicons name={icon} size={18} color={isDanger ? '#DC2626' : (darkMode ? '#34D399' : COLORS.primary)} />
      </View>
      <View style={styles.rowCopy}>
        <Text style={[styles.rowLabel, darkMode && styles.rowLabelDark, isDanger && styles.rowLabelDanger]}>{label}</Text>
        {helper ? <Text style={[styles.rowHelper, darkMode && styles.rowHelperDark]}>{helper}</Text> : null}
      </View>
      {right !== undefined ? right : <Ionicons name="chevron-forward" size={16} color={darkMode ? '#A7F3D0' : COLORS.textMuted} />}
    </TouchableOpacity>
  );
}

// Prominent theme toggle pill
function ThemeTogglePill({ darkMode, onToggle }) {
  const slideAnim = useRef(new Animated.Value(darkMode ? 1 : 0)).current;

  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: darkMode ? 1 : 0,
      useNativeDriver: true,
      damping: 16,
      stiffness: 200,
    }).start();
  }, [darkMode]);

  const thumbTranslate = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [2, 50],
  });

  return (
    <TouchableOpacity
      style={[toggleStyles.pill, darkMode && toggleStyles.pillDark]}
      onPress={onToggle}
      activeOpacity={0.85}
    >
      <Animated.View style={[toggleStyles.thumb, { transform: [{ translateX: thumbTranslate }] }]}>
        <Text style={{ fontSize: 18 }}>{darkMode ? '🌙' : '☀️'}</Text>
      </Animated.View>
      <View style={toggleStyles.labels}>
        <Text style={[toggleStyles.label, !darkMode && toggleStyles.labelActive]}>Light</Text>
        <Text style={[toggleStyles.label, darkMode && toggleStyles.labelActive]}>Dark</Text>
      </View>
    </TouchableOpacity>
  );
}

const toggleStyles = StyleSheet.create({
  pill: {
    width: 100,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(14,143,70,0.08)',
    borderWidth: 1.5,
    borderColor: 'rgba(14,143,70,0.14)',
    position: 'relative',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  pillDark: {
    backgroundColor: 'rgba(11,42,24,0.85)',
    borderColor: 'rgba(34,197,94,0.3)',
  },
  thumb: {
    position: 'absolute',
    width: 40,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.pressed,
    top: 3,
  },
  labels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
  },
  label: {
    fontSize: 10,
    fontFamily: FONTS.subheading.fontFamily,
    color: COLORS.textMuted,
    letterSpacing: 0.3,
  },
  labelActive: {
    color: COLORS.primary,
  },
});

export default function Sidebar({ visible, onClose, onNavigateTrace, darkMode, onToggleTheme, currentUser, onLogout }) {
  const insets = useSafeAreaInsets();
  const translateX = useRef(new Animated.Value(-340)).current;
  const fade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(translateX, { toValue: visible ? 0 : -340, duration: 260, useNativeDriver: true }),
      Animated.timing(fade, { toValue: visible ? 1 : 0, duration: 220, useNativeDriver: true }),
    ]).start();
  }, [fade, translateX, visible]);

  const openDashboard = () => Linking.openURL(DASHBOARD_URL);
  const openRate = () => Linking.openURL('https://expo.dev/');

  return (
    <Modal transparent visible={visible} animationType="none" onRequestClose={onClose}>
      <View style={styles.modalRoot} pointerEvents={visible ? 'auto' : 'none'}>
        <Animated.View style={[styles.backdrop, { opacity: fade }, darkMode && styles.backdropDark]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        </Animated.View>
        <Animated.View style={[styles.drawerWrap, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 18, transform: [{ translateX }] }]}> 
          <LiquidGlass style={styles.drawer} contentStyle={[styles.drawerContent, darkMode && styles.drawerContentDark]} strong radius={RADII.xl}>
            <View style={styles.profileHeaderRow}>
              <TouchableOpacity style={[styles.closeButton, darkMode && styles.closeButtonDark]} onPress={onClose} activeOpacity={0.8}>
                <Ionicons name="close" size={18} color={darkMode ? '#FFFFFF' : COLORS.textPrimary} />
              </TouchableOpacity>
            </View>

            {/* Profile block with initials avatar */}
            <View style={styles.profileBlock}>
              <View style={styles.profileTopRow}>
                <InitialsAvatar name={currentUser?.displayName} size={72} />
                <ThemeTogglePill darkMode={darkMode} onToggle={onToggleTheme} />
              </View>
              <View style={styles.profileCopy}>
                <Text style={[styles.profileName, darkMode && styles.profileNameDark]}>{currentUser?.displayName || 'Asaaniyat User'}</Text>
                <Text style={[styles.profileEmail, darkMode && styles.profileEmailDark]} numberOfLines={1}>{currentUser?.email || 'user@asaaniyat.pk'}</Text>
                <Text style={[styles.profileUrdu, darkMode && styles.profileUrduDark]}>آسانیت صارف</Text>
              </View>
            </View>

            <View style={styles.divider} />

            {/* Navigation rows */}
            <View style={styles.section}>
              {/* Dashboard link — prominent */}
              <SidebarRow
                darkMode={darkMode}
                icon="grid-outline"
                label="Admin Dashboard"
                helper="View analytics & agent traces"
                onPress={() => { onClose?.(); openDashboard(); }}
              />
              <SidebarRow
                darkMode={darkMode}
                icon="git-branch-outline"
                label="Agent Traces"
                helper="View orchestrator decisions"
                onPress={() => { onClose?.(); onNavigateTrace?.(); }}
              />
              <SidebarRow
                darkMode={darkMode}
                icon="star-outline"
                label="Rate Our App"
                helper="Share your feedback"
                onPress={openRate}
              />
            </View>

            {/* Footer */}
            <View style={styles.footer}>
              <SidebarRow
                darkMode={darkMode}
                icon="log-out-outline"
                label="Sign Out"
                isDanger
                right={<View />}
                onPress={async () => { await onLogout?.(); onClose?.(); }}
              />
              <Text style={styles.versionText}>آسانیت v1.0.0 · AI Seekho 2026</Text>
            </View>
          </LiquidGlass>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalRoot: { flex: 1 },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(9,38,22,0.46)' },
  backdropDark: { backgroundColor: 'rgba(0,0,0,0.7)' },
  drawerWrap: { position: 'absolute', top: 0, left: 0, bottom: 0, width: '72%', paddingLeft: 12 },
  drawer: { flex: 1 },
  drawerContent: { flex: 1, padding: 18, backgroundColor: 'rgba(255,255,255,0.2)' },
  drawerContentDark: { backgroundColor: 'rgba(11,42,24,0.95)' },
  profileHeaderRow: { flexDirection: 'row', justifyContent: 'flex-end', marginBottom: 8 },
  profileBlock: { alignItems: 'flex-start', gap: 12, marginBottom: 16, paddingHorizontal: 4 },
  profileTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%' },
  profileCopy: { width: '100%' },
  profileName: { color: COLORS.textPrimary, fontSize: 20, fontFamily: FONTS.heading.fontFamily, marginTop: 8 },
  profileNameDark: { color: '#FFFFFF' },
  profileEmail: { color: COLORS.primary, fontSize: 12, fontFamily: FONTS.bold.fontFamily, marginTop: 2 },
  profileEmailDark: { color: '#34D399' },
  profileUrdu: { color: COLORS.textSecondary, fontSize: 14, fontFamily: FONTS.urdu.fontFamily, marginTop: 4, writingDirection: 'rtl' },
  profileUrduDark: { color: '#A7F3D0' },
  divider: { height: 1, backgroundColor: 'rgba(14,143,70,0.08)', marginVertical: 12, width: '100%' },
  closeButton: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.8)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.9)' },
  closeButtonDark: { backgroundColor: 'rgba(34,197,94,0.15)', borderColor: 'rgba(34,197,94,0.3)' },
  section: { flex: 1, marginTop: 4 },
  row: { minHeight: 64, borderRadius: 16, padding: 12, marginBottom: 10, flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: 'rgba(255,255,255,0.7)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.9)' },
  rowDark: { backgroundColor: 'rgba(0,0,0,0.3)', borderColor: 'rgba(34,197,94,0.2)' },
  rowIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.chip },
  rowIconDark: { backgroundColor: 'rgba(34,197,94,0.15)' },
  rowIconDanger: { backgroundColor: 'rgba(220,38,38,0.1)' },
  rowCopy: { flex: 1 },
  rowLabel: { color: COLORS.textPrimary, fontSize: 15, fontFamily: FONTS.heading.fontFamily },
  rowLabelDark: { color: '#FFFFFF' },
  rowLabelDanger: { color: '#DC2626' },
  rowHelper: { marginTop: 2, color: COLORS.textSecondary, fontSize: 12, fontFamily: FONTS.bold.fontFamily },
  rowHelperDark: { color: '#A7F3D0' },
  footer: { marginTop: 'auto', borderTopWidth: 1, borderTopColor: 'rgba(14,143,70,0.06)', paddingTop: 16 },
  versionText: { textAlign: 'center', color: COLORS.textMuted, fontSize: 12, fontFamily: FONTS.urdu.fontFamily, marginTop: 12, writingDirection: 'rtl' },
});
