// patch-package cannot target a package nested inside another package's own
// node_modules (node_modules/@nxrocks/nx-flutter/node_modules/@nxrocks/common),
// so this one-off, idempotent script applies that specific fix after install.
//
// Bug: Nx 23's isolated plugin worker sometimes invokes a plugin's createNodesV2
// callback once with the *entire* matched-files array before replaying it
// correctly file-by-file. @nxrocks/common's createNodesInternal() then calls
// path.isAbsolute() on that array, which throws
// "The 'path' argument must be of type string. Received an instance of Array".
// Fix: when called with an array, delegate to Nx's own createNodesFromFiles
// helper (already imported in this file as devkit_1) instead of crashing —
// that produces the same result shape Nx expects for a batch call.
const fs = require('fs');
const path = require('path');

const target = path.join(
  __dirname,
  '..',
  '..',
  'node_modules',
  '@nxrocks',
  'nx-flutter',
  'node_modules',
  '@nxrocks',
  'common',
  'src',
  'lib',
  'workspace',
  'project-graph.js',
);

if (!fs.existsSync(target)) {
  // Nested copy not present (e.g. hoisted differently) — nothing to patch.
  process.exit(0);
}

const marker = 'Nx\'s isolated plugin worker occasionally invokes this callback';
const source = fs.readFileSync(target, 'utf8');

if (source.includes(marker)) {
  process.exit(0); // already patched
}

const needle = `function createNodesInternal(projectFilter, getProjectTypeAndTargets, pluginName) {
    return (file, options, context) => {
        if (!projectFilter({ root: (0, utils_1.getProjectRootFromFile)(file) })) {
            return {}; // back off if the file/project does not match the criteria
        }
        const root = (0, path_1.dirname)(file);
        // eslint-disable-next-line no-useless-escape -- eslint's wrong
        const parts = root.split(/[\\/\\\\]/g);
        const name = parts[parts.length - 1].toLowerCase();
        return {
            projects: {
                [name]: {
                    name,
                    root,
                    ...((0, utils_1.isNxCrystalEnabled)()
                        ? getProjectTypeAndTargets(file, options)
                        : {}),
                    tags: [\`type:\${pluginName.replace('@nxrocks/', '')}\`],
                },
            },
        };
    };
}`;

const replacement = `function createNodesInternal(projectFilter, getProjectTypeAndTargets, pluginName) {
    const singleFileHandler = (file, options, context) => {
        if (!projectFilter({ root: (0, utils_1.getProjectRootFromFile)(file) })) {
            return {}; // back off if the file/project does not match the criteria
        }
        const root = (0, path_1.dirname)(file);
        // eslint-disable-next-line no-useless-escape -- eslint's wrong
        const parts = root.split(/[\\/\\\\]/g);
        const name = parts[parts.length - 1].toLowerCase();
        return {
            projects: {
                [name]: {
                    name,
                    root,
                    ...((0, utils_1.isNxCrystalEnabled)()
                        ? getProjectTypeAndTargets(file, options)
                        : {}),
                    tags: [\`type:\${pluginName.replace('@nxrocks/', '')}\`],
                },
            },
        };
    };
    // Nx's isolated plugin worker occasionally invokes this callback once with
    // the full matched-files array before replaying it correctly file-by-file
    // (observed on Nx 23). Delegate that batch call to Nx's own createNodesFromFiles
    // helper instead of crashing (path.isAbsolute, called on a single file below,
    // rejects arrays).
    return (file, options, context) => {
        if (Array.isArray(file)) {
            return (0, devkit_1.createNodesFromFiles)(singleFileHandler, file, options, context);
        }
        return singleFileHandler(file, options, context);
    };
}`;

if (!source.includes(needle)) {
  console.warn(
    '[patch-nx-flutter-nested-common] Expected code not found — @nxrocks/nx-flutter may have been updated. Skipping patch; verify the array-input crash is still fixed.',
  );
  process.exit(0);
}

fs.writeFileSync(target, source.replace(needle, replacement));
console.log('[patch-nx-flutter-nested-common] Patched nested @nxrocks/common createNodesInternal.');
