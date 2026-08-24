/**
 * 武将系统 - 公开 API
 */
export * from "./registry";
export {
  useGeneralStore,
  syncInstancesWithRecruit,
  getTopFragments,
  type GeneralInstance,
  type GeneralState,
  type GeneralStatus,
} from "./store";
export { GeneralCollectionScreen } from "./GeneralCollectionScreen";
