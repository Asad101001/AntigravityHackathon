/**
 * ErrorBoundary.js — Production Failsafe
 *
 * A class component error boundary wrapped in a functional export.
 * Intercepts any unhandled JavaScript thread exceptions that escape
 * React's render tree and replaces the screen with a premium fallback UI.
 */

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Easing,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// ---------------------------------------------------------------------------
class ErrorBoundaryClass extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, errorMessage: null };
  }

  static getDerivedStateFromError(error) {
    return {
      hasError: true,
      errorMessage: error?.message || 'An unexpected error occurred.',
    };
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary] Caught exception:', error, info?.componentStack);
  }

  handleReset = () => {
    this.setState({ hasError: false, errorMessage: null });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <ErrorFallbackUI
          errorMessage={this.state.errorMessage}
          onRetry={this.handleReset}
        />
      );
    }
    return this.props.children;
  }
}

// ---------------------------------------------------------------------------
// Glassmorphic Fallback UI
// ---------------------------------------------------------------------------
function ErrorFallbackUI({ errorMessage, onRetry }) {
  const pulseAnim = React.useRef(new Animated.Value(1)).current;

  React.useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.08, duration: 900, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 900, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    ).start();
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      {/* Ambient background blobs */}
      <View style={styles.blobTop} />
      <View style={styles.blobBottom} />

      <View style={styles.card}>
        {/* Pulsing warning icon */}
        <Animated.View style={[styles.iconRing, { transform: [{ scale: pulseAnim }] }]}>
          <Text style={styles.iconEmoji}>⚠️</Text>
        </Animated.View>

        <Text style={styles.title}>Oops! Something went wrong</Text>
        <Text style={styles.subtitle}>
          An unexpected error occurred in the application thread. Your data is safe.
        </Text>

        {/* Error detail — monospaced and subtle */}
        {errorMessage ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorBoxLabel}>ERROR DETAIL</Text>
            <Text style={styles.errorBoxText} numberOfLines={4}>
              {errorMessage}
            </Text>
          </View>
        ) : null}

        {/* Primary CTA */}
        <TouchableOpacity style={styles.retryButton} onPress={onRetry} activeOpacity={0.84}>
          <Text style={styles.retryButtonText}>↺  Retry Application</Text>
        </TouchableOpacity>

        <Text style={styles.footerText}>
          Asaaniyat AI Engine • Error Recovery Mode
        </Text>
      </View>
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------
const BRAND_GREEN = '#0E8F46';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4FBF7',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  blobTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '40%',
    backgroundColor: '#EFF6FF',
    opacity: 0.65,
  },
  blobBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '30%',
    backgroundColor: '#FDECEA',
    opacity: 0.55,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: 'rgba(255,255,255,0.88)',
    borderRadius: 28,
    padding: 28,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(14,143,70,0.10)',
    shadowColor: BRAND_GREEN,
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.14,
    shadowRadius: 30,
    elevation: 10,
    // Glassmorphism effect approximation
    overflow: 'hidden',
  },
  iconRing: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(220,38,38,0.07)',
    borderWidth: 2,
    borderColor: 'rgba(220,38,38,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  iconEmoji: {
    fontSize: 36,
  },
  title: {
    fontSize: 22,
    fontWeight: '900',
    color: '#0B2A18',
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: -0.4,
  },
  subtitle: {
    fontSize: 13,
    color: '#4B6B58',
    textAlign: 'center',
    lineHeight: 20,
    fontWeight: '700',
    marginBottom: 20,
    paddingHorizontal: 8,
  },
  errorBox: {
    width: '100%',
    backgroundColor: 'rgba(220,38,38,0.04)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(220,38,38,0.12)',
    padding: 12,
    marginBottom: 24,
  },
  errorBoxLabel: {
    fontSize: 9,
    fontWeight: '900',
    color: '#DC2626',
    letterSpacing: 1.5,
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  errorBoxText: {
    fontSize: 11,
    fontFamily: 'monospace',
    color: '#6B2F2F',
    lineHeight: 16,
  },
  retryButton: {
    width: '100%',
    backgroundColor: BRAND_GREEN,
    borderRadius: 18,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: BRAND_GREEN,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.22,
    shadowRadius: 12,
    elevation: 4,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 0.2,
  },
  footerText: {
    fontSize: 9,
    color: '#8BA898',
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    textAlign: 'center',
  },
});

// ---------------------------------------------------------------------------
// Public export — functional wrapper
// ---------------------------------------------------------------------------
export default function ErrorBoundary({ children, onReset }) {
  return (
    <ErrorBoundaryClass onReset={onReset}>
      {children}
    </ErrorBoundaryClass>
  );
}
