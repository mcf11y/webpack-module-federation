'use strict';

const { ModuleFederationPlugin } = require('webpack').container;

const ExternalTemplateRemotesPlugin = require('external-remotes-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const ForkTsCheckerWebpackPlugin = require('fork-ts-checker-webpack-plugin');
const CircularDependencyPlugin = require('circular-dependency-plugin');
const ReactRefreshWebpackPlugin = require('@pmmmwh/react-refresh-webpack-plugin');
const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;

const DuplicatePackageCheckerPlugin = require('duplicate-package-checker-webpack-plugin');

const MiniCssExtractPlugin = require('mini-css-extract-plugin');

const CssMinimizerPlugin = require('css-minimizer-webpack-plugin');
const TerserPlugin = require('terser-webpack-plugin');

const CompressionPlugin = require('compression-webpack-plugin');
const ESLintPlugin = require('eslint-webpack-plugin');

// const LodashModuleReplacementPlugin = require('lodash-webpack-plugin');

const path = require('path');
const fs = require('fs');

const toml = require('toml');
const yaml = require('yamljs');
const json5 = require('json5');

const version = process.env.version;
const isDev = process.env.NODE_ENV === 'development';
const isProd = !isDev;
const isLib = Boolean(process.env.LIB);

const shouldUseSourceMap = process.env.GENERATE_SOURCEMAP !== 'false';
const shouldUseReactRefresh = process.env.FAST_REFRESH !== 'false';
const emitErrorsAsWarnings = process.env.ESLINT_NO_DEV_ERRORS === 'true';
const disableESLintPlugin = process.env.DISABLE_ESLINT_PLUGIN === 'true';
const shouldCompressionBundleToGz = process.env.SHOULD_COMPRESSION_BUNDLE === 'true';

const buildPath = process.env.BUILD_PATH || 'build';

// Make sure any symlinks in the project folder are resolved:
// https://github.com/facebook/create-react-app/issues/637
const appDirectory = fs.realpathSync(process.cwd());
const resolveApp = (relativePath) => path.resolve(appDirectory, relativePath);

const paths = {
  appPath: resolveApp('.'),
  appBuild: resolveApp(buildPath),
  appPublic: resolveApp('public'),
  appHtml: resolveApp('public/index.html'),
  appIndexJs: resolveApp('src/index'),
  appTsConfig: resolveApp('tsconfig.json'),
  appPackageJson: resolveApp('package.json'),
  appSrc: resolveApp('src'),
  appTsBuildInfoFile: resolveApp('node_modules/.cache/tsconfig.tsbuildinfo'),
  appNodeModules: resolveApp('node_modules'),
  appModuleFederationConfig: resolveApp('mf.config.js'),
};

const deps = require(paths.appPackageJson).dependencies;

const useTypeScript = fs.existsSync(paths.appTsConfig);
const useModuleFederation = fs.existsSync(paths.appModuleFederationConfig);

let MF_CONFIGURATION;
let DEV_PORT = 3001;
if (useModuleFederation) {
  const { mfConfig, mfPort } = require(paths.appModuleFederationConfig)(deps);

  MF_CONFIGURATION = mfConfig;
  DEV_PORT = mfPort;
}

const hasJsxRuntime = (() => {
  if (process.env.DISABLE_NEW_JSX_TRANSFORM === 'true') {
    return false;
  }

  try {
    require.resolve('react/jsx-runtime');
    return true;
  } catch (e) {
    return false;
  }
})();

const filename = (ext, isProd) => {
  if (isProd) {
    return `${ext}/[name].[contenthash:8].${ext}`;
  }
  return `${ext}/bundle.${ext}`;
};

const chunkFilename = (ext, isProd) => {
  if (isProd) {
    return `${ext}/[name].[contenthash:8].chunk.${ext}`;
  }
  return `${ext}/[name].chunk.${ext}`;
};

const cssLoaders = (extra) => {
  const loaders = [isDev ? 'style-loader' : MiniCssExtractPlugin.loader, 'css-loader'];

  if (extra) {
    loaders.push(extra);
  }

  return loaders;
};

const getPublicPath = (isDev) => {
  return isDev ? `http://localhost:${DEV_PORT}/` : 'auto';
};

const optimization = () => {
  const config = {
    minimize: isProd,

    splitChunks: useModuleFederation
      ? {
          chunks: 'async',
        }
      : {
          cacheGroups: {
            vendors: {
              test: /[\\/]node_modules[\\/]/,
              name: 'vendor',
              chunks: 'all',
            },
          },
        },

    flagIncludedChunks: isProd,
    innerGraph: isProd,
    mergeDuplicateChunks: isProd,
    removeAvailableModules: isProd,
    providedExports: true,
  };

  if (isProd) {
    config.minimizer = [
      new TerserPlugin({
        terserOptions: {
          parse: {
            // We want terser to parse ecma 8 code. However, we don't want it
            // to apply any minification steps that turns valid ecma 5 code
            // into invalid ecma 5 code. This is why the 'compress' and 'output'
            // sections only apply transformations that are ecma 5 safe
            // https://github.com/facebook/create-react-app/pull/4234
            ecma: 8,
          },
          compress: {
            ecma: 5,
            warnings: false,
            // Disabled because of an issue with Uglify breaking seemingly valid code:
            // https://github.com/facebook/create-react-app/issues/2376
            // Pending further investigation:
            // https://github.com/mishoo/UglifyJS2/issues/2011
            comparisons: false,
            // Disabled because of an issue with Terser breaking valid code:
            // https://github.com/facebook/create-react-app/issues/5250
            // Pending further investigation:
            // https://github.com/terser-js/terser/issues/120
            inline: 2,
          },
          mangle: {
            safari10: true,
          },
          // Added for profiling in devtools
          // keep_classnames: isEnvProductionProfile,
          // keep_fnames: isEnvProductionProfile,
          output: {
            ecma: 5,
            comments: false,
            // Turned on because emoji and regex is not minified properly using default
            // https://github.com/facebook/create-react-app/issues/2488
            ascii_only: true,
          },
        },
        extractComments: false,
      }),

      new CssMinimizerPlugin(),
    ];
  }

  return config;
};

const plugins = () => {
  const base = [
    new HtmlWebpackPlugin(
      Object.assign(
        {},
        {
          inject: true,
          template: paths.appHtml,
          // for hot module reload to work, it is necessary to exclude the mf chunk
          // https://github.com/webpack/webpack-dev-server/issues/3038
          excludeChunks: useModuleFederation ? [MF_CONFIGURATION.name] : undefined,
        },
        isProd
          ? {
              minify: {
                removeComments: true,
                collapseWhitespace: true,
                removeRedundantAttributes: true,
                useShortDoctype: true,
                removeEmptyAttributes: true,
                removeStyleLinkTypeAttributes: true,
                keepClosingSlash: true,
                minifyJS: true,
                minifyCSS: true,
                minifyURLs: true,
              },
            }
          : undefined
      )
    ),

    isProd &&
      new MiniCssExtractPlugin({
        // Options similar to the same options in webpackOptions.output
        // both options are optional
        filename: filename('css', true),
        chunkFilename: chunkFilename('css', true),
      }),

    !disableESLintPlugin &&
      new ESLintPlugin({
        // Plugin options
        extensions: ['js', 'mjs', 'jsx', 'ts', 'tsx'],
        formatter: require.resolve('react-dev-utils/eslintFormatter'),
        eslintPath: require.resolve('eslint'),
        failOnError: !(isDev && emitErrorsAsWarnings),
        context: paths.appSrc,
        cache: true,
        cacheLocation: path.resolve(paths.appNodeModules, '.cache/.eslintcache'),
        // ESLint class options
        cwd: paths.appPath,
        resolvePluginsRelativeTo: __dirname,
        baseConfig: {
          extends: [require.resolve('eslint-config-react-app/base')],
          rules: {
            ...(!hasJsxRuntime && {
              'react/react-in-jsx-scope': 'error',
            }),
          },
        },
      }),

    isDev &&
      shouldUseReactRefresh &&
      new ReactRefreshWebpackPlugin({
        exclude: [/node_modules/, /bootstrap\.[jt]s$/],
        overlay: false,
      }),

    useTypeScript &&
      new ForkTsCheckerWebpackPlugin({
        async: isDev,
      }),

    isDev &&
      new CircularDependencyPlugin({
        onDetected({ paths, compilation }) {
          if (paths.some((path) => path.includes('node_modules'))) return;

          compilation.warnings.push(new Error(paths.join(' -> \n')));
        },
      }),

    shouldCompressionBundleToGz &&
      isProd &&
      new CompressionPlugin({
        test: /\.js(\?.*)?$/i,
        filename: '[path][base].gz',
        algorithm: 'gzip',
        deleteOriginalAssets: false,
      }),

    useModuleFederation && new ModuleFederationPlugin(MF_CONFIGURATION),

    // new LodashModuleReplacementPlugin({
    //   collections: true,
    //   paths: true,
    // }),

    new ExternalTemplateRemotesPlugin(),

    isDev && new DuplicatePackageCheckerPlugin(),

    new BundleAnalyzerPlugin({
      analyzerMode: process.env.STATS || 'disabled',
    }),
  ]?.filter(Boolean);

  return base;
};

const modules = () => {
  return {
    rules: [
      {
        test: /\.css$/i,
        use: cssLoaders(),
      },
      {
        test: /\.s[ac]ss$/i,
        use: cssLoaders('sass-loader'),
      },
      {
        test: /\.(png|svg|jpg|jpeg|gif)$/i,
        type: 'asset/resource',
      },
      {
        test: /\.(woff|woff2|eot|ttf|otf)$/i,
        type: 'asset/resource',
      },
      {
        test: /\.(csv|tsv)$/i,
        use: ['csv-loader'],
      },
      {
        test: /\.xml$/i,
        use: ['xml-loader'],
      },
      {
        test: /\.toml$/i,
        type: 'json',
        parser: {
          parse: toml.parse,
        },
      },
      {
        test: /\.yaml$/i,
        type: 'json',
        parser: {
          parse: yaml.parse,
        },
      },
      {
        test: /\.json5$/i,
        type: 'json',
        parser: {
          parse: json5.parse,
        },
      },
      {
        test: /\.mjs$/,
        exclude: [/node_modules/, /bootstrap\.[jt]s$/],
        use: {
          loader: 'babel-loader',
        },
      },
      {
        test: /\.[jt]sx?$/,
        exclude: [/node_modules/, /bootstrap\.[jt]s$/],
        use: {
          loader: 'babel-loader',
          options: {
            cacheDirectory: true,
            // plugins: ['react-refresh/babel'],
          },
        },
      },
      {
        test: /\.svg$/i,
        issuer: /\.[jt]sx?$/,
        use: [
          {
            loader: '@svgr/webpack',
            options: {
              svgoConfig: {
                plugins: [
                  {
                    name: 'removeAttrs',
                    params: {
                      attrs: ['svg:width', 'svg:height'],
                    },
                  },
                ],
              },
            },
          },
        ],
      },
    ],
  };
};

module.exports = {
  mode: isProd ? 'production' : isDev && 'development',
  target: ['browserslist'],
  entry: {
    entry: paths.appIndexJs,
  },

  // Webpack noise constrained to errors and warnings
  stats: 'errors-warnings',

  // Stop compilation early in production
  bail: isProd,

  // source maps for details when debugging on PROD
  devtool: isProd ? (shouldUseSourceMap ? 'source-map' : false) : isDev && 'cheap-module-source-map',

  // excluding dependencies from the output bundles
  externals: isLib ? ['react, react-dom'] : undefined,

  output: {
    path: paths.appBuild,
    pathinfo: isDev,
    publicPath: getPublicPath(isDev),

    // There will be one main bundle, and one file per asynchronous chunk.
    // In development, it does not produce real files.
    filename: filename('js', isProd),

    // There are also additional JS chunk files if you use code splitting.
    chunkFilename: chunkFilename('js', isProd),
    assetModuleFilename: 'static/media/[name].[hash][ext]',

    clean: true,
  },

  resolve: {
    extensions: ['.tsx', '.jsx', '.ts', '.js', '.json', '.css', '.scss', '.sass', '.jpg', 'jpeg', 'png'],
    alias: {
      '@': path.join(__dirname, '/src'),
      'global/window': path.join(__dirname, '/global/window'),
      'global/document': path.join(__dirname, '/global/document'),
    },
  },

  devServer: {
    port: DEV_PORT,
    hot: isDev,
    open: true,
    historyApiFallback: true,
    client: {
      overlay: { errors: true, warnings: false },
      progress: true,
      reconnect: 20,
    },
    static: {
      directory: paths.appPublic,
    },

    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
      'Access-Control-Allow-Headers': 'X-Requested-With, content-type, Authorization',
    },

    // if needed api
    // proxy: {
    //   '/api': 'http://localhost:3001',
    // },
  },

  optimization: optimization(),

  module: modules(),

  plugins: plugins(),
};
