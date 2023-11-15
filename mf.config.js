const NAME = 'mf1';
const BUNDLE_NAME = 'mf/entry.js';

// for check local dev port in MF
const LOCAL_DEV_PORT = 3001;

// TODO - IMPORTANT!! - ENTER PROD URL !!!
const PROD_URL = 'some_url...';

function getRemoteEntryUrl(mfName, remotePort, isDev) {
  if (isDev) {
    return `${mfName}@http//localhost:${remotePort}/${BUNDLE_NAME}`;
  }

  return `${mfName}@http//${PROD_URL}:${remotePort}/${BUNDLE_NAME}`;
}

module.exports = (deps, isDev) => {
  return {
    mfConfig: {
      name: NAME,
      library: { type: 'var', name: NAME },
      // path to remote mf
      filename: BUNDLE_NAME,
      // imporeted module
      exposes: {
        './OperatorPhone': './src/OperatorPhone/OperatorPhone.tsx',
      },
      // exported module
      remotes: {
        // mf2: getRemoteEntryUrl('mf2', 3002, isDev);
      },
      // shared common libs
      shared: {
        // ...deps,
        react: {
          // eager: true,
          singleton: true,
          requiredVersion: deps.react,
        },
        'react-dom': {
          // eager: true,
          singleton: true,
          requiredVersion: deps['react-dom'],
        },
      },
    },

    mfPort: LOCAL_DEV_PORT,
  };
};
