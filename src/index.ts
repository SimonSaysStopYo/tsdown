import process from 'node:process'
import { rolldown, type InputOptions } from 'rolldown'
import { IsolatedDecl } from 'unplugin-isolated-decl'
import { cleanOutDir } from './features/clean'
import { ExternalPlugin } from './features/external'
import { resolveOutputExtension } from './features/output'
import {
  normalizeOptions,
  type Options,
  type OptionsWithoutConfig,
} from './options'
import { logger } from './utils/logger'
import { readPackageJson } from './utils/package'

export async function build(userOptions: Options = {}): Promise<void> {
  const {
    entry,
    external,
    plugins,
    outDir,
    format,
    clean,
    platform,
    alias,
    treeshake,
    dts,
  } = await normalizeOptions(userOptions)

  if (clean) await cleanOutDir(outDir, clean)

  const pkg = await readPackageJson(process.cwd())

  const inputOptions: InputOptions = {
    input: entry,
    external,
    resolve: { alias },
    treeshake,
    plugins: [
      ExternalPlugin(pkg, platform),
      dts && IsolatedDecl.rolldown(dts === true ? {} : dts),
      ...plugins,
    ].filter((plugin) => !!plugin),
  }
  const build = await rolldown(inputOptions)

  await Promise.all(
    format.map((format) => {
      const extension = resolveOutputExtension(pkg, format)
      return build.write({
        format,
        dir: outDir,
        entryFileNames: `[name].${extension}`,
        chunkFileNames: `[name]-[hash].${extension}`,
      })
    }),
  )
  await build.destroy()

  logger.info('Build complete')
  // FIXME https://github.com/rolldown/rolldown/issues/1274
  process.exit(0)
}

export function defineConfig(
  options: OptionsWithoutConfig,
): OptionsWithoutConfig {
  return options
}
