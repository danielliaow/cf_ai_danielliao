import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Easing,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface ThinkingAnimationProps {
  visible: boolean;
  message?: string;
}

export const ThinkingAnimation: React.FC<ThinkingAnimationProps> = ({
  visible,
  message = 'AI is thinking...',
}) => {
  const dot1Anim = useRef(new Animated.Value(0)).current;
  const dot2Anim = useRef(new Animated.Value(0)).current;
  const dot3Anim = useRef(new Animated.Value(0)).current;
  const brainRotate = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (visible) {
      // Floating dots animation
      const createDotAnimation = (animValue: Animated.Value, delay: number) => {
        return Animated.loop(
          Animated.sequence([
            Animated.delay(delay),
            Animated.timing(animValue, {
              toValue: 1,
              duration: 600,
              easing: Easing.inOut(Easing.sin),
              useNativeDriver: true,
            }),
            Animated.timing(animValue, {
              toValue: 0,
              duration: 600,
              easing: Easing.inOut(Easing.sin),
              useNativeDriver: true,
            }),
          ])
        );
      };

      // Brain rotation animation
      const brainAnimation = Animated.loop(
        Animated.timing(brainRotate, {
          toValue: 1,
          duration: 3000,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      );

      // Pulse animation
      const pulseAnimation = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.1,
            duration: 1000,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ])
      );

      // Start all animations
      createDotAnimation(dot1Anim, 0).start();
      createDotAnimation(dot2Anim, 200).start();
      createDotAnimation(dot3Anim, 400).start();
      brainAnimation.start();
      pulseAnimation.start();
    } else {
      // Stop all animations
      dot1Anim.stopAnimation();
      dot2Anim.stopAnimation();
      dot3Anim.stopAnimation();
      brainRotate.stopAnimation();
      pulseAnim.stopAnimation();
      
      // Reset values
      dot1Anim.setValue(0);
      dot2Anim.setValue(0);
      dot3Anim.setValue(0);
      brainRotate.setValue(0);
      pulseAnim.setValue(1);
    }
  }, [visible]);

  if (!visible) return null;

  const brainRotateInterpolate = brainRotate.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const getDotTranslateY = (animValue: Animated.Value) => {
    return animValue.interpolate({
      inputRange: [0, 1],
      outputRange: [0, -10],
    });
  };

  const getDotOpacity = (animValue: Animated.Value) => {
    return animValue.interpolate({
      inputRange: [0, 0.5, 1],
      outputRange: [0.3, 1, 0.3],
    });
  };

  return (
    <View style={styles.container}>
      <Animated.View 
        style={[
          styles.brainContainer,
          {
            transform: [
              { scale: pulseAnim },
              { rotate: brainRotateInterpolate }
            ],
          },
        ]}
      >
        <Ionicons name="bulb" size={24} color="#4285F4" />
      </Animated.View>
      
      <View style={styles.contentContainer}>
        <Text style={styles.message}>{message}</Text>
        
        <View style={styles.dotsContainer}>
          <Animated.View
            style={[
              styles.dot,
              {
                transform: [{ translateY: getDotTranslateY(dot1Anim) }],
                opacity: getDotOpacity(dot1Anim),
              },
            ]}
          />
          <Animated.View
            style={[
              styles.dot,
              {
                transform: [{ translateY: getDotTranslateY(dot2Anim) }],
                opacity: getDotOpacity(dot2Anim),
              },
            ]}
          />
          <Animated.View
            style={[
              styles.dot,
              {
                transform: [{ translateY: getDotTranslateY(dot3Anim) }],
                opacity: getDotOpacity(dot3Anim),
              },
            ]}
          />
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'rgba(66, 133, 244, 0.05)',
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(66, 133, 244, 0.2)',
  },
  brainContainer: {
    marginRight: 12,
  },
  contentContainer: {
    flex: 1,
  },
  message: {
    fontSize: 14,
    color: '#4285F4',
    fontWeight: '500',
    marginBottom: 6,
  },
  dotsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#4285F4',
    marginRight: 6,
  },
});