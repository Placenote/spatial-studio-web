// Rollup plugins
import babel from 'rollup-plugin-babel';
import { eslint } from 'rollup-plugin-eslint';
import resolve from 'rollup-plugin-node-resolve';
import commonjs from 'rollup-plugin-commonjs';
import replace from 'rollup-plugin-replace';
import { terser }  from 'rollup-plugin-terser';

const fileExtension  = (process.env.NODE_ENV === 'production') ? '.min.js' : '.js'

export default {
  input: 'src/mesh-manager.js',
  output: [
    // For browser configration (not recommeneded)
		{
			format: 'iife',
			name: 'MeshManager',
			file: `build/mesh-manager.iife${fileExtension}`,
      globals: {
        'three-full': 'Three',
        'jszip': 'JSZip',
        'jszip-utils': 'JSZipUtils'
      },
		},
    // ES6 configuration (recommended)
    {
      format: 'cjs',
      file: `build/mesh-manager.cjs${fileExtension}`,
    },
    // Node/CommonJS configuration (recommended)
		{
			format: 'es',
			file: `build/mesh-manager.es${fileExtension}`,
		}
	],
  external: ['three-full', 'jszip', 'jszip-utils'],
  plugins: [
    commonjs(),
    eslint(),
    babel({
      exclude: 'node_modules/**',
    }),
    replace({
      exclude: 'node_modules/**',
      ENV: JSON.stringify(process.env.NODE_ENV || 'development'),
    }),
    (process.env.NODE_ENV === 'production' && terser()),
  ],
};