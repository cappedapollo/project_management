import { http, HttpResponse } from "msw";
import { setupWorker } from "msw/browser";
// import { mockTokenExpired } from "./handlers/_demo"; // Removed for production
const mockTokenExpired = http.get("/api/mock-token-expired", () => HttpResponse.json({ success: true })); // Empty for production
import { menuList } from "./handlers/_menu";
import { signIn, userList } from "./handlers/_user";

const handlers = [signIn, userList, mockTokenExpired, menuList];
const worker = setupWorker(...handlers);

export { worker };
