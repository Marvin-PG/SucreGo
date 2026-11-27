import { demoApi } from "../mocks/demo";
import { isDemo, realApi } from "./client";

export const api = isDemo ? demoApi : realApi;
export { isDemo };
