// src/templates/xlsx/index.ts
export type { XlsxColumnDef, XlsxTemplateConfig, ParsedRow } from "./types";
export { servicesTemplate } from "./services-template";
export { specialistsTemplate } from "./specialists-template";
export { customersTemplate } from "./customers-template";

import type { XlsxTemplateConfig } from "./types";
import { servicesTemplate } from "./services-template";
import { specialistsTemplate } from "./specialists-template";
import { customersTemplate } from "./customers-template";

export const templateConfigs: Record<string, XlsxTemplateConfig> = {
  services: servicesTemplate,
  specialists: specialistsTemplate,
  customers: customersTemplate,
};
