import dotenv from "dotenv"
import { homedir } from "os"
import { YAMLTryParse } from "./yaml"
import { JSON5TryParse } from "./json5"
import {
    DOT_ENV_FILENAME,
    DOT_ENV_GENAISCRIPT_FILENAME,
    MODEL_PROVIDERS,
    TOOL_ID,
} from "./constants"
import { join, resolve } from "path"
import { validateJSONWithSchema } from "./schema"
import { HostConfiguration } from "./hostconfiguration"
import { structuralMerge } from "./merge"
import {
    LanguageModelConfiguration,
    ResolvedLanguageModelConfiguration,
} from "./server/messages"
import { resolveLanguageModel } from "./lm"
import { arrayify, deleteEmptyValues } from "./cleaners"
import { errorMessage } from "./error"
import schema from "../../../docs/public/schemas/config.json"
import defaultConfig from "./config.json"
import { CancellationOptions } from "./cancellation"
import { host } from "./host"
import { uniq } from "es-toolkit"
import { expandHomeDir, tryReadText, tryStat } from "./fs"
import { parseDefaultsFromEnv } from "./env"

import debug from "debug"
const dbg = debug("genaiscript:config")

async function resolveGlobalConfiguration(
    dotEnvPaths?: string[]
): Promise<HostConfiguration> {
    const dirs = [homedir(), "."]
    const exts = ["yml", "yaml", "json"]

    dbg("starting to resolve global configuration")
    // import and merge global local files
    let config: HostConfiguration = structuredClone(defaultConfig)
    delete (config as any)["$schema"]
    dbg("initialized config from defaultConfig")

    for (const dir of dirs) {
        for (const ext of exts) {
            const filename = resolve(dir, `${TOOL_ID}.config.${ext}`)
            dbg(`checking file: ${filename}`)
            const stat = await tryStat(filename)
            if (!stat) continue
            if (!stat.isFile()) {
                dbg(`skipping ${filename}, not a file`)
                throw new Error(`config: ${filename} is a not a file`)
            }
            const fileContent = await tryReadText(filename)
            if (!fileContent) {
                dbg(`skipping ${filename}, no content`)
                continue
            }
            dbg(`loading ${filename}`)
            const parsed: HostConfiguration =
                ext === "yml" || ext === "yaml"
                    ? YAMLTryParse(fileContent)
                    : JSON5TryParse(fileContent)
            if (!parsed) {
                dbg(`failed to parse ${filename}`)
                throw new Error(`config: failed to parse ${filename}`)
            }
            dbg("validating config schema")
            const validation = validateJSONWithSchema(
                parsed,
                schema as JSONSchema
            )
            if (validation.schemaError) {
                dbg(
                    `validation error for ${filename}: ${validation.schemaError}`
                )
                throw new Error(`config: ` + validation.schemaError)
            }
            dbg("merging parsed configuration", parsed)
            config = deleteEmptyValues({
                include: structuralMerge(
                    config?.include || [],
                    parsed?.include || []
                ),
                envFile: [
                    ...arrayify(parsed?.envFile),
                    ...arrayify(config?.envFile),
                ],
                modelAliases: structuralMerge(
                    config?.modelAliases || {},
                    parsed?.modelAliases || {}
                ),
                modelEncodings: structuralMerge(
                    config?.modelEncodings || {},
                    parsed?.modelEncodings || {}
                ),
                secretScanners: structuralMerge(
                    config?.secretPatterns || {},
                    parsed?.secretPatterns || {}
                ),
            })
        }
    }

    if (process.env.GENAISCRIPT_ENV_FILE) {
        dbg(
            `adding env file from environment variable: '${process.env.GENAISCRIPT_ENV_FILE}'`
        )
        config.envFile = [
            ...(config.envFile || []),
            process.env.GENAISCRIPT_ENV_FILE,
        ]
    }
    if (dotEnvPaths?.length) {
        dbg(`adding env files from CLI: '${dotEnvPaths.join(", ")}'`)
        config.envFile = [...(config.envFile || []), ...dotEnvPaths]
    }

    if (!config.envFile?.length) {
        dbg("no env files found, using defaults")
        config.envFile = [
            join(homedir(), DOT_ENV_GENAISCRIPT_FILENAME),
            DOT_ENV_GENAISCRIPT_FILENAME,
            DOT_ENV_FILENAME,
        ]
    }
    dbg("resolving env file paths")
    config.envFile = uniq(
        arrayify(config.envFile).map((f) => expandHomeDir(resolve(f)))
    )
    dbg(`resolved env files: ${config.envFile.join(", ")}`)
    return config
}

/**
 * Reads and resolves the configuration for the host environment.
 *
 * @param dotEnvPaths - Optional array of .env file paths to consider. If provided, these paths will be prioritized.
 *
 * Steps:
 * - Calls `resolveGlobalConfiguration` to load base configurations from default paths and files.
 * - Processes specified `.env` files to load environment variables.
 * - Validates the existence and file type of each `.env` file.
 * - Loads and overrides environment variables using `dotenv`.
 * - Parses additional defaults from the current `process.env`.
 * - Ensures unique resolution of `.env` file paths.
 *
 * @returns The resolved host configuration including merged and validated settings.
 *
 * @throws An error if any provided `.env` file is invalid, unreadable, or not a file.
 */
export async function readConfig(
    dotEnvPaths?: string[]
): Promise<HostConfiguration> {
    dbg(`reading configuration`)
    const config = await resolveGlobalConfiguration(dotEnvPaths)
    const { envFile } = config
    for (const dotEnv of arrayify(envFile)) {
        dbg(`.env: ${dotEnv}`)
        const stat = await tryStat(dotEnv)
        if (!stat) {
            dbg(`ignored ${dotEnv}, not found`)
        } else {
            if (!stat.isFile()) {
                throw new Error(`.env: ${dotEnv} is not a file`)
            }
            dbg(`loading ${dotEnv}`)
            const res = dotenv.config({
                path: dotEnv,
                debug: /dotenv/.test(process.env.DEBUG),
                override: true,
            })
            if (res.error) {
                throw res.error
            }
        }
    }
    await parseDefaultsFromEnv(process.env)
    return config
}

/**
 * Resolves and outputs environment information for language model providers.
 * @param provider - Filters by specific provider. If not provided, resolves all providers.
 * @param options - Configuration options:
 *   - token - Include tokens in the output. If false, tokens are masked.
 *   - error - Include errors in the output.
 *   - models - List models for each provider if supported.
 *   - hide - Exclude hidden providers from the output.
 *   - cancellation options - Additional cancellation options.
 * @returns Sorted list of resolved language model configurations, including errors if applicable.
 * @throws An error if there is an issue retrieving or processing configurations for a provider.
 */
export async function resolveLanguageModelConfigurations(
    provider: string,
    options?: {
        token?: boolean
        error?: boolean
        models?: boolean
        hide?: boolean
    } & CancellationOptions
): Promise<ResolvedLanguageModelConfiguration[]> {
    const { token, error, models, hide } = options || {}
    const res: ResolvedLanguageModelConfiguration[] = []
    dbg("starting to resolve language model configurations")

    for (const modelProvider of MODEL_PROVIDERS.filter(
        (mp) => (!provider || mp.id === provider) && (!hide || !mp.hidden)
    )) {
        dbg(`processing model provider: ${modelProvider.id}, token: ${token}`)
        try {
            const conn: LanguageModelConfiguration & {
                models?: LanguageModelInfo[]
            } = await host.getLanguageModelConfiguration(
                modelProvider.id + ":*",
                options
            )
            if (conn) {
                dbg(
                    `retrieved connection configuration for provider: ${modelProvider.id}`
                )
                let listError = ""
                if (models && token) {
                    dbg(`listing models for provider: ${modelProvider.id}`)
                    const lm = await resolveLanguageModel(modelProvider.id)
                    if (lm.listModels) {
                        const models = await lm.listModels(conn, options)
                        if (models.ok) {
                            dbg(
                                `successfully listed models for provider: ${modelProvider.id}`
                            )
                            conn.models = models.models
                        } else {
                            listError =
                                errorMessage(models.error) ||
                                "failed to list models"
                            dbg(
                                `error listing models for provider ${modelProvider.id}: ${listError}`
                            )
                        }
                    }
                }
                if (!token && conn.token) conn.token = "***"
                if (!listError || error || provider) {
                    dbg(
                        `adding resolved configuration for provider: ${modelProvider.id}`
                    )
                    res.push(
                        deleteEmptyValues({
                            provider: conn.provider,
                            source: conn.source,
                            base: conn.base,
                            type: conn.type,
                            models: conn.models,
                            error: listError,
                        })
                    )
                }
            }
        } catch (e) {
            dbg(
                `error resolving configuration for provider ${modelProvider.id}: ${e}`
            )
            if (error || provider)
                res.push({
                    provider: modelProvider.id,
                    error: errorMessage(e),
                })
        }
    }
    dbg("returning sorted resolved configurations")
    return res.sort((l, r) => l.provider.localeCompare(r.provider))
}
