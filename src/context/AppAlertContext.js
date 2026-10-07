import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from './ThemeContext';
import { glassPopupTheme } from '../theme/colors';

const AppAlertContext = createContext(null);

export function AppAlertProvider({ children }) {
    const { colors } = useTheme();
  const [alert, setAlert] = useState(null);

  const showAlert = useCallback((title, message, buttons) => {
    setAlert({
      title,
      message,
      buttons: buttons?.length ? buttons : [{ text: 'OK' }],
    });
  }, []);

  const dismiss = useCallback((button) => {
    setAlert(null);
    button?.onPress?.();
  }, []);

  const alertApi = useMemo(() => ({ alert: showAlert }), [showAlert]);
  const buttons = alert?.buttons ?? [];

  return (
    <AppAlertContext.Provider value={alertApi}>
      {children}
      <Modal
        visible={!!alert}
        transparent
        animationType="fade"
        onRequestClose={() => dismiss(buttons.find((button) => button.style === 'cancel'))}
      >
        <View style={styles.backdrop}>
          <View accessibilityViewIsModal style={styles.dialog}>
            <View style={[styles.iconWrap, { backgroundColor: glassPopupTheme.iconSurface }]}>
              <Ionicons name="leaf" size={18} color={glassPopupTheme.accent} />
            </View>
            {alert?.title ? (
              <Text style={[styles.title, { color: glassPopupTheme.text }]}>{alert.title}</Text>
            ) : null}
            {alert?.message ? (
              <Text style={[styles.message, { color: glassPopupTheme.muted }]}>{alert.message}</Text>
            ) : null}
            <View style={[styles.actions, buttons.length > 2 && styles.stackedActions]}>
              {buttons.map((button, index) => {
                const destructive = button.style === 'destructive';
                const cancel = button.style === 'cancel';
                const color = destructive
                  ? colors.danger
                  : cancel
                    ? glassPopupTheme.muted
                    : glassPopupTheme.accent;

                return (
                  <Pressable
                    key={`${button.text}-${index}`}
                    accessibilityRole="button"
                    onPress={() => dismiss(button)}
                    style={({ pressed }) => [
                      styles.action,
                      buttons.length > 2 && styles.stackedAction,
                      destructive && { backgroundColor: colors.dangerBg },
                      pressed && styles.pressed,
                    ]}
                  >
                    <Text style={[styles.actionText, { color }]}>{button.text}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        </View>
      </Modal>
    </AppAlertContext.Provider>
  );
}

export function useAppAlert() {
  const alertApi = useContext(AppAlertContext);
  if (!alertApi) throw new Error('useAppAlert must be used within AppAlertProvider');
  return alertApi;
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 28,
    backgroundColor: 'rgba(0, 0, 0, 0.58)',
  },
  dialog: {
    backgroundColor: glassPopupTheme.surface,
    width: '92%',
    maxWidth: 400,
    borderWidth: 1,
    borderColor: glassPopupTheme.border,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.24,
    shadowRadius: 16,
    elevation: 12,
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  message: {
    fontSize: 15,
    lineHeight: 21,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  stackedActions: {
    flexDirection: 'column',
    alignItems: 'stretch',
  },
  action: {
    minHeight: 40,
    minWidth: 58,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 14,
    borderRadius: 8,
  },
  stackedAction: {
    width: '100%',
  },
  actionText: {
    fontSize: 15,
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.7,
  },
});