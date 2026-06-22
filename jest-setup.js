'use strict';

// RN 0.76 / @testing-library/react-native requires window to be defined
if (typeof global.window === 'undefined') {
  global.window = global;
}

global.__DEV__ = true;
global.IS_REACT_ACT_ENVIRONMENT = true;
global.IS_REACT_NATIVE_TEST_ENVIRONMENT = true;

global.__fbBatchedBridgeConfig = {
  remoteModuleConfig: [],
  localModulesConfig: [],
};

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'));

jest.mock('expo-font', () => ({ useFonts: () => [true], isLoaded: () => true, loadAsync: () => Promise.resolve() }));
jest.mock('expo-splash-screen', () => ({ preventAutoHideAsync: () => Promise.resolve(), hideAsync: () => Promise.resolve() }));
jest.mock('expo-blur', () => ({ BlurView: require('react-native').View }));
// Keep the USDA network out of component/hook tests; usda.test.ts uses requireActual.
jest.mock('./src/services/usda', () => ({
  usdaLookupByBarcode: jest.fn(async () => null),
  usdaSearchByName: jest.fn(async () => []),
}));
jest.mock('@expo-google-fonts/merriweather', () => ({ Merriweather_700Bold: 'Merriweather_700Bold' }));
jest.mock('@expo-google-fonts/inter', () => ({ Inter_400Regular: 'Inter_400Regular', Inter_500Medium: 'Inter_500Medium', Inter_600SemiBold: 'Inter_600SemiBold', Inter_700Bold: 'Inter_700Bold', Inter_800ExtraBold: 'Inter_800ExtraBold' }));
jest.mock('@expo-google-fonts/hanken-grotesk', () => ({ HankenGrotesk_400Regular: 'HankenGrotesk_400Regular', HankenGrotesk_500Medium: 'HankenGrotesk_500Medium', HankenGrotesk_600SemiBold: 'HankenGrotesk_600SemiBold', HankenGrotesk_700Bold: 'HankenGrotesk_700Bold', HankenGrotesk_800ExtraBold: 'HankenGrotesk_800ExtraBold' }));
jest.mock('@expo-google-fonts/space-grotesk', () => ({ SpaceGrotesk_500Medium: 'SpaceGrotesk_500Medium', SpaceGrotesk_600SemiBold: 'SpaceGrotesk_600SemiBold', SpaceGrotesk_700Bold: 'SpaceGrotesk_700Bold' }));

global.nativeFabricUIManager = {};
global.cancelAnimationFrame = (id) => clearTimeout(id);
global.requestAnimationFrame = (callback) => setTimeout(callback, 0);

const defaultDimensions = { width: 375, height: 812, scale: 2, fontScale: 1 };

const nativeModuleMocks = {
  SourceCode: { getConstants: () => ({ scriptURL: '' }) },
  PlatformConstants: {
    getConstants: () => ({
      isTesting: true,
      reactNativeVersion: { major: 0, minor: 85, patch: 3 },
      osVersion: '17',
      systemName: 'iOS',
      interfaceIdiom: 'phone',
      forceTouchAvailable: false,
      isTV: false,
    }),
  },
  DeviceInfo: {
    getConstants: () => ({
      Dimensions: { window: defaultDimensions, screen: defaultDimensions },
    }),
  },
  Timing: {
    createTimer: () => {},
    deleteTimer: () => {},
    setSendIdleEvents: () => {},
  },
  AppState: {
    getConstants: () => ({ initialAppState: 'active' }),
    getCurrentAppState: (_success, _error) => {},
    addListener: () => {},
    removeListeners: () => {},
  },
  AccessibilityInfo: {
    getConstants: () => ({}),
    isReduceMotionEnabled: (_cb) => {},
    isBoldTextEnabled: (_cb) => {},
    isScreenReaderEnabled: (_cb) => {},
    addListener: () => ({ remove: () => {} }),
    removeListeners: () => {},
    announceForAccessibility: () => {},
    setAccessibilityFocus: () => {},
  },
  UIManager: {
    getConstants: () => ({
      customBubblingEventTypes: {},
      customDirectEventTypes: {},
      Dimensions: { window: defaultDimensions, screen: defaultDimensions },
    }),
    getViewManagerConfig: () => null,
    hasViewManagerConfig: () => false,
    getAccessibilityManager: () => ({}),
    lazilyLoadView: () => {},
    createView: () => {},
    updateView: () => {},
    manageChildren: () => {},
    setChildren: () => {},
    dispatchViewManagerCommand: () => {},
    measureLayout: () => {},
    measure: () => {},
    findSubviewIn: () => {},
    blur: () => {},
    focus: () => {},
    configureNextLayoutAnimation: () => {},
    setJSResponder: () => {},
    clearJSResponder: () => {},
  },
  NativeAnimatedModule: {},
  Networking: {},
  KeyboardObserver: {
    addListener: () => {},
    removeListeners: () => {},
  },
  ImageLoader: {
    getSize: (_uri, success, _failure) => { success(100, 100); },
    getSizeWithHeaders: (_uri, _headers, success, _failure) => { success(100, 100); },
    prefetchImage: (_uri, resolve, _reject) => { resolve(true); },
    queryCache: (_uris, resolve, _reject) => { resolve({}); },
    abortRequest: () => {},
  },
  DevSettings: {
    addMenuItem: () => {},
    reload: () => {},
    getConstants: () => ({}),
  },
  DevMenu: {
    show: () => {},
    getConstants: () => ({}),
  },
  NativeDevMenu: {
    show: () => {},
    getConstants: () => ({}),
  },
  Linking: {
    getConstants: () => ({ initialURL: null, supportedExternalProtocols: [] }),
    getInitialURL: () => Promise.resolve(null),
    canOpenURL: () => Promise.resolve(false),
    openURL: () => Promise.resolve(),
    addEventListener: () => ({ remove: () => {} }),
    removeEventListener: () => {},
    sendIntent: () => Promise.resolve(),
    openSettings: () => Promise.resolve(),
  },
  LinkingManager: {
    getConstants: () => ({ initialURL: null }),
    getInitialURL: () => Promise.resolve(null),
    canOpenURL: () => Promise.resolve(false),
    openURL: () => Promise.resolve(),
    openSettings: () => Promise.resolve(),
    addListener: () => {},
    removeListeners: () => {},
  },
};

jest.mock(
  'react-native/Libraries/TurboModule/TurboModuleRegistry',
  () => ({
    get: (name) => nativeModuleMocks[name] || null,
    getEnforcing: (name) => {
      const mod = nativeModuleMocks[name];
      if (!mod) {
        // Return a generic stub for any unknown native module so RNTL host
        // component detection doesn't fail on modules not critical to tests.
        return new Proxy({}, {
          get: (_target, prop) => {
            if (prop === 'getConstants') return () => ({});
            return () => {};
          },
        });
      }
      return mod;
    },
  }),
);

jest.mock('expo-crypto', () => ({ randomUUID: () => '00000000-0000-4000-8000-' + Date.now().toString().padStart(12, '0') }))

// Prevent native Supabase/SecureStore modules from loading in Jest.
// createSupabaseAuth() takes the client as a param so tests bypass this.
jest.mock('./src/services/supabase', () => ({ supabase: null, isSupabaseConfigured: false }))
