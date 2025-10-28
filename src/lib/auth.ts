/**
 * Unified authentication storage helper
 * Manages user data in localStorage consistently across the app
 */

export interface UserData {
  email: string;
  name: string;
}

const USER_EMAIL_KEY = "user_email";
const USER_NAME_KEY = "user_name";
const LEGACY_KEY = "hedgehog_user";

/**
 * Save user authentication data to localStorage
 * Uses user_email and user_name keys consistently
 */
export const saveUser = (email: string, name: string): void => {
  try {
    localStorage.setItem(USER_EMAIL_KEY, email);
    localStorage.setItem(USER_NAME_KEY, name);
    
    // Also save to legacy key for backwards compatibility (temporary)
    localStorage.setItem(LEGACY_KEY, JSON.stringify({ email, name }));
    
    console.log("Auth: User saved to storage", { email, name });
  } catch (error) {
    console.error("Auth: Failed to save user", error);
  }
};

/**
 * Get user authentication data from localStorage
 * Checks both current and legacy storage keys for backwards compatibility
 */
export const getUser = (): UserData | null => {
  try {
    // First, try the current storage keys
    const email = localStorage.getItem(USER_EMAIL_KEY);
    const name = localStorage.getItem(USER_NAME_KEY);
    
    if (email && name) {
      console.log("Auth: User retrieved from storage", { email, name });
      return { email, name };
    }
    
    // Fallback: check legacy hedgehog_user key
    const legacyData = localStorage.getItem(LEGACY_KEY);
    if (legacyData) {
      const parsed = JSON.parse(legacyData);
      if (parsed.email && parsed.name) {
        console.log("Auth: User retrieved from legacy storage (migrating...)", { email: parsed.email, name: parsed.name });
        // Migrate to new keys
        saveUser(parsed.email, parsed.name);
        return { email: parsed.email, name: parsed.name };
      }
    }
    
    console.log("Auth: No user found in storage");
    return null;
  } catch (error) {
    console.error("Auth: Failed to get user", error);
    return null;
  }
};

/**
 * Clear all user authentication data from localStorage
 * Removes both current and legacy keys
 */
export const clearUser = (): void => {
  try {
    localStorage.removeItem(USER_EMAIL_KEY);
    localStorage.removeItem(USER_NAME_KEY);
    localStorage.removeItem(LEGACY_KEY);
    
    console.log("Auth: User cleared from storage");
  } catch (error) {
    console.error("Auth: Failed to clear user", error);
  }
};

/**
 * Check if user is logged in
 */
export const isUserLoggedIn = (): boolean => {
  return getUser() !== null;
};
