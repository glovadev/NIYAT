import { test, describe, beforeEach, afterEach, after } from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import { Notice } from "../models/Notice";
import { GET as getActiveNoticeHandler } from "../app/api/notices/active/route";
import { GET as getAdminNoticesHandler, POST as createAdminNoticeHandler } from "../app/api/admin/notices/route";
import {
  GET as getSingleAdminNoticeHandler,
  PATCH as patchAdminNoticeHandler,
  DELETE as deleteAdminNoticeHandler,
} from "../app/api/admin/notices/[id]/route";

function makeNextRequest(url: string, init?: RequestInit): any {
  const req = new globalThis.Request(url, init);
  (req as any).cookies = {
    get: (name: string) => undefined,
  };
  return req;
}

describe("Store Notice & Updates Management Tests", () => {
  const originalEnv = { ...process.env };
  let originalFind: any;
  let originalFindOne: any;
  let originalFindById: any;
  let originalFindByIdAndDelete: any;
  let originalCreate: any;
  let originalUpdateMany: any;

  beforeEach(() => {
    (process.env as any).NODE_ENV = "test";
    process.env.MONGODB_URI = "mongodb://127.0.0.1:27017/niyat_test";
    (global as any).mongooseCache = {
      conn: { connection: { readyState: 1 } } as any,
      promise: null,
    };

    originalFind = Notice.find;
    originalFindOne = Notice.findOne;
    originalFindById = Notice.findById;
    originalFindByIdAndDelete = Notice.findByIdAndDelete;
    originalCreate = Notice.create;
    originalUpdateMany = Notice.updateMany;
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    Notice.find = originalFind;
    Notice.findOne = originalFindOne;
    Notice.findById = originalFindById;
    Notice.findByIdAndDelete = originalFindByIdAndDelete;
    Notice.create = originalCreate;
    Notice.updateMany = originalUpdateMany;
  });

  after(async () => {
    try {
      await mongoose.disconnect();
    } catch (_) {}
  });

  describe("1. Notice Model Schema & Validation", () => {
    test("validates required title and message", () => {
      const invalidNotice = new Notice({});
      const validationError = invalidNotice.validateSync();
      assert.ok(validationError?.errors["title"]);
      assert.ok(validationError?.errors["message"]);
    });

    test("sets default values correctly", () => {
      const validNotice = new Notice({
        title: "Holiday Express Delivery Notice",
        message: "Same-day courier dispatch active across all states today.",
      });

      assert.strictEqual(validNotice.badge, "Notice & Update");
      assert.strictEqual(validNotice.theme, "EMERALD");
      assert.strictEqual(validNotice.icon, "SPARKLES");
      assert.strictEqual(validNotice.isActive, false); // Disabled by default until admin activates
      assert.strictEqual(validNotice.showOnTopBar, false);
      assert.strictEqual(validNotice.sortOrder, 0);
    });

    test("accepts valid theme and icon options", () => {
      const customNotice = new Notice({
        title: "24K Gold Launch",
        message: "Our new facial serum is now available.",
        theme: "GOLD",
        icon: "BELL",
        isActive: true,
        showOnTopBar: true,
      });

      assert.strictEqual(customNotice.theme, "GOLD");
      assert.strictEqual(customNotice.icon, "BELL");
      assert.strictEqual(customNotice.isActive, true);
      assert.strictEqual(customNotice.showOnTopBar, true);
    });
  });

  describe("2. Public Notice API (/api/notices/active)", () => {
    test("returns notice: null when no notice is active (disabled)", async () => {
      Notice.findOne = () =>
        ({
          sort: () => ({
            lean: async () => null,
          }),
        } as any);

      const res = await getActiveNoticeHandler();
      const json = await res.json();

      assert.strictEqual(res.status, 200);
      assert.strictEqual(json.success, true);
      assert.strictEqual(json.data.notice, null);
    });

    test("returns notice data when active notice exists", async () => {
      const mockNotice = {
        _id: new mongoose.Types.ObjectId(),
        title: "Grand Festive Dispatch",
        message: "Orders placed before 3 PM ship same-day.",
        badge: "Special Update",
        linkUrl: "/shop",
        linkText: "Explore Now",
        theme: "EMERALD",
        icon: "SPARKLES",
        isActive: true,
        showOnTopBar: true,
        updatedAt: new Date(),
      };

      Notice.findOne = () =>
        ({
          sort: () => ({
            lean: async () => mockNotice,
          }),
        } as any);

      const res = await getActiveNoticeHandler();
      const json = await res.json();

      assert.strictEqual(res.status, 200);
      assert.strictEqual(json.success, true);
      assert.ok(json.data.notice);
      assert.strictEqual(json.data.notice.title, "Grand Festive Dispatch");
      assert.strictEqual(json.data.notice.badge, "Special Update");
      assert.strictEqual(json.data.notice.theme, "EMERALD");
      assert.strictEqual(json.data.notice.showOnTopBar, true);
    });
  });

  describe("3. Admin Notices API (/api/admin/notices)", () => {
    test("rejects unauthenticated requests with 401", async () => {
      (process.env as any).NODE_ENV = "production";
      const req = makeNextRequest("http://localhost:3000/api/admin/notices");
      const res = await getAdminNoticesHandler(req);

      assert.strictEqual(res.status, 401);
    });

    test("allows admin to list all notices and identify active status", async () => {
      (process.env as any).NODE_ENV = "development";
      const mockItems = [
        {
          _id: new mongoose.Types.ObjectId(),
          title: "Notice 1",
          message: "Message 1",
          badge: "Notice & Update",
          linkUrl: "",
          linkText: "",
          theme: "EMERALD",
          icon: "SPARKLES",
          isActive: true,
          showOnTopBar: false,
          sortOrder: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          _id: new mongoose.Types.ObjectId(),
          title: "Notice 2",
          message: "Message 2",
          badge: "Old Notice",
          linkUrl: "",
          linkText: "",
          theme: "GOLD",
          icon: "BELL",
          isActive: false,
          showOnTopBar: false,
          sortOrder: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      Notice.find = () =>
        ({
          sort: () => ({
            lean: async () => mockItems,
          }),
        } as any);

      const req = makeNextRequest("http://localhost:3000/api/admin/notices", {
        headers: { "x-dev-admin": "true" },
      });
      const res = await getAdminNoticesHandler(req);
      const json = await res.json();

      assert.strictEqual(res.status, 200);
      assert.strictEqual(json.success, true);
      assert.strictEqual(json.data.items.length, 2);
      assert.strictEqual(json.data.isAnyActive, true);
      assert.strictEqual(json.data.activeNoticeId, String(mockItems[0]._id));
    });

    test("allows admin to create a notice and deactivates others if new notice is active", async () => {
      (process.env as any).NODE_ENV = "development";
      let deactivatedCalled = false;

      (Notice as any).updateMany = async (filter: any, update: any) => {
        deactivatedCalled = true;
        return { modifiedCount: 1 } as any;
      };

      const newId = new mongoose.Types.ObjectId();
      Notice.create = async (doc: any) =>
        ({
          _id: newId,
          ...doc,
          createdAt: new Date(),
          updatedAt: new Date(),
        } as any);

      const req = makeNextRequest("http://localhost:3000/api/admin/notices", {
        method: "POST",
        headers: {
          "x-dev-admin": "true",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: "New Courier Advisory",
          message: "Heavy rain may cause slight delays in transit.",
          badge: "Courier Notice",
          theme: "AMBER",
          icon: "TRUCK",
          isActive: true,
          showOnTopBar: true,
        }),
      });

      const res = await createAdminNoticeHandler(req);
      const json = await res.json();

      assert.strictEqual(res.status, 201);
      assert.strictEqual(json.success, true);
      assert.strictEqual(json.data.title, "New Courier Advisory");
      assert.strictEqual(json.data.theme, "AMBER");
      assert.strictEqual(json.data.isActive, true);
      assert.strictEqual(deactivatedCalled, true);
    });

    test("allows admin to toggle active status via PATCH /api/admin/notices/[id]", async () => {
      (process.env as any).NODE_ENV = "development";
      const targetId = new mongoose.Types.ObjectId();

      const mockNoticeInstance = {
        _id: targetId,
        title: "Sample Notice",
        message: "Sample Message",
        badge: "Update",
        linkUrl: "",
        linkText: "",
        theme: "EMERALD",
        icon: "SPARKLES",
        isActive: false,
        showOnTopBar: false,
        sortOrder: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
        save: async function () {
          return this;
        },
      };

      Notice.findById = (async (id: any) => mockNoticeInstance) as any;

      // Patch: turn notice on (isActive: true)
      const req = makeNextRequest(`http://localhost:3000/api/admin/notices/${targetId}`, {
        method: "PATCH",
        headers: {
          "x-dev-admin": "true",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          isActive: true,
        }),
      });

      const res = await patchAdminNoticeHandler(req, {
        params: Promise.resolve({ id: String(targetId) }),
      });
      const json = await res.json();

      assert.strictEqual(res.status, 200);
      assert.strictEqual(json.success, true);
      assert.strictEqual(json.data.isActive, true);
      assert.strictEqual(mockNoticeInstance.isActive, true);
    });

    test("allows admin to delete a notice via DELETE /api/admin/notices/[id]", async () => {
      (process.env as any).NODE_ENV = "development";
      const targetId = new mongoose.Types.ObjectId();

      (Notice as any).findByIdAndDelete = async (id: any) => ({ _id: targetId } as any);

      const req = makeNextRequest(`http://localhost:3000/api/admin/notices/${targetId}`, {
        method: "DELETE",
        headers: { "x-dev-admin": "true" },
      });

      const res = await deleteAdminNoticeHandler(req, {
        params: Promise.resolve({ id: String(targetId) }),
      });
      const json = await res.json();

      assert.strictEqual(res.status, 200);
      assert.strictEqual(json.success, true);
      assert.strictEqual(json.data.message, "Notice deleted successfully");
    });
  });
});
