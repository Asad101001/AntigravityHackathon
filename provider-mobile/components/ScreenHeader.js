import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, FONTS } from '../theme';

export default function ScreenHeader({ 
  title, 
  subtitle, 
  onBack, 
  rightAction, 
  rightIcon,
  onRightPress,
  avatar
}) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.content}>
        <View style={styles.left}>
          {onBack && (
            <TouchableOpacity onPress={onBack} style={styles.backButton}>
              <Ionicons name="chevron-back" size={28} color={COLORS.textPrimary} />
            </TouchableOpacity>
          )}
          {avatar && (
            <View style={styles.avatarContainer}>
              <React.Fragment>
                {typeof avatar === 'string' ? (
                  <View style={styles.avatarImageWrapper}>
                    {/* Using basic Image component - replace with FastImage if available */}
                    <Image source={{ uri: avatar }} style={{ width: '100%', height: '100%', resizeMode: 'cover' }} />
                  </View>
                ) : null}
              </React.Fragment>
            </View>
          )}
          <View style={styles.textContainer}>
            <Text style={styles.title}>{title}</Text>
            {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
          </View>
        </View>

        {rightAction ? (
          <TouchableOpacity onPress={onRightPress} style={styles.rightAction}>
            {rightIcon && <Ionicons name={rightIcon} size={24} color={COLORS.primary} />}
            <Text style={styles.rightText}>{rightAction}</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.card,
    borderBottomColor: COLORS.border,
    borderBottomWidth: 1,
  },
  content: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  backButton: {
    marginRight: 8,
  },
  avatarContainer: {
    marginRight: 12,
  },
  avatarImageWrapper: {
    width: 40,
    height: 40,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    ...FONTS.subtitle1,
    color: COLORS.textPrimary,
  },
  subtitle: {
    ...FONTS.caption,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  rightAction: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 16,
  },
  rightText: {
    ...FONTS.button,
    color: COLORS.primary,
    marginLeft: 4,
  },
});
