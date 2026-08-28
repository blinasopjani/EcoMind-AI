import { Alert, Platform } from 'react-native';

export const showAlert = (title, message, buttons = []) => {
  if (Platform.OS === 'web') {
    if (buttons && buttons.length > 0) {
      // Look for confirmation style dialog
      const isConfirm = buttons.length > 1;
      
      // Usually, buttons are formatted like:
      // [{ text: "Cancel", style: "cancel" }, { text: "Action", onPress: () => {} }]
      // Find the positive action (not "cancel" or "Anulo" or "Jo")
      const actionBtn = buttons.find(b => b.style !== 'cancel' && b.text?.toLowerCase() !== 'anulo' && b.text?.toLowerCase() !== 'jo') || buttons[0];
      
      if (isConfirm) {
        const result = window.confirm(`${title}\n\n${message}`);
        if (result && actionBtn && actionBtn.onPress) {
          actionBtn.onPress();
        } else {
          // If cancel button has onPress, trigger it
          const cancelBtn = buttons.find(b => b.style === 'cancel' || b.text?.toLowerCase() === 'anulo' || b.text?.toLowerCase() === 'jo');
          if (cancelBtn && cancelBtn.onPress) cancelBtn.onPress();
        }
      } else {
        window.alert(`${title}\n\n${message}`);
        if (actionBtn && actionBtn.onPress) {
          actionBtn.onPress();
        }
      }
    } else {
      window.alert(`${title}\n\n${message}`);
    }
  } else {
    Alert.alert(title, message, buttons);
  }
};
