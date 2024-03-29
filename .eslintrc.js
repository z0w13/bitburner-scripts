module.exports = {
  env: {
    browser: true,
    commonjs: true,
    es6: false,
  },
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:prettier/recommended",
  ],
  parser: "@typescript-eslint/parser",
  parserOptions: {
    ecmaVersion: 8,
    sourceType: "module",
    ecmaFeatures: {
      experimentalObjectRestSpread: true,
    },
    project: ["./tsconfig.json"],
    tsconfigRootDir: __dirname,
  },
  plugins: ["@typescript-eslint", "prettier", "no-relative-import-paths", "deprecation"],
  ignorePatterns: ["*.d.ts", "*.js", "game-constants.ts"],
  rules: {
    "@typescript-eslint/await-thenable": "error",
    "@typescript-eslint/no-floating-promises": "error",
    "@typescript-eslint/no-unused-vars": ["error", { varsIgnorePattern: "^_", argsIgnorePattern: "^_" }],
    "deprecation/deprecation": "error",
    "no-constant-condition": "off",
    "no-relative-import-paths/no-relative-import-paths": "error",
  }
}
