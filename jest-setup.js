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
