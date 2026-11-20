const TENANT_ID = "d699061e-e6ee-4b8c-a675-65a7bbbaa252";
const BRANCH_ID = "1dcbd4e0-79f9-4ee4-9c56-1cc66693d387";
const MIGUEL_ID = "52d563f1-64ef-4439-b50c-02119170e198";
const JAVIER_ID = "776f9e16-1796-4324-b75e-64e5859c5da6";

const uuid = (suffix) => `d699061e-1000-4000-8000-${String(suffix).padStart(12, "0")}`;

const CATEGORIES = [
  { id: uuid(1), tenant_id: TENANT_ID, name: "Capilar", icon: "Sparkles", sort_order: 1 },
  { id: uuid(2), tenant_id: TENANT_ID, name: "Skincare", icon: "Droplets", sort_order: 2 },
  { id: uuid(3), tenant_id: TENANT_ID, name: "Styling", icon: "Wand2", sort_order: 3 },
];

const PRODUCTS = [
  {
    id: uuid(11),
    tenant_id: TENANT_ID,
    branch_id: BRANCH_ID,
    name: "Kit Reconstrucción Capilar Deluxe",
    brand: "Kérastase",
    category: "Capilar",
    sku: "DEV-CAP-001",
    description: "Tratamiento intensivo con queratina y aceites botánicos para fibra capilar dañada.",
    price: 48,
    currency_iso: "USD",
    stock_quantity: 22,
    min_stock_alert: 5,
    is_active: true,
    palette: ["#1e1b4b", "#6366f1", "#e0e7ff"],
    subtitle: "KERATIN REPAIR",
  },
  {
    id: uuid(12),
    tenant_id: TENANT_ID,
    branch_id: BRANCH_ID,
    name: "Sérum Brillo Seda Argán",
    brand: "Moroccanoil",
    category: "Capilar",
    sku: "DEV-CAP-002",
    description: "Elixir ligero de argán puro que sella puntas y aporta brillo inmediato sin peso.",
    price: 34,
    currency_iso: "USD",
    stock_quantity: 26,
    min_stock_alert: 5,
    is_active: true,
    palette: ["#451a03", "#d97706", "#fef3c7"],
    subtitle: "ARGAN ELIXIR",
  },
  {
    id: uuid(13),
    tenant_id: TENANT_ID,
    branch_id: BRANCH_ID,
    name: "Bruma Hidratante Facial",
    brand: "La Roche-Posay",
    category: "Skincare",
    sku: "DEV-SKN-001",
    description: "Bruma calmante con ácido hialurónico y agua termal para hidratación continua.",
    price: 26,
    currency_iso: "USD",
    stock_quantity: 18,
    min_stock_alert: 5,
    is_active: true,
    palette: ["#0c4a6e", "#0ea5e9", "#e0f2fe"],
    subtitle: "HYDRA MIST",
  },
  {
    id: uuid(14),
    tenant_id: TENANT_ID,
    branch_id: BRANCH_ID,
    name: "Sérum Vitamina C Iluminador",
    brand: "SkinCeuticals",
    category: "Skincare",
    sku: "DEV-SKN-002",
    description: "Antioxidante concentrado al 15% para unificar el tono y potenciar la luminosidad.",
    price: 55,
    currency_iso: "USD",
    stock_quantity: 14,
    min_stock_alert: 4,
    is_active: true,
    palette: ["#7c2d12", "#f97316", "#ffedd5"],
    subtitle: "VITAMIN C 15%",
  },
  {
    id: uuid(15),
    tenant_id: TENANT_ID,
    branch_id: BRANCH_ID,
    name: "Cera Mate Texturizante",
    brand: "Olaplex",
    category: "Styling",
    sku: "DEV-STY-001",
    description: "Definición natural con acabado mate y fijación moldeable durante todo el día.",
    price: 22,
    currency_iso: "USD",
    stock_quantity: 28,
    min_stock_alert: 6,
    is_active: true,
    palette: ["#18181b", "#52525b", "#f4f4f5"],
    subtitle: "MATTE CLAY",
  },
  {
    id: uuid(16),
    tenant_id: TENANT_ID,
    branch_id: BRANCH_ID,
    name: "Spray Fijación Flexible",
    brand: "Schwarzkopf",
    category: "Styling",
    sku: "DEV-STY-002",
    description: "Laca micro-difusión resistente a la humedad sin dejar residuos visibles.",
    price: 19,
    currency_iso: "USD",
    stock_quantity: 16,
    min_stock_alert: 5,
    is_active: true,
    palette: ["#3b0764", "#a855f7", "#f3e8ff"],
    subtitle: "FLEX HOLD",
  },
];

function buildProductSvg(product) {
  const [bg, accent, soft] = product.palette;
  const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400" width="400" height="400">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${bg}"/>
      <stop offset="100%" stop-color="${accent}"/>
    </linearGradient>
  </defs>
  <rect width="400" height="400" rx="28" fill="url(#g)"/>
  <circle cx="320" cy="80" r="90" fill="${soft}" opacity="0.14"/>
  <circle cx="75" cy="330" r="70" fill="${soft}" opacity="0.1"/>
  <rect x="148" y="88" width="104" height="24" rx="6" fill="${soft}" opacity="0.9"/>
  <rect x="166" y="70" width="68" height="22" rx="4" fill="${soft}" opacity="0.7"/>
  <rect x="128" y="114" width="144" height="196" rx="20" fill="${soft}" opacity="0.95"/>
  <rect x="144" y="156" width="112" height="104" rx="10" fill="${bg}" opacity="0.1"/>
  <text x="200" y="198" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-size="13" font-weight="700" letter-spacing="2" fill="${bg}">${esc(product.brand.toUpperCase())}</text>
  <text x="200" y="224" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-size="11" font-weight="600" letter-spacing="1.5" fill="${accent}">${esc(product.subtitle)}</text>
  <text x="200" y="356" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-size="15" font-weight="600" fill="${soft}">${esc(product.name)}</text>
</svg>`;
}

function currentMonthIso(dayOffset) {
  const now = new Date();
  const day = Math.max(1, now.getUTCDate() - dayOffset);
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), day, 15, 30, 0)).toISOString();
}

export async function seedInventory(supabase) {
  const { error: catErr } = await supabase
    .from("product_categories")
    .upsert(CATEGORIES, { onConflict: "id" });
  if (catErr) throw new Error(`product_categories upsert failed: ${catErr.message}`);

  const productRows = PRODUCTS.map(({ palette: _p, subtitle: _s, ...row }) => row);
  const { error: prodErr } = await supabase
    .from("products")
    .upsert(productRows, { onConflict: "id" });
  if (prodErr) throw new Error(`products upsert failed: ${prodErr.message}`);

  const imageUrls = [];
  const imageRows = [];

  for (let i = 0; i < PRODUCTS.length; i++) {
    const product = PRODUCTS[i];
    const path = `${TENANT_ID}/products/${product.id}/primary.svg`;
    const svgBuffer = Buffer.from(buildProductSvg(product), "utf8");

    const { error: upErr } = await supabase.storage
      .from("product-images")
      .upload(path, svgBuffer, { upsert: true, contentType: "image/svg+xml" });
    if (upErr) throw new Error(`storage upload failed for ${path}: ${upErr.message}`);

    const { data: pub } = supabase.storage.from("product-images").getPublicUrl(path);
    const res = await fetch(pub.publicUrl);
    if (!res.ok) {
      throw new Error(`Image URL returned HTTP ${res.status}: ${pub.publicUrl}`);
    }

    imageUrls.push(pub.publicUrl);
    imageRows.push({
      id: uuid(21 + i),
      product_id: product.id,
      storage_path: path,
      is_primary: true,
      sort_order: 0,
    });
  }

  const { error: imgErr } = await supabase
    .from("product_images")
    .upsert(imageRows, { onConflict: "id" });
  if (imgErr) throw new Error(`product_images upsert failed: ${imgErr.message}`);

  const entries = PRODUCTS.map((p, i) => ({
    id: uuid(31 + i),
    product_id: p.id,
    branch_id: BRANCH_ID,
    movement_type: "entry",
    quantity: p.stock_quantity + 5,
    reason: "Carga inicial de inventario demo",
  }));

  const exitsAndWithdrawals = [
    {
      id: uuid(41),
      product_id: uuid(11),
      branch_id: BRANCH_ID,
      movement_type: "exit",
      quantity: 3,
      reason: "Venta en mostrador",
    },
    {
      id: uuid(42),
      product_id: uuid(12),
      branch_id: BRANCH_ID,
      movement_type: "exit",
      quantity: 4,
      reason: "Venta en mostrador",
    },
    {
      id: uuid(43),
      product_id: uuid(13),
      branch_id: BRANCH_ID,
      movement_type: "exit",
      quantity: 2,
      reason: "Venta en mostrador",
    },
    {
      id: uuid(44),
      product_id: uuid(15),
      branch_id: BRANCH_ID,
      movement_type: "specialist_withdrawal",
      specialist_id: MIGUEL_ID,
      quantity: 2,
      reason: "Uso en cabina - Miguel",
    },
    {
      id: uuid(45),
      product_id: uuid(16),
      branch_id: BRANCH_ID,
      movement_type: "specialist_withdrawal",
      specialist_id: JAVIER_ID,
      quantity: 2,
      reason: "Uso en cabina - Javier Calva",
    },
  ];

  const allMovements = [...entries, ...exitsAndWithdrawals];
  const { data: existingMovs, error: movCheckErr } = await supabase
    .from("inventory_movements")
    .select("id")
    .in("id", allMovements.map((m) => m.id));
  if (movCheckErr) throw new Error(`inventory_movements check failed: ${movCheckErr.message}`);

  const existingMovIds = new Set((existingMovs || []).map((m) => m.id));
  const missingEntries = entries.filter((m) => !existingMovIds.has(m.id));
  const missingExits = exitsAndWithdrawals.filter((m) => !existingMovIds.has(m.id));

  if (missingEntries.length > 0) {
    const { error: entErr } = await supabase.from("inventory_movements").insert(missingEntries);
    if (entErr) throw new Error(`inventory_movements entry insert failed: ${entErr.message}`);
  }

  if (missingExits.length > 0) {
    const { error: exErr } = await supabase.from("inventory_movements").insert(missingExits);
    if (exErr) throw new Error(`inventory_movements exit insert failed: ${exErr.message}`);
  }

  const sales = [
    {
      id: uuid(51),
      tenant_id: TENANT_ID,
      branch_id: BRANCH_ID,
      product_id: uuid(11),
      movement_id: uuid(41),
      quantity: 3,
      unit_price: 48,
      total: 144,
      currency_iso: "USD",
      sold_at: currentMonthIso(3),
    },
    {
      id: uuid(52),
      tenant_id: TENANT_ID,
      branch_id: BRANCH_ID,
      product_id: uuid(12),
      movement_id: uuid(42),
      quantity: 4,
      unit_price: 34,
      total: 136,
      currency_iso: "USD",
      sold_at: currentMonthIso(2),
    },
    {
      id: uuid(53),
      tenant_id: TENANT_ID,
      branch_id: BRANCH_ID,
      product_id: uuid(13),
      movement_id: uuid(43),
      quantity: 2,
      unit_price: 26,
      total: 52,
      currency_iso: "USD",
      sold_at: currentMonthIso(1),
    },
  ];

  const { error: salesErr } = await supabase
    .from("product_sales")
    .upsert(sales, { onConflict: "id" });
  if (salesErr) throw new Error(`product_sales upsert failed: ${salesErr.message}`);

  return { imageUrls };
}
