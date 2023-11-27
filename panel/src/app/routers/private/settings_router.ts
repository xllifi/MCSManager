import Router from "@koa/router";
import remoteService from "../../service/system_remote_service";
import permission from "../../middleware/permission";
import validator from "../../middleware/validator";
import { saveSystemConfig, systemConfig } from "../../setting";
import { logger } from "../../service/log";
import { i18next } from "../../i18n";
import userSystem from "../../service/system_user";
import { v4 } from "uuid";
import path from "path";
import * as fs from "fs-extra";
import {
  getFrontendLayoutConfig,
  resetFrontendLayoutConfig,
  setFrontendLayoutConfig
} from "../../service/frontend_layout";
import { ROLE } from "../../entity/user";

const router = new Router({ prefix: "/overview" });

// [Top-level Permission]
// Get panel configuration items
router.get("/setting", permission({ level: ROLE.ADMIN }), async (ctx) => {
  ctx.body = systemConfig;
});

// [Top-level Permission]
// Update panel configuration items
router.put("/setting", validator({ body: {} }), permission({ level: ROLE.ADMIN }), async (ctx) => {
  const config = ctx.request.body;
  if (config) {
    if (config.httpIp != null) systemConfig.httpIp = config.httpIp;
    if (config.httpPort != null) systemConfig.httpPort = config.httpPort;
    if (config.crossDomain != null) systemConfig.crossDomain = config.crossDomain;
    if (config.gzip != null) systemConfig.gzip = config.gzip;
    if (config.maxCompress != null) systemConfig.maxCompress = config.maxCompress;
    if (config.maxDownload != null) systemConfig.maxDownload = config.maxDownload;
    if (config.zipType != null) systemConfig.zipType = config.zipType;
    if (config.loginCheckIp != null) systemConfig.loginCheckIp = config.loginCheckIp;
    if (config.forwardType != null) systemConfig.forwardType = Number(config.forwardType);
    if (config.dataPort != null) systemConfig.dataPort = Number(config.dataPort);
    if (config.loginInfo != null) systemConfig.loginInfo = String(config.loginInfo);
    if (config.canFileManager != null) systemConfig.canFileManager = Boolean(config.canFileManager);
    if (config.quickInstallAddr != null)
      systemConfig.quickInstallAddr = String(config.quickInstallAddr);
    if (config.language != null) {
      logger.warn("Language change:", config.language);
      systemConfig.language = String(config.language);
      i18next.changeLanguage(systemConfig.language.toLowerCase());
      remoteService.changeDaemonLanguage(systemConfig.language);
    }
    saveSystemConfig(systemConfig);
    ctx.body = "OK";
    return;
  }
  ctx.body = new Error("The body is incorrect");
});

// [Public Permission]
// Update config when install
router.put("/install", async (ctx) => {
  const config = ctx.request.body;
  if (userSystem.objects.size === 0) {
    if (config.language != null) {
      logger.warn("Language change:", config.language);
      systemConfig.language = String(config.language);
      i18next.changeLanguage(systemConfig.language.toLowerCase());
      remoteService.changeDaemonLanguage(systemConfig.language);
    }
    saveSystemConfig(systemConfig);
    ctx.body = "OK";
    return;
  }
  ctx.body = new Error("The MCSManager has been installed");
});

// [Public router]
router.get("/layout", async (ctx) => {
  ctx.body = getFrontendLayoutConfig();
});

// [Top-level Permission]
// Set frontend layout
router.post("/layout", permission({ level: ROLE.ADMIN }), async (ctx) => {
  const config = ctx.request.body;
  setFrontendLayoutConfig(config);
  ctx.body = true;
});

// [Top-level Permission]
// Reset frontend layout
router.delete("/layout", permission({ level: ROLE.ADMIN }), async (ctx) => {
  resetFrontendLayoutConfig();
  ctx.body = true;
});

// [Top-level Permission]
// Upload file to asserts directory, only administrator can upload
router.post("/upload_assets", permission({ level: ROLE.ADMIN }), async (ctx) => {
  const tmpFiles = ctx.request.files.file;
  if (!tmpFiles || tmpFiles instanceof Array) throw new Error("The body is incorrect");
  if (!tmpFiles.path || !fs.existsSync(tmpFiles.path)) throw new Error("The file does not exist");
  const tmpFile = tmpFiles;
  const newFileName = v4() + path.extname(tmpFile.name);
  const saveDirPath = path.join(process.cwd(), "public/upload_files/");
  if (!fs.existsSync(saveDirPath)) fs.mkdirsSync(saveDirPath);
  await fs.move(tmpFile.path, path.join(saveDirPath, newFileName));
  ctx.body = newFileName;
});

export default router;
