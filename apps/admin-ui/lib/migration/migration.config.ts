/**
 * Migration Configuration Template
 *
 * Copy file này thành migration.config.ts và điền thông tin của bạn.
 * KHÔNG commit file config với API keys vào repository.
 *
 * LUÔN LUÔN dùng WooCommerce REST API — KHÔNG kết nối MySQL WordPress trực tiếp.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const config: any = {
  woo: {
    // WooCommerce REST API base URL (phải chứa /wp-json)
    baseUrl: process.env.WOO_API_BASE_URL || "https://mytholaptop.vn/wp-json",
    // Consumer Key từ WooCommerce Admin > Settings > Advanced > REST API
    consumerKey: process.env.WOO_CONSUMER_KEY || "",
    // Consumer Secret từ WooCommerce Admin
    consumerSecret: process.env.WOO_CONSUMER_SECRET || "",
  },

  medusa: {
    backendUrl: process.env.MEDUSA_BACKEND_URL || "http://localhost:9000",
    // API Key (sk_xxx) — ưu tiên dùng nếu có
    adminApiKey: process.env.MEDUSA_ADMIN_API_KEY || "",
    // JWT auth — dùng nếu không có API Key
    adminEmail: process.env.MEDUSA_ADMIN_EMAIL || "",
    adminPassword: process.env.MEDUSA_ADMIN_PASSWORD || "",
    retryAttempts: 3,
    retryDelay: 1000,
    batchSize: 5,
    dryRun: false,
    skipImages: false,
    skipVariants: false,
    preserveIds: false,
  },

  options: {
    source: "woocommerce",
    mode: "full",
    preserveSourceIds: true,
    mapSourceImages: true,
    createMissingCategories: true,
    createMissingTags: true,
    setProductsPublished: true,
  },
};

export default config;
