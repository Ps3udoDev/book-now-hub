const TENANT_ID = "d699061e-e6ee-4b8c-a675-65a7bbbaa252";
const BRANCH_ID = "1dcbd4e0-79f9-4ee4-9c56-1cc66693d387";
const MIGUEL_ID = "52d563f1-64ef-4439-b50c-02119170e198";
const PUESTO_1_ID = "cbd39f2e-6e2a-4330-9fb7-1590ad409602";

const CATEGORIES = [
  {
    id: "d699061e-2000-4000-8000-000000000001",
    tenant_id: TENANT_ID,
    branch_id: BRANCH_ID,
    name: "Café & Espresso",
    icon: "Coffee|#8B5E3C",
    sort_order: 1,
    is_active: true,
  },
  {
    id: "d699061e-2000-4000-8000-000000000002",
    tenant_id: TENANT_ID,
    branch_id: BRANCH_ID,
    name: "Bebidas Frías",
    icon: "CupSoda|#1D9BF0",
    sort_order: 2,
    is_active: true,
  },
  {
    id: "d699061e-2000-4000-8000-000000000003",
    tenant_id: TENANT_ID,
    branch_id: BRANCH_ID,
    name: "Snacks & Postres",
    icon: "Dessert|#E86A92",
    sort_order: 3,
    is_active: true,
  },
];

const ITEMS = [
  {
    id: "d699061e-2000-4000-8000-000000000011",
    imageId: "d699061e-2000-4000-8000-000000000021",
    category_id: "d699061e-2000-4000-8000-000000000001",
    name: "Cappuccino Artesanal",
    description: "Espresso doble con leche vaporizada sedosa y arte latte.",
    price: 4.5,
    preparation_time_minutes: 5,
    palette: ["#3B2314", "#8B5E3C", "#F6EFE7"],
    subtitle: "ARTISAN ESPRESSO",
    slug: "cappuccino-artesanal",
  },
  {
    id: "d699061e-2000-4000-8000-000000000012",
    imageId: "d699061e-2000-4000-8000-000000000022",
    category_id: "d699061e-2000-4000-8000-000000000001",
    name: "Espresso Doble",
    description: "Extracción intensa de grano arábica tostado medio.",
    price: 3.0,
    preparation_time_minutes: 3,
    palette: ["#26160C", "#6F4E37", "#F2E9E1"],
    subtitle: "DOUBLE SHOT",
    slug: "espresso-doble",
  },
  {
    id: "d699061e-2000-4000-8000-000000000013",
    imageId: "d699061e-2000-4000-8000-000000000023",
    category_id: "d699061e-2000-4000-8000-000000000002",
    name: "Iced Matcha Latte",
    description: "Té verde ceremonial japonés batido sobre hielo y leche de avena.",
    price: 5.5,
    preparation_time_minutes: 5,
    palette: ["#1F4D2E", "#5A9A68", "#EDF7EE"],
    subtitle: "CEREMONIAL GRADE",
    slug: "iced-matcha-latte",
  },
  {
    id: "d699061e-2000-4000-8000-000000000014",
    imageId: "d699061e-2000-4000-8000-000000000024",
    category_id: "d699061e-2000-4000-8000-000000000002",
    name: "Smoothie de Frutos Rojos",
    description: "Fresa, mora y arándanos naturales batidos con yogurt griego.",
    price: 5.0,
    preparation_time_minutes: 6,
    palette: ["#7A1C3D", "#D9487B", "#FCEEF3"],
    subtitle: "FRESH BERRIES",
    slug: "smoothie-frutos-rojos",
  },
  {
    id: "d699061e-2000-4000-8000-000000000015",
    imageId: "d699061e-2000-4000-8000-000000000025",
    category_id: "d699061e-2000-4000-8000-000000000003",
    name: "Croissant de Almendras",
    description: "Hojaldre francés horneado con crema frangipane y láminas de almendra.",
    price: 4.0,
    preparation_time_minutes: 4,
    palette: ["#6B3E17", "#C88A4B", "#FBF4EA"],
    subtitle: "FRENCH BAKERY",
    slug: "croissant-almendras",
  },
  {
    id: "d699061e-2000-4000-8000-000000000016",
    imageId: "d699061e-2000-4000-8000-000000000026",
    category_id: "d699061e-2000-4000-8000-000000000003",
    name: "Cheesecake de Maracuyá",
    description: "Base crocante de galleta con crema suave y coulis de maracuyá.",
    price: 6.0,
    preparation_time_minutes: 3,
    palette: ["#8A5200", "#F0A500", "#FFF8E7"],
    subtitle: "HOUSE DESSERT",
    slug: "cheesecake-maracuya",
  },
];

function buildMenuSvg(item) {
  const [dark, accent, bg] = item.palette;
  const priceLabel = `$${item.price.toFixed(2)}`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 450" width="600" height="450">
  <defs>
    <linearGradient id="g-${item.slug}" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${bg}"/>
      <stop offset="100%" stop-color="${accent}" stop-opacity="0.22"/>
    </linearGradient>
  </defs>
  <rect width="600" height="450" rx="28" fill="url(#g-${item.slug})"/>
  <circle cx="300" cy="185" r="95" fill="${accent}" fill-opacity="0.16"/>
  <circle cx="300" cy="185" r="64" fill="${dark}"/>
  <circle cx="300" cy="185" r="46" fill="${accent}" fill-opacity="0.35"/>
  <circle cx="284" cy="168" r="10" fill="#ffffff" fill-opacity="0.3"/>
  <text x="300" y="325" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-size="13" font-weight="700" letter-spacing="3" fill="${accent}">${item.subtitle}</text>
  <text x="300" y="360" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-size="26" font-weight="700" fill="${dark}">${item.name}</text>
  <rect x="255" y="380" width="90" height="32" rx="16" fill="${dark}"/>
  <text x="300" y="401" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-size="15" font-weight="700" fill="#ffffff">${priceLabel}</text>
</svg>`;
}

function assertNoError(result, context) {
  if (result.error) {
    throw new Error(`${context}: ${result.error.message}`);
  }
}

export async function seedCafeteria(supabase) {
  // 1. Categorías de cafetería
  assertNoError(
    await supabase.from("menu_categories").upsert(CATEGORIES, { onConflict: "id" }),
    "upsert menu_categories",
  );

  // 2. Ítems del menú
  const menuRows = ITEMS.map((item) => ({
    id: item.id,
    tenant_id: TENANT_ID,
    branch_id: BRANCH_ID,
    category_id: item.category_id,
    name: item.name,
    description: item.description,
    price: item.price,
    currency_iso: "USD",
    preparation_time_minutes: item.preparation_time_minutes,
    is_available: true,
    is_active: true,
  }));

  assertNoError(
    await supabase.from("menu_items").upsert(menuRows, { onConflict: "id" }),
    "upsert menu_items",
  );

  // 3. Imágenes SVG en Storage ("menu-images") + menu_item_images
  const imageUrls = [];
  const imageRows = [];

  for (const item of ITEMS) {
    const storagePath = `${TENANT_ID}/menu/${item.id}/${item.slug}.svg`;
    const svgBuffer = Buffer.from(buildMenuSvg(item), "utf-8");

    assertNoError(
      await supabase.storage.from("menu-images").upload(storagePath, svgBuffer, {
        upsert: true,
        contentType: "image/svg+xml",
      }),
      `upload ${storagePath}`,
    );

    const { data: pub } = supabase.storage.from("menu-images").getPublicUrl(storagePath);
    const res = await fetch(pub.publicUrl);
    if (!res.ok) {
      throw new Error(`Image URL returned HTTP ${res.status}: ${pub.publicUrl}`);
    }

    imageUrls.push(pub.publicUrl);
    imageRows.push({
      id: item.imageId,
      menu_item_id: item.id,
      storage_path: storagePath,
      is_primary: true,
      sort_order: 0,
    });
  }

  assertNoError(
    await supabase.from("menu_item_images").upsert(imageRows, { onConflict: "id" }),
    "upsert menu_item_images",
  );

  // 4. Habilitar QR de cafetería en Puesto 1
  const now = new Date();
  assertNoError(
    await supabase
      .from("workstations")
      .update({
        cafeteria_qr_enabled: true,
        cafeteria_qr_slug: "puesto-1",
        cafeteria_qr_last_generated_at: now.toISOString(),
      })
      .eq("id", PUESTO_1_ID)
      .eq("tenant_id", TENANT_ID),
    "update workstation QR",
  );

  // 5. Dos pedidos de hoy en cafe_orders + cafe_order_items
  const nowIso = now.toISOString();
  const estReadyIso = new Date(now.getTime() + 5 * 60_000).toISOString();
  const t30Ago = new Date(now.getTime() - 30 * 60_000).toISOString();
  const t20Ago = new Date(now.getTime() - 20 * 60_000).toISOString();
  const t15Ago = new Date(now.getTime() - 15 * 60_000).toISOString();

  const order1Id = "d699061e-2000-4000-8000-000000000031";
  const order2Id = "d699061e-2000-4000-8000-000000000032";

  const orders = [
    {
      id: order1Id,
      tenant_id: TENANT_ID,
      branch_id: BRANCH_ID,
      workstation_id: PUESTO_1_ID,
      specialist_id: null,
      order_type: "client",
      status: "preparing",
      charge_to_commissions: false,
      source: "workstation_qr",
      currency_iso: "USD",
      placed_by_name: "Cliente Puesto 1",
      notes: "Sin azúcar extra, por favor",
      total: 8.5,
      preparing_at: nowIso,
      estimated_ready_at: estReadyIso,
      ready_at: null,
      delivered_at: null,
      created_at: nowIso,
      updated_at: nowIso,
    },
    {
      id: order2Id,
      tenant_id: TENANT_ID,
      branch_id: BRANCH_ID,
      workstation_id: null,
      specialist_id: MIGUEL_ID,
      order_type: "specialist",
      status: "delivered",
      charge_to_commissions: true,
      source: "internal",
      currency_iso: "USD",
      placed_by_name: "Miguel",
      notes: "Consumo personal en turno",
      total: 8.5,
      preparing_at: t30Ago,
      estimated_ready_at: null,
      ready_at: t20Ago,
      delivered_at: t15Ago,
      created_at: t30Ago,
      updated_at: t15Ago,
    },
  ];

  assertNoError(
    await supabase.from("cafe_orders").upsert(orders, { onConflict: "id" }),
    "upsert cafe_orders",
  );

  const orderItems = [
    {
      id: "d699061e-2000-4000-8000-000000000041",
      cafe_order_id: order1Id,
      menu_item_id: ITEMS[0].id,
      description: ITEMS[0].name,
      quantity: 1,
      unit_price: ITEMS[0].price,
      subtotal: ITEMS[0].price,
    },
    {
      id: "d699061e-2000-4000-8000-000000000042",
      cafe_order_id: order1Id,
      menu_item_id: ITEMS[4].id,
      description: ITEMS[4].name,
      quantity: 1,
      unit_price: ITEMS[4].price,
      subtotal: ITEMS[4].price,
    },
    {
      id: "d699061e-2000-4000-8000-000000000043",
      cafe_order_id: order2Id,
      menu_item_id: ITEMS[2].id,
      description: ITEMS[2].name,
      quantity: 1,
      unit_price: ITEMS[2].price,
      subtotal: ITEMS[2].price,
    },
    {
      id: "d699061e-2000-4000-8000-000000000044",
      cafe_order_id: order2Id,
      menu_item_id: ITEMS[1].id,
      description: ITEMS[1].name,
      quantity: 1,
      unit_price: ITEMS[1].price,
      subtotal: ITEMS[1].price,
    },
  ];

  assertNoError(
    await supabase.from("cafe_order_items").upsert(orderItems, { onConflict: "id" }),
    "upsert cafe_order_items",
  );

  return { imageUrls };
}
