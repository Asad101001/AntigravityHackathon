import React, { useEffect, useRef } from 'react';
import { Animated, Linking, Modal, Pressable, StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import LiquidGlass from './LiquidGlass';
import { COLORS, RADII, SHADOWS } from '../theme';

const REPO_URL = 'https://github.com/';

function SidebarRow({ icon, label, helper, onPress, right }) {
  return (
    <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={0.82} disabled={!onPress}>
      <View style={styles.rowIcon}><Ionicons name={icon} size={18} color={COLORS.primary} /></View>
      <View style={styles.rowCopy}>
        <Text style={styles.rowLabel}>{label}</Text>
        {helper ? <Text style={styles.rowHelper}>{helper}</Text> : null}
      </View>
      {right || <Ionicons name="chevron-forward" size={16} color={COLORS.textMuted} />}
    </TouchableOpacity>
  );
}

export default function Sidebar({ visible, onClose, onNavigateTrace, darkMode, onToggleTheme, currentUser, onLogout }) {
  const insets = useSafeAreaInsets();
  const translateX = useRef(new Animated.Value(340)).current;
  const fade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(translateX, { toValue: visible ? 0 : 340, duration: 260, useNativeDriver: true }),
      Animated.timing(fade, { toValue: visible ? 1 : 0, duration: 220, useNativeDriver: true }),
    ]).start();
  }, [fade, translateX, visible]);

  const openRate = () => Linking.openURL('https://expo.dev/');
  const openRepo = () => Linking.openURL(REPO_URL);

  return (
    <Modal transparent visible={visible} animationType="none" onRequestClose={onClose}>
      <View style={styles.modalRoot} pointerEvents={visible ? 'auto' : 'none'}>
        <Animated.View style={[styles.backdrop, { opacity: fade }]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        </Animated.View>
        <Animated.View style={[styles.drawerWrap, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 18, transform: [{ translateX }] }]}> 
          <LiquidGlass style={styles.drawer} contentStyle={styles.drawerContent} strong radius={RADII.xl}>
            <View style={styles.profileBlock}>
              <View style={styles.profileAvatar}><Text style={styles.profileInitial}>A</Text></View>
              <View style={styles.profileCopy}>
                <Text style={styles.profileName}>{currentUser?.displayName || 'Asaaniyat User'}</Text>
                <Text style={styles.profileMeta}>{currentUser?.email || 'Liquid Glass control center'}</Text>
              </View>
              <TouchableOpacity style={styles.closeButton} onPress={onClose} activeOpacity={0.8}>
                <Ionicons name="close" size={18} color={COLORS.textPrimary} />
              </TouchableOpacity>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Preferences</Text>
              <SidebarRow
                icon={darkMode ? 'moon' : 'sunny'}
                label="Theme Toggle"
                helper={darkMode ? 'Soft dark glass enabled' : 'Asaaniyat light branding'}
                right={<Switch value={darkMode} onValueChange={onToggleTheme} trackColor={{ false: '#DDEBE3', true: COLORS.accent }} thumbColor="#FFFFFF" />}
              />
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Project</Text>
              <SidebarRow icon="logo-github" label="GitHub Repo Link" helper="Open repository" onPress={openRepo} />
              <SidebarRow icon="star-outline" label="Rate Our App" helper="Share your feedback" onPress={openRate} />
              <SidebarRow icon="git-branch-outline" label="Agent Traces" helper="View orchestrator decisions" onPress={() => { onClose?.(); onNavigateTrace?.(); }} />
            </View>

            <View style={styles.section}>
              <SidebarRow
                icon="log-out-outline"
                label="Log out"
                helper="End this secure session"
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
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(9,38,22,0.22)' },
  drawerWrap: { position: 'absolute', top: 0, right: 0, bottom: 0, width: '84%', maxWidth: 350, paddingRight: 12 },
  drawer: { flex: 1 },
  drawerContent: { flex: 1, padding: 18 },
  profileBlock: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 24 },
  profileAvatar: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.primary, ...SHADOWS.card },
  profileInitial: { color: '#FFFFFF', fontSize: 24, fontWeight: '900' },
  profileCopy: { flex: 1 },
  profileName: { color: COLORS.textPrimary, fontSize: 18, fontWeight: '900' },
  profileMeta: { marginTop: 2, color: COLORS.textSecondary, fontSize: 12, fontWeight: '700' },
  closeButton: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.66)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.9)' },
  section: { marginTop: 10 },
  sectionTitle: { color: COLORS.textMuted, fontSize: 11, fontWeight: '900', letterSpacing: 1.3, textTransform: 'uppercase', marginBottom: 10 },
  row: { minHeight: 66, borderRadius: 22, padding: 12, marginBottom: 10, flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: 'rgba(255,255,255,0.56)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.84)' },
  rowIcon: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.accentSoft },
  rowCopy: { flex: 1 },
  rowLabel: { color: COLORS.textPrimary, fontSize: 14, fontWeight: '900' },
  rowHelper: { marginTop: 2, color: COLORS.textSecondary, fontSize: 11, fontWeight: '700' },
});
