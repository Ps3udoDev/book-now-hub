// src/templates/xlsx/index.ts

export { customersTemplate } from "./customers-template";
export { productsTemplate } from "./products-template";
export { servicesTemplate } from "./services-template";
export { specialistsTemplate } from "./specialists-template";
export type { ParsedRow, XlsxColumnDef, XlsxTemplateConfig } from "./types";

import { customersTemplate } from "./customers-template";
import { productsTemplate } from "./products-template";
import { servicesTemplate } from "./services-template";
import { specialistsTemplate } from "./specialists-template";
import type { XlsxTemplateConfig } from "./types";

export const templateConfigs: Record<string, XlsxTemplateConfig> = {
  services: servicesTemplate,
  specialists: specialistsTemplate,
  customers: customersTemplate,
  products: productsTemplate,
};
