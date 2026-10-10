import { RolldownMagicString } from 'rolldown'
import { parse, Visitor } from 'rolldown/utils'
import { defineConfig } from 'vite-plus'
import type { TsdownPluginOption } from 'vite-plus/pack'
import { appendExportEmptyToDts } from './build/dts-plugins'

const removeDtsPrivateFieldsPlugin: TsdownPluginOption = {
  name: 'hono:remove-dts-private-fields',
  async renderChunk(code, id) {
    if (!id.fileName.endsWith('.d.ts')) {
      return
    }

    const ast = await parse(id.fileName, code)
    const ms = new RolldownMagicString(code, { filename: id.fileName })

    new Visitor({
      ClassDeclaration: (node) => {
        node.body.body.forEach((elem) => {
          if (elem.type === 'PropertyDefinition' && elem.key.type === 'PrivateIdentifier') {
            this.info(`Removing private field from ${id.fileName}`)
            ms.remove(elem.start, elem.end)
          }
        })
      },
    }).visit(ast.program)

    return ms.toString()
  },
}

// JSDoc is kept in the .d.ts files, which editors read. Dropping it from the .js files makes the package smaller.
const removeJsDocPlugin: TsdownPluginOption = {
  name: 'hono:remove-jsdoc',
  async renderChunk(code, id) {
    if (!id.fileName.endsWith('.js')) {
      return
    }

    const { comments } = await parse(id.fileName, code)
    const ms = new RolldownMagicString(code, { filename: id.fileName })

    for (const comment of comments) {
      if (comment.type !== 'Block' || !comment.value.startsWith('*')) {
        continue
      }
      // Also remove the whitespace up to the next token, so no blank line is left behind
      let end = comment.end
      while (end < code.length && /\s/.test(code[end])) {
        end++
      }
      ms.remove(comment.start, end)
    }

    return ms.toString()
  },
}

const validatePackageExportsPlugin: TsdownPluginOption = {
  name: 'hono:validate-package-exports',
  async buildStart() {
    const validateExports = (
      source: Record<string, unknown>,
      target: Record<string, unknown>,
      fileName: string
    ) => {
      const isEntryInTarget = (entry: string): boolean => {
        if (entry in target) {
          return true
        }

        // e.g., "./utils/*" -> "./utils"
        const wildcardPrefix = entry.replace(/\/\*$/, '')
        if (entry.endsWith('/*')) {
          return Object.keys(target).some(
            (targetEntry) =>
              targetEntry.startsWith(wildcardPrefix + '/') && targetEntry !== wildcardPrefix
          )
        }

        const separatedEntry = entry.split('/')
        while (separatedEntry.length > 0) {
          const pattern = `${separatedEntry.join('/')}/*`
          if (pattern in target) {
            return true
          }
          separatedEntry.pop()
        }

        return false
      }

      Object.keys(source).forEach((sourceEntry) => {
        if (!isEntryInTarget(sourceEntry)) {
          throw new Error(`Missing "${sourceEntry}" in '${fileName}'`)
        }
      })
    }

    const pkgJson = await import('./package.json', { with: { type: 'json' } })
    const jsrJson = await import('./jsr.json', { with: { type: 'json' } })

    validateExports(pkgJson.exports, jsrJson.exports, 'jsr.json')
    validateExports(jsrJson.exports, pkgJson.exports, 'package.json')
  },
}

export default defineConfig({
  fmt: {
    printWidth: 100,
    trailingComma: 'es5',
    tabWidth: 2,
    semi: false,
    singleQuote: true,
    jsxSingleQuote: true,
    endOfLine: 'lf',
    sortImports: {
      newlinesBetween: false,
    },
    sortPackageJson: false,
    ignorePatterns: ['dist/', 'coverage/', '.wrangler/', 'pnpm-lock.yaml', '**/*.json', '**/*.mts'],
  },
  lint: {
    plugins: ['node', 'typescript', 'import', 'unicorn'],
    categories: {
      correctness: 'off',
    },
    env: {
      builtin: true,
      es2024: true,
    },
    globals: {
      __dirname: 'off',
      __filename: 'off',
      AbortController: 'readonly',
      AbortSignal: 'readonly',
      atob: 'readonly',
      Blob: 'readonly',
      BroadcastChannel: 'readonly',
      btoa: 'readonly',
      Buffer: 'readonly',
      ByteLengthQueuingStrategy: 'readonly',
      clearImmediate: 'readonly',
      clearInterval: 'readonly',
      clearTimeout: 'readonly',
      CloseEvent: 'readonly',
      CompressionStream: 'readonly',
      console: 'readonly',
      CountQueuingStrategy: 'readonly',
      crypto: 'readonly',
      Crypto: 'readonly',
      CryptoKey: 'readonly',
      CustomEvent: 'readonly',
      DecompressionStream: 'readonly',
      DOMException: 'readonly',
      Event: 'readonly',
      EventTarget: 'readonly',
      exports: 'off',
      fetch: 'readonly',
      File: 'readonly',
      FormData: 'readonly',
      global: 'readonly',
      Headers: 'readonly',
      MessageChannel: 'readonly',
      MessageEvent: 'readonly',
      MessagePort: 'readonly',
      module: 'off',
      navigator: 'readonly',
      Navigator: 'readonly',
      performance: 'readonly',
      Performance: 'readonly',
      PerformanceEntry: 'readonly',
      PerformanceMark: 'readonly',
      PerformanceMeasure: 'readonly',
      PerformanceObserver: 'readonly',
      PerformanceObserverEntryList: 'readonly',
      PerformanceResourceTiming: 'readonly',
      process: 'readonly',
      queueMicrotask: 'readonly',
      ReadableByteStreamController: 'readonly',
      ReadableStream: 'readonly',
      ReadableStreamBYOBReader: 'readonly',
      ReadableStreamBYOBRequest: 'readonly',
      ReadableStreamDefaultController: 'readonly',
      ReadableStreamDefaultReader: 'readonly',
      Request: 'readonly',
      require: 'off',
      Response: 'readonly',
      setImmediate: 'readonly',
      setInterval: 'readonly',
      setTimeout: 'readonly',
      structuredClone: 'readonly',
      SubtleCrypto: 'readonly',
      TextDecoder: 'readonly',
      TextDecoderStream: 'readonly',
      TextEncoder: 'readonly',
      TextEncoderStream: 'readonly',
      TransformStream: 'readonly',
      TransformStreamDefaultController: 'readonly',
      URL: 'readonly',
      URLSearchParams: 'readonly',
      WebAssembly: 'readonly',
      WebSocket: 'readonly',
      WritableStream: 'readonly',
      WritableStreamDefaultController: 'readonly',
      WritableStreamDefaultWriter: 'readonly',
      addEventListener: 'readonly',
    },
    ignorePatterns: ['.wrangler', '**/coverage', '**/dist'],
    rules: {
      'constructor-super': 'error',
      'for-direction': 'error',
      'getter-return': 'error',
      'no-async-promise-executor': 'error',
      'no-case-declarations': 'error',
      'no-class-assign': 'error',
      'no-compare-neg-zero': 'error',
      'no-cond-assign': 'error',
      'no-const-assign': 'error',
      'no-constant-binary-expression': 'error',
      'no-constant-condition': 'error',
      'no-control-regex': 'error',
      'no-debugger': ['error'],
      'no-delete-var': 'error',
      'no-dupe-class-members': 'error',
      'no-dupe-else-if': 'error',
      'no-dupe-keys': 'error',
      'no-duplicate-case': 'error',
      'no-empty': [
        'warn',
        {
          allowEmptyCatch: true,
        },
      ],
      'no-empty-character-class': 'error',
      'no-empty-pattern': 'error',
      'no-empty-static-block': 'error',
      'no-ex-assign': 'error',
      'no-extra-boolean-cast': 'error',
      'no-fallthrough': 'error',
      'no-func-assign': 'error',
      'no-global-assign': 'error',
      'no-import-assign': 'error',
      'no-invalid-regexp': 'error',
      'no-irregular-whitespace': 'error',
      'no-loss-of-precision': 'error',
      'no-misleading-character-class': 'error',
      'no-new-native-nonconstructor': 'error',
      'no-nonoctal-decimal-escape': 'error',
      'no-obj-calls': 'error',
      'no-prototype-builtins': 'error',
      'no-redeclare': 'error',
      'no-regex-spaces': 'error',
      'no-self-assign': 'error',
      'no-setter-return': 'error',
      'no-shadow-restricted-names': 'error',
      'no-sparse-arrays': 'error',
      'no-this-before-super': 'error',
      'no-unreachable': 'error',
      'no-unsafe-finally': 'error',
      'no-unsafe-negation': 'error',
      'no-unsafe-optional-chaining': 'error',
      'no-unused-labels': 'error',
      'no-unused-private-class-members': 'error',
      'no-unused-vars': [
        'warn',
        {
          args: 'all',
          argsIgnorePattern: '^_',
          caughtErrors: 'all',
          caughtErrorsIgnorePattern: '^_',
          destructuredArrayIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          ignoreRestSiblings: true,
        },
      ],
      'no-useless-backreference': 'error',
      'no-useless-catch': 'error',
      'no-with': 'error',
      'require-yield': 'error',
      'use-isnan': 'error',
      'valid-typeof': 'error',
      'no-array-constructor': 'error',
      'no-empty-function': [
        'error',
        {
          allow: ['arrowFunctions'],
        },
      ],
      'prefer-const': [
        'warn',
        {
          destructuring: 'all',
        },
      ],
      curly: ['error', 'all'],
      'import/consistent-type-specifier-style': ['error', 'prefer-top-level'],
      'import/no-duplicates': 'error',
      'node/no-exports-assign': 'error',
      'typescript/ban-ts-comment': [
        'error',
        {
          minimumDescriptionLength: 10,
        },
      ],
      'typescript/no-duplicate-enum-values': 'error',
      'typescript/no-explicit-any': 'warn',
      'typescript/no-extra-non-null-assertion': 'error',
      'typescript/no-misused-new': 'error',
      'typescript/no-namespace': 'error',
      'typescript/no-non-null-asserted-nullish-coalescing': 'error',
      'typescript/no-non-null-asserted-optional-chain': 'error',
      'typescript/no-this-alias': 'error',
      'typescript/no-unnecessary-type-constraint': 'error',
      'typescript/no-unsafe-declaration-merging': 'error',
      'typescript/no-wrapper-object-types': 'error',
      'typescript/prefer-as-const': 'error',
      'typescript/prefer-namespace-keyword': 'error',
      'typescript/triple-slash-reference': 'error',
      'typescript/adjacent-overload-signatures': 'error',
      'typescript/ban-tslint-comment': 'error',
      'typescript/class-literal-property-style': 'error',
      'typescript/consistent-type-assertions': 'error',
      'typescript/consistent-type-imports': [
        'error',
        {
          prefer: 'type-imports',
        },
      ],
    },
    overrides: [
      {
        files: ['**/*.ts', '**/*.tsx', '**/*.mts', '**/*.cts'],
        rules: {
          'constructor-super': 'off',
          'getter-return': 'off',
          'no-class-assign': 'off',
          'no-const-assign': 'off',
          'no-dupe-class-members': 'off',
          'no-dupe-keys': 'off',
          'no-func-assign': 'off',
          'no-import-assign': 'off',
          'no-new-native-nonconstructor': 'off',
          'no-obj-calls': 'off',
          'no-redeclare': 'off',
          'no-setter-return': 'off',
          'no-this-before-super': 'off',
          'no-unreachable': 'off',
          'no-unsafe-negation': 'off',
          'no-var': 'error',
          'no-with': 'off',
          'prefer-rest-params': 'error',
          'prefer-spread': 'error',
        },
      },
    ],
  },
  pack: {
    entry: ['src/**/*.ts', '!src/**/*.test.ts', '!src/**/*.test.tsx'],
    tsconfig: 'tsconfig.build.json',
    unbundle: true,
    format: ['esm'],
    dts: true,
    outExtensions: () => ({ js: '.js', dts: '.d.ts' }),
    plugins: [
      validatePackageExportsPlugin,
      removeJsDocPlugin,
      removeDtsPrivateFieldsPlugin,
      appendExportEmptyToDts,
    ],
  },
})
