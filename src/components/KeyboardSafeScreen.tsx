import { ReactNode } from 'react';
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ScrollViewProps,
  StyleProp,
  StyleSheet,
  TouchableWithoutFeedback,
  View,
  ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type KeyboardSafeScreenProps = {
  children: ReactNode;
  contentContainerStyle?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
  footer?: ReactNode;
  safeAreaEdges?: Array<'top' | 'right' | 'bottom' | 'left'>;
  scrollViewProps?: Omit<
    ScrollViewProps,
    'children' | 'contentContainerStyle' | 'keyboardShouldPersistTaps'
  >;
  style?: StyleProp<ViewStyle>;
};

export const KeyboardSafeScreen = ({
  children,
  contentContainerStyle,
  contentStyle,
  footer,
  safeAreaEdges = ['top', 'right', 'bottom', 'left'],
  scrollViewProps,
  style,
}: KeyboardSafeScreenProps) => (
  <SafeAreaView edges={safeAreaEdges} style={[styles.safeArea, style]}>
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.keyboardView}
    >
      <ScrollView
        {...scrollViewProps}
        keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'none'}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[styles.scrollContent, contentContainerStyle]}
      >
        <TouchableWithoutFeedback accessible={false} onPress={Keyboard.dismiss}>
          <View style={contentStyle}>{children}</View>
        </TouchableWithoutFeedback>
      </ScrollView>
      {footer}
    </KeyboardAvoidingView>
  </SafeAreaView>
);

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
});
