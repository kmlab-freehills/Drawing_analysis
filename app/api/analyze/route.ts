import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { GoogleAIFileManager } from "@google/generative-ai/server";
import { writeFile, unlink } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";

export const runtime = "nodejs";

function guessMimeType(fileName: string, fallback: string) {
  const n = fileName.toLowerCase();
  if (n.endsWith(".pdf")) return "application/pdf";
  if (n.endsWith(".png")) return "image/png";
  if (n.endsWith(".jpg") || n.endsWith(".jpeg")) return "image/jpeg";
  if (n.endsWith(".webp")) return "image/webp";
  return fallback || "application/octet-stream";
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "ファイルが選択されていません" }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "環境変数 GEMINI_API_KEY が設定されていません" }, { status: 500 });
    }

    // Accept only PDF or images
    const mime = guessMimeType(file.name, file.type);
    const ok = mime === "application/pdf" || mime.startsWith("image/");
    if (!ok) {
      return NextResponse.json({ error: "対応形式は PDF / 画像 のみです" }, { status: 400 });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const fileManager = new GoogleAIFileManager(apiKey);

    // const modelName = process.env.GEMINI_MODEL || "gemini-1.5-flash";
    const modelName = process.env.GEMINI_MODEL || "gemini-3.5-flash";
    const model = genAI.getGenerativeModel({ model: modelName });

    // Save to temp file (GoogleAIFileManagerはNode環境のファイルパスを要求)
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const tempFilePath = join(tmpdir(), `upload-${Date.now()}-${file.name.replaceAll("/", "_")}`);
    await writeFile(tempFilePath, buffer);

    try {
      const uploadResponse = await fileManager.uploadFile(tempFilePath, {
        mimeType: mime,
        displayName: file.name,
      });

      // Prompt (ユーザー指定の文言)
      const question_old =
        "表面積を求めるのに必要な寸法を抽出してください。抽出した寸法を元にメッキに必要な表面積を計算してください。";
      const question =
      "表面積計算は，四角（立方体，直方体），穴，円柱，球，三角形といった基本図形に分解し，足し引きを行い全体の表面積計算を行ってください．表面積は平方ミリメートル単位でまず行ってください．表記はtex形式はつかわずmm2をつけてください．表面積の最終結果は平方デジメートルであるdmm2に直して最後の行に記載してください．";

      const result = await model.generateContent([
        {
          fileData: {
            mimeType: uploadResponse.file.mimeType,
            fileUri: uploadResponse.file.uri,
          },
        },
        { text: question },
      ]);

      const text = result.response.text();

      // （任意）Gemini側のアップロード済みファイルを削除したい場合:
      // await fileManager.deleteFile(uploadResponse.file.name);

      return NextResponse.json({ text });
    } finally {
      await unlink(tempFilePath).catch(() => {});
    }
  } catch (error: any) {
    console.error("API Error:", error);
    return NextResponse.json(
      { error: error?.message || "内部サーバーエラー" },
      { status: 500 }
    );
  }
}
