import { NextRequest, NextResponse } from "next/server";
import { getAppSetting, saveAppSetting } from "@/lib/content/db/app-settings";

export async function GET() {
  try {
    const [wooCommerce, medusa, company] = await Promise.all([
      getAppSetting("wooCommerce"),
      getAppSetting("medusa"),
      getAppSetting("company"),
    ]);

    const settings = {
      wooCommerce: (wooCommerce as Record<string, string>) ?? {
        wordpressUrl: "",
        consumerKey: "",
        consumerSecret: "",
      },
      medusa: (medusa as Record<string, string>) ?? {
        backendUrl: "",
        adminEmail: "",
        adminPassword: "",
        adminApiKey: "",
      },
      company: (company as Record<string, string>) ?? {
        name: "",
        website: "",
        phone: "",
        logoUrl: "",
        address: "",
      },
    };

    return NextResponse.json(settings);
  } catch (err) {
    console.error("[Settings GET]", err);
    return NextResponse.json({ error: "Lỗi khi đọc settings" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const { wooCommerce, medusa, company } = body;

    const saves: Promise<void>[] = [];

    if (wooCommerce) {
      saves.push(saveAppSetting("wooCommerce", wooCommerce));
    }
    if (medusa) {
      saves.push(saveAppSetting("medusa", medusa));
    }
    if (company) {
      saves.push(saveAppSetting("company", company));
    }

    await Promise.all(saves);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[Settings POST]", err);
    return NextResponse.json({ error: "Lỗi khi lưu settings" }, { status: 500 });
  }
}
