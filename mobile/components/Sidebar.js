import React, { useEffect, useRef } from 'react';
import { Animated, Image, Linking, Modal, Pressable, StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import LiquidGlass from './LiquidGlass';
import { COLORS, RADII, SHADOWS } from '../theme';

function SidebarRow({ icon, label, helper, onPress, right, isDanger }) {
  return (
    <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={0.82} disabled={!onPress}>
      <View style={[styles.rowIcon, isDanger && styles.rowIconDanger]}>
        <Ionicons name={icon} size={18} color={isDanger ? '#DC2626' : COLORS.primary} />
      </View>
      <View style={styles.rowCopy}>
        <Text style={[styles.rowLabel, isDanger && styles.rowLabelDanger]}>{label}</Text>
        {helper ? <Text style={styles.rowHelper}>{helper}</Text> : null}
      </View>
      {right !== undefined ? right : <Ionicons name="chevron-forward" size={16} color={COLORS.textMuted} />}
    </TouchableOpacity>
  );
}

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

  const openRate = () => Linking.openURL('https://expo.dev/');

  return (
    <Modal transparent visible={visible} animationType="none" onRequestClose={onClose}>
      <View style={styles.modalRoot} pointerEvents={visible ? 'auto' : 'none'}>
        <Animated.View style={[styles.backdrop, { opacity: fade }]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        </Animated.View>
        <Animated.View style={[styles.drawerWrap, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 18, transform: [{ translateX }] }]}> 
          <LiquidGlass style={styles.drawer} contentStyle={styles.drawerContent} strong radius={RADII.xl}>
            <View style={styles.profileHeaderRow}>
              <TouchableOpacity style={styles.closeButton} onPress={onClose} activeOpacity={0.8}>
                <Ionicons name="close" size={18} color={COLORS.textPrimary} />
              </TouchableOpacity>
            </View>

            <View style={styles.profileBlock}>
              <Image 
                source={{ uri: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=120&h=120&q=80' }} 
                style={styles.profileAvatar} 
              />
              <View style={styles.profileCopy}>
                <Text style={styles.profileName}>{currentUser?.displayName || 'Asaaniyat User'}</Text>
                <Text style={styles.profileMeta}>Karachi, Pakistan</Text>
                <View style={styles.badgeContainer}>
                  <Text style={styles.badgeText}>PREMIUM MEMBER</Text>
                </View>
              </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.section}>
              <SidebarRow icon="star-outline" label="Rate Our App" helper="Share your feedback" onPress={openRate} />
              <SidebarRow icon="git-branch-outline" label="Agent Traces" helper="View orchestrator decisions" onPress={() => { onClose?.(); onNavigateTrace?.(); }} />
              <SidebarRow
                icon={darkMode ? 'moon-outline' : 'sunny-outline'}
                label="Theme Toggle"
                helper={darkMode ? 'Soft dark glass enabled' : 'Asaaniyat light branding'}
                right={<Switch value={darkMode} onValueChange={onToggleTheme} trackColor={{ false: '#DDEBE3', true: COLORS.accent }} thumbColor="#FFFFFF" />}
              />
            </View>

            <View style={styles.footer}>
              <SidebarRow
                icon="log-out-outline"
                label="Sign Out"
                isDanger
                right={<View />}
                onPress={async () => { await onLogout?.(); onClose?.(); }}
              />
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
  drawerWrap: { position: 'absolute', top: 0, left: 0, bottom: 0, width: '64%', paddingLeft: 12 },
  drawer: { flex: 1 },
  drawerContent: { flex: 1, padding: 16 },
  profileHeaderRow: { flexDirection: 'row', justifyContent: 'flex-end', marginBottom: 12 },
  profileBlock: { alignItems: 'flex-start', gap: 12, marginBottom: 16, paddingHorizontal: 4 },
  profileAvatar: { width: 72, height: 72, borderRadius: 36, borderWidth: 2, borderColor: '#FFFFFF', ...SHADOWS.card },
  profileCopy: { width: '100%' },
  profileName: { color: COLORS.primary, fontSize: 20, fontWeight: '900', marginTop: 8 },
  profileMeta: { marginTop: 2, color: COLORS.textSecondary, fontSize: 13, fontWeight: '700' },
  badgeContainer: {
    alignSelf: 'flex-start',
    backgroundColor: '#EAF8EF',
    borderWidth: 1,
    borderColor: 'rgba(14,143,70,0.18)',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginTop: 8,
  },
  badgeText: {
    color: COLORS.primary,
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  divider: { height: 1, backgroundColor: 'rgba(14,143,70,0.08)', marginVertical: 12, width: '100%' },
  closeButton: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.66)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.9)' },
  section: { flex: 1, marginTop: 4 },
  row: { minHeight: 60, borderRadius: 18, padding: 10, marginBottom: 8, flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: 'rgba(255,255,255,0.56)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.84)' },
  rowIcon: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.accentSoft },
  rowIconDanger: { backgroundColor: 'rgba(220,38,38,0.1)' },
  rowCopy: { flex: 1 },
  rowLabel: { color: COLORS.textPrimary, fontSize: 13, fontWeight: '900' },
  rowLabelDanger: { color: '#DC2626' },
  rowHelper: { marginTop: 1, color: COLORS.textSecondary, fontSize: 10, fontWeight: '700' },
  footer: { marginTop: 'auto', borderTopWidth: 1, borderTopColor: 'rgba(14,143,70,0.06)', paddingTop: 12 },
});
