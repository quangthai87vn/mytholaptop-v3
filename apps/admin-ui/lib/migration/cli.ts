/**
 * Migration CLI - Command Line Interface
 *
 * LUÔN LUÔN dùng WooCommerce REST API — KHÔNG kết nối MySQL WordPress trực tiếp.
 *
 * Ví dụ sử dụng:
 *   npx ts-node lib/migration/cli.ts migrate
 *   npx ts-node lib/migration/cli.ts migrate --dry-run
 *   npx ts-node lib/migration/cli.ts migrate --batch-size 10
 *   npx ts-node lib/migration/cli.ts status
 *   npx ts-node lib/migration/cli.ts stats
 */

import { WooToMedusaMigrator, WooCommerceRestConfig } from "./woo-to-medusa";
import { MedusaApiClient } from "./medusa-api-client";
import type { MedusaMigrationConfig } from "./medusa-migration-types";
import * as fs from "fs";
import * as path from "path";

/**
 * Load credentials from multiple sources with priority:
 * 1. data/settings.json (primary — has correct JWT token)
 * 2. lib/migration/.env (fallback for backward compatibility)
 *
 * CRITICAL: JWT tokens (eyJ...) always take precedence over sk_ API keys.
 * The .env file may contain sk_ API keys that are invalid; settings.json
 * has the correct JWT token that we must use.
 */
async function loadEnvFile(): Promise<Record<string, string>> {
  const envVars: Record<string, string> = {};

  // Priority 1: data/settings.json (has the correct JWT token)
  const settingsPath = path.join(process.cwd(), "data", "settings.json");
  let settingsJwtToken: string | null = null;
  try {
    if (fs.existsSync(settingsPath)) {
      const content = fs.readFileSync(settingsPath, "utf-8");
      const settings = JSON.parse(content);

      // WooCommerce
      if (settings.wooCommerce) {
        if (settings.wooCommerce.wordpressUrl) {
          envVars.WOO_API_BASE_URL = settings.wooCommerce.wordpressUrl;
        }
        if (settings.wooCommerce.consumerKey) {
          envVars.WOO_CONSUMER_KEY = settings.wooCommerce.consumerKey;
        }
        if (settings.wooCommerce.consumerSecret) {
          envVars.WOO_CONSUMER_SECRET = settings.wooCommerce.consumerSecret;
        }
      }

      // Medusa
      if (settings.medusa) {
        if (settings.medusa.backendUrl) {
          envVars.MEDUSA_BACKEND_URL = settings.medusa.backendUrl;
        }
        // JWT token is stored as adminApiKey in settings.json — this is the correct one
        if (settings.medusa.adminApiKey && settings.medusa.adminApiKey.startsWith("eyJ")) {
          settingsJwtToken = settings.medusa.adminApiKey;
          envVars.MEDUSA_ADMIN_API_KEY = settings.medusa.adminApiKey;
        }
        if (settings.medusa.adminEmail) {
          envVars.MEDUSA_ADMIN_EMAIL = settings.medusa.adminEmail;
        }
        if (settings.medusa.adminPassword) {
          envVars.MEDUSA_ADMIN_PASSWORD = settings.medusa.adminPassword;
        }
      }
    }
  } catch (err) {
    console.warn("[Migration] Could not read data/settings.json:", err instanceof Error ? err.message : String(err));
  }

  // Priority 2: lib/migration/.env (fallback)
  // BUT: Only override MEDUSA_ADMIN_API_KEY if the .env has a valid JWT token (eyJ...)
  // Do NOT override with sk_ API keys — use JWT from settings.json instead
  const envPath = path.join(process.cwd(), "lib", "migration", ".env");
  try {
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, "utf-8");
      for (const line of content.split("\n")) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) continue;
        const eqIdx = trimmed.indexOf("=");
        if (eqIdx === -1) continue;
        const key = trimmed.slice(0, eqIdx).trim();
        const value = trimmed.slice(eqIdx + 1).trim();
        if (!key || !value) continue;

        // Medusa API key: only use .env value if it's a valid JWT token
        // Do NOT use sk_ API keys from .env — they are invalid
        if (key === "MEDUSA_ADMIN_API_KEY") {
          if (value.startsWith("eyJ")) {
            // .env has a valid JWT — use it
            envVars[key] = value;
          } else {
            // .env has sk_ API key (invalid) — keep JWT from settings.json
            console.warn("[Migration] .env has invalid MEDUSA_ADMIN_API_KEY (sk_xxx). Using JWT from data/settings.json.");
          }
        } else {
          // All other keys: use .env value
          envVars[key] = value;
        }
      }
    }
  } catch (err) {
    console.warn("[Migration] Could not read lib/migration/.env:", err instanceof Error ? err.message : String(err));
  }

  // Apply env vars to process.env (only if not already set)
  for (const [key, value] of Object.entries(envVars)) {
    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }

  // If we have settings JWT but .env didn't override, ensure it's set
  if (settingsJwtToken && !process.env.MEDUSA_ADMIN_API_KEY) {
    process.env.MEDUSA_ADMIN_API_KEY = settingsJwtToken;
  }

  return envVars;
}

interface CliOptions {
  command: string;
  dryRun?: boolean;
  incremental?: boolean;
  batchSize?: number;
  configPath?: string;
  productIds?: string[];
  categoryIds?: string[];
}

async function parseArgs(): Promise<CliOptions> {
  const args = process.argv.slice(2);
  const options: CliOptions = {
    command: args[0] || "help",
  };

  for (let i = 1; i < args.length; i++) {
    const arg = args[i];
    const nextArg = args[i + 1];

    switch (arg) {
      case "--dry-run":
      case "-d":
        options.dryRun = true;
        break;
      case "--incremental":
      case "-i":
        options.incremental = true;
        break;
      case "--batch-size":
      case "-b":
        if (nextArg) {
          options.batchSize = parseInt(nextArg, 10);
          i++;
        }
        break;
      case "--config":
      case "-c":
        if (nextArg) {
          options.configPath = nextArg;
          i++;
        }
        break;
      case "--products":
        if (nextArg) {
          options.productIds = nextArg.split(",").map((s) => s.trim());
          i++;
        }
        break;
      case "--categories":
        if (nextArg) {
          options.categoryIds = nextArg.split(",").map((s) => s.trim());
          i++;
        }
        break;
    }
  }

  return options;
}

async function loadConfig(
  configPath?: string
): Promise<Record<string, unknown>> {
  if (!configPath) return {};

  try {
    const imported = await import(configPath);
    return (imported.default || imported) as Record<string, unknown>;
  } catch (error) {
    console.error(`Failed to load config from ${configPath}:`, error);
    process.exit(1);
  }
}

async function cmdHelp(): Promise<void> {
  console.log(`
WooCommerce to Medusa Migration CLI v2.0 (REST API)

LUÔN LUÔN dùng WooCommerce REST API — KHÔNG kết nối MySQL WordPress trực tiếp.

USAGE:
  npx ts-node lib/migration/cli.ts <command> [options]

COMMANDS:
  migrate     Chạy migration từ WooCommerce sang Medusa
  status      Kiểm tra trạng thái kết nối
  stats       Hiển thị thống kê từ cả hai hệ thống
  help        Hiển thị help này

OPTIONS:
  --dry-run, -d        Chạy thử không tạo thay đổi
  --incremental, -i    Chỉ migrate dữ liệu mới
  --batch-size, -b N   Số sản phẩm mỗi batch (default: 5)
  --config, -c FILE   Đường dẫn config file
  --products IDS       Danh sách product IDs (phân cách bằng dấu phẩy)
  --categories IDS     Danh sách category IDs (phân cách bằng dấu phẩy)

ENVIRONMENT VARIABLES:
  WOO_API_BASE_URL      WooCommerce REST API base URL (https://domain.com/wp-json)
  WOO_CONSUMER_KEY     WooCommerce Consumer Key (ck_...)
  WOO_CONSUMER_SECRET  WooCommerce Consumer Secret (cs_...)
  MEDUSA_BACKEND_URL    Medusa backend URL (default: http://localhost:9000)
  MEDUSA_ADMIN_API_KEY  Medusa admin API key (sk_xxx) — dung API Key hoac JWT
  MEDUSA_ADMIN_EMAIL    Medusa admin email (cho JWT auth)
  MEDUSA_ADMIN_PASSWORD Medusa admin password (cho JWT auth)

EXAMPLES:
  # Chạy migration đầy đủ
  npx ts-node lib/migration/cli.ts migrate

  # Chạy thử (dry-run)
  npx ts-node lib/migration/cli.ts migrate --dry-run

  # Chạy với batch size lớn hơn
  npx ts-node lib/migration/cli.ts migrate --batch-size 10

  # Kiểm tra trạng thái kết nối
  npx ts-node lib/migration/cli.ts status
`);
}

async function cmdStatus(config: Record<string, unknown>): Promise<void> {
  console.log(
    "\n=== WooCommerce to Medusa Status Check (REST API) ===\n"
  );

  let wooConnected = false;
  let medusaConnected = false;

  // Get WooCommerce config from file config or env vars
  const wooConfig: WooCommerceRestConfig = {
    baseUrl:
      (config.woo as WooCommerceRestConfig)?.baseUrl ||
      process.env.WOO_API_BASE_URL ||
      "",
    consumerKey:
      (config.woo as WooCommerceRestConfig)?.consumerKey ||
      process.env.WOO_CONSUMER_KEY ||
      "",
    consumerSecret:
      (config.woo as WooCommerceRestConfig)?.consumerSecret ||
      process.env.WOO_CONSUMER_SECRET ||
      "",
  };

  if (wooConfig.baseUrl) {
    console.log("Checking WooCommerce REST API connection...");
    console.log(`  URL: ${wooConfig.baseUrl}`);

    try {
      const https = await import("https");
      const http = await import("http");
      const { URL } = await import("url");

      const testUrl = new URL(
        `${wooConfig.baseUrl.replace(/\/wp-json$/i, "")}/wp-json/wc/v3/products/categories?per_page=1`
      );
      testUrl.searchParams.set("consumer_key", wooConfig.consumerKey || "");
      testUrl.searchParams.set("consumer_secret", wooConfig.consumerSecret || "");

      const protocol = testUrl.protocol === "https:" ? https : http;

      const result = await new Promise<{ success: boolean; statusCode?: number }>(
        (resolve) => {
          const req = protocol.get(testUrl.toString(), (res) => {
            res.resume();
            resolve({
              success: res.statusCode === 200,
              statusCode: res.statusCode,
            });
          });
          req.on("error", () => resolve({ success: false }));
          req.setTimeout(10000, () => {
            req.destroy();
            resolve({ success: false });
          });
        }
      );

      if (result.success) {
        wooConnected = true;
        console.log("  ✓ Connected to WooCommerce REST API");
      } else {
        console.log(
          `  ✗ Connection failed (HTTP ${result.statusCode || "timeout"})`
        );
      }
    } catch (error) {
      console.log(
        `  ✗ Connection failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  } else {
    console.log(
      "WooCommerce: No config found (set WOO_API_BASE_URL, WOO_CONSUMER_KEY, WOO_CONSUMER_SECRET env vars or --config)"
    );
  }

  console.log("");

  // Get Medusa config from file config or env vars
  const medusaConfig: MedusaMigrationConfig = {
    backendUrl:
      (config.medusa as MedusaMigrationConfig)?.backendUrl ||
      process.env.MEDUSA_BACKEND_URL ||
      "http://localhost:9000",
    adminApiKey:
      (config.medusa as MedusaMigrationConfig)?.adminApiKey ||
      process.env.MEDUSA_ADMIN_API_KEY ||
      "",
    adminEmail:
      (config.medusa as MedusaMigrationConfig)?.adminEmail ||
      process.env.MEDUSA_ADMIN_EMAIL ||
      "",
    adminPassword:
      (config.medusa as MedusaMigrationConfig)?.adminPassword ||
      process.env.MEDUSA_ADMIN_PASSWORD ||
      "",
    retryAttempts: 3,
    retryDelay: 1000,
    batchSize: 5,
    dryRun: false,
    skipImages: false,
    skipVariants: false,
    preserveIds: false,
  };

  if (medusaConfig.adminApiKey || medusaConfig.adminEmail) {
    console.log("Checking Medusa API connection...");
    const medusa = new MedusaApiClient(medusaConfig);
    try {
      const health = await medusa.healthCheck();
      if (health.connected) {
        medusaConnected = true;
        console.log(`  ✓ Connected to: ${medusaConfig.backendUrl}`);
        console.log(`    Auth: ${health.authMethod || "JWT"}`);
        console.log(`    Store: ${health.store || "Unknown"}`);
        console.log(`    User: ${health.user || "Unknown"}`);
        console.log(`    Version: ${health.version || "Unknown"}`);
      } else {
        console.log("  ✗ Connection failed");
      }
    } catch (error) {
      console.log(
        `  ✗ Connection failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  } else {
    console.log(
      "Medusa: No config found (set MEDUSA_ADMIN_API_KEY or MEDUSA_ADMIN_EMAIL+MEDUSA_ADMIN_PASSWORD env vars)"
    );
  }

  console.log("\n");
  console.log("Summary:");
  console.log(
    `  WooCommerce REST API: ${wooConnected ? "✓ Connected" : "✗ Not connected"}`
  );
  console.log(
    `  Medusa: ${medusaConnected ? "✓ Connected" : "✗ Not connected"}`
  );
  console.log("");
}

async function cmdStats(config: Record<string, unknown>): Promise<void> {
  console.log("\n=== System Statistics (REST API) ===\n");

  // Get WooCommerce config from file config or env vars
  const wooConfig: WooCommerceRestConfig = {
    baseUrl:
      (config.woo as WooCommerceRestConfig)?.baseUrl ||
      process.env.WOO_API_BASE_URL ||
      "",
    consumerKey:
      (config.woo as WooCommerceRestConfig)?.consumerKey ||
      process.env.WOO_CONSUMER_KEY ||
      "",
    consumerSecret:
      (config.woo as WooCommerceRestConfig)?.consumerSecret ||
      process.env.WOO_CONSUMER_SECRET ||
      "",
  };

  if (wooConfig.baseUrl) {
    try {
      const https = await import("https");
      const http = await import("http");

      console.log("WooCommerce REST API:");

      const [catResult, prodResult] = await Promise.all([
        new Promise<number>((resolve) => {
          const testUrl = new URL(
            `${wooConfig.baseUrl.replace(/\/wp-json$/i, "")}/wp-json/wc/v3/products/categories?per_page=1`
          );
          testUrl.searchParams.set("consumer_key", wooConfig.consumerKey || "");
          testUrl.searchParams.set("consumer_secret", wooConfig.consumerSecret || "");
          const protocol = testUrl.protocol === "https:" ? https : http;
          const req = protocol.get(testUrl.toString(), (res) => {
            const total = res.headers["x-wp-total"];
            res.resume();
            resolve(total ? parseInt(String(total), 10) : 0);
          });
          req.on("error", () => resolve(0));
          req.setTimeout(10000, () => {
            req.destroy();
            resolve(0);
          });
        }),
        new Promise<number>((resolve) => {
          const testUrl = new URL(
            `${wooConfig.baseUrl.replace(/\/wp-json$/i, "")}/wp-json/wc/v3/products?per_page=1`
          );
          testUrl.searchParams.set("consumer_key", wooConfig.consumerKey || "");
          testUrl.searchParams.set("consumer_secret", wooConfig.consumerSecret || "");
          const protocol = testUrl.protocol === "https:" ? https : http;
          const req = protocol.get(testUrl.toString(), (res) => {
            const total = res.headers["x-wp-total"];
            res.resume();
            resolve(total ? parseInt(String(total), 10) : 0);
          });
          req.on("error", () => resolve(0));
          req.setTimeout(10000, () => {
            req.destroy();
            resolve(0);
          });
        }),
      ]);

      console.log(`  Products: ${prodResult}`);
      console.log(`  Categories: ${catResult}`);
      console.log("");
    } catch (error) {
      console.log(
        `WooCommerce Error: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  const medusaConfig: MedusaMigrationConfig = {
    backendUrl:
      (config.medusa as MedusaMigrationConfig)?.backendUrl ||
      process.env.MEDUSA_BACKEND_URL ||
      "http://localhost:9000",
    adminApiKey:
      (config.medusa as MedusaMigrationConfig)?.adminApiKey ||
      process.env.MEDUSA_ADMIN_API_KEY ||
      "",
    adminEmail:
      (config.medusa as MedusaMigrationConfig)?.adminEmail ||
      process.env.MEDUSA_ADMIN_EMAIL ||
      "",
    adminPassword:
      (config.medusa as MedusaMigrationConfig)?.adminPassword ||
      process.env.MEDUSA_ADMIN_PASSWORD ||
      "",
    retryAttempts: 3,
    retryDelay: 1000,
    batchSize: 5,
    dryRun: false,
    skipImages: false,
    skipVariants: false,
    preserveIds: false,
  };

  if (medusaConfig.adminApiKey || medusaConfig.adminEmail) {
    const medusa = new MedusaApiClient(medusaConfig);
    try {
      const existing = await medusa.getExistingResources();

      console.log("Medusa Store:");
      console.log(`  Backend: ${medusaConfig.backendUrl}`);
      console.log(`  Existing Categories: ${existing.categories.size}`);
      console.log(`  Existing Tags: ${existing.tags.size}`);
      console.log(`  Existing Products: ${existing.products.size}`);
    } catch (error) {
      console.log(
        `Medusa Error: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  console.log("");
}

async function cmdMigrate(
  options: CliOptions,
  config: Record<string, unknown>
): Promise<void> {
  const migrationConfig = {
    woo: {
      baseUrl:
        (config.woo as WooCommerceRestConfig)?.baseUrl ||
        process.env.WOO_API_BASE_URL ||
        "",
      consumerKey:
        (config.woo as WooCommerceRestConfig)?.consumerKey ||
        process.env.WOO_CONSUMER_KEY ||
        "",
      consumerSecret:
        (config.woo as WooCommerceRestConfig)?.consumerSecret ||
        process.env.WOO_CONSUMER_SECRET ||
        "",
    },
    medusa: {
      backendUrl:
        (config.medusa as MedusaMigrationConfig)?.backendUrl ||
        process.env.MEDUSA_BACKEND_URL ||
        "http://localhost:9000",
      adminApiKey:
        (config.medusa as MedusaMigrationConfig)?.adminApiKey ||
        process.env.MEDUSA_ADMIN_API_KEY ||
        "",
      adminEmail:
        (config.medusa as MedusaMigrationConfig)?.adminEmail ||
        process.env.MEDUSA_ADMIN_EMAIL ||
        "",
      adminPassword:
        (config.medusa as MedusaMigrationConfig)?.adminPassword ||
        process.env.MEDUSA_ADMIN_PASSWORD ||
        "",
      retryAttempts: 3,
      retryDelay: 1000,
      batchSize: options.batchSize || 5,
      dryRun: options.dryRun || false,
      skipImages: false,
      skipVariants: false,
      preserveIds: false,
    },
    options: {
      source: "woocommerce" as const,
      mode: options.incremental ? ("incremental" as const) : ("full" as const),
      productIds: options.productIds,
      categoryIds: options.categoryIds,
    },
  };

  const migrator = new WooToMedusaMigrator(migrationConfig);

  try {
    const result = await migrator.migrate();

    console.log("\n=== Migration Result ===\n");
    console.log(`Success: ${result.success ? "✓ Yes" : "✗ No"}`);
    console.log(`Duration: ${Math.round(result.duration / 1000)}s`);
    console.log(`Categories: ${result.categoriesMigrated}`);
    console.log(`Tags: ${result.tagsMigrated}`);
    console.log(`Products: ${result.productsMigrated}`);
    console.log(`Errors: ${result.errors.length}`);

    if (result.errors.length > 0) {
      console.log("\nErrors:");
      result.errors.slice(0, 20).forEach((err, i) => {
        console.log(
          `  ${i + 1}. [${err.type}] ${err.sourceId}: ${err.message}`
        );
      });
      if (result.errors.length > 20) {
        console.log(`  ... and ${result.errors.length - 20} more`);
      }
    }

    console.log("");
    process.exitCode = result.success ? 0 : 1;
  } catch (error) {
    console.error(
      "\nMigration failed:",
      error instanceof Error ? error.message : String(error)
    );
    process.exit(1);
  }
}

async function main(): Promise<void> {
  // Load credentials from data/settings.json (primary) and lib/migration/.env (fallback)
  await loadEnvFile();

  const options = await parseArgs();

  switch (options.command) {
    case "help":
    case "--help":
    case "-h":
      await cmdHelp();
      break;

    case "migrate": {
      const config = await loadConfig(options.configPath);
      await cmdMigrate(options, config);
      break;
    }

    case "status": {
      const statusConfig = await loadConfig(options.configPath);
      await cmdStatus(statusConfig);
      break;
    }

    case "stats": {
      const statsConfig = await loadConfig(options.configPath);
      await cmdStats(statsConfig);
      break;
    }

    default:
      console.error(`Unknown command: ${options.command}\n`);
      await cmdHelp();
      process.exit(1);
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error("CLI Error:", error);
    process.exit(1);
  });
}

export { cmdHelp, cmdStatus, cmdStats, cmdMigrate };
