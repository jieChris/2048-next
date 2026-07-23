import { resolveMobileBuildFlags } from "./build-flags-contract";

export {
  MOBILE_BUILD_FLAGS_SCHEMA,
  MOBILE_PRODUCTION_API_BASE,
  resolveMobileBuildFlags,
  type MobileBuildFlags,
} from "./build-flags-contract";

export const MOBILE_BUILD_FLAGS = resolveMobileBuildFlags(import.meta.env.MODE);
