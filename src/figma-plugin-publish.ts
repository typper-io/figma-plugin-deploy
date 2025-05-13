import { readFileSync } from "fs";

import { authenticator } from "otplib";
import axios from "axios";

import "dotenv/config";

const secret = process.env.FIGMA_TOTP_SECRET!.toUpperCase();
const email = process.env.FIGMA_EMAIL!;
const password = process.env.FIGMA_PASSWORD!;

type LoginResponse = {
  error: boolean;
  status: number;
  meta: {
    id: string;
    img_url: string;
    handle: string;
    email: string;
    name: string;
  };
  i18n: null;
};

type PluginMeta = {
  id: string;
  creator: {
    id: string;
    handle: string;
    img_url: string;
  };
  current_plugin_version_id: string;
  created_at: string;
  is_widget: boolean | null;
  roles: {
    is_public: boolean | null;
  };
  category_id: string;
  is_seo_indexable: boolean;
  community_publishers: {
    accepted: Publisher[];
    pending: Publisher[];
  };
  plugin_publishers: {
    accepted: Publisher[];
    pending: Publisher[];
  };
  unpublished_at: string | null;
  install_count: number;
  like_count: number;
  view_count: number;
  blocked_at: string | null;
  profile_id: string;
  comment_count: number;
  org_id: string | null;
  hide_related_content_by_others: boolean | null;
  editor_type: string | null;
  unique_run_count: number;
  publishing_status: string | null;
  publishing_status_updated_at: string | null;
  install_status: number | null;
  profile_install_status: number | null;
  publisher: Publisher;
  current_user_liked: boolean;
  current_user_has_run: boolean;
  current_user_first_ran_at: string | null;
  monetization_status: string | null;
  third_party_m10n_status: string | null;
  support_contact: string;
  comments_setting: string;
  badges: any[];
  versions: {
    [versionId: string]: PluginVersion;
  };
  tags: string[];
  tags_v2: Record<string, unknown>;
  carousel_videos: Record<string, unknown>;
  carousel_media_urls: {
    [index: string]: {
      id: string;
      url: string;
      sha1: string;
      created_at: string;
    };
  };
};

type Publisher = {
  id: string;
  location: string;
  profile_handle: string;
  public_at: string;
  follower_count: number;
  following_count: number;
  primary_user_id: string;
  name: string;
  img_url: string;
  img_urls: {
    "120_120": string;
    "500_500": string;
  };
};

type PluginVersion = {
  id: string;
  plugin_id: string;
  name: string;
  description: string;
  version: string;
  icon_path: string;
  cover_image_path: string;
  code_path: string;
  resource_staging_signature: string;
  manifest: any;
  release_notes: string;
  created_at: string;
  snapshot_path: string | null;
  playground_file_version_id: string | null;
  tagline: string;
  creator_policy: string;
  user_id: string;
  redirect_icon_url: string;
  redirect_cover_image_url: string;
  redirect_code_url: string;
  redirect_snapshot_url: string | null;
  current_plugin_version_id: string;
  is_private: boolean;
  playground_fig_file_key: string | null;
};

type PluginsResponse = {
  error: boolean;
  status: number;
  meta: PluginMeta[];
  i18n: any;
};

type GetPluginLinksResponse = {
  error: boolean;
  status: number;
  meta: {
    version_id: string;
    code_upload_url: {
      code_path: string;
      fields: Record<string, unknown>;
      signed_cloudfront_url: string;
    };
    icon_upload_url: {
      image_path: string;
      fields: Record<string, unknown>;
      signed_cloudfront_url: string;
    };
    cover_image_upload_url: {
      image_path: string;
      fields: Record<string, unknown>;
      signed_cloudfront_url: string;
    };
    signature: string;
    carousel_images: [];
  };
  i18n: null;
};

type CarouselMedia = {
  carousel_position: number;
  sha1: string;
};

export class FigmaPublishFlow {
  private cookies?: string[];
  private figmaUserId?: string;
  private manifest?: Record<string, unknown>;
  private ui?: string;
  private main?: string;
  private code?: string;
  private signedCodeUploadCloudfrontUrl?: string;
  private versionId?: string;
  private pluginSignature?: string;
  private pluginResources?: PluginMeta;
  private pluginId: string;
  private pluginCurrentVersion?: PluginVersion & {
    carousel_media: CarouselMedia[];
  };
  private releaseNotes: string;
  private teamId: string;

  private getBasicHeaders() {
    return {
      accept: "application/json",
      "content-type": "application/json",
      "x-csrf-bypass": "yes",
      "x-figma-user-id": this.figmaUserId,
      Cookie: this.cookies?.join("; "),
    };
  }

  constructor({
    pluginId,
    releaseNotes,
    teamId,
  }: {
    pluginId: string;
    releaseNotes: string;
    teamId: string;
  }) {
    this.cookies = [];
    this.manifest = JSON.parse(readFileSync("manifest.json", "utf-8"));
    this.ui = this.manifest?.ui as string;
    this.main = this.manifest?.main as string;
    this.pluginId = pluginId;
    this.releaseNotes = releaseNotes;
    this.teamId = teamId;
  }

  private formatCarouselMedia(media?: PluginMeta["carousel_media_urls"]) {
    return Object.values(media || {}).map((media, index) => ({
      carousel_position: index,
      sha1: media.sha1,
    }));
  }

  private getPluginCurrentVersion() {
    const currentVersionId = this.pluginResources?.current_plugin_version_id;

    this.pluginCurrentVersion = {
      ...(this.pluginResources?.versions[currentVersionId!] as PluginVersion),
      carousel_media: this.formatCarouselMedia(
        this.pluginResources?.carousel_media_urls
      ),
    };
  }

  private async getLoginCookies() {
    try {
      const response = await axios.get(
        `https://www.figma.com/files/team/${this.teamId}/recents-and-sharing`,
        {
          headers: {
            accept:
              "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "cache-control": "max-age=0",
          },
        }
      );

      this.cookies = response.headers["set-cookie"];
    } catch (error) {
      console.error("Error fetching team files:", error);
      throw error;
    }
  }

  private async loginToFigma() {
    const totpKey = authenticator.generate(secret);

    try {
      const response = await axios.post<LoginResponse>(
        "https://www.figma.com/api/session/login",
        {
          totp_key: totpKey,
          email,
          password,
          password_retype: password,
          username: email,
        },
        {
          headers: {
            ...this.getBasicHeaders(),
            Referer: "https://www.figma.com/login",
          },
        }
      );

      this.cookies?.push(...(response.headers["set-cookie"] || []));
      this.figmaUserId = response.data.meta.id;
    } catch (error) {
      console.error("Error logging in:", error);
      throw error;
    }
  }

  private async getUploadLinks() {
    try {
      const response = await axios.post<GetPluginLinksResponse>(
        `https://www.figma.com/api/plugins/${this.pluginId}/upload`,
        {
          manifest: this.manifest,
          release_notes: this.releaseNotes,
          name: this.pluginCurrentVersion?.name,
          description: this.pluginCurrentVersion?.description,
          tagline: this.pluginCurrentVersion?.tagline,
          creator_policy: this.pluginCurrentVersion?.creator_policy,
          tags: this.pluginResources?.tags,
          tags_v2: [],
          category_id: this.pluginResources?.category_id,
          images_sha1: [],
        },
        {
          headers: this.getBasicHeaders(),
        }
      );

      this.signedCodeUploadCloudfrontUrl =
        response.data.meta.code_upload_url.signed_cloudfront_url;
      this.versionId = response.data.meta.version_id;
      this.pluginSignature = response.data.meta.signature;
    } catch (error) {
      console.error("Error getting upload links:", error);
      throw error;
    }
  }

  private async updatePluginSettings() {
    try {
      await axios.put(
        `https://www.figma.com/api/plugins/${this.pluginId}`,
        {
          support_contact: this.pluginResources?.support_contact,
          publisher_ids: [],
          agreed_to_tos: true,
          category_id: this.pluginResources?.category_id,
          is_public: this.pluginResources?.roles.is_public,
          is_annual_discount_active: false,
        },
        {
          headers: this.getBasicHeaders(),
        }
      );
    } catch (error) {
      console.error("Error updating plugin settings:", error);
      throw error;
    }
  }

  private async publishVersion() {
    try {
      await axios.put(
        `https://www.figma.com/api/plugins/${this.pluginId}/versions/${this.versionId}`,
        {
          icon_uploaded: false,
          cover_image_uploaded: false,
          snapshot_uploaded: false,
          carousel_media: this.pluginCurrentVersion?.carousel_media,
          code_uploaded: true,
          comments_setting: this.pluginResources?.comments_setting,
          category_id: this.pluginResources?.category_id,
          signature: this.pluginSignature,
          agreed_to_tos: true,
          playground_file_publish_type: "noop",
        },
        {
          headers: this.getBasicHeaders(),
        }
      );
    } catch (error) {
      console.error("Error publishing version:", error);
      throw error;
    }
  }

  private buildCode() {
    const uiCode = readFileSync(this.ui!, "utf-8");
    const mainCode = readFileSync(this.main!, "utf-8");

    const escapedUiCode = JSON.stringify(uiCode);

    this.code = `const __html__ = ${escapedUiCode};${mainCode}`;
  }

  private async uploadCode() {
    try {
      await axios.put(this.signedCodeUploadCloudfrontUrl!, this.code, {
        headers: {
          accept: "*/*",
          "content-type": "text/javascript",
          "x-amz-acl": "bucket-owner-full-control",
        },
      });
    } catch (error) {
      console.error("Error uploading code:", error);
      throw error;
    }
  }

  private async getPluginResources() {
    try {
      const response = await axios.get<PluginsResponse>(
        `https://www.figma.com/api/plugins?id=${this.pluginId}`,
        {
          headers: this.getBasicHeaders(),
        }
      );

      this.pluginResources = response.data.meta[0];
      this.getPluginCurrentVersion();
    } catch (error) {
      console.error("Error getting plugin resources:", error);
      throw error;
    }
  }

  async publish() {
    await this.getLoginCookies();
    await this.loginToFigma();
    await this.getPluginResources();
    await this.getUploadLinks();
    await this.updatePluginSettings();
    this.buildCode();
    await this.uploadCode();
    await this.publishVersion();

    console.log("🎉 Plugin published successfully!");
  }
}
