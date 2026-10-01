// src/utils/updateManager.js
import * as Updates from 'expo-updates';

export async function rollbackUpdate() {
  try {
    await Updates.rollbackAsync();
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

export async function isRollbackAvailable() {
  try {
    return await Updates.isRollbackAvailable();
  } catch {
    return false;
  }
}