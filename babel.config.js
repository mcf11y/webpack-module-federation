// This is similar to how env works in Babel:
// https://babeljs.io/docs/usage/babelrc/#env-option
// We are not using env because it’s ignored in versions > babel-core@6.10.4:
// https://github.com/babel/babel/issues/4539
// https://github.com/facebook/create-react-app/issues/720
// It’s also nice that we can enforce NODE_ENV being specified.
const env = process.env.BABEL_ENV || process.env.NODE_ENV;
const isEnvDevelopment = env === 'development';
// const isEnvProduction = env === 'production';
const isEnvTest = env === 'test';

module.exports = {
  presets: [
    [
      '@babel/preset-env',
      {
        useBuiltIns: 'entry',
        corejs: '3.26',
        // Do not transform modules to CJS
        modules: false,
        // Exclude transforms that make all code slower
        exclude: ['transform-typeof-symbol'],
      },
    ],
    [
      '@babel/preset-react',
      {
        runtime: 'automatic',
      },
    ],
    '@babel/preset-typescript',
  ],
  plugins: [
    // 'lodash',
    [
      '@babel/plugin-proposal-class-properties',
      {
        loose: true,
      },
    ],
    ['@babel/plugin-proposal-private-methods', { loose: true }],
    ['@babel/plugin-proposal-private-property-in-object', { loose: true }],
    [
      '@babel/plugin-transform-runtime',
      {
        corejs: false,
        helpers: true,
        // By default, babel assumes babel/runtime version 7.0.0-beta.0,
        // explicitly resolving to match the provided helper functions.
        // https://github.com/babel/babel/issues/10261
        version: require('@babel/runtime/package.json').version,
        regenerator: true,
      },
    ],
  ],
};
