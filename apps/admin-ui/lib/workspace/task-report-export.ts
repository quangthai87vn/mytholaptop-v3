import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import type { Campaign, Project, Task } from "@/lib/workspace/types";
import type { FormOption } from "@/lib/workspace/master-data-helpers";

interface ExportCampaignTaskReportParams {
  tasks: Task[];
  projects: Project[];
  campaigns: Campaign[];
  company?: {
    name?: string;
    website?: string;
    phone?: string;
    logoUrl?: string;
    address?: string;
  };
  statusOptions: FormOption[];
  taskTypeOptions: FormOption[];
  staffMap: Record<string, string>;
  platformMap: Record<string, { name: string; color?: string }>;
  campaignId: string;
  onStageChange?: (stage: string) => void;
}

const PLATFORM_LINK_CONFIG = [
  { key: "website_url", label: "Website", color: "FF475569" },
  { key: "youtube_url", label: "YouTube", color: "FFDC2626" },
  { key: "tiktok_url", label: "TikTok", color: "FF111827" },
  { key: "facebook_url", label: "Fanpage", color: "FF2563EB" },
] as const;

const STATUS_STYLE_MAP: Record<string, { bg: string; fg: string }> = {
  completed: { bg: "FFDCFCE7", fg: "FF166534" },
  review: { bg: "FFFEF3C7", fg: "FF92400E" },
  working: { bg: "FFDBEAFE", fg: "FF1D4ED8" },
  assigned: { bg: "FFE0E7FF", fg: "FF4338CA" },
  cancelled: { bg: "FFF3F4F6", fg: "FF4B5563" },
  rework: { bg: "FFFEE2E2", fg: "FFB91C1C" },
  idea: { bg: "FFF5F3FF", fg: "FF7C3AED" },
};

function formatDate(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("vi-VN");
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "chien-dich";
}

function getStatusLabel(status: string, statusOptions: FormOption[]) {
  return statusOptions.find((option) => option.code === status)?.name ?? status;
}

function getTaskTypeLabel(taskType: string | undefined, taskTypeOptions: FormOption[]) {
  if (!taskType) return "—";
  return taskTypeOptions.find((option) => option.code === taskType)?.name ?? taskType;
}

function getPriorityLabel(priority?: string) {
  switch (priority) {
    case "urgent":
      return "Khẩn cấp";
    case "high":
      return "Cao";
    case "normal":
      return "Bình thường";
    case "low":
      return "Thấp";
    default:
      return "—";
  }
}

function getPlatformIds(task: Task) {
  const metadataPlatforms = (task.metadata?.platform_ids as string[] | undefined) ?? [];
  if (metadataPlatforms.length > 0) return metadataPlatforms;
  return task.platform ? [task.platform] : [];
}

function getPlatformLabel(task: Task, platformMap: Record<string, { name: string; color?: string }>) {
  const platformIds = getPlatformIds(task);
  if (platformIds.length === 0) return "—";
  return platformIds.map((platformId) => platformMap[platformId]?.name ?? platformId).join(", ");
}

function getAssigneeLabel(task: Task, staffMap: Record<string, string>) {
  if (!task.assignee_ids?.length) return "—";
  return task.assignee_ids.map((assigneeId) => staffMap[assigneeId] ?? assigneeId).join(", ");
}

function getPrimaryResultLink(task: Task) {
  return task.website_url || task.youtube_url || task.tiktok_url || task.facebook_url || task.output_links?.[0] || "";
}

function extractYouTubeVideoId(url?: string | null) {
  if (!url) return null;
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtube\.com\/embed\/|youtu\.be\/)([A-Za-z0-9_-]{11})/,
    /youtube\.com\/shorts\/([A-Za-z0-9_-]{11})/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match?.[1]) return match[1];
  }

  return null;
}

function getYouTubeThumbnailUrl(task: Task) {
  const ytId = extractYouTubeVideoId(task.youtube_url);
  if (!ytId) return null;
  return `https://img.youtube.com/vi/${ytId}/mqdefault.jpg`;
}

function getTaskImageUrl(task: Task) {
  return task.thumbnail_url || getYouTubeThumbnailUrl(task) || null;
}

function normalizeImageExtension(contentType: string, url?: string) {
  if (contentType.includes("png")) return "png" as const;
  if (contentType.includes("webp")) return "png" as const;
  if (contentType.includes("gif")) return "gif" as const;
  if (url?.toLowerCase().endsWith(".png")) return "png" as const;
  return "jpeg" as const;
}

async function fetchImageBuffer(url?: string) {
  if (!url) return null;
  try {
    const response = await fetch(url, {
      cache: "no-store",
      mode: "cors",
      credentials: "omit",
    });
    if (!response.ok) return null;
    const contentType = response.headers.get("content-type")?.toLowerCase() ?? "";
    if (!contentType.startsWith("image/")) return null;
    const arrayBuffer = await response.arrayBuffer();
    if (arrayBuffer.byteLength === 0) return null;

    return {
      buffer: arrayBuffer,
      extension: normalizeImageExtension(contentType, url),
    } as const;
  } catch {
    return null;
  }
}

function getResultLinks(task: Task) {
  const links = PLATFORM_LINK_CONFIG.flatMap((platform) => {
    const value = task[platform.key as keyof Task];
    return typeof value === "string" && value.trim().length > 0 ? [`${platform.label}: ${value}`] : [];
  });

  const otherLinks = (task.output_links ?? []).filter(Boolean).map((link) => `Khác: ${link}`);
  return [...links, ...otherLinks];
}

function applyHeaderMeta(cell: ExcelJS.Cell) {
  cell.font = { name: "Arial", size: 11, color: { argb: "FF475569" } };
  cell.alignment = { vertical: "middle", horizontal: "left", wrapText: true };
}

function applyMainHeaderCell(cell: ExcelJS.Cell) {
  cell.font = { name: "Arial", size: 11, bold: true, color: { argb: "FFFFFFFF" } };
  cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF111827" } };
  cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
  cell.border = {
    top: { style: "thin", color: { argb: "FF374151" } },
    bottom: { style: "thin", color: { argb: "FF374151" } },
    left: { style: "thin", color: { argb: "FF374151" } },
    right: { style: "thin", color: { argb: "FF374151" } },
  };
}

function applyBodyBorder(cell: ExcelJS.Cell) {
  cell.border = {
    top: { style: "thin", color: { argb: "FFE5E7EB" } },
    bottom: { style: "thin", color: { argb: "FFE5E7EB" } },
    left: { style: "thin", color: { argb: "FFE5E7EB" } },
    right: { style: "thin", color: { argb: "FFE5E7EB" } },
  };
}

function applyKpiCard(
  worksheet: ExcelJS.Worksheet,
  range: string,
  title: string,
  value: string | number,
  options?: { bg?: string; fg?: string; titleColor?: string; valueSize?: number }
) {
  worksheet.mergeCells(range);
  const cell = worksheet.getCell(range.split(":")[0]);
  cell.value = `${title}\n${value}`;
  cell.font = {
    name: "Arial",
    size: options?.valueSize ?? 12,
    bold: true,
    color: { argb: options?.fg ?? "FF0F172A" },
  };
  cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: options?.bg ?? "FFF8FAFC" } };
  cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
  cell.border = {
    top: { style: "thin", color: { argb: "FFE2E8F0" } },
    bottom: { style: "thin", color: { argb: "FFE2E8F0" } },
    left: { style: "thin", color: { argb: "FFE2E8F0" } },
    right: { style: "thin", color: { argb: "FFE2E8F0" } },
  };
}

function getProgressFill(progress: number) {
  if (progress >= 100) return "FFDCFCE7";
  if (progress >= 70) return "FFDBEAFE";
  if (progress >= 40) return "FFFEF3C7";
  return "FFFEE2E2";
}

function getProgressText(progress: number) {
  if (progress >= 100) return "FF166534";
  if (progress >= 70) return "FF1D4ED8";
  if (progress >= 40) return "FF92400E";
  return "FFB91C1C";
}

export async function exportCampaignTaskReport({
  tasks,
  projects,
  campaigns,
  company,
  statusOptions,
  taskTypeOptions,
  staffMap,
  platformMap,
  campaignId,
  onStageChange,
}: ExportCampaignTaskReportParams) {
  onStageChange?.("Đang chuẩn bị dữ liệu báo cáo");
  const campaign = campaigns.find((item) => item.id === campaignId);
  if (!campaign) {
    throw new Error("Không tìm thấy chiến dịch để xuất báo cáo");
  }

  const project = projects.find((item) => item.id === campaign.project_id);
  const today = new Date();
  const overdueCount = tasks.filter((task) => {
    if (!task.due_date) return false;
    const dueDate = new Date(task.due_date);
    return !Number.isNaN(dueDate.getTime()) && dueDate < new Date() && !["completed", "cancelled"].includes(task.status);
  }).length;
  const completedCount = tasks.filter((task) => task.status === "completed").length;
  const activeCount = tasks.filter((task) => ["assigned", "working", "review", "rework"].includes(task.status)).length;

  const workbook = new ExcelJS.Workbook();
  workbook.creator = company?.name || "Mỹ Tho Laptop";
  workbook.company = company?.name || "Mỹ Tho Laptop";
  workbook.created = today;

  const summarySheet = workbook.addWorksheet("Bao_cao_chinh", {
    views: [{ state: "frozen", ySplit: 9, xSplit: 2 }],
    properties: { defaultRowHeight: 22 },
  });

  summarySheet.columns = [
    { key: "stt", width: 8 },
    { key: "thumbnail", width: 18 },
    { key: "startDate", width: 14 },
    { key: "dueDate", width: 14 },
    { key: "title", width: 34 },
    { key: "status", width: 18 },
    { key: "progress", width: 13 },
    { key: "priority", width: 14 },
    { key: "assignee", width: 24 },
    { key: "platform", width: 18 },
    { key: "youtube", width: 16 },
    { key: "tiktok", width: 16 },
    { key: "fanpage", width: 16 },
    { key: "note", width: 28 },
  ];

  summarySheet.mergeCells("A1:D3");
  const brandCell = summarySheet.getCell("A1");
  brandCell.value = company?.name || "Mỹ Tho Laptop";
  brandCell.font = { name: "Arial", size: 18, bold: true, color: { argb: "FF991B1B" } };
  brandCell.alignment = { vertical: "middle", horizontal: "left" };

  summarySheet.mergeCells("E1:Q2");
  const titleCell = summarySheet.getCell("E1");
  titleCell.value = "BÁO CÁO QUẢN TRỊ CÔNG VIỆC THEO CHIẾN DỊCH";
  titleCell.font = { name: "Arial", size: 20, bold: true, color: { argb: "FFFFFFFF" } };
  titleCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFB91C1C" } };
  titleCell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };

  summarySheet.mergeCells("R1:U2");
  const exportDateCell = summarySheet.getCell("R1");
  exportDateCell.value = `Ngày xuất\n${today.toLocaleString("vi-VN")}`;
  exportDateCell.font = { name: "Arial", size: 11, bold: true, color: { argb: "FF0F172A" } };
  exportDateCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF8FAFC" } };
  exportDateCell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
  applyBodyBorder(exportDateCell);

  summarySheet.mergeCells("E3:Q3");
  summarySheet.getCell("E3").value = [company?.website, company?.phone, company?.address].filter(Boolean).join("  •  ");
  applyHeaderMeta(summarySheet.getCell("E3"));

  const companyLogo = null;
  if (companyLogo) {
    const logoImageId = workbook.addImage({
      buffer: new Uint8Array(companyLogo.buffer),
      extension: companyLogo.extension,
    });
    summarySheet.addImage(logoImageId, {
      tl: { col: 0.25, row: 0.2 },
      ext: { width: 135, height: 70 },
      editAs: "oneCell",
    });
  }

  summarySheet.getRow(5).height = 34;
  summarySheet.getRow(6).height = 34;
  summarySheet.getRow(7).height = 34;
  summarySheet.getRow(8).height = 34;

  applyKpiCard(summarySheet, "A5:F6", "Dự án", project?.name ?? "—", { bg: "FFFEE2E2", fg: "FF991B1B", valueSize: 13 });
  applyKpiCard(summarySheet, "G5:L6", "Chiến dịch", campaign.name, { bg: "FFFFF7ED", fg: "FF9A3412", valueSize: 13 });
  applyKpiCard(summarySheet, "M5:O6", "Tổng việc", tasks.length, { bg: "FFEFF6FF", fg: "FF1D4ED8", valueSize: 16 });
  applyKpiCard(summarySheet, "P5:R6", "Hoàn thành", completedCount, { bg: "FFDCFCE7", fg: "FF166534", valueSize: 16 });
  applyKpiCard(summarySheet, "S5:U6", "Quá hạn", overdueCount, { bg: "FFFEE2E2", fg: "FFB91C1C", valueSize: 16 });
  applyKpiCard(summarySheet, "A7:F8", "Đang xử lý", activeCount, { bg: "FFF5F3FF", fg: "FF6D28D9", valueSize: 16 });
  applyKpiCard(summarySheet, "G7:L8", "Tỷ lệ hoàn thành", `${tasks.length > 0 ? Math.round((completedCount / tasks.length) * 100) : 0}%`, { bg: "FFECFEFF", fg: "FF0F766E", valueSize: 16 });
  applyKpiCard(summarySheet, "M7:U8", "Ghi chú", "Sheet chính đã rút gọn để dễ xem. Sheet chi tiết giữ đầy đủ dữ liệu.", { bg: "FFF8FAFC", fg: "FF334155", valueSize: 11 });

  const mainHeaderRow = 10;
  const mainHeaders = [
    "STT",
    "Ảnh công việc",
    "Ngày bắt đầu",
    "Hạn chót",
    "Tiêu đề công việc",
    "Trạng thái",
    "Tiến độ (%)",
    "Ưu tiên",
    "Người phụ trách",
    "Nền tảng",
    "YouTube",
    "TikTok",
    "Fanpage",
    "Ghi chú ngắn",
  ];
  summarySheet.getRow(mainHeaderRow).values = mainHeaders;
  summarySheet.getRow(mainHeaderRow).height = 30;
  summarySheet.getRow(mainHeaderRow).eachCell((cell) => applyMainHeaderCell(cell));
  summarySheet.autoFilter = {
    from: "A10",
    to: "N10",
  };

  onStageChange?.("Đang tải thumbnail công việc");
  const thumbnailBuffers = await Promise.all(tasks.map((task) => fetchImageBuffer(getTaskImageUrl(task) ?? undefined)));

  tasks.forEach((task, index) => {
    const rowNumber = mainHeaderRow + 1 + index;
    const statusStyle = STATUS_STYLE_MAP[task.status] ?? { bg: "FFF8FAFC", fg: "FF334155" };
    const row = summarySheet.getRow(rowNumber);
    row.height = 72;

    summarySheet.getCell(`A${rowNumber}`).value = index + 1;
    summarySheet.getCell(`C${rowNumber}`).value = formatDate(task.start_date);
    summarySheet.getCell(`D${rowNumber}`).value = formatDate(task.due_date);
    summarySheet.getCell(`E${rowNumber}`).value = task.title;
    summarySheet.getCell(`F${rowNumber}`).value = getStatusLabel(task.status, statusOptions);
    summarySheet.getCell(`G${rowNumber}`).value = task.progress ?? 0;
    summarySheet.getCell(`H${rowNumber}`).value = getPriorityLabel(task.priority);
    summarySheet.getCell(`I${rowNumber}`).value = getAssigneeLabel(task, staffMap);
    summarySheet.getCell(`J${rowNumber}`).value = getPlatformLabel(task, platformMap);
    summarySheet.getCell(`K${rowNumber}`).value = task.youtube_url ? { text: "Open link", hyperlink: task.youtube_url } : "";
    summarySheet.getCell(`L${rowNumber}`).value = task.tiktok_url ? { text: "Open link", hyperlink: task.tiktok_url } : "";
    summarySheet.getCell(`M${rowNumber}`).value = task.facebook_url ? { text: "Open link", hyperlink: task.facebook_url } : "";
    summarySheet.getCell(`N${rowNumber}`).value = task.completion_note ?? "";

    const isOverdue = Boolean(
      task.due_date &&
        new Date(task.due_date).getTime() < Date.now() &&
        !["completed", "cancelled"].includes(task.status)
    );
    const progressValue = task.progress ?? 0;

    ["K", "L", "M"].forEach((column) => {
      const linkCell = summarySheet.getCell(`${column}${rowNumber}`);
      if (typeof linkCell.value === "object" && linkCell.value && "hyperlink" in linkCell.value) {
        linkCell.font = { name: "Arial", size: 10, bold: true, color: { argb: "FF2563EB" }, underline: true };
      }
    });

    const columns = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M", "N"];
    columns.forEach((column) => {
      const cell = summarySheet.getCell(`${column}${rowNumber}`);
      if (!["F", "K", "L", "M"].includes(column)) {
        cell.font = { name: "Arial", size: 10, color: { argb: "FF0F172A" } };
      }
      cell.alignment = {
        vertical: column === "B" ? "middle" : "top",
        horizontal: ["A", "C", "D", "F", "G", "H", "K", "L", "M"].includes(column) ? "center" : "left",
        wrapText: true,
      };
      applyBodyBorder(cell);
      if (index % 2 === 0) {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFCFCFD" } };
      }
    });

    summarySheet.getCell(`F${rowNumber}`).fill = { type: "pattern", pattern: "solid", fgColor: { argb: statusStyle.bg } };
    summarySheet.getCell(`F${rowNumber}`).font = { name: "Arial", size: 10, bold: true, color: { argb: statusStyle.fg } };
    summarySheet.getCell(`E${rowNumber}`).fill = { type: "pattern", pattern: "solid", fgColor: { argb: isOverdue ? "FFFEE2E2" : "FFFFFBEB" } };
    summarySheet.getCell(`G${rowNumber}`).fill = { type: "pattern", pattern: "solid", fgColor: { argb: getProgressFill(progressValue) } };
    summarySheet.getCell(`G${rowNumber}`).font = { name: "Arial", size: 10, bold: true, color: { argb: getProgressText(progressValue) } };

    if (isOverdue) {
      summarySheet.getCell(`D${rowNumber}`).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFEE2E2" } };
      summarySheet.getCell(`D${rowNumber}`).font = { name: "Arial", size: 10, bold: true, color: { argb: "FFB91C1C" } };
    }

    const thumbnail = thumbnailBuffers[index];
    if (thumbnail) {
      const imageId = workbook.addImage({
        buffer: new Uint8Array(thumbnail.buffer),
        extension: thumbnail.extension,
      });
      summarySheet.addImage(imageId, {
        tl: { col: 1.1, row: rowNumber - 0.82 },
        ext: { width: 92, height: 56 },
        editAs: "oneCell",
      });
    } else {
      summarySheet.getCell(`B${rowNumber}`).value = getTaskImageUrl(task) ? "Không tải được thumbnail" : "Không có ảnh";
      summarySheet.getCell(`B${rowNumber}`).font = { name: "Arial", size: 9, italic: true, color: { argb: "FF64748B" } };
      summarySheet.getCell(`B${rowNumber}`).alignment = { vertical: "middle", horizontal: "center", wrapText: true };
    }
  });

  const detailSheet = workbook.addWorksheet("Chi_tiet_day_du", {
    views: [{ state: "frozen", ySplit: 1 }],
    properties: { defaultRowHeight: 22 },
  });

  onStageChange?.("Đang hoàn thiện sheet chi tiết");

  detailSheet.columns = [
    { key: "stt", width: 8 },
    { key: "title", width: 32 },
    { key: "status", width: 18 },
    { key: "taskType", width: 18 },
    { key: "project", width: 20 },
    { key: "campaign", width: 22 },
    { key: "startDate", width: 14 },
    { key: "dueDate", width: 14 },
    { key: "priority", width: 14 },
    { key: "assignee", width: 24 },
    { key: "platform", width: 18 },
    { key: "progress", width: 12 },
    { key: "website", width: 18 },
    { key: "youtube", width: 18 },
    { key: "tiktok", width: 18 },
    { key: "fanpage", width: 18 },
    { key: "otherLinks", width: 30 },
    { key: "completionNote", width: 32 },
    { key: "description", width: 44 },
  ];

  const detailHeaders = [
    "STT",
    "Tiêu đề công việc",
    "Trạng thái",
    "Loại công việc",
    "Dự án",
    "Chiến dịch",
    "Ngày bắt đầu",
    "Hạn chót",
    "Độ ưu tiên",
    "Người phụ trách",
    "Nền tảng",
    "Tiến độ (%)",
    "Website",
    "YouTube",
    "TikTok",
    "Fanpage",
    "Link kết quả khác",
    "Ghi chú hoàn thành",
    "Mô tả",
  ];
  detailSheet.getRow(1).values = detailHeaders;
  detailSheet.getRow(1).height = 28;
  detailSheet.getRow(1).eachCell((cell) => applyMainHeaderCell(cell));
  detailSheet.autoFilter = {
    from: "A1",
    to: "S1",
  };

  tasks.forEach((task, index) => {
    const rowNumber = index + 2;
    detailSheet.getCell(`A${rowNumber}`).value = index + 1;
    detailSheet.getCell(`B${rowNumber}`).value = task.title;
    detailSheet.getCell(`C${rowNumber}`).value = getStatusLabel(task.status, statusOptions);
    detailSheet.getCell(`D${rowNumber}`).value = getTaskTypeLabel(task.task_type, taskTypeOptions);
    detailSheet.getCell(`E${rowNumber}`).value = project?.name ?? "—";
    detailSheet.getCell(`F${rowNumber}`).value = campaign.name;
    detailSheet.getCell(`G${rowNumber}`).value = formatDate(task.start_date);
    detailSheet.getCell(`H${rowNumber}`).value = formatDate(task.due_date);
    detailSheet.getCell(`I${rowNumber}`).value = getPriorityLabel(task.priority);
    detailSheet.getCell(`J${rowNumber}`).value = getAssigneeLabel(task, staffMap);
    detailSheet.getCell(`K${rowNumber}`).value = getPlatformLabel(task, platformMap);
    detailSheet.getCell(`L${rowNumber}`).value = task.progress ?? 0;
    detailSheet.getCell(`Q${rowNumber}`).value = task.output_links?.join("\n") ?? "";
    detailSheet.getCell(`R${rowNumber}`).value = task.completion_note ?? "";
    detailSheet.getCell(`S${rowNumber}`).value = task.description ?? "";

    const detailLinks = [
      { column: "M", url: task.website_url },
      { column: "N", url: task.youtube_url },
      { column: "O", url: task.tiktok_url },
      { column: "P", url: task.facebook_url },
    ];

    detailLinks.forEach(({ column, url }) => {
      if (!url) return;
      const cell = detailSheet.getCell(`${column}${rowNumber}`);
      cell.value = { text: "Open link", hyperlink: url };
      cell.font = { name: "Arial", size: 10, bold: true, color: { argb: "FF2563EB" }, underline: true };
      cell.alignment = { vertical: "top", horizontal: "center", wrapText: true };
    });

    const row = detailSheet.getRow(rowNumber);
    row.height = 44;
    row.eachCell({ includeEmpty: true }, (cell) => {
      cell.alignment = { vertical: "top", horizontal: "left", wrapText: true };
      cell.font = { name: "Arial", size: 10, color: { argb: "FF0F172A" } };
      applyBodyBorder(cell);
      if (index % 2 === 0) {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFCFCFD" } };
      }
    });
  });

  onStageChange?.("Đang đóng gói file Excel");
  const buffer = await Promise.race([
    workbook.xlsx.writeBuffer(),
    new Promise<never>((_, reject) => {
      window.setTimeout(() => reject(new Error("Xuất Excel bị treo khi tạo file. Vui lòng thử lại với ít dữ liệu hơn.")), 15000);
    }),
  ]);
  onStageChange?.("Đang gửi file tải xuống");
  const blob = new Blob([
    buffer instanceof ArrayBuffer ? buffer : new Uint8Array(buffer as ArrayBufferLike),
  ], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const fileName = `bao-cao-cong-viec-${slugify(campaign.name)}-${today.toISOString().slice(0, 10)}.xlsx`;
  saveAs(blob, fileName);
}
