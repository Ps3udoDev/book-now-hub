import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import { seedCafeteria } from "./seed/cafeteria.mjs";
import { seedInventory } from "./seed/inventory.mjs";
import { seedOperations } from "./seed/operations.mjs";

const TENANT_ID = "d699061e-e6ee-4b8c-a675-65a7bbbaa252";

function loadEnvIfNeeded() {
  if (
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.SUPABASE_SERVICE_ROLE_KEY
  ) {
    return;
  }
  const envPath = path.resolve(process.cwd(), ".env");
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (!match) continue;
    const key = match[1].trim();
    const val = match[2].trim().replace(/^["']|["']$/g, "");
    if (!process.env[key]) process.env[key] = val;
  }
}

async function main() {
  loadEnvIfNeeded();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    throw new Error(
      "Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env",
    );
  }

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false },
  });

  console.log("==> Ejecutando seed integral para dev-test...");
  const inv = await seedInventory(supabase);
  const cafe = await seedCafeteria(supabase);
  await seedOperations(supabase);

  // Verificar HTTP 200 en todas las URLs públicas de imágenes
  const allUrls = [...(inv?.imageUrls ?? []), ...(cafe?.imageUrls ?? [])];
  for (const url of allUrls) {
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`Imagen inaccesible (${res.status}): ${url}`);
    }
  }
  console.log(`==> ${allUrls.length} URLs de imágenes verificadas (HTTP 200).`);

  // Conteo final por tabla en dev-test
  const tenantTables = [
    "product_categories",
    "products",
    "product_sales",
    "menu_categories",
    "menu_items",
    "cafe_orders",
    "customers",
    "specialist_schedules",
    "specialist_services",
    "appointments",
    "commission_rules",
    "cash_registers",
    "cash_register_sessions",
    "orders",
    "invoices",
    "commissions",
  ];

  console.log("\n==> Conteos finales en dev-test:");
  for (const table of tenantTables) {
    const { count, error } = await supabase
      .from(table)
      .select("*", { count: "exact", head: true })
      .eq("tenant_id", TENANT_ID);
    if (error) throw new Error(`Error contando ${table}: ${error.message}`);
    console.log(`  ${table}: ${count}`);
  }
}

main().catch((err) => {
  console.error("Error en seed-dev-test-demo:", err);
  process.exit(1);
});
