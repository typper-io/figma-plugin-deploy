"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FigmaPublishFlow = void 0;
const fs_1 = require("fs");
const otplib_1 = require("otplib");
const axios_1 = __importDefault(require("axios"));
require("dotenv/config");
const secret = process.env.FIGMA_TOTP_SECRET.toUpperCase();
const email = process.env.FIGMA_EMAIL;
const password = process.env.FIGMA_PASSWORD;
class FigmaPublishFlow {
    getBasicHeaders() {
        var _a;
        return {
            accept: "application/json",
            "content-type": "application/json",
            "x-csrf-bypass": "yes",
            "x-figma-user-id": this.figmaUserId,
            Cookie: (_a = this.cookies) === null || _a === void 0 ? void 0 : _a.join("; "),
        };
    }
    constructor({ pluginId, releaseNotes, teamId, }) {
        var _a, _b;
        this.cookies = [];
        this.manifest = JSON.parse((0, fs_1.readFileSync)("manifest.json", "utf-8"));
        this.ui = (_a = this.manifest) === null || _a === void 0 ? void 0 : _a.ui;
        this.main = (_b = this.manifest) === null || _b === void 0 ? void 0 : _b.main;
        this.pluginId = pluginId;
        this.releaseNotes = releaseNotes;
        this.teamId = teamId;
    }
    formatCarouselMedia(media) {
        return Object.values(media || {}).map((media, index) => ({
            carousel_position: index,
            sha1: media.sha1,
        }));
    }
    getPluginCurrentVersion() {
        var _a, _b, _c;
        const currentVersionId = (_a = this.pluginResources) === null || _a === void 0 ? void 0 : _a.current_plugin_version_id;
        this.pluginCurrentVersion = Object.assign(Object.assign({}, (_b = this.pluginResources) === null || _b === void 0 ? void 0 : _b.versions[currentVersionId]), { carousel_media: this.formatCarouselMedia((_c = this.pluginResources) === null || _c === void 0 ? void 0 : _c.carousel_media_urls) });
    }
    getLoginCookies() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const response = yield axios_1.default.get(`https://www.figma.com/files/team/${this.teamId}/recents-and-sharing`, {
                    headers: {
                        accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
                        "cache-control": "max-age=0",
                    },
                });
                this.cookies = response.headers["set-cookie"];
            }
            catch (error) {
                console.error("Error fetching team files:", error);
                throw error;
            }
        });
    }
    loginToFigma() {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            const totpKey = otplib_1.authenticator.generate(secret);
            try {
                const response = yield axios_1.default.post("https://www.figma.com/api/session/login", {
                    totp_key: totpKey,
                    email,
                    password,
                    password_retype: password,
                    username: email,
                }, {
                    headers: Object.assign(Object.assign({}, this.getBasicHeaders()), { Referer: "https://www.figma.com/login" }),
                });
                (_a = this.cookies) === null || _a === void 0 ? void 0 : _a.push(...(response.headers["set-cookie"] || []));
                this.figmaUserId = response.data.meta.id;
            }
            catch (error) {
                console.error("Error logging in:", error);
                throw error;
            }
        });
    }
    getUploadLinks() {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c, _d, _e, _f;
            try {
                const response = yield axios_1.default.post(`https://www.figma.com/api/plugins/${this.pluginId}/upload`, {
                    manifest: this.manifest,
                    release_notes: this.releaseNotes,
                    name: (_a = this.pluginCurrentVersion) === null || _a === void 0 ? void 0 : _a.name,
                    description: (_b = this.pluginCurrentVersion) === null || _b === void 0 ? void 0 : _b.description,
                    tagline: (_c = this.pluginCurrentVersion) === null || _c === void 0 ? void 0 : _c.tagline,
                    creator_policy: (_d = this.pluginCurrentVersion) === null || _d === void 0 ? void 0 : _d.creator_policy,
                    tags: (_e = this.pluginResources) === null || _e === void 0 ? void 0 : _e.tags,
                    tags_v2: [],
                    category_id: (_f = this.pluginResources) === null || _f === void 0 ? void 0 : _f.category_id,
                    images_sha1: [],
                }, {
                    headers: this.getBasicHeaders(),
                });
                this.signedCodeUploadCloudfrontUrl =
                    response.data.meta.code_upload_url.signed_cloudfront_url;
                this.versionId = response.data.meta.version_id;
                this.pluginSignature = response.data.meta.signature;
            }
            catch (error) {
                console.error("Error getting upload links:", error);
                throw error;
            }
        });
    }
    updatePluginSettings() {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c;
            try {
                yield axios_1.default.put(`https://www.figma.com/api/plugins/${this.pluginId}`, {
                    support_contact: (_a = this.pluginResources) === null || _a === void 0 ? void 0 : _a.support_contact,
                    publisher_ids: [],
                    agreed_to_tos: true,
                    category_id: (_b = this.pluginResources) === null || _b === void 0 ? void 0 : _b.category_id,
                    is_public: (_c = this.pluginResources) === null || _c === void 0 ? void 0 : _c.roles.is_public,
                    is_annual_discount_active: false,
                }, {
                    headers: this.getBasicHeaders(),
                });
            }
            catch (error) {
                console.error("Error updating plugin settings:", error);
                throw error;
            }
        });
    }
    publishVersion() {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c;
            try {
                yield axios_1.default.put(`https://www.figma.com/api/plugins/${this.pluginId}/versions/${this.versionId}`, {
                    icon_uploaded: false,
                    cover_image_uploaded: false,
                    snapshot_uploaded: false,
                    carousel_media: (_a = this.pluginCurrentVersion) === null || _a === void 0 ? void 0 : _a.carousel_media,
                    code_uploaded: true,
                    comments_setting: (_b = this.pluginResources) === null || _b === void 0 ? void 0 : _b.comments_setting,
                    category_id: (_c = this.pluginResources) === null || _c === void 0 ? void 0 : _c.category_id,
                    signature: this.pluginSignature,
                    agreed_to_tos: true,
                    playground_file_publish_type: "noop",
                }, {
                    headers: this.getBasicHeaders(),
                });
            }
            catch (error) {
                console.error("Error publishing version:", error);
                throw error;
            }
        });
    }
    buildCode() {
        const uiCode = (0, fs_1.readFileSync)(this.ui, "utf-8");
        const mainCode = (0, fs_1.readFileSync)(this.main, "utf-8");
        const escapedUiCode = JSON.stringify(uiCode);
        this.code = `const __html__ = ${escapedUiCode};${mainCode}`;
    }
    uploadCode() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                yield axios_1.default.put(this.signedCodeUploadCloudfrontUrl, this.code, {
                    headers: {
                        accept: "*/*",
                        "content-type": "text/javascript",
                        "x-amz-acl": "bucket-owner-full-control",
                    },
                });
            }
            catch (error) {
                console.error("Error uploading code:", error);
                throw error;
            }
        });
    }
    getPluginResources() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const response = yield axios_1.default.get(`https://www.figma.com/api/plugins?id=${this.pluginId}`, {
                    headers: this.getBasicHeaders(),
                });
                this.pluginResources = response.data.meta[0];
                this.getPluginCurrentVersion();
            }
            catch (error) {
                console.error("Error getting plugin resources:", error);
                throw error;
            }
        });
    }
    publish() {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.getLoginCookies();
            yield this.loginToFigma();
            yield this.getPluginResources();
            yield this.getUploadLinks();
            yield this.updatePluginSettings();
            this.buildCode();
            yield this.uploadCode();
            yield this.publishVersion();
            console.log("🎉 Plugin published successfully!");
        });
    }
}
exports.FigmaPublishFlow = FigmaPublishFlow;
