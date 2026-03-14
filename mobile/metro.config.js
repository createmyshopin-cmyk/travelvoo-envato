const path = require("path");
const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

const config = getDefaultConfig(__dirname);
const nativeWindConfig = withNativeWind(config, { input: "./global.css" });

// Ensure react-native-reanimated resolves from project root (fix for react-native-css-interop)
nativeWindConfig.resolver = nativeWindConfig.resolver || {};
nativeWindConfig.resolver.extraNodeModules = {
  ...nativeWindConfig.resolver.extraNodeModules,
  "react-native-reanimated": path.resolve(__dirname, "node_modules/react-native-reanimated"),
};

module.exports = nativeWindConfig;
